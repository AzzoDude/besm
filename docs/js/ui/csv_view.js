// Vault-Tec Master File Database & Compiler - CSV File View & Loader

import { escapeHtml } from '../helpers.js';

export class CsvView {
    constructor(store) {
        this.store = store;
    }

    load(file) {
        this.store.update({ loadedFileMode: "csv" });
        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target.result;
            const lines = text.split(/\r?\n/);
            if (lines.length === 0) {
                document.getElementById('status').innerText = "Empty CSV file";
                return;
            }
            
            const csvHeaders = this.parseLine(lines[0]);
            const csvRows = [];
            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim()) {
                    csvRows.push(this.parseLine(lines[i]));
                }
            }
            
            this.store.update({
                csvHeaders,
                csvRows,
                csvPage: 0
            });

            this.filterAndRender();
            document.getElementById('status').innerText = `Loaded CSV: ${csvRows.length} rows`;
        };
        reader.readAsText(file);
    }

    parseLine(line) {
        const result = [];
        let cur = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(cur.trim());
                cur = "";
            } else {
                cur += char;
            }
        }
        result.push(cur.trim());
        return result;
    }

    filterAndRender() {
        const { csvRows } = this.store.getState();
        const q = document.getElementById('searchBox').value.toLowerCase().trim();
        const filteredCsvRows = q ? csvRows.filter(row => 
            row.some(cell => String(cell).toLowerCase().includes(q))
        ) : csvRows;
        
        this.store.update({ filteredCsvRows });
        this.render();
    }

    render() {
        const { csvHeaders, filteredCsvRows, csvPage, pageSize } = this.store.getState();
        const start = csvPage * pageSize;
        const end = Math.min(start + pageSize, filteredCsvRows.length);
        const headers = csvHeaders;
        
        document.getElementById('db-headers').innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
        
        const tbody = document.getElementById('db-body');
        if (!tbody) return;
        
        if (filteredCsvRows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${headers.length}">No records match</td></tr>`;
        } else {
            tbody.innerHTML = filteredCsvRows.slice(start, end).map(row => {
                return `<tr>
                    ${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}
                </tr>`;
            }).join('');
        }
        
        const pageInfo = document.getElementById('db-page-info');
        if (pageInfo) {
            pageInfo.innerText = `Showing ${filteredCsvRows.length > 0 ? start + 1 : 0}-${end} of ${filteredCsvRows.length}`;
        }
        
        const btnPrev = document.getElementById('db-prev-btn');
        if (btnPrev) btnPrev.disabled = (csvPage === 0);
        
        const btnNext = document.getElementById('db-next-btn');
        if (btnNext) btnNext.disabled = (end >= filteredCsvRows.length);
    }
}
