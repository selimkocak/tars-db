// tars_db/js/charts.js

import { AppState } from './state.js';
import { COLORS } from './constants.js';
import { Storage } from './storage.js';

export const ChartManager = {
    init(ctx1, ctx2, updateCallback) {
        const conf = (getCol) => ({
            type: 'bar', 
            data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
            options: {
                responsive: true, 
                maintainAspectRatio: false,
                onClick: async (e, el) => {
                    if(el.length > 0) {
                        const idx = el[0].index;
                        const chart = (e.chart.canvas.id === 'chart1') ? AppState.chart1 : AppState.chart2;
                        const col = (e.chart.canvas.id === 'chart1') ? AppState.activeCol1 : AppState.activeCol2;
                        const val = chart.data.labels[idx];
                        
                        AppState.db.toggle_selection(col, val); 
                        updateCallback(); 
                        
                        const state = AppState.db.export_db();
                        await Storage.save(state);
                    }
                },
                plugins: { 
                    legend: {display:false}, 
                    title: {display:true, text:'-'},
                    // --- TOOLTIP FORMATLAMA ---
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) {
                                    // AppState.loc.formatNumber kullanıyoruz
                                    label += AppState.loc.formatNumber(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: { 
                    x: {grid:{display:false}}, 
                    y: {
                        beginAtZero:true,
                        // --- EKSEN FORMATLAMA ---
                        ticks: {
                            callback: function(value) {
                                return AppState.loc.formatNumber(value);
                            }
                        }
                    } 
                }
            }
        });

        AppState.chart1 = new Chart(ctx1, conf(() => AppState.activeCol1));
        AppState.chart2 = new Chart(ctx2, conf(() => AppState.activeCol2));
    },

    update() {
        if(!AppState.activeCol1 || !AppState.activeCol2) return;
        
        // Eğer ayarlar değiştiyse (Router'dan dönünce) loc nesnesini tazele
        AppState.refreshLoc();

        const render = (chart, col) => {
            chart.options.plugins.title.text = col;
            
            // Top Values
            const labels = AppState.db.get_top_values(col).split(',').filter(s => s);
            
            // Eğer label bir tarih veya sayı ise formatlayabiliriz (İsteğe bağlı)
            // const formattedLabels = labels.map(l => AppState.loc.formatDate(l)); 

            const data = []; 
            const colors = [];
            
            labels.forEach(val => {
                const state = AppState.db.get_state(col, val);
                if (state === 0) { 
                    data.push(AppState.db.query_global_count(col, val)); 
                    colors.push(COLORS.GRAY); 
                } else { 
                    data.push(AppState.db.query_count(col, val)); 
                    colors.push(state === 2 ? COLORS.GREEN : COLORS.BLUE);
                }
            });

            chart.data.labels = labels;
            chart.data.datasets[0].data = data;
            chart.data.datasets[0].backgroundColor = colors;
            chart.update();
        };
        
        render(AppState.chart1, AppState.activeCol1);
        render(AppState.chart2, AppState.activeCol2);
        
        // UI.js'deki toplam sayıyı güncelle (Ama burada çağırmak yerine UI modülüne paslayabiliriz)
        // Pratik olması için direkt DOM güncellemesi:
        document.getElementById('totalRows').innerText = AppState.loc.formatNumber(AppState.db.get_total_filtered());
    }
};