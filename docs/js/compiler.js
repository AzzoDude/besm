// Vault-Tec Master File Database & Compiler - Main Orchestrator

import { compressDeflateRaw, BlobPoolBuilder } from './helpers.js';
import { parseSchemaForCompile } from './schema.js';
import { decodeRecord } from './compiler/record_decoder.js';
import { buildStringTable, parseStringTable } from './compiler/string_table.js';
import { buildReconstruction, parseReconstruction } from './compiler/reconstruction.js';

export { parseStringTable } from './compiler/string_table.js';
export { parseReconstruction } from './compiler/reconstruction.js';

export async function compileEsmToBesm(bytes, gamePreset, activeSchemaStr) {
    const schemas = parseSchemaForCompile(activeSchemaStr);
    
    const textStringCache = new Map();
    const sectorRows = new Map();
    const blobPool = new BlobPoolBuilder();
    const stringCacheMap = new Map();
    const loadedRecords = [];
    
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    
    const headerSig = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    if (headerSig !== "TES4") {
        throw new Error("Invalid file header: Must start with TES4");
    }
    
    const headerFlags = view.getUint32(8, true);
    const isLocalized = (headerFlags & 0x00000080) !== 0;
    
    function saveStr(str) {
        if (!str) return 0;
        if (textStringCache.has(str)) return textStringCache.get(str);
        const encoded = new TextEncoder().encode(str);
        const zeroTerm = new Uint8Array(encoded.length + 1);
        zeroTerm.set(encoded);
        const sOff = blobPool.write(zeroTerm);
        textStringCache.set(str, sOff);
        return sOff;
    }
    
    let offset = 0;
    while (offset < bytes.length) {
        if (offset + 24 > bytes.length) break;
        
        const recType = String.fromCharCode(bytes[offset], bytes[offset+1], bytes[offset+2], bytes[offset+3]);
        if (recType === "GRUP") {
            const hBytes = bytes.slice(offset, offset + 24);
            loadedRecords.push({ type: "GRUP", flags: 0, fID: 0, bodyLen: 0, headerBytes: hBytes, bodyOffset: offset + 24 });
            offset += 24;
            continue;
        }
        
        const bodyLen = view.getUint32(offset + 4, true);
        const totalSize = 24 + bodyLen;
        if (offset + totalSize > bytes.length) break;
        
        const fID = view.getUint32(offset + 12, true);
        const flags = view.getUint32(offset + 8, true);
        const hBytes = bytes.slice(offset, offset + 24);
        
        const r = { type: recType, flags, fID, bodyLen, headerBytes: hBytes, bodyOffset: offset + 24 };
        loadedRecords.push(r);
        
        const schema = schemas[recType];
        if (schema) {
            const row = await decodeRecord(r, bytes, schema, isLocalized, saveStr, stringCacheMap, blobPool);
            if (!sectorRows.has(recType)) {
                sectorRows.set(recType, []);
            }
            sectorRows.get(recType).push(row);
        }
        
        offset += totalSize;
    }
    
    const outBuilder = new BlobPoolBuilder();
    const enc = new TextEncoder();
    
    // Write BESM format signature, version, and sector count
    outBuilder.write(enc.encode("BESM"));
    outBuilder.writeUint32(1); 
    outBuilder.writeUint32(sectorRows.size); 
    
    // Allocation spaceholders for main offset pointers (written dynamically later)
    outBuilder.write(new Uint8Array(96));
    
    const headStart = 12 + 96;
    
    // Write empty headers for subsectors (40 bytes each)
    for (let i = 0; i < sectorRows.size; i++) {
        outBuilder.write(new Uint8Array(40));
    }
    
    // Serialize & compress subsectors data blocks
    const infos = [];
    for (const [recType, rows] of sectorRows.entries()) {
        const schema = schemas[recType];
        const rawSectorBytes = new Uint8Array(rows.length * schema.rowSize);
        let sOff = 0;
        for (const row of rows) {
            rawSectorBytes.set(row, sOff);
            sOff += row.length;
        }
        
        const comp = await compressDeflateRaw(rawSectorBytes);
        const offsetInFile = outBuilder.length;
        outBuilder.write(comp);
        
        infos.push({
            recType,
            rowSize: schema.rowSize,
            rowCount: rows.length,
            offset: offsetInFile,
            compSize: comp.length,
            uncompSize: rawSectorBytes.length
        });
    }
    
    // Write Blob Pool
    const rawB = blobPool.toArray();
    const compB = await compressDeflateRaw(rawB);
    const bOff = outBuilder.length;
    outBuilder.write(compB);
    
    // Write String Table
    const rawBS = buildStringTable(stringCacheMap);
    const compBS = await compressDeflateRaw(rawBS);
    const bsOff = outBuilder.length;
    outBuilder.write(compBS);
    
    // Write Schema Strings
    const rawSC = enc.encode(activeSchemaStr);
    const compSC = await compressDeflateRaw(rawSC);
    const scOff = outBuilder.length;
    outBuilder.write(compSC);
    
    // Write Reconstruction
    const rawRC = buildReconstruction(loadedRecords, bytes);
    const compRC = await compressDeflateRaw(rawRC);
    const rcOff = outBuilder.length;
    outBuilder.write(compRC);
    
    const finalBytes = outBuilder.toArray();
    const finalView = new DataView(finalBytes.buffer);
    
    // Fill main header section offsets
    finalView.setBigUint64(12, BigInt(bOff), true);
    finalView.setBigUint64(20, BigInt(compB.length), true);
    finalView.setBigUint64(28, BigInt(rawB.length), true);
    
    finalView.setBigUint64(36, BigInt(bsOff), true);
    finalView.setBigUint64(44, BigInt(compBS.length), true);
    finalView.setBigUint64(52, BigInt(rawBS.length), true);
    
    finalView.setBigUint64(60, BigInt(scOff), true);
    finalView.setBigUint64(68, BigInt(compSC.length), true);
    finalView.setBigUint64(76, BigInt(rawSC.length), true);
    
    finalView.setBigUint64(84, BigInt(rcOff), true);
    finalView.setBigUint64(92, BigInt(compRC.length), true);
    finalView.setBigUint64(100, BigInt(rawRC.length), true);
    
    // Write subsector descriptors
    let sPos = headStart;
    for (const info of infos) {
        const paddedType = (info.recType + "    ").substring(0, 4);
        finalBytes.set(enc.encode(paddedType), sPos);
        finalView.setUint32(sPos + 4, info.rowSize, true);
        finalView.setUint32(sPos + 8, info.rowCount, true);
        finalView.setBigUint64(sPos + 12, BigInt(info.offset), true);
        finalView.setBigUint64(sPos + 20, BigInt(info.compSize), true);
        finalView.setBigUint64(sPos + 28, BigInt(info.uncompSize), true);
        finalView.setUint32(sPos + 36, 0, true);
        sPos += 40;
    }
    
    return { finalBytes, loadedRecords };
}
