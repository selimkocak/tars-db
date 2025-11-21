import init, { TarsEngine } from '../pkg/tars_db.js';

// Global Değişkenler (Modül Kapsamında)
let db = null;
let chart1 = null, chart2 = null;
let activeCol1 = null, activeCol2 = null;

// Renkler
const C_GREEN = '#4caf50';
const C_GRAY  = '#bfbfbf';
const C_BLUE  = '#3498db';

// --- MOTORU BAŞLATMA ---
// Bu fonksiyonu Router çağıracak
export async function initApp() {
    // Eğer motor zaten yüklüyse tekrar yükleme (Singleton Pattern)
    if (!db) {
        console.log("⚙️ TarsDB Motoru Yükleniyor...");
        await init();
        db = new TarsEngine();
        console.log("✅ TarsDB Hazır!");
    }

    // HTML elementlerini bağla
    initUI();
}

// --- ARAYÜZ BAĞLANTILARI ---
function initUI() {
    const ctx1 = document.getElementById('chart1');
    const ctx2 = document.getElementById('chart2');

    if (ctx1 && ctx2) {
        // Grafikleri Kur
        initCharts(ctx1, ctx2);

        // Dosya Yükleme
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        
        if(dropZone && fileInput) {
            dropZone.onclick = () => fileInput.click();
            fileInput.onchange = handleFile;
        }

        // Dropdownlar
        document.getElementById('sel1').addEventListener('change', (e) => { 
            activeCol1 = e.target.value; updateDashboard(); 
        });
        document.getElementById('sel2').addEventListener('change', (e) => { 
            activeCol2 = e.target.value; updateDashboard(); 
        });
    }
}

// --- DOSYA İŞLEMLERİ ---
function handleFile(evt) {
    const file = evt.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = e.target.result;
        
        // Excel ise CSV'ye çevir
        if (file.name.endsWith('.xlsx')) {
            const wb = XLSX.read(data, {type: 'binary'});
            const csv = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
            db.load_csv_data(csv);
        } else {
            db.load_csv_data(data);
        }
        
        // Arayüzü Tazele
        refreshUI();
    };

    if (file.name.endsWith('.xlsx')) reader.readAsBinaryString(file); 
    else reader.readAsText(file);
}

// --- MENÜ GÜNCELLEME ---
function refreshUI() {
    const cols = db.get_column_names().split(',').filter(c => c.trim() !== "");
    populateSelect('sel1', cols);
    populateSelect('sel2', cols);
    
    // Varsayılan Seçimler
    if (cols.length >= 2) {
        activeCol1 = cols[0];
        activeCol2 = cols[1];
        document.getElementById('sel1').value = activeCol1;
        document.getElementById('sel2').value = activeCol2;
        updateDashboard();
    }
}

function populateSelect(id, opts) {
    const el = document.getElementById(id);
    el.innerHTML = "";
    opts.forEach(o => { 
        const op = document.createElement("option"); 
        op.text = o; 
        el.add(op); 
    });
}

// --- GRAFİK KURULUMU ---
function initCharts(ctx1, ctx2) {
    const conf = (getCol) => ({
        type: 'bar', 
        data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
        options: {
            responsive: true, 
            maintainAspectRatio: false,
            onClick: (e, el) => {
                if(el.length > 0) {
                    const idx = el[0].index;
                    const chart = (e.chart.canvas.id === 'chart1') ? chart1 : chart2;
                    const col = (e.chart.canvas.id === 'chart1') ? activeCol1 : activeCol2;
                    
                    const val = chart.data.labels[idx];
                    db.toggle_selection(col, val); // Motor Çağrısı
                    updateDashboard();
                }
            },
            plugins: { legend: {display:false}, title: {display:true, text:'-'} },
            scales: { x: {grid:{display:false}}, y: {beginAtZero:true} }
        }
    });

    chart1 = new Chart(ctx1, conf(() => activeCol1));
    chart2 = new Chart(ctx2, conf(() => activeCol2));
}

// --- DASHBOARD GÜNCELLEME (Render Loop) ---
function updateDashboard() {
    if(!activeCol1 || !activeCol2) return;
    
    const render = (chart, col) => {
        chart.options.plugins.title.text = col;
        
        // Veriyi Çek
        const labels = db.get_top_values(col).split(',').filter(s => s);
        const data = []; 
        const colors = [];
        
        labels.forEach(val => {
            const state = db.get_state(col, val);
            if (state === 0) { 
                // GRİ (Excluded - Global Count)
                data.push(db.query_global_count(col, val)); 
                colors.push(C_GRAY); 
            } else { 
                // YEŞİL/MAVİ (Selected/Possible)
                data.push(db.query_count(col, val)); 
                colors.push(state === 2 ? C_GREEN : C_BLUE);
            }
        });

        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.data.datasets[0].backgroundColor = colors;
        chart.update();
    };
    
    render(chart1, activeCol1);
    render(chart2, activeCol2);
    
    document.getElementById('totalRows').innerText = db.get_total_filtered().toLocaleString();
}
