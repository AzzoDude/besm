// Vault-Tec Master File Database & Compiler - 2D Spatial View Engine (Modular)

import { CanvasRenderer } from './spatial/canvas_renderer.js';
import { CellMatrix } from './spatial/cell_matrix.js';
import { RecordInspector } from './spatial/inspector.js';
import { InteractionHandler } from './spatial/interaction_handler.js';

export class SpatialView {
    constructor(store, uiController) {
        this.store = store;
        this.uiController = uiController;
        this.canvas = null;
        this.ctx = null;
        
        // Instantiate sub-renderers and input handlers
        this.renderer = new CanvasRenderer(store, this);
        this.matrix = new CellMatrix(store);
        this.inspector = new RecordInspector(store);
        this.interaction = new InteractionHandler(store, this);
        
        this.handleResize = this.resizeCanvas.bind(this);
    }

    init() {
        this.canvas = document.getElementById('spatial-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        this.interaction.setup(this.canvas);
        this.setupSpatialControls();
        this.resizeCanvas();

        window.addEventListener('resize', this.handleResize);

        // Subscribe to store updates to trigger redrawing
        this.store.subscribe((state, updates) => {
            if (state.activeViewMode === "spatial") {
                const needsDraw = 
                    updates.spatialRecords || 
                    updates.selectedSpatialRecord !== undefined || 
                    updates.activeCellFilter !== undefined || 
                    updates.scale !== undefined || 
                    updates.offsetX !== undefined || 
                    updates.offsetY !== undefined ||
                    updates.hoverSpatialRecord !== undefined;
                
                if (needsDraw) {
                    this.drawMap();
                }
                
                if (updates.spatialRecords || updates.activeCellFilter !== undefined) {
                    this.renderCellMatrixTable();
                }
                
                if (updates.selectedSpatialRecord !== undefined) {
                    this.inspectRecord(state.selectedSpatialRecord);
                }
            }
        });
    }

    setupSpatialControls() {
        document.getElementById('btn-fit').addEventListener('click', () => this.zoomToFit());
        document.getElementById('btn-zin').addEventListener('click', () => this.adjustZoom(1.3));
        document.getElementById('btn-zout').addEventListener('click', () => this.adjustZoom(1 / 1.3));
        document.getElementById('btn-clear-cell').addEventListener('click', () => this.clearCellFilter());
    }

    adjustZoom(factor) {
        const canvas = this.canvas;
        if (!canvas) return;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const worldPt = this.screenToWorld(cx, cy);

        let newScale = this.store.getState().scale * factor;
        newScale = Math.max(0.00005, Math.min(1.0, newScale));

        const newOffsetX = cx - worldPt.x * newScale;
        const newOffsetY = cy - (-worldPt.y) * newScale;

        this.store.update({
            scale: newScale,
            offsetX: newOffsetX,
            offsetY: newOffsetY
        });
    }

    resizeCanvas() {
        const canvas = this.canvas;
        if (!canvas) return;
        const parent = canvas.parentElement;
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        this.drawMap();
    }

    screenToWorld(sx, sy) {
        const { offsetX, offsetY, scale } = this.store.getState();
        return {
            x: (sx - offsetX) / scale,
            y: -(sy - offsetY) / scale
        };
    }

    worldToScreen(wx, wy) {
        const { offsetX, offsetY, scale } = this.store.getState();
        return {
            x: wx * scale + offsetX,
            y: -wy * scale + offsetY
        };
    }

    findClosestRecord(wx, wy, threshold) {
        const { spatialRecords } = this.store.getState();
        let closest = null;
        let minDist = threshold;
        for (const r of spatialRecords) {
            const dist = Math.hypot(r.X - wx, r.Y - wy);
            if (dist < minDist) {
                minDist = dist;
                closest = r;
            }
        }
        return closest;
    }

    zoomToFit() {
        const canvas = this.canvas;
        const { spatialRecords } = this.store.getState();
        if (!canvas || spatialRecords.length === 0) return;

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        for (const r of spatialRecords) {
            if (r.X < minX) minX = r.X;
            if (r.X > maxX) maxX = r.X;
            if (r.Y < minY) minY = r.Y;
            if (r.Y > maxY) maxY = r.Y;
        }

        if (minX === Infinity) return;

        const width = canvas.width;
        const height = canvas.height;

        const spanX = Math.max(1000, maxX - minX);
        const spanY = Math.max(1000, maxY - minY);
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        let newScale = Math.min(width / spanX, height / spanY) * 0.85;
        newScale = Math.max(0.00005, Math.min(1.0, newScale));

        const newOffsetX = width / 2 - centerX * newScale;
        const newOffsetY = height / 2 - (-centerY) * newScale;

        this.store.update({
            scale: newScale,
            offsetX: newOffsetX,
            offsetY: newOffsetY
        });
    }

    drawMap() {
        this.renderer.drawMap(this.canvas, this.ctx);
    }

    inspectRecord(record) {
        const container = document.getElementById('inspector-content');
        this.inspector.render(container, record);
    }

    renderCellMatrixTable() {
        const container = document.getElementById('cell-matrix-container');
        this.matrix.render(container);
    }

    selectSpatialObject(record) {
        const { filteredSubsectorRows, pageSize } = this.store.getState();
        this.store.update({ selectedSpatialRecord: record });

        const index = filteredSubsectorRows.findIndex(r => r.FormID === record.FormID);
        if (index >= 0) {
            const page = Math.floor(index / pageSize);
            this.store.update({ dbPage: page });
            this.uiController.renderDbPage();

            setTimeout(() => {
                const targetRow = document.getElementById(`db-row-${index}`);
                if (targetRow) {
                    targetRow.scrollIntoView({ block: 'nearest' });
                    document.querySelectorAll('#db-body tr').forEach(tr => tr.classList.remove('row-selected'));
                    targetRow.classList.add('row-selected');
                }
            }, 10);
        }

        const cx = Math.floor(record.X / 4096);
        const cy = Math.floor(record.Y / 4096);
        document.querySelectorAll('.cell-matrix-table td').forEach(td => td.classList.remove('cell-active'));
        const cellEl = document.querySelector(`.cell-matrix-table td[data-cx="${cx}"][data-cy="${cy}"]`);
        if (cellEl) {
            cellEl.classList.add('cell-active');
            cellEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
    }

    toggleCellFilter(cx, cy) {
        const { activeCellFilter } = this.store.getState();
        if (activeCellFilter && activeCellFilter.cx === cx && activeCellFilter.cy === cy) {
            this.clearCellFilter();
            return;
        }

        this.store.update({
            activeCellFilter: { cx, cy },
            dbPage: 0
        });
        
        const btnClear = document.getElementById('btn-clear-cell');
        if (btnClear) btnClear.style.display = 'inline-block';

        document.querySelectorAll('.cell-matrix-table td').forEach(td => td.classList.remove('cell-active'));
        const tdEl = document.querySelector(`.cell-matrix-table td[data-cx="${cx}"][data-cy="${cy}"]`);
        if (tdEl) tdEl.classList.add('cell-active');

        this.uiController.filterAndRenderDb();

        const cellSize = 4096;
        const canvas = this.canvas;
        if (canvas) {
            const scaleVal = canvas.height / (cellSize * 2.5);
            const finalScale = Math.max(0.00005, Math.min(1.0, scaleVal));
            this.store.update({
                scale: finalScale,
                offsetX: canvas.width / 2 - (cx + 0.5) * cellSize * finalScale,
                offsetY: canvas.height / 2 - (-(cy + 0.5) * cellSize) * finalScale
            });
        }
    }

    clearCellFilter() {
        this.store.update({
            activeCellFilter: null,
            dbPage: 0
        });
        
        const btnClear = document.getElementById('btn-clear-cell');
        if (btnClear) btnClear.style.display = 'none';
        
        document.querySelectorAll('.cell-matrix-table td').forEach(td => td.classList.remove('cell-active'));

        this.uiController.filterAndRenderDb();
        this.zoomToFit();
    }
}
