// Vault-Tec Master File Database & Compiler - Individual Record Binary Decoder

import { decompressDeflateRaw, getTagInt, getSubDataFast, BlobPoolBuilder } from '../helpers.js';

const fullTagInt = getTagInt("FULL");
const edidTagInt = getTagInt("EDID");

export async function decodeRecord(r, bytes, schema, isLocalized, saveStr, stringCacheMap, blobPool) {
    const rawBody = bytes.slice(r.bodyOffset, r.bodyOffset + r.bodyLen);
    let dataBlock = rawBody;
    
    if (r.flags & 0x00040000) { // Compressed
        try {
            dataBlock = await decompressDeflateRaw(rawBody.slice(6));
        } catch (err) {
            console.error("Decompression failed for record", r.type, err);
        }
    }
    
    let edidStr = "";
    let fullStr = "";
    
    const edidData = getSubDataFast(dataBlock, edidTagInt);
    if (edidData) {
        const termIdx = edidData.indexOf(0);
        edidStr = new TextDecoder().decode(termIdx >= 0 ? edidData.slice(0, termIdx) : edidData);
    }
    
    const fullData = getSubDataFast(dataBlock, fullTagInt);
    if (fullData) {
        if (isLocalized && fullData.length === 4) {
            const strId = new DataView(fullData.buffer, fullData.byteOffset, fullData.byteLength).getUint32(0, true);
            fullStr = `[LocalString: ${strId}]`;
        } else {
            const termIdx = fullData.indexOf(0);
            fullStr = new TextDecoder().decode(termIdx >= 0 ? fullData.slice(0, termIdx) : fullData);
        }
    }
    
    if (edidStr || fullStr) {
        stringCacheMap.set(r.fID, fullStr + "|" + edidStr);
    }
    
    const row = new Uint8Array(schema.rowSize);
    const rView = new DataView(row.buffer);
    
    for (const col of schema.columns) {
        let val = 0;
        if (col.srcTag === "HeaderFormID") {
            val = r.fID;
        } else if (col.srcTag === "HeaderFlags") {
            val = r.flags;
        } else if (col.srcTag === "BlobOffset") {
            val = 0; // Filled later
        } else if (col.srcOffset === "StringIndex") {
            if (col.srcTag === "EDID") {
                val = saveStr(edidStr);
            } else if (col.srcTag === "FULL") {
                val = saveStr(fullStr);
            } else {
                const subData = getSubDataFast(dataBlock, col.srcTagInt);
                if (subData) {
                    let valStr = "";
                    if (isLocalized && subData.length === 4 && (col.srcTag === "FULL" || col.srcTag === "DESC" || col.srcTag === "ITXT")) {
                        const strId = new DataView(subData.buffer, subData.byteOffset, subData.byteLength).getUint32(0, true);
                        valStr = `[LocalString: ${strId}]`;
                    } else {
                        const termIdx = subData.indexOf(0);
                        valStr = new TextDecoder().decode(termIdx >= 0 ? subData.slice(0, termIdx) : subData);
                    }
                    val = saveStr(valStr);
                }
            }
        } else {
            const subData = getSubDataFast(dataBlock, col.srcTagInt);
            if (subData) {
                const sOff = parseInt(col.srcOffset);
                if (sOff < subData.length) {
                    const dv = new DataView(subData.buffer, subData.byteOffset, subData.byteLength);
                    if (col.type === "Float") {
                        if (sOff + 4 <= subData.length) {
                            val = dv.getFloat32(sOff, true);
                        }
                    } else {
                        if (sOff + 4 <= subData.length) {
                            val = dv.getUint32(sOff, true);
                        } else if (sOff + 2 <= subData.length) {
                            val = dv.getUint16(sOff, true);
                        } else if (sOff + 1 <= subData.length) {
                            val = dv.getUint8(sOff);
                        }
                    }
                }
            }
        }
        
        if (col.offset + 4 <= schema.rowSize) {
            if (col.type === "Float") {
                rView.setFloat32(col.offset, val, true);
            } else {
                rView.setUint32(col.offset, val, true);
            }
        }
    }
    
    // Extract remainder body bytes
    const remainderOffset = extractRemainderBytes(dataBlock, schema, blobPool);
    for (const col of schema.columns) {
        if (col.srcTag === "BlobOffset" && col.offset + 4 <= schema.rowSize) {
            rView.setUint32(col.offset, remainderOffset, true);
        }
    }
    
    return row;
}

function extractRemainderBytes(dataBlock, schema, blobPool) {
    const trackedTags = new Set();
    for (const col of schema.columns) {
        if (col.srcTagInt) trackedTags.add(col.srcTagInt);
    }
    
    const blobBuilder = new BlobPoolBuilder();
    let bOff = 0;
    const subView = new DataView(dataBlock.buffer, dataBlock.byteOffset, dataBlock.byteLength);
    
    while (bOff + 6 <= dataBlock.length) {
        const subTag = subView.getUint32(bOff, true);
        const subSize = subView.getUint16(bOff + 4, true);
        if (bOff + 6 + subSize > dataBlock.length) break;
        
        if (!trackedTags.has(subTag) && subTag !== fullTagInt && subTag !== edidTagInt) {
            blobBuilder.write(dataBlock.slice(bOff, bOff + 6 + subSize));
        }
        bOff += 6 + subSize;
    }
    
    const remainderBytes = blobBuilder.toArray();
    if (remainderBytes.length > 0) {
        return blobPool.write(remainderBytes);
    }
    return 0;
}
