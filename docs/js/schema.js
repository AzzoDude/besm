// Vault-Tec Master File Database & Compiler - Schema Engine

import { getTagInt, escapeHtml } from './helpers.js';

export function formatSchemaForTextarea(schemaStr) {
    if (schemaStr.includes('[') && schemaStr.includes(']')) {
        return schemaStr.trim();
    }
    return schemaStr.split(';').map(s => {
        const cleaned = s.trim();
        if (!cleaned) return "";
        const parts = cleaned.split('|');
        if (parts.length < 2) return cleaned;
        
        const header = parts[0].trim();
        const cols = parts[1].split(',').map(c => "  " + c.trim()).join('\n');
        return `[${header}]\n${cols}`;
    }).filter(s => s).join('\n\n');
}

export function parseSchema(schemaStr) {
    const list = {};
    if (schemaStr.includes('[') && schemaStr.includes(']')) {
        const regex = /\[([A-Z_0-9]{4})\:?(\d*)\]([^\[]*)/gi;
        let match;
        while ((match = regex.exec(schemaStr)) !== null) {
            const sig = match[1].trim();
            const explicitRowSize = match[2] ? parseInt(match[2]) : null;
            const blockText = match[3];
            
            const s = { recordType: sig, rowSize: explicitRowSize || 0, columns: [] };
            const items = blockText.split(/[\n,\r;]+/);
            let currentOffset = 0;
            
            for (const item of items) {
                const cleaned = item.trim();
                if (!cleaned) continue;
                const cp = cleaned.split(':');
                if (cp.length === 4) {
                    const name = cp[0].trim();
                    const type = cp[1].trim();
                    const srcTag = cp[2].trim();
                    const srcOffset = cp[3].trim();
                    
                    const typeLower = type.toLowerCase();
                    let size = 4;
                    if (typeLower === "uint16" || typeLower === "int16" || typeLower === "short") {
                        size = 2;
                    } else if (typeLower === "uint8" || typeLower === "int8" || typeLower === "byte" || typeLower === "char") {
                        size = 1;
                    }
                    
                    s.columns.push({
                        name: name,
                        type: type,
                        offset: currentOffset,
                        srcTag: srcTag,
                        srcOffset: srcOffset
                    });
                    currentOffset += size;
                } else if (cp.length >= 5) {
                    const name = cp[0].trim();
                    const type = cp[1].trim();
                    const offset = parseInt(cp[2]);
                    const srcTag = cp[3].trim();
                    const srcOffset = cp[4].trim();
                    
                    s.columns.push({
                        name: name,
                        type: type,
                        offset: offset,
                        srcTag: srcTag,
                        srcOffset: srcOffset
                    });
                    
                    const typeLower = type.toLowerCase();
                    let size = 4;
                    if (typeLower === "uint16" || typeLower === "int16" || typeLower === "short") {
                        size = 2;
                    } else if (typeLower === "uint8" || typeLower === "int8" || typeLower === "byte" || typeLower === "char") {
                        size = 1;
                    }
                    currentOffset = offset + size;
                }
            }
            if (!s.rowSize) {
                s.rowSize = currentOffset;
            }
            list[sig] = s;
        }
    } else {
        for (const t of schemaStr.split(';')) {
            const cleaned = t.trim();
            if (!cleaned) continue;
            const p = cleaned.split('|'), h = p[0].split(':');
            const s = { recordType: h[0].trim(), rowSize: parseInt(h[1]), columns: [] };
            if (p[1]) {
                for (const c of p[1].split(',')) {
                    const cp = c.trim().split(':');
                    if (cp.length >= 5) {
                        s.columns.push({
                            name: cp[0].trim(),
                            type: cp[1].trim(),
                            offset: parseInt(cp[2]),
                            srcTag: cp[3].trim(),
                            srcOffset: cp[4].trim()
                        });
                    }
                }
            }
            list[h[0].trim()] = s;
        }
    }
    return list;
}

export function parseSchemaForCompile(schemaStr) {
    const list = {};
    
    if (schemaStr.includes('[') && schemaStr.includes(']')) {
        const regex = /\[([A-Z_0-9]{4})\:?(\d*)\]([^\[]*)/gi;
        let match;
        while ((match = regex.exec(schemaStr)) !== null) {
            const sig = match[1].trim();
            const explicitRowSize = match[2] ? parseInt(match[2]) : null;
            const blockText = match[3];
            
            const s = { recordType: sig, rowSize: explicitRowSize || 0, columns: [] };
            const items = blockText.split(/[\n,\r;]+/);
            let currentOffset = 0;
            
            for (const item of items) {
                const cleaned = item.trim();
                if (!cleaned) continue;
                const cp = cleaned.split(':');
                
                if (cp.length === 4) {
                    const name = cp[0].trim();
                    const type = cp[1].trim();
                    const tag = cp[2].trim();
                    const srcOffset = cp[3].trim();
                    let tagInt = 0;
                    if (tag.length > 0 && tag !== "HeaderFormID" && tag !== "HeaderFlags" && tag !== "BlobOffset" && tag !== "StringIndex") {
                        tagInt = getTagInt(tag);
                    }
                    
                    const typeLower = type.toLowerCase();
                    let size = 4;
                    if (typeLower === "uint16" || typeLower === "int16" || typeLower === "short") {
                        size = 2;
                    } else if (typeLower === "uint8" || typeLower === "int8" || typeLower === "byte" || typeLower === "char") {
                        size = 1;
                    }
                    
                    s.columns.push({
                        name: name,
                        type: type,
                        offset: currentOffset,
                        srcTag: tag,
                        srcTagInt: tagInt,
                        srcOffset: srcOffset
                    });
                    currentOffset += size;
                } else if (cp.length >= 5) {
                    const name = cp[0].trim();
                    const type = cp[1].trim();
                    const offset = parseInt(cp[2]);
                    const tag = cp[3].trim();
                    const srcOffset = cp[4].trim();
                    let tagInt = 0;
                    if (tag.length > 0 && tag !== "HeaderFormID" && tag !== "HeaderFlags" && tag !== "BlobOffset" && tag !== "StringIndex") {
                        tagInt = getTagInt(tag);
                    }
                    
                    s.columns.push({
                        name: name,
                        type: type,
                        offset: offset,
                        srcTag: tag,
                        srcTagInt: tagInt,
                        srcOffset: srcOffset
                    });
                    
                    const typeLower = type.toLowerCase();
                    let size = 4;
                    if (typeLower === "uint16" || typeLower === "int16" || typeLower === "short") {
                        size = 2;
                    } else if (typeLower === "uint8" || typeLower === "int8" || typeLower === "byte" || typeLower === "char") {
                        size = 1;
                    }
                    currentOffset = offset + size;
                }
            }
            if (!s.rowSize) {
                s.rowSize = currentOffset;
            }
            list[sig] = s;
        }
    } else {
        for (const t of schemaStr.split(';')) {
            const cleaned = t.trim();
            if (!cleaned) continue;
            const p = cleaned.split('|'), h = p[0].split(':');
            const s = { recordType: h[0].trim(), rowSize: parseInt(h[1]), columns: [] };
            if (p[1]) {
                for (const c of p[1].split(',')) {
                    const cp = c.trim().split(':');
                    if (cp.length >= 5) {
                        const name = cp[0].trim();
                        const type = cp[1].trim();
                        const offset = parseInt(cp[2]);
                        const tag = cp[3].trim();
                        const srcOffset = cp[4].trim();
                        let tagInt = 0;
                        if (tag.length > 0 && tag !== "HeaderFormID" && tag !== "HeaderFlags" && tag !== "BlobOffset" && tag !== "StringIndex") {
                            tagInt = getTagInt(tag);
                        }
                        s.columns.push({
                            name: name,
                            type: type,
                            offset: offset,
                            srcTag: tag,
                            srcTagInt: tagInt,
                            srcOffset: srcOffset
                        });
                    }
                }
            }
            list[h[0].trim()] = s;
        }
    }
    return list;
}

export function formatAndComputeSchemaText(schemaStr) {
    const parsed = parseSchema(schemaStr);
    let output = "";
    for (const [sig, s] of Object.entries(parsed)) {
        output += `[${sig}:${s.rowSize}]\n`;
        for (const col of s.columns) {
            output += `  ${col.name}:${col.type}:${col.offset}:${col.srcTag}:${col.srcOffset}\n`;
        }
        output += "\n";
    }
    return output.trim();
}

export function highlightSchemaText(text) {
    let html = escapeHtml(text);
    
    // 1. Highlight 5-part field mapping: Name:Type:Offset:Tag:SrcOffset
    html = html.replace(/([a-zA-Z0-9_]+)\s*\:\s*(UInt[0-9]+|Float|Int[0-9]+|short|byte|char|int)\s*\:\s*(\d+)\s*\:\s*([a-zA-Z0-9_]+)\s*\:\s*([a-zA-Z0-9_]+)/gi, 
        '<span class="hl-col">$1</span>:<span class="hl-type">$2</span>:<span class="hl-num">$3</span>:<span class="hl-tag">$4</span>:<span class="hl-num">$5</span>');
        
    // 2. Highlight 4-part field mapping: Name:Type:Tag:SrcOffset
    html = html.replace(/(?<!span class="hl-col">)(?<!:)([a-zA-Z0-9_]+)\s*\:\s*(UInt[0-9]+|Float|Int[0-9]+|short|byte|char|int)\s*\:\s*([a-zA-Z0-9_]+)\s*\:\s*([a-zA-Z0-9_]+)/gi,
        '<span class="hl-col">$1</span>:<span class="hl-type">$2</span>:<span class="hl-tag">$3</span>:<span class="hl-num">$4</span>');

    // 3. Highlight TOML-style headers: [REFR:44] or [REFR]
    html = html.replace(/\[([A-Z_0-9]{4})(?:(\s*\:\s*)(\d+))?\]/gi, (m, sig, sep, num) => {
        let res = `<span class="hl-pipe">[</span><span class="hl-sig">${sig}</span>`;
        if (sep && num) {
            res += `${sep}<span class="hl-num">${num}</span>`;
        }
        res += `<span class="hl-pipe">]</span>`;
        return res;
    });

    // 4. Highlight Legacy Signature headers: REFR:44|
    html = html.replace(/([A-Z_0-9]{4})(\s*\:\s*)(\d+)(\s*\|)/gi, 
        '<span class="hl-sig">$1</span>$2<span class="hl-num">$3</span><span class="hl-pipe">$4</span>');

    // 5. Highlight Commas and Semicolons
    html = html.replace(/,/g, '<span class="hl-comma">,</span>');
    html = html.replace(/;/g, '<span class="hl-semi">;</span>');
    
    return html;
}
