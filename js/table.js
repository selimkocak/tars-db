// tars_db/js/table.js

import { AppState } from './state.js';
import { ChartManager } from './charts.js'; // Seçim yapınca grafikleri güncellemek için

export const TableManager = {
    currentSort: null,
    isDesc: false,
    visibleColumns: [],
    currentPage: 0,
    pageSize: 50, // Her seferinde 50 satır göster (Scroll ile artacak)

    init() {
        if(!AppState.db) return;
        
        // Varsayılan kolonlar (Eğer yoksa)
        if (this.visibleColumns.length === 0) {
            const allCols = AppState.db.get_column_names().split(',').filter(s=>s);
            this.visibleColumns = allCols.slice(0, 5);
        }

        this.renderHeader();
        this.update();
        this.setupScroll(); // Sonsuz kaydırma dinleyicisi
    },

    setupScroll() {
        const container = document.querySelector('.table-container');
        if(container) {
            container.onscroll = () => {
                // Scroll sonuna yaklaştı mı?
                if (container.scrollTop + container.clientHeight >= container.scrollHeight - 50) {
                    this.loadMore();
                }
            };
        }
    },

    loadMore() {
        this.pageSize += 50; // Limiti artır
        this.update(true);   // Append mode (tabloyu silmeden ekle)
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
        this.pageSize = 50; // Sıralama değişince başa dön
        this.renderHeader();
        this.update();
    },

    // Hücre Tıklama (Seçim)
    selectCell(col, val) {
        if(AppState.db) {
            AppState.db.toggle_selection(col, val);
            // Tüm dashboard'u güncelle (ChartManager veya app.js üzerinden updateDashboard çağrılmalı)
            // Burada global bir event veya callback kullanabiliriz.
            // Pratik çözüm:
            window.updateDashboardGlobal(); 
        }
    },

    update(append = false) {
        if (!AppState.db) return;
        
        const colsStr = this.visibleColumns.join(',');
        
        // Rust'tan veriyi çek (Offset: 0, Limit: pageSize)
        // Virtual Scroll'un basit versiyonu: "Load More". 
        // Daha gelişmişi için "Windowing" gerekir ama şimdilik bu yeterli.
        const jsonStr = AppState.db.get_table_data(
            colsStr, 
            0, // Hep baştan çek ama limit artıyor
            this.pageSize, 
            this.currentSort, 
            this.isDesc
        ); 
        
        const data = JSON.parse(jsonStr);
        const tbody = document.getElementById('gridBody');
        if(!tbody) return;

        // HTML String oluştur
        const html = data.map(row => {
            let tr = '<tr>';
            this.visibleColumns.forEach(col => {
                let val = row[col];
                // Sayısal format (Lokalizasyon)
                if(!isNaN(parseFloat(val))) val = AppState.loc.Num(val);
                
                // Tıklanabilir Hücre
                // Değerin kendisini tırnak içine alarak fonksiyona gönderiyoruz
                tr += `<td onclick="TableManager.selectCell('${col}', '${row[col].replace(/'/g, "\\'")}')" class="selectable-cell">${val}</td>`;
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

// Global Erişim
window.TableManager = TableManager;