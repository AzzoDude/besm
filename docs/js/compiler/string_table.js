// Vault-Tec Master File Database & Compiler - String Table Serialization & Parsing

import { BlobPoolBuilder } from '../helpers.js';

export function parseStringTable(bStr) {
    const stringCache = {};
    if (bStr.byteLength < 4) return stringCache;
    const view = new DataView(bStr.buffer, bStr.byteOffset, bStr.byteLength);
    const count = view.getUint32(0, true);
    const idxs = [];
    for (let i = 0; i < count; i++) {
        const off = 4 + i * 10;
        if (off + 10 > bStr.byteLength) break;
        idxs.push({ 
            fID: view.getUint32(off, true), 
            sOffset: view.getUint32(off + 4, true), 
            sLength: view.getUint16(off + 8, true) 
        });
    }
    const heap = 4 + count * 10;
    const dec = new TextDecoder();
    for (const idx of idxs) {
        if (heap + idx.sOffset + idx.sLength > bStr.byteLength) continue;
        const val = dec.decode(bStr.subarray(heap + idx.sOffset, heap + idx.sOffset + idx.sLength));
        const pipe = val.indexOf('|');
        if (pipe >= 0) {
            stringCache[idx.fID] = { 
                name: val.substring(0, pipe), 
                edid: val.substring(pipe + 1) 
            };
        }
    }
    return stringCache;
}

export function buildStringTable(stringCacheMap) {
    const stringTableBuilder = new BlobPoolBuilder();
    stringTableBuilder.writeUint32(stringCacheMap.size);
    const strDataBuilder = new BlobPoolBuilder();
    const enc = new TextEncoder();
    
    for (const [fID, val] of stringCacheMap.entries()) {
        const encodedVal = enc.encode(val);
        const sOff = strDataBuilder.write(encodedVal);
        const item = new Uint8Array(10);
        const view = new DataView(item.buffer);
        view.setUint32(0, fID, true);
        view.setUint32(4, sOff, true);
        view.setUint16(8, encodedVal.length, true);
        stringTableBuilder.write(item);
    }
    
    const rawBS = new Uint8Array(stringTableBuilder.length + strDataBuilder.length);
    rawBS.set(stringTableBuilder.toArray(), 0);
    rawBS.set(strDataBuilder.toArray(), stringTableBuilder.length);
    return rawBS;
}
