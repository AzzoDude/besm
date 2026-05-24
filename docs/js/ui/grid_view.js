// Vault-Tec Master File Database & Compiler - Database Grid Table View

import { escapeHtml, getRecordLabel } from '../helpers.js';

function decodeRecordFlags(val) {
    const flags = [];
    if (val & 0x00000008) flags.push("Deleted");
    if (val & 0x00000040) flags.push("Constant");
    if (val & 0x00000200) flags.push("Ignored");
    if (val & 0x00040000) flags.push("Compressed");
    if (val & 0x00080000) flags.push("Persistent");
    if (val & 0x00100000) flags.push("Initially Disabled");
    if (val & 0x00800000) flags.push("Cast Shadows");
    return flags.length > 0 ? flags.join(", ") : "None";
}

export class GridView {
    constructor(store, uiController) {
        this.store = store;
        this.uiController = uiController;
    }

    render() {
        const state = this.store.getState();
        const { activeSubsectorType, schemas, dbPage, pageSize, filteredSubsectorRows, selectedSpatialRecord, stringCache, numCols, monoCols } = state;
        
        const sectorCache = state.rawSectorBytesCache ? state.rawSectorBytesCache[activeSubsectorType] : null;
        const rowSize = sectorCache ? sectorCache.rowSize : 12;
        const schema = schemas[activeSubsectorType] || {
            rowSize: rowSize,
            columns: [
                { name: "FormID", type: "int", offset: 0 },
                { name: "Flags", type: "int", offset: 4 },
                { name: "BlobOffset", type: "int", offset: 8 }
            ]
        };
        
        const start = dbPage * pageSize;
        const end = Math.min(start + pageSize, filteredSubsectorRows.length);
        
        const cols = schema.columns.map(c => c.name);
        document.getElementById('db-headers').innerHTML = `<tr><th>EditorID</th><th>Name</th>${cols.map(c => `<th>${c}</th>`).join('')}</tr>`;
        
        const tbody = document.getElementById('db-body');
        if (!tbody) return;
        
        if (filteredSubsectorRows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${cols.length + 2}">No records match</td></tr>`;
        } else {
            tbody.innerHTML = filteredSubsectorRows.slice(start, end).map((r, i) => {
                const cache = stringCache[r.FormID] || { edid: '', name: '' };
                const globalIdx = start + i;
                const isSelected = selectedSpatialRecord && selectedSpatialRecord.FormID === r.FormID;
                const clsSelected = isSelected ? 'class="row-selected"' : '';

                return `<tr ${clsSelected} id="db-row-${globalIdx}" onclick="selectGridRow(${globalIdx})" style="cursor: pointer;">
                    <td class="mono">${escapeHtml(cache.edid)}</td>
                    <td>${escapeHtml(cache.name)}</td>
                    ${cols.map(c => {
                        const val = r[c];
                        const cls = numCols.has(c.toLowerCase()) ? 'num' : (monoCols.has(c.toLowerCase()) ? 'mono' : '');
                        let titleAttr = '';
                        let displayVal = escapeHtml(monoCols.has(c.toLowerCase()) ? getRecordLabel(val, stringCache) : val);
                        
                        if (c === "Flags") {
                            const decoded = decodeRecordFlags(val);
                            titleAttr = `title="Active Flags: ${decoded}"`;
                            displayVal = `0x${val.toString(16).toUpperCase().padStart(8, '0')} <span style="color: #888; font-size: 9px; font-weight: normal; margin-left: 4px;">(${decoded})</span>`;
                        }
                        
                        return `<td class="${cls}" ${titleAttr}>${displayVal}</td>`;
                    }).join('')}
                </tr>`;
            }).join('');
        }
        
        const pageInfo = document.getElementById('db-page-info');
        if (pageInfo) {
            pageInfo.innerText = `Showing ${filteredSubsectorRows.length > 0 ? start + 1 : 0}-${end} of ${filteredSubsectorRows.length}`;
        }
        
        const btnPrev = document.getElementById('db-prev-btn');
        if (btnPrev) btnPrev.disabled = (dbPage === 0);
        
        const btnNext = document.getElementById('db-next-btn');
        if (btnNext) btnNext.disabled = (end >= filteredSubsectorRows.length);
    }

    selectRow(globalIdx) {
        const { filteredSubsectorRows } = this.store.getState();
        const record = filteredSubsectorRows[globalIdx];
        if (!record) return;

        document.querySelectorAll('#db-body tr').forEach(tr => tr.classList.remove('row-selected'));
        const rowEl = document.getElementById(`db-row-${globalIdx}`);
        if (rowEl) rowEl.classList.add('row-selected');

        this.store.update({ selectedSpatialRecord: record });
        if (this.uiController.spatialView) {
            this.uiController.spatialView.inspectRecord(record);
        }
    }
}
