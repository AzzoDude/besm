// Vault-Tec Master File Database & Compiler - UI Controller Orchestrator

import { GridView } from './ui/grid_view.js';
import { CsvView } from './ui/csv_view.js';
import { ChronoView } from './ui/chrono_view.js';
import { StringsView } from './ui/strings_view.js';
import { SchemaView } from './ui/schema_view.js';
import { FileLoader } from './ui/file_loader.js';
import { EventBinder } from './ui/event_binder.js';
import { md5 } from './helpers.js';

export class UIController {
    constructor(store) {
        this.store = store;
        this.spatialView = null;

        // Instantiate specialized sub-views
        this.grid = new GridView(store, this);
        this.csv = new CsvView(store);
        this.chrono = new ChronoView(store);
        this.strings = new StringsView(store);
        this.schema = new SchemaView(store, this);
        this.loader = new FileLoader(store, this);
        this.binder = new EventBinder(store, this);
    }

    setSpatialView(spatialView) {
        this.spatialView = spatialView;
    }

    init() {
        this.binder.bind();
        this.schema.loadPreset('skyrim');

        // Listen for view mode changes to update UI elements
        this.store.subscribe((state, updates) => {
            if (updates.activeViewMode !== undefined) {
                this.updateViewModeActiveState(state.activeViewMode);
            }
        });
    }

    // Grid rows filtering & database pagination orchestration
    filterAndRenderDb() {
        const { loadedFileMode, activeSubsectorType, subsectors, activeCellFilter } = this.store.getState();
        if (loadedFileMode === "csv" || !activeSubsectorType || !subsectors[activeSubsectorType]) return;

        let rows = subsectors[activeSubsectorType];
        
        // 1. Spatial Cell filtering
        if (activeCellFilter) {
            rows = rows.filter(r => {
                if (r.X === undefined || r.Y === undefined) return false;
                const cx = Math.floor(r.X / 4096);
                const cy = Math.floor(r.Y / 4096);
                return cx === activeCellFilter.cx && cy === activeCellFilter.cy;
            });
        }

        // 2. Text Search filtering
        const q = document.getElementById('searchBox').value.toLowerCase().trim();
        const filteredSubsectorRows = q ? rows.filter(r => 
            Object.keys(r).some(k => 
                this.getRecordLabelStr(r[k]).toLowerCase().includes(q) || 
                String(r[k]).toLowerCase().includes(q)
            )
        ) : rows;

        this.store.update({ filteredSubsectorRows });

        // 3. Extract spatial details for the map
        this.extractSpatialList();

        this.grid.render();
        this.updateViewModeToolbarVisibility();
    }

    extractSpatialList() {
        const { activeSubsectorType, subsectors, activeViewMode } = this.store.getState();
        const allRows = subsectors[activeSubsectorType] || [];
        const q = document.getElementById('searchBox').value.toLowerCase().trim();
        
        const matched = q ? allRows.filter(r => 
            Object.keys(r).some(k => 
                this.getRecordLabelStr(r[k]).toLowerCase().includes(q) || 
                String(r[k]).toLowerCase().includes(q)
            )
        ) : allRows;

        const spatialRecords = matched.filter(r => r.X !== undefined && r.Y !== undefined);
        this.store.update({ spatialRecords });

        const badge = document.getElementById('spatial-count-badge');
        if (badge) {
            badge.textContent = `${spatialRecords.length} Objects`;
        }
        
        if (activeViewMode === "spatial" && this.spatialView) {
            this.spatialView.renderCellMatrixTable();
            this.spatialView.drawMap();
        }
    }

    getRecordLabelStr(val) {
        return (val && this.store.getState().stringCache[val]) 
            ? (this.store.getState().stringCache[val].edid || `0x${val.toString(16).toUpperCase()}`) 
            : String(val);
    }

    renderDbPage() {
        this.grid.render();
    }

    selectGridRow(globalIdx) {
        this.grid.selectRow(globalIdx);
    }

    changeDbPage(dir) {
        const { loadedFileMode, csvPage, dbPage } = this.store.getState();
        if (loadedFileMode === "csv") { 
            this.store.update({ csvPage: csvPage + dir });
            this.csv.render(); 
        } else { 
            this.store.update({ dbPage: dbPage + dir });
            this.grid.render(); 
        }
    }

    changeChronoPage(dir) {
        const { chronoPage } = this.store.getState();
        this.store.update({ chronoPage: chronoPage + dir });
        this.chrono.render();
    }

    changeStringsPage(dir) {
        const { stringsPage } = this.store.getState();
        this.store.update({ stringsPage: stringsPage + dir });
        this.strings.render();
    }

    filterAndRenderChrono() {
        this.chrono.filterAndRender();
    }

    filterAndRenderStrings() {
        this.strings.filterAndRender();
    }

    // Tabs Manager
    switchTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        
        const tabBtns = Array.from(document.querySelectorAll('.tab-btn'));
        const tabMap = {
            'database-view': 0,
            'chronology-view': 1,
            'schema-view': 2,
            'strings-view': 3,
            'how-it-works-view': 4
        };
        
        const targetIdx = tabMap[tabId];
        if (targetIdx !== undefined && tabBtns[targetIdx]) {
            tabBtns[targetIdx].classList.add('active');
        }
        
        const targetPanel = document.getElementById(tabId);
        if (targetPanel) targetPanel.classList.add('active');
        
