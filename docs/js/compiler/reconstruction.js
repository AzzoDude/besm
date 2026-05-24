// Vault-Tec Master File Database & Compiler - Chronology Reconstruction Serialization & Parsing

import { BlobPoolBuilder } from '../helpers.js';

export function parseReconstruction(bRc) {
    const loadedRecords = [];
    if (bRc.byteLength < 4) return loadedRecords;
    const view = new DataView(bRc.buffer, bRc.byteOffset, bRc.byteLength);
    const count = view.getUint32(0, true);
    let off = 4;
    for (let i = 0; i < count; i++) {
        if (off + 32 > bRc.byteLength) break;
        const sig = String.fromCharCode(bRc[off], bRc[off + 1], bRc[off + 2], bRc[off + 3]);
        const head = bRc.slice(off + 4, off + 28);
        const bodyLen = view.getUint32(off + 28, true);
        const flags = view.getUint32(off + 12, true);
        const fID = view.getUint32(off + 16, true);
        
        if (off + 32 + bodyLen > bRc.byteLength) break;
        
        loadedRecords.push({ type: sig, flags, fID, bodyLen, headerBytes: head, bodyOffset: off + 32 });
        off += 32 + bodyLen;
    }
    return loadedRecords;
}

export function buildReconstruction(loadedRecords, bytes) {
    const chronoBuilder = new BlobPoolBuilder();
    const enc = new TextEncoder();
    chronoBuilder.writeUint32(loadedRecords.length);
    for (const r of loadedRecords) {
        chronoBuilder.write(enc.encode((r.type + "    ").substring(0, 4)));
        chronoBuilder.write(r.headerBytes);
        chronoBuilder.writeUint32(r.bodyLen);
        if (r.bodyLen > 0) {
            chronoBuilder.write(bytes.subarray(r.bodyOffset, r.bodyOffset + r.bodyLen));
        }
    }
    return chronoBuilder.toArray();
}
