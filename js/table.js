// tars_db/js/table.js

import { AppState } from './state.js';

export const TableManager = {
    currentSort: null,
    isDesc: false,
    visibleColumns: [],
    currentPage: 0,
    pageSize: 50, 

    init() {
        if(!AppState.db) return;
        
        if (this.visibleColumns.length === 0) {
            const allCols = AppState.db.get_column_names().split(',').filter(s=>s);
            this.visibleColumns = allCols.slice(0, 5);
        }

        this.renderHeader();
        this.update();
        this.setupScroll(); 
    },

    setupScroll() {
        const container = document.querySelector('.table-container');
        if(container) {
            container.onscroll = () => {
                if (container.scrollTop + container.clientHeight >= container.scrollHeight - 50) {
                    this.loadMore();
                }
            };
        }
    },

    loadMore() {
        this.pageSize += 50; 
        this.update(true);   
    },

    renderHeader() {
        const thead = document.getElementById('gridHeader');
        if(!thead) return;

        let html = '<tr>';
        this.visibleColumns.forEach(col => {
            const icon = this.currentSort === col 
                ? (this.isDesc ? '<i class="fa-solid fa-sort-down"></i>' : '<i class="fa-solid fa-sort-up"></i>') 
                : '<i class="fa-solid fa-sort" style="opacity:0.3"></i>';
            
            html += `<th onclick="TableManager.sortBy('${col}')" style="cursor:pointer">
                        ${col} ${icon}
                     </th>`;
        });
        html += '</tr>';
        thead.innerHTML = html;
    },

    sortBy(col) {
        if (this.currentSort === col) {
            this.isDesc = !this.isDesc;
        } else {
            this.currentSort = col;
            this.isDesc = false;
        }
        this.pageSize = 50; 
        this.renderHeader();
        this.update();
    },

    selectCell(col, val) {
        if(AppState.db) {
            AppState.db.toggle_selection(col, val);
            window.updateDashboardGlobal(); 
        }
    },

    // --- GÜNCELLENEN KISIM ---
    update(append = false) {
        if (!AppState.db) return;
        
        const colsStr = this.visibleColumns.join(',');
        
        const jsonStr = AppState.db.get_table_data(
            colsStr, 
            0, 
            this.pageSize, 
            this.currentSort, 
            this.isDesc
        ); 
        
        const data = JSON.parse(jsonStr);
        const tbody = document.getElementById('gridBody');
        if(!tbody) return;

        const html = data.map(row => {
            let tr = '<tr>';
            this.visibleColumns.forEach(col => {
                let val = row[col];
                
                // --- AKILLI FORMATLAMA ---
                // 1. Sayı mı?
                if (!isNaN(parseFloat(val)) && isFinite(val)) {
                    // Ama belki tarihtir? (Excel Serial Date: 20000 - 60000 arası)
                    // Kolon adında "Tarih" veya "Date" geçiyorsa ve değer o aralıktaysa
                    const isDateCol = col.toLowerCase().includes('tarih') || col.toLowerCase().includes('date');
                    const numVal = parseFloat(val);

                    if (isDateCol && numVal > 20000 && numVal < 60000) {
                        // Tarih olarak formatla
                        val = AppState.loc.formatDate(numVal);
                    } else {
                        // Normal sayı olarak formatla
                        val = AppState.loc.Num(val);
                    }
                } 
                // 2. ISO Tarih String mi? (2025-11-22)
                else if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) {
                     val = AppState.loc.formatDate(val);
                }

                // Kaçış karakterlerini temizle
                const safeVal = row[col].replace(/'/g, "\\'");
                
                tr += `<td onclick="TableManager.selectCell('${col}', '${safeVal}')" class="selectable-cell">${val}</td>`;
            });
            tr += '</tr>';
            return tr;
        }).join('');
        
        tbody.innerHTML = html;
        
        const total = AppState.db.get_total_filtered();
        const showing = data.length;
        document.getElementById('tableRowCount').innerText = `${AppState.loc.formatNumber(showing)} / ${AppState.loc.formatNumber(total)} satır`;
    }
};

window.TableManager = TableManager;