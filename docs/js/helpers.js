// Vault-Tec Master File Database & Compiler - Pure Utility and Algorithmic Helpers

export async function readStreamToBytes(stream) {
    const reader = stream.getReader();
    const chunks = [];
    let totalLength = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        totalLength += value.length;
    }
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }
    return result;
}

export async function decompressDeflateRaw(compressedBytes) {
    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(compressedBytes);
            controller.close();
        }
    }).pipeThrough(new DecompressionStream('deflate-raw'));
    return readStreamToBytes(stream);
}

export async function compressDeflateRaw(bytes) {
    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(bytes);
            controller.close();
        }
    }).pipeThrough(new CompressionStream('deflate-raw'));
    return readStreamToBytes(stream);
}

export function md5(bytes) {
    let k = [], i = 0;
    for (; i < 64; ) {
        k[i] = Math.floor(Math.abs(Math.sin(++i)) * 4294967296);
    }
    let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
    
    let len = bytes.length;
    let blockCount = ((len + 8) >> 6) + 1;
    let totalLen = blockCount << 6;
    let pad = new Uint8Array(totalLen);
    pad.set(bytes);
    pad[len] = 0x80;
    
    let view = new DataView(pad.buffer);
    let bits = len * 8;
    view.setUint32(totalLen - 8, bits & 0xFFFFFFFF, true);
    view.setUint32(totalLen - 4, Math.floor(bits / 4294967296), true);
    
    function rol(num, cnt) {
        return (num << cnt) | (num >>> (32 - cnt));
    }
    
    for (let off = 0; off < totalLen; off += 64) {
        let w = [];
        for (let j = 0; j < 16; j++) {
            w[j] = view.getUint32(off + j * 4, true);
        }
        let olda = a, oldb = b, oldc = c, oldd = d;
        
        // Round 1
        a = rol(a + ((b & c) | (~b & d)) + w[0] + k[0], 7) + b;
        d = rol(d + ((a & b) | (~a & c)) + w[1] + k[1], 12) + a;
        c = rol(c + ((d & a) | (~d & b)) + w[2] + k[2], 17) + d;
        b = rol(b + ((c & d) | (~c & a)) + w[3] + k[3], 22) + c;
        a = rol(a + ((b & c) | (~b & d)) + w[4] + k[4], 7) + b;
        d = rol(d + ((a & b) | (~a & c)) + w[5] + k[5], 12) + a;
        c = rol(c + ((d & a) | (~d & b)) + w[6] + k[6], 17) + d;
        b = rol(b + ((c & d) | (~c & a)) + w[7] + k[7], 22) + c;
        a = rol(a + ((b & c) | (~b & d)) + w[8] + k[8], 7) + b;
        d = rol(d + ((a & b) | (~a & c)) + w[9] + k[9], 12) + a;
        c = rol(c + ((d & a) | (~d & b)) + w[10] + k[10], 17) + d;
        b = rol(b + ((c & d) | (~c & a)) + w[11] + k[11], 22) + c;
        a = rol(a + ((b & c) | (~b & d)) + w[12] + k[12], 7) + b;
        d = rol(d + ((a & b) | (~a & c)) + w[13] + k[13], 12) + a;
        c = rol(c + ((d & a) | (~d & b)) + w[14] + k[14], 17) + d;
        b = rol(b + ((c & d) | (~c & a)) + w[15] + k[15], 22) + c;
        
        // Round 2
        a = rol(a + ((b & d) | (c & ~d)) + w[1] + k[16], 5) + b;
        d = rol(d + ((a & c) | (b & ~c)) + w[6] + k[17], 9) + a;
        c = rol(c + ((d & b) | (a & ~b)) + w[11] + k[18], 14) + d;
        b = rol(b + ((c & a) | (d & ~a)) + w[0] + k[19], 20) + c;
        a = rol(a + ((b & d) | (c & ~d)) + w[5] + k[20], 5) + b;
        d = rol(d + ((a & c) | (b & ~c)) + w[10] + k[21], 9) + a;
        c = rol(c + ((d & b) | (a & ~b)) + w[15] + k[22], 14) + d;
        b = rol(b + ((c & a) | (d & ~a)) + w[4] + k[23], 20) + c;
        a = rol(a + ((b & d) | (c & ~d)) + w[9] + k[24], 5) + b;
        d = rol(d + ((a & c) | (b & ~c)) + w[14] + k[25], 9) + a;
        c = rol(c + ((d & b) | (a & ~b)) + w[3] + k[26], 14) + d;
        b = rol(b + ((c & a) | (d & ~a)) + w[8] + k[27], 20) + c;
        a = rol(a + ((b & d) | (c & ~d)) + w[13] + k[28], 5) + b;
        d = rol(d + ((a & c) | (b & ~c)) + w[2] + k[29], 9) + a;
        c = rol(c + ((d & b) | (a & ~b)) + w[7] + k[30], 14) + d;
        b = rol(b + ((c & a) | (d & ~a)) + w[12] + k[31], 20) + c;
        
        // Round 3
        a = rol(a + (b ^ c ^ d) + w[5] + k[32], 4) + b;
        d = rol(d + (a ^ b ^ c) + w[8] + k[33], 11) + a;
        c = rol(c + (d ^ a ^ b) + w[11] + k[34], 16) + d;
        b = rol(b + (c ^ d ^ a) + w[14] + k[35], 23) + c;
        a = rol(a + (b ^ c ^ d) + w[1] + k[36], 4) + b;
        d = rol(d + (a ^ b ^ c) + w[4] + k[37], 11) + a;
        c = rol(c + (d ^ a ^ b) + w[7] + k[38], 16) + d;
        b = rol(b + (c ^ d ^ a) + w[10] + k[39], 23) + c;
        a = rol(a + (b ^ c ^ d) + w[13] + k[40], 4) + b;
        d = rol(d + (a ^ b ^ c) + w[0] + k[41], 11) + a;
        c = rol(c + (d ^ a ^ b) + w[3] + k[42], 16) + d;
        b = rol(b + (c ^ d ^ a) + w[6] + k[43], 23) + c;
        a = rol(a + (b ^ c ^ d) + w[9] + k[44], 4) + b;
        d = rol(d + (a ^ b ^ c) + w[12] + k[45], 11) + a;
        c = rol(c + (d ^ a ^ b) + w[15] + k[46], 16) + d;
        b = rol(b + (c ^ d ^ a) + w[2] + k[47], 23) + c;
        
        // Round 4
        a = rol(a + (c ^ (b | ~d)) + w[0] + k[48], 6) + b;
        d = rol(d + (b ^ (a | ~c)) + w[7] + k[49], 10) + a;
        c = rol(c + (a ^ (d | ~b)) + w[14] + k[50], 15) + d;
        b = rol(b + (d ^ (c | ~a)) + w[5] + k[51], 21) + c;
        a = rol(a + (c ^ (b | ~d)) + w[12] + k[52], 6) + b;
        d = rol(d + (b ^ (a | ~c)) + w[3] + k[53], 10) + a;
        c = rol(c + (a ^ (d | ~b)) + w[10] + k[54], 15) + d;
        b = rol(b + (d ^ (c | ~a)) + w[1] + k[55], 21) + c;
        a = rol(a + (c ^ (b | ~d)) + w[8] + k[56], 6) + b;
        d = rol(d + (b ^ (a | ~c)) + w[15] + k[57], 10) + a;
        c = rol(c + (a ^ (d | ~b)) + w[6] + k[58], 15) + d;
        b = rol(b + (d ^ (c | ~a)) + w[13] + k[59], 21) + c;
        a = rol(a + (c ^ (b | ~d)) + w[4] + k[60], 6) + b;
        d = rol(d + (b ^ (a | ~c)) + w[11] + k[61], 10) + a;
        c = rol(c + (a ^ (d | ~b)) + w[2] + k[62], 15) + d;
        b = rol(b + (d ^ (c | ~a)) + w[9] + k[63], 21) + c;
        
        a = (a + olda) | 0;
        b = (b + oldb) | 0;
        c = (c + oldc) | 0;
        d = (d + oldd) | 0;
    }
    
    function hex(n) {
        let s = "", j = 0;
        for (; j < 4; j++) {
            const byteVal = (n >> (j * 8)) & 0xFF;
            s += (byteVal >>> 4).toString(16) + (byteVal & 0x0F).toString(16);
        }
        return s;
    }
    
    return hex(a) + hex(b) + hex(c) + hex(d);
}

