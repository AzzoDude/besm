// Vault-Tec Master File Database & Compiler - Strings View Renderer

import { escapeHtml } from '../helpers.js';

export class StringsView {
    constructor(store) {
        this.store = store;
    }

    filterAndRender() {
        const { stringCache } = this.store.getState();
        const list = Object.keys(stringCache).map(fID => ({ 
            fID: parseInt(fID), 
            edid: stringCache[fID].edid, 
            name: stringCache[fID].name 
        }));
        
        const q = document.getElementById('searchBox').value.toLowerCase().trim();
        const filteredStrings = q ? list.filter(s => 
            s.edid.toLowerCase().includes(q) || 
            s.name.toLowerCase().includes(q) || 
            ("0x" + s.fID.toString(16)).includes(q)
        ) : list;
        
        this.store.update({ filteredStrings });
        this.render();
    }

    render() {
        const { stringsPage, pageSize, filteredStrings } = this.store.getState();
        const start = stringsPage * pageSize;
        const end = Math.min(start + pageSize, filteredStrings.length);
        const tbody = document.getElementById('strings-body');
        if (!tbody) return;
        
        if (filteredStrings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No matches</td></tr>';
        } else {
            tbody.innerHTML = filteredStrings.slice(start, end).map(s => {
                return `<tr>
                    <td class="mono">0x${s.fID.toString(16).toUpperCase().padStart(8, '0')}</td>
                    <td class="mono" style="color:#a8ffb2;">${escapeHtml(s.edid)}</td>
                    <td>${escapeHtml(s.name)}</td>
                </tr>`;
            }).join('');
        }
        
        const pageInfo = document.getElementById('strings-page-info');
        if (pageInfo) {
            pageInfo.innerText = `Showing ${filteredStrings.length > 0 ? start + 1 : 0}-${end} of ${filteredStrings.length}`;
        }
        
        const btnPrev = document.getElementById('strings-prev-btn');
        if (btnPrev) btnPrev.disabled = (stringsPage === 0);
        
        const btnNext = document.getElementById('strings-next-btn');
        if (btnNext) btnNext.disabled = (end >= filteredStrings.length);
    }
}