        const { activeViewMode } = this.store.getState();
        if (tabId === 'database-view' && activeViewMode === 'spatial') {
            setTimeout(() => {
                if (this.spatialView) {
                    this.spatialView.resizeCanvas();
                    this.spatialView.drawMap();
                }
            }, 50);
        }
    }

    // View Modes
    setViewMode(mode) {
        this.store.update({ activeViewMode: mode });

        const defaultGrid = document.getElementById('default-grid-container');
        const spatialGrid = document.getElementById('spatial-grid-container');
        const dbFooter = document.getElementById('db-footer');

        if (mode === 'default') {
            defaultGrid.style.display = 'block';
            spatialGrid.style.display = 'none';
            dbFooter.style.display = 'flex';
        } else {
            defaultGrid.style.display = 'none';
            spatialGrid.style.display = 'flex';
            dbFooter.style.display = 'none';
            
            setTimeout(() => {
                if (this.spatialView) {
                    this.spatialView.resizeCanvas();
                    const { selectedSpatialRecord } = this.store.getState();
                    if (selectedSpatialRecord && selectedSpatialRecord.X !== undefined && selectedSpatialRecord.Y !== undefined) {
                        const canvas = this.spatialView.canvas;
                        const scale = 0.05;
                        const offsetX = canvas.width / 2 - selectedSpatialRecord.X * scale;
                        const offsetY = canvas.height / 2 - (-selectedSpatialRecord.Y) * scale;
                        this.store.update({ scale, offsetX, offsetY });
                    } else {
                        this.spatialView.zoomToFit();
                    }
                    this.spatialView.renderCellMatrixTable();
                    this.spatialView.drawMap();
                }
            }, 50);
        }
    }

    updateViewModeActiveState(mode) {
        const btnDefault = document.getElementById('view-btn-default');
        const btnSpatial = document.getElementById('view-btn-spatial');
        if (btnDefault) btnDefault.classList.toggle('active', mode === 'default');
        if (btnSpatial) btnSpatial.classList.toggle('active', mode === 'spatial');
    }

    subsectorHasSpatialData() {
        const { loadedFileMode, activeSubsectorType, subsectors, schemas } = this.store.getState();
        if (loadedFileMode === "csv") return false;
        if (!activeSubsectorType || !subsectors[activeSubsectorType]) return false;
        const schema = schemas[activeSubsectorType];
        if (!schema) return false;
        return schema.columns.some(c => c.name === 'X') && schema.columns.some(c => c.name === 'Y');
    }

    updateViewModeToolbarVisibility() {
        const toolbar = document.getElementById('viewModeBar');
        if (!toolbar) return;
        if (this.subsectorHasSpatialData()) {
            toolbar.style.display = 'flex';
        } else {
            toolbar.style.display = 'none';
            this.setViewMode('default');
        }
    }

    // Schema Actions Delegation
    loadSchemaPreset(preset) { this.schema.loadPreset(preset); }
    syncEditorScroll() { this.schema.syncScroll(); }
    updateSchemaHighlight() { this.schema.updateHighlight(); }
    applyCustomSchema() { this.schema.applyCustomSchema(); }
    formatSchemaInEditor() { this.schema.formatInEditor(); }

    // Reconstruct Master File
    rebuildMasterFile() {
        const { decompRc, loadedRecords, originalFileName, rawFileBytes } = this.store.getState();
        if (!decompRc || loadedRecords.length === 0) return;
        
        try {
            const total = loadedRecords.reduce((acc, r) => acc + 24 + r.bodyLen, 0);
            const outBytes = new Uint8Array(total);
            let off = 0;
            for (const r of loadedRecords) {
                outBytes.set(r.headerBytes, off);
                off += 24;
                if (r.bodyLen > 0) {
                    outBytes.set(decompRc.subarray(r.bodyOffset, r.bodyOffset + r.bodyLen), off);
                    off += r.bodyLen;
                }
            }
            
            let ext = ".esm";
            if (originalFileName.toLowerCase().endsWith('.besp')) ext = ".esp";
            else if (originalFileName.toLowerCase().endsWith('.besl')) ext = ".esl";
            const outName = originalFileName.replace(/\.bes[m|p|l]$/i, '') + ext;
            
            const blob = new Blob([outBytes], { type: "application/octet-stream" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = outName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            const rebuiltMd5 = md5(outBytes).toUpperCase();
            if (rawFileBytes) {
                const originalMd5 = md5(rawFileBytes).toUpperCase();
                if (originalMd5 === rebuiltMd5) {
                    document.getElementById('status').innerHTML = "Rebuilt & saved " + outName + "<br><span style='color: #a8ffb2; font-weight: bold;'>✔ 1:1 MD5 MATCH: " + rebuiltMd5 + "</span>";
                } else {
                    document.getElementById('status').innerHTML = "Rebuilt & saved " + outName + "<br><span style='color: #ff8b8b; font-weight: bold;'>✘ MD5 MISMATCH!<br>Original: " + originalMd5 + "<br>Rebuilt: " + rebuiltMd5 + "</span>";
                }
            } else {
                document.getElementById('status').innerHTML = "Rebuilt & saved " + outName + "<br><span style='color: #e2e2e2; font-weight: bold;'>Rebuilt MD5: " + rebuiltMd5 + "</span>";
            }
        } catch (err) {
            console.error(err);
            document.getElementById('status').innerText = "Rebuild failed: " + err.message;
        }
    }
}
