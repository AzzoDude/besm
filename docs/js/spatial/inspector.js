// Vault-Tec Master File Database & Compiler - Record Detail Inspector

import { getRecordLabel, escapeHtml } from '../helpers.js';

export class RecordInspector {
    constructor(store) {
        this.store = store;
    }

    render(container, record) {
        if (!container) return;
        if (!record) {
            container.innerHTML = `<div style="color: #888; padding: 10px; text-align: center;">Select an object on the map to inspect its data fields</div>`;
            return;
        }

        const state = this.store.getState();
        const { stringCache, monoCols } = state;
        const cache = stringCache[record.FormID] || { edid: '', name: '' };
        
        let html = `<table class="inspector-table">`;
        html += `<tr><td class="inspector-label">FormID</td><td class="inspector-value highlight">0x${record.FormID.toString(16).toUpperCase().padStart(8, '0')}</td></tr>`;
        html += `<tr><td class="inspector-label">EditorID</td><td class="inspector-value">${escapeHtml(cache.edid || 'N/A')}</td></tr>`;
        html += `<tr><td class="inspector-label">FullName</td><td class="inspector-value">${escapeHtml(cache.name || 'N/A')}</td></tr>`;

        for (const [key, val] of Object.entries(record)) {
            if (key === 'FormID') continue;
            const isNum = typeof val === 'number';
            const isFormIDCol = monoCols.has(key.toLowerCase());
            const displayVal = isFormIDCol ? getRecordLabel(val, stringCache) : val;

            html += `<tr>
                <td class="inspector-label">${escapeHtml(key)}</td>
                <td class="inspector-value ${isFormIDCol ? 'highlight' : (isNum ? 'numeric' : '')}">${escapeHtml(displayVal)}</td>
            </tr>`;
        }

        html += `</table>`;
        container.innerHTML = html;
    }
}
