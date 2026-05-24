// Vault-Tec Master File Database & Compiler - Schema Editor Actions & View

import { 
    formatSchemaForTextarea, 
    parseSchema, 
    formatAndComputeSchemaText, 
    highlightSchemaText 
} from '../schema.js';
import { skyrimSchemaStr, fallout4SchemaStr } from '../record_types.js';

export class SchemaView {
    constructor(store, uiController) {
        this.store = store;
        this.uiController = uiController;
    }

    loadPreset(preset) {
        const textarea = document.getElementById('schemaTextarea');
        if (!textarea) return;
        
        if (preset === 'skyrim') {
            textarea.value = formatSchemaForTextarea(skyrimSchemaStr);
        } else if (preset === 'fallout4') {
            textarea.value = formatSchemaForTextarea(fallout4SchemaStr);
        }
        
        const schemas = parseSchema(textarea.value);
        this.store.update({ schemas });
        this.updateHighlight();

        // Keep dropdown selectors synchronized in both places
        const gameSelect = document.getElementById('gamePresetSelect');
        if (gameSelect) gameSelect.value = preset;

        const schemaSelect = document.getElementById('schemaPresetSelect');
        if (schemaSelect) schemaSelect.value = preset;
    }

    syncScroll() {
        const textarea = document.getElementById('schemaTextarea');
        const backdrop = document.getElementById('schemaHighlightBackdrop');
        if (textarea && backdrop) {
            backdrop.scrollTop = textarea.scrollTop;
            backdrop.scrollLeft = textarea.scrollLeft;
        }
    }

    updateHighlight() {
        const textarea = document.getElementById('schemaTextarea');
        const backdrop = document.getElementById('schemaHighlightBackdrop');
        if (textarea && backdrop) {
            backdrop.innerHTML = highlightSchemaText(textarea.value);
        }
    }

    applyCustomSchema() {
        const val = document.getElementById('schemaTextarea').value;
        const { rawSectorBytesCache } = this.store.getState();
        try {
            const schemas = parseSchema(val);
            this.store.update({ schemas });
            this.updateHighlight();
            
            if (Object.keys(rawSectorBytesCache).length > 0) {
                this.parseAllSubsectorsFromCache();
                this.uiController.filterAndRenderDb();
                document.getElementById('status').innerText = "Schema applied to active data successfully.";
            } else {
                document.getElementById('status').innerText = "Schema applied successfully. Load a file to view.";
            }
        } catch (err) {
            console.error(err);
            document.getElementById('status').innerText = "Failed to apply schema: " + err.message;
        }
    }

    formatInEditor() {
        const textarea = document.getElementById('schemaTextarea');
        if (textarea) {
            const currentText = textarea.value;
            try {
                const formatted = formatAndComputeSchemaText(currentText);
                textarea.value = formatted;
                this.updateHighlight();
                document.getElementById('status').innerText = "Schema calculated and formatted successfully.";
            } catch (err) {
                document.getElementById('status').innerText = "Format error: " + err.message;
            }
        }
    }

    parseAllSubsectorsFromCache() {
        const { rawSectorBytesCache, schemas } = this.store.getState();
        const subsectors = {};
        for (const [sig, cache] of Object.entries(rawSectorBytesCache)) {
            const schema = schemas[sig] || { rowSize: cache.rowSize, columns: [
                { name: "FormID", type: "int", offset: 0 },
                { name: "Flags", type: "int", offset: 4 },
                { name: "BlobOffset", type: "int", offset: 8 }
            ] };
            
            const secView = new DataView(cache.rawSec.buffer, cache.rawSec.byteOffset, cache.rawSec.byteLength);
            const items = [];
            for (let r = 0; r < cache.rowCount; r++) {
                const rOff = r * schema.rowSize;
                const item = {};
                for (const col of schema.columns) {
                    if (rOff + col.offset + 4 <= cache.rawSec.length) {
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
        }
        this.store.update({ subsectors });
    }
}
