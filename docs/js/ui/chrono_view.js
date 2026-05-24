// Vault-Tec Master File Database & Compiler - Chronology View Renderer

import { escapeHtml } from '../helpers.js';
import { recordTypeNames } from '../record_types.js';

export class ChronoView {
    constructor(store) {
        this.store = store;
    }

    filterAndRender() {
        const { loadedRecords, stringCache } = this.store.getState();
        const q = document.getElementById('searchBox').value.toLowerCase().trim();
        const filteredChronoRows = q ? loadedRecords.filter(r => {
            const cache = stringCache[r.fID] || { edid: '', name: '' };
            return r.type.toLowerCase().includes(q) || 
                   cache.edid.toLowerCase().includes(q) || 
                   cache.name.toLowerCase().includes(q) || 
                   ("0x" + r.fID.toString(16)).includes(q);
        }) : loadedRecords;

        this.store.update({ filteredChronoRows });
        this.render();
    }

    render() {
        const { chronoPage, pageSize, filteredChronoRows, stringCache } = this.store.getState();
        const start = chronoPage * pageSize;
        const end = Math.min(start + pageSize, filteredChronoRows.length);
        const tbody = document.getElementById('chrono-body');
        if (!tbody) return;
        
        if (filteredChronoRows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No matches</td></tr>';
        } else {
            tbody.innerHTML = filteredChronoRows.slice(start, end).map((r, i) => {
                const cache = stringCache[r.fID] || { edid: '', name: '' };
                const desc = recordTypeNames[r.type] || "Unknown";
                return `<tr>
                    <td class="num">${start + i + 1}</td>
                    <td><span class="badge" title="${desc}">${r.type}</span></td>
                    <td class="mono">${r.type === "GRUP" ? 'N/A' : "0x" + r.fID.toString(16).toUpperCase().padStart(8, '0')}</td>
                    <td class="mono" style="color:#a8ffb2;">${escapeHtml(cache.edid)}</td>
                    <td>${escapeHtml(cache.name)}</td>
                    <td class="mono">0x${r.flags.toString(16).toUpperCase()}</td>
                    <td class="num">${r.bodyLen}</td>
                </tr>`;
            }).join('');
        }
        
        const pageInfo = document.getElementById('chrono-page-info');
        if (pageInfo) {
            pageInfo.innerText = `Showing ${filteredChronoRows.length > 0 ? start + 1 : 0}-${end} of ${filteredChronoRows.length}`;
        }
        
        const btnPrev = document.getElementById('chrono-prev-btn');
        if (btnPrev) btnPrev.disabled = (chronoPage === 0);
        
        const btnNext = document.getElementById('chrono-next-btn');
        if (btnNext) btnNext.disabled = (end >= filteredChronoRows.length);
    }
}