export class BlobPoolBuilder {
    constructor() {
        this.chunks = [];
        this.length = 0;
    }
    write(bytes) {
        this.chunks.push(bytes);
        const start = this.length;
        this.length += bytes.length;
        return start;
    }
    writeByte(b) {
        return this.write(new Uint8Array([b]));
    }
    writeUint32(val) {
        const buf = new Uint8Array(4);
        new DataView(buf.buffer).setUint32(0, val, true);
        return this.write(buf);
    }
    toArray() {
        const out = new Uint8Array(this.length);
        let off = 0;
        for (const chunk of this.chunks) {
            out.set(chunk, off);
            off += chunk.length;
        }
        return out;
    }
}

export function getTagInt(tag) {
    const padded = (tag + "    ").substring(0, 4);
    const bytes = new TextEncoder().encode(padded);
    return bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24);
}

export function getSubDataFast(dataBlock, tagInt) {
    let offset = 0;
    const view = new DataView(dataBlock.buffer, dataBlock.byteOffset, dataBlock.byteLength);
    while (offset + 6 <= dataBlock.length) {
        const currentTag = view.getUint32(offset, true);
        const subSize = view.getUint16(offset + 4, true);
        if (offset + 6 + subSize > dataBlock.length) break;
        if (currentTag === tagInt) {
            return dataBlock.slice(offset + 6, offset + 6 + subSize);
        }
        offset += 6 + subSize;
    }
    return null;
}

export function getRecordLabel(formID, stringCache = {}) {
    if (!formID) return "None";
    return "0x" + formID.toString(16).toUpperCase().padStart(8, '0');
}

export function escapeHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
