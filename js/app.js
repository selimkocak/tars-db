// tars_db/js/app.js
import init, { TarsEngine } from '../pkg/tars_db.js';
import { AppState } from './state.js';
import { UI } from './ui.js';
import { Storage } from './storage.js';
import { ChartManager } from './charts.js';
import { FileManager } from './files.js';

// --- MOTORU BAŞLATMA ---
export async function initApp() {
    if (!AppState.db) {
        await init(); // WASM yükle
        
        UI.showLoading("Önceki oturum kontrol ediliyor...");
        try {
            const savedData = await Storage.load();
            if (savedData) {
                AppState.setDB(TarsEngine.import_db(savedData));
                UI.showToast("🔄 Önceki oturum yüklendi!", "info");
            } else {
                AppState.setDB(new TarsEngine());
                UI.showToast("✅ TarsDB Hazır", "success");
            }
        } catch (err) {
            console.error("DB Init Hatası:", err);
            AppState.setDB(new TarsEngine());
        } finally {
            UI.hideLoading();
        }
    }
    initUI();
}

// --- UI BAĞLANTILARI ---
function initUI() {
    const ctx1 = document.getElementById('chart1');
    const ctx2 = document.getElementById('chart2');

    if (ctx1 && ctx2) {
        // Grafikleri Başlat
        ChartManager.init(ctx1, ctx2, ChartManager.update);
        refreshUI();

        // Dosya Yükleme Olayları
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        if(dropZone && fileInput) {
            dropZone.onclick = () => fileInput.click();
            fileInput.onchange = (e) => FileManager.handleFile(e, refreshUI);
            
            dropZone.ondragover = (e) => { e.preventDefault(); dropZone.style.borderColor = '#3498db'; };
            dropZone.ondragleave = (e) => { e.preventDefault(); dropZone.style.borderColor = '#ccc'; };
            dropZone.ondrop = (e) => {
                e.preventDefault();
                dropZone.style.borderColor = '#ccc';
                if(e.dataTransfer.files.length > 0) {
                    fileInput.files = e.dataTransfer.files;
                    FileManager.handleFile({target: fileInput}, refreshUI);
                }
            };
        }

        // Dropdownlar
        document.getElementById('sel1').addEventListener('change', (e) => { AppState.activeCol1 = e.target.value; ChartManager.update(); });
        document.getElementById('sel2').addEventListener('change', (e) => { AppState.activeCol2 = e.target.value; ChartManager.update(); });
        
        // Butonlar
        const btnSave = document.getElementById('btnSave');
        const btnClear = document.getElementById('btnClear');
        
        if(btnSave) {
            btnSave.innerHTML = '<i class="fa-solid fa-download"></i> Yedek İndir';
            btnSave.onclick = FileManager.saveProjectToFile; 
        }
        
        if(btnClear) btnClear.onclick = () => {
            if(AppState.db) { 
                AppState.db.clear_all_selections();
                ChartManager.update();
                UI.showToast("Filtreler Temizlendi", "info");
            }
        };
    }
}

// --- ARAYÜZ GÜNCELLEME ---
function refreshUI() {
    if (!AppState.db || AppState.db.get_total_filtered() === 0) return;

    const cols = AppState.db.get_column_names().split(',').filter(c => c.trim() !== "");
    
    // State güncelle
    if (cols.length >= 2) {
        if(!AppState.activeCol1 || !cols.includes(AppState.activeCol1)) AppState.activeCol1 = cols[0]; 
        if(!AppState.activeCol2 || !cols.includes(AppState.activeCol2)) AppState.activeCol2 = cols[1];
    }

    // Dropdownları Doldur
    UI.populateSelect('sel1', cols, AppState.activeCol1);
    UI.populateSelect('sel2', cols, AppState.activeCol2);
    
    ChartManager.update();
}