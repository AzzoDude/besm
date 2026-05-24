// Vault-Tec Master File Database & Compiler - Cell Density Matrix Heatmap

export class CellMatrix {
    constructor(store) {
        this.store = store;
    }

    render(container) {
        if (!container) return;
        
        const { spatialRecords, activeCellFilter } = this.store.getState();
        if (spatialRecords.length === 0) {
            container.innerHTML = `<div style="color: #888; padding: 10px; text-align: center;">No spatial records loaded</div>`;
            return;
        }

        const cells = {};
        let minCx = Infinity, maxCx = -Infinity;
        let minCy = Infinity, maxCy = -Infinity;

        for (const r of spatialRecords) {
            const cx = Math.floor(r.X / 4096);
            const cy = Math.floor(r.Y / 4096);

            if (cx < minCx) minCx = cx;
            if (cx > maxCx) maxCx = cx;
            if (cy < minCy) minCy = cy;
            if (cy > maxCy) maxCy = cy;

            const key = `${cx},${cy}`;
            cells[key] = (cells[key] || 0) + 1;
        }

        if (minCx === Infinity) {
            container.innerHTML = `<div style="color: #888; padding: 10px; text-align: center;">No valid spatial cells</div>`;
            return;
        }

        let maxCount = 0;
        for (const cnt of Object.values(cells)) {
            if (cnt > maxCount) maxCount = cnt;
        }

        const maxDim = 16;
        let startCx = minCx, endCx = maxCx;
        let startCy = minCy, endCy = maxCy;

        const spanCx = maxCx - minCx + 1;
        const spanCy = maxCy - minCy + 1;

        let isCropped = false;
        let centerCx = Math.floor((minCx + maxCx) / 2);
        let centerCy = Math.floor((minCy + maxCy) / 2);

        if (spanCx > maxDim || spanCy > maxDim) {
            isCropped = true;
            let peakCx = centerCx, peakCy = centerCy, peakVal = 0;
            for (const [k, count] of Object.entries(cells)) {
                if (count > peakVal) {
                    peakVal = count;
                    const pts = k.split(',');
                    peakCx = parseInt(pts[0]);
                    peakCy = parseInt(pts[1]);
                }
            }
            centerCx = peakCx;
            centerCy = peakCy;

            startCx = Math.max(minCx, centerCx - Math.floor(maxDim / 2));
            endCx = Math.min(maxCx, startCx + maxDim - 1);
            if (endCx - startCx < maxDim - 1) startCx = Math.max(minCx, endCx - maxDim + 1);

            startCy = Math.max(minCy, centerCy - Math.floor(maxDim / 2));
            endCy = Math.min(maxCy, startCy + maxDim - 1);
            if (endCy - startCy < maxDim - 1) startCy = Math.max(minCy, endCy - maxDim + 1);
        }

        let html = `<table class="cell-matrix-table">`;
        html += `<thead><tr><th>Y\\X</th>`;
        for (let cx = startCx; cx <= endCx; cx++) {
            html += `<th>${cx}</th>`;
        }
        html += `</tr></thead><tbody>`;

        for (let cy = endCy; cy >= startCy; cy--) {
            html += `<tr><th>${cy}</th>`;
            for (let cx = startCx; cx <= endCx; cx++) {
                const key = `${cx},${cy}`;
                const count = cells[key] || 0;

                let style = "";
                let cls = "";
                let txt = "";

                if (count > 0) {
                    const opacity = Math.min(1.0, 0.2 + (Math.log(count) / Math.log(maxCount)) * 0.8);
                    style = `style="background-color: rgba(0, 240, 255, ${opacity});"`;
                    txt = count;
                } else {
                    cls = "empty-cell";
                }

                const isActive = activeCellFilter && activeCellFilter.cx === cx && activeCellFilter.cy === cy;
                if (isActive) cls += " cell-active";

                html += `<td class="${cls}" ${style} data-cx="${cx}" data-cy="${cy}" title="Cell (${cx}, ${cy})\nCount: ${count}" onclick="toggleCellFilter(${cx}, ${cy})">${txt}</td>`;
            }
            html += `</tr>`;
        }
        html += `</tbody></table>`;

        if (isCropped) {
            html = `<div style="color: #ffb86c; font-size: 9px; margin-bottom: 4px; text-align: center;">Heatmap cropped to 16x16 center around (${centerCx}, ${centerCy})</div>` + html;
        }

        container.innerHTML = html;
    }
}
