// tars_db/js/router.js

import { initApp } from './app.js';
import { AppState } from './state.js';
import { TarsLoc } from './localization.js'; // Önizleme için sınıfı import ediyoruz

async function router() {
    const app = document.getElementById('app-container');
    const hash = window.location.hash || '#hub';

    console.log("Yönlendiriliyor:", hash);

    if (hash === '#hub') {
        try {
            const html = await fetch('templates/hub.html').then(r => r.text());
            app.innerHTML = html;
        } catch (e) {
            console.error("Hub yüklenemedi:", e);
        }
    } 
    else if (hash === '#analysis') {
        try {
            const html = await fetch('templates/analysis.html').then(r => r.text());
            app.innerHTML = html;
            // DOM yüklendikten sonra App'i başlat (100ms güvenli bekleme)
            setTimeout(() => {
                initApp(); 
            }, 100);
        } catch (e) {
            console.error("Analiz sayfası yüklenemedi:", e);
        }
    }
    else if (hash === '#settings') {
        try {
            const html = await fetch('templates/settings.html').then(r => r.text());
            app.innerHTML = html;
            // DOM yüklendikten sonra Ayarlar mantığını başlat
            setTimeout(initSettingsLogic, 100);
        } catch (e) {
            console.error("Ayarlar sayfası yüklenemedi:", e);
        }
    }
}

// --- AYARLAR SAYFASI MANTIĞI (GELİŞMİŞ) ---
function initSettingsLogic() {
    const loc = AppState.loc; 
    let s = loc.settings; // Mevcut ayarlar referansı

    // 1. HTML Elementlerini Seç
    const elThous = document.getElementById('locThousand');
    const elDec = document.getElementById('locDecimal');
    const elDecimals = document.getElementById('locDecimals'); // Yeni: Ondalık basamak
    const elAbbr = document.getElementById('locAbbr');         // Yeni: Kısaltma Checkbox
    const elDate = document.getElementById('locDate');
    
    // Önizleme Elementleri
    const pBig = document.getElementById('previewBigNum');
    const pSmall = document.getElementById('previewSmallNum');
    const pDate = document.getElementById('previewDate');

    // Butonlar
    const btnSave = document.getElementById('btnSaveLoc');
    const btnReset = document.getElementById('btnResetLoc');
    const msgDiv = document.getElementById('locMsg');

    // 2. Formu Mevcut Ayarlarla Doldur (Null check ile güvenli hale getirdik)
    if(elThous) elThous.value = s.thousandSep;
    if(elDec) elDec.value = s.decimalSep;
    if(elDecimals) elDecimals.value = s.decimals;
    if(elAbbr) elAbbr.checked = s.useAbbreviation;
    if(elDate) elDate.value = s.dateFormat;

    // 3. CANLI ÖNİZLEME FONKSİYONU
    const updatePreview = () => {
        if(!pBig || !pSmall || !pDate) return;

        // Geçici bir instance oluşturup anlık testi yapıyoruz
        const tempLoc = new TarsLoc();
        tempLoc.settings = {
            thousandSep: elThous.value,
            decimalSep: elDec.value,
            decimals: parseInt(elDecimals.value || 2),
            useAbbreviation: elAbbr.checked,
            dateFormat: elDate.value
        };

        // Test Değerleri ile UI güncelle
        pBig.innerText = tempLoc.formatNumber(12500000); // Örn: 12,5 M
        pSmall.innerText = tempLoc.formatNumber(1234.5678); // Örn: 1.234,57
        pDate.innerText = tempLoc.formatDate(new Date()); // Bugünün tarihi
    };

    // 4. Event Listener Ekle (Her tuşta/değişimde güncelle)
    if(elThous) elThous.addEventListener('input', updatePreview);
    if(elDec) elDec.addEventListener('input', updatePreview);
    if(elDecimals) elDecimals.addEventListener('input', updatePreview);
    if(elDate) elDate.addEventListener('input', updatePreview);
    if(elAbbr) elAbbr.addEventListener('change', updatePreview);

    // İlk Açılışta Çalıştır
    updatePreview();

    // 5. KAYDET BUTONU
    if (btnSave) {
        btnSave.onclick = () => {
            // Ayarları kaydet
            loc.saveSettings({
                thousandSep: elThous.value,
                decimalSep: elDec.value,
                decimals: parseInt(elDecimals.value),
                useAbbreviation: elAbbr.checked,
                dateFormat: elDate.value
            });
            
            // Global State'i Tazele (Grafiklerin haberi olsun)
            AppState.refreshLoc();
            
            // Başarı Mesajı
            if(msgDiv) {
                msgDiv.style.color = 'green';
                msgDiv.innerHTML = '<i class="fa-solid fa-check"></i> Ayarlar kaydedildi ve uygulandı!';
                setTimeout(() => msgDiv.innerHTML = "", 3000);
            }
        };
    }
    
    // 6. VARSAYILANLAR BUTONU (TR Standartları)
    if (btnReset) {
        btnReset.onclick = () => {
            elThous.value = ".";
            elDec.value = ",";
            elDecimals.value = 2;
            elAbbr.checked = true;
            elDate.value = "DD.MM.YYYY"; 
            
            updatePreview(); // Form değiştiği için önizlemeyi güncelle
            
            if(msgDiv) {
                msgDiv.style.color = '#2980b9';
                msgDiv.innerHTML = 'Varsayılanlar seçildi. Kaydetmeyi unutmayın.';
                setTimeout(() => msgDiv.innerHTML = "", 3000);
            }
        };
    }
}

// Olayları Dinle
window.addEventListener('load', router);
window.addEventListener('hashchange', router);