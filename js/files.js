// tars_db/js/files.js

import { TarsEngine } from '../pkg/tars_db.js';
import { AppState } from './state.js';
import { UI } from './ui.js';
import { Storage } from './storage.js';

export const FileManager = {
    handleFile(evt, callbackRefresh) {
        const file = evt.target.files[0];
        if (!file) return;

        UI.showLoading(`"${file.name}" okunuyor...`);

        setTimeout(() => {
            const reader = new FileReader();
            const isBinary = file.name.endsWith('.tars') || file.name.endsWith('.xlsx');
            
            if (isBinary) reader.readAsArrayBuffer(file);
            else reader.readAsText(file);

            reader.onload = async function(e) {
                try {
                    const data = e.target.result;
                    let msg = "";

                    if (file.name.endsWith('.tars')) {
                        const bytes = new Uint8Array(data);
                        AppState.setDB(TarsEngine.import_db(bytes));
                        msg = "📂 Proje yüklendi!";
                    } 
                    else if (file.name.endsWith('.xlsx')) {
                        const workbook = XLSX.read(data, {type: 'array'});
                        const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
                        msg = AppState.db.load_csv_data(csv);
                    } 
                    else {
                        msg = AppState.db.load_csv_data(data);
                    }

                    callbackRefresh(); // UI Yenile
                    
                    // Otomatik Kayıt
                    const currentState = AppState.db.export_db();
                    await Storage.save(currentState);
                    
                    UI.showToast(msg + " (Otomatik Kaydedildi)", "success");

                } catch (err) {
                    console.error(err);
                    UI.showToast("Hata: Dosya formatı bozuk.", "error");
                } finally {
                    UI.hideLoading();
                    evt.target.value = '';
                }
            };
        }, 100);
    },

    saveProjectToFile() {
        if (!AppState.db || AppState.db.get_total_filtered() === 0) {
            UI.showToast("Kaydedilecek veri yok!", "error");
            return;
        }
        UI.showLoading("Yedek Paketleniyor...");
        setTimeout(() => {
            try {
                const data = AppState.db.export_db(); 
                const blob = new Blob([data], { type: "application/octet-stream" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `TarsDB_Backup_${new Date().toISOString().slice(0,10)}.tars`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                UI.showToast("💾 Yedek indirildi!", "success");
            } catch (e) { UI.showToast("Hata oluştu.", "error"); } 
            finally { UI.hideLoading(); }
        }, 50);
    }
};