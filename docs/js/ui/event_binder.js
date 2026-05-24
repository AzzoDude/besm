// Vault-Tec Master File Database & Compiler - DOM Events Binder

import { compileEsmToBesm } from '../compiler.js';

export class EventBinder {
    constructor(store, uiController) {
        this.store = store;
        this.ui = uiController;
    }

    bind() {
        // File selection trigger
        document.getElementById('fileInput').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            this.store.update({ originalFileName: file.name });
            const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
            document.getElementById('status').innerText = "Loading " + file.name + "...";

            document.getElementById('subsectorSelect').style.display = 'none';
            document.getElementById('rebuildBtn').style.display = 'none';
            document.getElementById('gamePresetSelect').style.display = 'none';
            document.getElementById('compileBtn').style.display = 'none';

            if (ext === '.csv') {
                this.ui.csv.load(file);
            } else if (ext === '.besm' || ext === '.besp' || ext === '.besl') {
                await this.ui.loader.loadBinary(file);
            } else if (ext === '.esm' || ext === '.esp' || ext === '.esl') {
                this.ui.loader.loadRaw(file);
            } else {
                document.getElementById('status').innerText = "Unsupported file type";
            }
        });

        // Game preset select trigger
        document.getElementById('gamePresetSelect').addEventListener('change', (e) => {
            this.ui.schema.loadPreset(e.target.value);
        });

        // Compile raw ESM/ESP file trigger
        document.getElementById('compileBtn').addEventListener('click', async () => {
            const { rawFileBytes, originalFileName } = this.store.getState();
            if (!rawFileBytes) return;
            
            const preset = document.getElementById('gamePresetSelect').value;
            const activeSchemaStr = document.getElementById('schemaTextarea').value;
            
            document.getElementById('status').innerText = "Compiling to binary format...";
            
            try {
                const { finalBytes } = await compileEsmToBesm(rawFileBytes, preset, activeSchemaStr);
                
                const ext = originalFileName.substring(originalFileName.lastIndexOf('.')).toLowerCase();
                const targetExt = ext === '.esp' ? '.besp' : (ext === '.esl' ? '.besl' : '.besm');
                const outName = originalFileName.substring(0, originalFileName.lastIndexOf('.')) + targetExt;
                
                const blob = new Blob([finalBytes], { type: "application/octet-stream" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = outName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                document.getElementById('status').innerText = "Compiled & downloaded " + outName;
                
                this.store.update({ originalFileName: outName });
                await this.ui.loader.loadBinaryBytes(finalBytes.buffer);
            } catch (err) {
                console.error(err);
                document.getElementById('status').innerText = "Compilation failed: " + err.message;
            }
        });

        // Subsector dropdown selector trigger
        document.getElementById('subsectorSelect').addEventListener('change', (e) => {
            this.store.update({
                activeSubsectorType: e.target.value,
                dbPage: 0
            });
            this.ui.filterAndRenderDb();
        });

        // Global search box input filtering trigger
        document.getElementById('searchBox').addEventListener('input', () => {
            this.store.update({
                dbPage: 0,
                chronoPage: 0,
                stringsPage: 0,
                csvPage: 0
            });
            const { loadedFileMode } = this.store.getState();
            if (loadedFileMode === "csv") {
                this.ui.csv.filterAndRender();
            } else {
                this.ui.filterAndRenderDb();
                this.ui.chrono.filterAndRender();
                this.ui.strings.filterAndRender();
            }
        });

        // Reconstruct raw master file trigger
        document.getElementById('rebuildBtn').addEventListener('click', () => {
            this.ui.rebuildMasterFile();
        });
    }
}
