// Vault-Tec Master File Database & Compiler - File Importers & Binary Unpacker

import { decompressDeflateRaw, md5 } from '../helpers.js';
import { parseSchema } from '../schema.js';
import { parseStringTable, parseReconstruction } from '../compiler.js';
import { formatSchemaForTextarea } from '../schema.js';

export class FileLoader {
    constructor(store, uiController) {
        this.store = store;
        this.uiController = uiController;
    }

    loadRaw(file) {
        this.store.update({ loadedFileMode: "raw" });
        const reader = new FileReader();
        reader.onload = (evt) => {
            const rawFileBytes = new Uint8Array(evt.target.result);
            this.store.update({ rawFileBytes });
            
            const presetSelect = document.getElementById('gamePresetSelect');
            const compileBtn = document.getElementById('compileBtn');
            presetSelect.style.display = 'inline-block';
            compileBtn.style.display = 'inline-block';
            
            const nameLower = file.name.toLowerCase();
            if (nameLower.includes('skyrim') || nameLower.includes('ccbg')) {
                presetSelect.value = "skyrim";
            } else {
                presetSelect.value = "fallout4";
            }
            
            const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
            const targetExt = ext === '.esp' ? '.besp' : (ext === '.esl' ? '.besl' : '.besm');
            compileBtn.textContent = "Compile to " + targetExt.toUpperCase();
            
            const fileMd5 = md5(rawFileBytes).toUpperCase();
            document.getElementById('status').innerText = "Loaded raw file. MD5: " + fileMd5 + ". Select preset & compile.";
        };
        reader.readAsArrayBuffer(file);
    }

    async loadBinary(file) {
        const reader = new FileReader();
        reader.onload = async (evt) => {
            await this.loadBinaryBytes(evt.target.result);
        };
        reader.readAsArrayBuffer(file);
    }

    async loadBinaryBytes(buf) {
        this.store.update({
            loadedFileMode: "besm",
            rawSectorBytesCache: {}
        });
        
        document.getElementById('rebuildBtn').style.display = 'inline-block';
        document.getElementById('subsectorSelect').style.display = 'inline-block';
        document.getElementById('gamePresetSelect').style.display = 'none';
        document.getElementById('compileBtn').style.display = 'none';
        
        try {
            const view = new DataView(buf);
            const bytes = new Uint8Array(buf);
            const sig = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
            if (sig !== 'BESM' && sig !== 'BES\0' && sig !== 'BES ') {
                document.getElementById('status').innerText = "Corrupt file header";
                return;
            }
            
            const ver = view.getUint32(4, true);
            const secCount = view.getUint32(8, true);
            
            const bOff = Number(view.getBigUint64(12, true));
            const bCS = Number(view.getBigUint64(20, true));
            const bUS = Number(view.getBigUint64(28, true));
            
            const bsOff = Number(view.getBigUint64(36, true));
            const bsCS = Number(view.getBigUint64(44, true));
            const bsUS = Number(view.getBigUint64(52, true));
            
            const scOff = Number(view.getBigUint64(60, true));
            const scCS = Number(view.getBigUint64(68, true));
            const scUS = Number(view.getBigUint64(76, true));
            
            const rcOff = Number(view.getBigUint64(84, true));
            const rcCS = Number(view.getBigUint64(92, true));
            const rcUS = Number(view.getBigUint64(100, true));
            
            const bPool = await decompressDeflateRaw(bytes.slice(bOff, bOff + bCS));
            const stringCache = parseStringTable(await decompressDeflateRaw(bytes.slice(bsOff, bsOff + bsCS)));
            this.store.update({ stringCache });
            
            let schemas = this.store.getState().schemas;
            if (scOff > 0) {
                const schemaStr = new TextDecoder().decode(await decompressDeflateRaw(bytes.slice(scOff, scOff + scCS)));
                schemas = parseSchema(schemaStr);
                this.store.update({ schemas });
                
                const textarea = document.getElementById('schemaTextarea');
                if (textarea) {
                    textarea.value = formatSchemaForTextarea(schemaStr);
                    this.uiController.schema.updateHighlight();
                }
            }
            
            let decompRc = null;
            let loadedRecords = [];
            if (rcOff > 0) {
                decompRc = await decompressDeflateRaw(bytes.slice(rcOff, rcOff + rcCS));
                loadedRecords = parseReconstruction(decompRc);
                this.store.update({ decompRc, loadedRecords });
            }
            
            const sStart = 12 + 96;
            const select = document.getElementById('subsectorSelect');
            select.innerHTML = '';
            
            const subsectors = {};
            const rawSectorBytesCache = {};
            
            const optionsList = [];
            
            for (let i = 0; i < secCount; i++) {
                const off = sStart + i * 40;
                const sig = String.fromCharCode(...bytes.slice(off, off + 4)).trim();
                const rowSize = view.getUint32(off + 4, true);
                const rowCount = view.getUint32(off + 8, true);
                const sOffset = Number(view.getBigUint64(off + 12, true));
                const sCompSize = Number(view.getBigUint64(off + 20, true));
                
                const rawSec = await decompressDeflateRaw(bytes.slice(sOffset, sOffset + sCompSize));
                rawSectorBytesCache[sig] = { rawSec, rowSize, rowCount };
                
                const schema = schemas[sig] || { rowSize, columns: [
                    { name: "FormID", type: "int", offset: 0 },
                    { name: "Flags", type: "int", offset: 4 },
                    { name: "BlobOffset", type: "int", offset: 8 }
                ] };
                
                const secView = new DataView(rawSec.buffer, rawSec.byteOffset, rawSec.byteLength);
                const items = [];
                for (let r = 0; r < rowCount; r++) {
                    const rOff = r * schema.rowSize;
                    const item = {};
                    for (const col of schema.columns) {
                        if (rOff + col.offset + 4 <= rawSec.length) {
                            if (col.type.toLowerCase() === "float") {
                                item[col.name] = secView.getFloat32(rOff + col.offset, true);
                            } else {
                                item[col.name] = secView.getUint32(rOff + col.offset, true);
                            }
                        } else {
                            item[col.name] = 0;
                        }
                    }
                    items.push(item);
                }
                
                subsectors[sig] = items;
                optionsList.push({ sig, rowCount });
            }
            
            optionsList.sort((a, b) => a.sig.localeCompare(b.sig));
            for (const optInfo of optionsList) {
                const opt = document.createElement('option');
                opt.value = optInfo.sig;
                opt.textContent = optInfo.sig + " (" + optInfo.rowCount + ")";
                select.appendChild(opt);
            }
            
            let activeSubsectorType = "";
            if (secCount > 0 && optionsList.length > 0) {
                select.value = optionsList[0].sig;
                activeSubsectorType = select.value;
            }
            
            this.store.update({
                subsectors,
                rawSectorBytesCache,
                activeSubsectorType,
                dbPage: 0,
                chronoPage: 0,
                stringsPage: 0
            });
            
            this.uiController.filterAndRenderDb();
            this.uiController.filterAndRenderChrono();
            this.uiController.filterAndRenderStrings();
            
            document.getElementById('status').innerText = "Loaded binary file";
            
            if (this.store.getState().activeViewMode === "spatial" && this.uiController.spatialView) {
                this.uiController.spatialView.zoomToFit();
            }
            
        } catch (err) {
            console.error(err);
            document.getElementById('status').innerText = "Parse error: " + err.message;
        }
    }
}
