// tars_db/js/state.js

import { TarsLoc } from './localization.js'; // Modülü çağır

export const AppState = {
    db: null,
    chart1: null,
    chart2: null,
    activeCol1: null,
    activeCol2: null,
    
    // Global Localization Nesnesi
    loc: new TarsLoc(), 

    setDB(newDB) { this.db = newDB; },
    setActiveCols(c1, c2) { this.activeCol1 = c1; this.activeCol2 = c2; },
    
    // Ayarlar değişirse yeniden yükle
    refreshLoc() { this.loc = new TarsLoc(); }
};