// tars_db/js/router.js
// app.js içindeki init fonksiyonunu çağıracağız
import { initApp } from './app.js';

async function router() {
    const app = document.getElementById('app-container');
    const hash = window.location.hash || '#hub';

    console.log("Yönlendiriliyor:", hash);

    if (hash === '#hub') {
        const html = await fetch('templates/hub.html').then(r => r.text());
        app.innerHTML = html;
    } 
    else if (hash === '#analysis') {
        const html = await fetch('templates/analysis.html').then(r => r.text());
        app.innerHTML = html;
        // DOM yüklendikten sonra App'i başlat
        setTimeout(() => {
            initApp(); 
        }, 100);
    }
    else if (hash === '#settings') {
        const html = await fetch('templates/settings.html').then(r => r.text());
        app.innerHTML = html;
        setTimeout(initSettingsPage, 100);
    }
}

function initSettingsPage() {
    const conf = JSON.parse(localStorage.getItem('tars_config')) || { thou: '.', dec: ',', date: 'DD.MM.YYYY' };
    
    const elThous = document.getElementById('setThousand');
    const elDec = document.getElementById('setDecimal');
    const elDate = document.getElementById('setDateFormat');

    if(elThous) elThous.value = conf.thou;
    if(elDec) elDec.value = conf.dec;
    if(elDate) elDate.value = conf.date;

    const btn = document.getElementById('btnSaveSettings');
    if(btn) {
        btn.onclick = () => {
            const newConf = {
                thou: elThous.value,
                dec: elDec.value,
                date: elDate.value
            };
            localStorage.setItem('tars_config', JSON.stringify(newConf));
            
            const msg = document.getElementById('settingsMsg');
            msg.innerText = "✅ Ayarlar Kaydedildi!";
            setTimeout(() => msg.innerText = "", 2000);
        };
    }
}

// Olayları Dinle
window.addEventListener('load', router);
window.addEventListener('hashchange', router);