// Vault-Tec Master File Database & Compiler - Canvas Renderer

import { escapeHtml } from '../helpers.js';

export class CanvasRenderer {
    constructor(store, coordConverter) {
        this.store = store;
        this.coordConverter = coordConverter;
    }

    drawMap(canvas, ctx) {
        if (!canvas || !ctx) return;
        const state = this.store.getState();
        const { spatialRecords, activeCellFilter, selectedSpatialRecord, hoverSpatialRecord, isPanning, scale, stringCache } = state;

        ctx.fillStyle = '#151515';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (spatialRecords.length === 0) return;

        const cellSize = 4096;
        const tl = this.coordConverter.screenToWorld(0, 0);
        const br = this.coordConverter.screenToWorld(canvas.width, canvas.height);

        const minCellX = Math.floor(tl.x / cellSize);
        const maxCellX = Math.ceil(br.x / cellSize);
        const minCellY = Math.floor(br.y / cellSize);
        const maxCellY = Math.ceil(tl.y / cellSize);

        ctx.lineWidth = 1;
        ctx.font = '9px monospace';

        // Draw verticals
        for (let cx = minCellX; cx <= maxCellX; cx++) {
            const wx = cx * cellSize;
            const sPt = this.coordConverter.worldToScreen(wx, 0);
            
            ctx.strokeStyle = cx === 0 ? 'rgba(0, 240, 255, 0.4)' : '#262626';
            ctx.beginPath();
            ctx.moveTo(sPt.x, 0);
            ctx.lineTo(sPt.x, canvas.height);
            ctx.stroke();

            if (scale > 0.002) {
                ctx.fillStyle = '#666';
                ctx.fillText(cx, sPt.x + 3, canvas.height - 6);
            }
        }

        // Draw horizontals
        for (let cy = minCellY; cy <= maxCellY; cy++) {
            const wy = cy * cellSize;
            const sPt = this.coordConverter.worldToScreen(0, wy);
            
            ctx.strokeStyle = cy === 0 ? 'rgba(0, 240, 255, 0.4)' : '#262626';
            ctx.beginPath();
            ctx.moveTo(0, sPt.y);
            ctx.lineTo(canvas.width, sPt.y);
            ctx.stroke();

            if (scale > 0.002) {
                ctx.fillStyle = '#666';
                ctx.fillText(cy, 6, sPt.y - 3);
            }
        }

        // Highlight active cell filter area
        if (activeCellFilter) {
            const cx = activeCellFilter.cx;
            const cy = activeCellFilter.cy;
            const tlPt = this.coordConverter.worldToScreen(cx * cellSize, (cy + 1) * cellSize);
            const brPt = this.coordConverter.worldToScreen((cx + 1) * cellSize, cy * cellSize);
            const w = brPt.x - tlPt.x;
            const h = brPt.y - tlPt.y;

            ctx.fillStyle = 'rgba(255, 184, 108, 0.06)';
            ctx.strokeStyle = '#ffb86c';
            ctx.lineWidth = 1.5;
            ctx.fillRect(tlPt.x, tlPt.y, w, h);
            ctx.strokeRect(tlPt.x, tlPt.y, w, h);
        }

        // Draw objects
        for (const r of spatialRecords) {
            const sPt = this.coordConverter.worldToScreen(r.X, r.Y);
            if (sPt.x < -10 || sPt.x > canvas.width + 10 || sPt.y < -10 || sPt.y > canvas.height + 10) continue;

            const isSelected = selectedSpatialRecord && selectedSpatialRecord.FormID === r.FormID;
            const isHovered = hoverSpatialRecord && hoverSpatialRecord.FormID === r.FormID;

            let radius = 2.5;
            if (scale > 0.01) radius = 3.5;
            if (scale > 0.1) radius = 5.5;

            if (isSelected) {
                ctx.beginPath();
                ctx.arc(sPt.x, sPt.y, radius + 4 + Math.sin(Date.now() / 150) * 1.5, 0, 2 * Math.PI);
                ctx.strokeStyle = '#ffb86c';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(sPt.x, sPt.y, radius, 0, 2 * Math.PI);
                ctx.fillStyle = '#ffb86c';
                ctx.fill();
            } else if (isHovered) {
                ctx.beginPath();
                ctx.arc(sPt.x, sPt.y, radius + 2, 0, 2 * Math.PI);
                ctx.strokeStyle = '#00f0ff';
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(sPt.x, sPt.y, radius, 0, 2 * Math.PI);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(sPt.x, sPt.y, radius, 0, 2 * Math.PI);
                ctx.fillStyle = '#00f0ff';
                ctx.fill();
            }
        }

        // Hover tooltip details
        if (hoverSpatialRecord && !isPanning) {
            const cache = stringCache[hoverSpatialRecord.FormID] || { edid: '', name: '' };
            const sPt = this.coordConverter.worldToScreen(hoverSpatialRecord.X, hoverSpatialRecord.Y);

            const lines = [
                `FormID: 0x${hoverSpatialRecord.FormID.toString(16).toUpperCase().padStart(8, '0')}`,
                `EDID: ${cache.edid || 'N/A'}`,
                `Name: ${cache.name || 'N/A'}`,
                `Coords: (${Math.round(hoverSpatialRecord.X)}, ${Math.round(hoverSpatialRecord.Y)}, ${Math.round(hoverSpatialRecord.Z || 0)})`
            ];

            ctx.font = '10px monospace';
            let maxW = 0;
            for (const l of lines) {
                maxW = Math.max(maxW, ctx.measureText(l).width);
            }

            const boxW = maxW + 16;
            const boxH = lines.length * 13 + 8;

            let tx = sPt.x + 10;
            let ty = sPt.y - boxH / 2;

            if (tx + boxW > canvas.width) tx = sPt.x - boxW - 10;
            if (ty < 5) ty = 5;
            if (ty + boxH > canvas.height - 5) ty = canvas.height - boxH - 5;

            ctx.fillStyle = '#1a1a1a';
            ctx.strokeStyle = '#3d3d3d';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.rect(tx, ty, boxW, boxH);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#e0e0e0';
            let ly = ty + 12;
            for (const l of lines) {
                ctx.fillText(l, tx + 8, ly);
                ly += 13;
            }
        }
    }
}
