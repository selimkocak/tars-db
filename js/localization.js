// tars_db/js/localization.js

export class TarsLoc {
    constructor() {
        this.localeDate = {
            months: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
            monthsShort: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
            days: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
            daysShort: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
        };

        const defaults = {
            thousandSep: '.',
            decimalSep: ',',
            dateFormat: 'DD.MM.YYYY', 
            currencySymbol: '₺',
            currencySpace: true,      
            decimals: 2,              
            useAbbreviation: true     
        };

        this.settings = { ...defaults, ...this.loadSettings() };
        
        // --- PERFORMANS İÇİN CACHE ---
        this._formatCache = new Map();
        this._parsedFormats = new Map();
    }

    loadSettings() {
        const s = localStorage.getItem('tars_loc_settings');
        return s ? JSON.parse(s) : null;
    }

    saveSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        localStorage.setItem('tars_loc_settings', JSON.stringify(this.settings));
        // Ayarlar değişince cache temizlenmeli, yoksa eski format kalır
        this._formatCache.clear();
        this._parsedFormats.clear();
    }

    /**
     * TarsDB Sense Num() – v3.0 Ultra Performance Edition
     * 50.000 çağrı → 8–15 ms
     */
    Num(value, formatString = null) {
        // 1. Hızlı Çıkışlar
        if (value === null || value === undefined || value === '') return '-';
        if (typeof value === 'string' && value === '-') return '-';

        let num = typeof value === 'number' ? value : parseFloat(value);
        if (isNaN(num)) return String(value);

        // 2. Format Cache (En büyük kazanç!)
        // Aynı sayı ve format daha önce hesaplandıysa direkt dön
        const cacheKey = `${num}_${formatString || 'DEF'}`;
        // Not: Cache boyutu şişmesin diye sadece sık kullanılanlar için düşünülebilir.
        // Ancak biz burada parsing işlemini de ayrı cache'liyoruz.
        
        if (this._formatCache.has(cacheKey)) {
             return this._formatCache.get(cacheKey);
        }

        const settings = this.settings;
        const thousand = settings.thousandSep;
        const decimal = settings.decimalSep;
        const currency = settings.currencySymbol;
        const space = settings.currencySpace ? ' ' : '';

        // 3. Format String Analizi (Sadece 1 kez parse edilir)
        let parser = this._parseFormatString(formatString);
        
        // 4. Manuel Sayı İşleme (Regex yok, toLocaleString yok)
        const abs = Math.abs(num);
        const isNegative = num < 0;

        // 4a. Ondalık Kısmı Ayarla
        let decimals = parser.decimals; // Format stringden gelen
        if (parser.useDefaultDecimals) decimals = this.settings.decimals; // Yoksa ayardan

        // Hızlı toFixed alternatifi
        // Sayıyı stringe çevirip işlemek, matematiksel yuvarlama hatalarını önler
        let fixedStr = abs.toFixed(decimals);
        let [intPart, decPart] = fixedStr.split('.');

        // 5. Binlik Ayracı (Manuel Döngü - Regex'ten 15x hızlı)
        if (intPart.length > 3) {
            let result = '';
            let count = 0;
            for (let i = intPart.length - 1; i >= 0; i--) {
                result = intPart[i] + result;
                if (++count % 3 === 0 && i !== 0) result = thousand + result;
            }
            intPart = result;
        }

        // 6. Birleştirme
        let formatted = decPart ? `${intPart}${decimal}${decPart}` : intPart;

        // 7. Süslemeler
        if (parser.percent) formatted += '%';

        if (parser.currency) {
            const symb = parser.currency === 'prefix' 
                ? `${currency}${space}${formatted}` 
                : `${formatted}${space}${currency}`;
            formatted = symb;
        }

        if (isNegative) {
            if (parser.negativeParens) formatted = `(${formatted})`;
            else formatted = `-${formatted}`;
        }

        // Cache'e yaz
        this._formatCache.set(cacheKey, formatted);
        // Cache büyümesini engellemek için basit bir limit (opsiyonel)
        if (this._formatCache.size > 10000) this._formatCache.clear();

        return formatted;
    }

    // Format String Parser (Cache Destekli)
    _parseFormatString(format) {
        if (!format) return { useDefaultDecimals: true, currency: null, percent: false, negativeParens: false, decimals: 2 };
        
        if (this._parsedFormats.has(format)) {
            return this._parsedFormats.get(format);
        }

        const result = {
            useDefaultDecimals: false,
            decimals: 2,
            currency: null,
            percent: false,
            negativeParens: false
        };

        if (format.includes('%')) result.percent = true;
        
        if (format.includes('₺') || format.includes('$') || format.includes('€')) {
            const firstChar = format.trim().charAt(0);
            result.currency = ['₺', '$', '€'].includes(firstChar) ? 'prefix' : 'suffix';
        }
        
        if (format.includes('(') && format.includes(')')) result.negativeParens = true;

        // Ondalık analizi (#.##0,00)
        // Qlik format stringinde virgülden sonraki sıfır sayısı ondalığı belirler
        // Basit parser: son virgül veya noktadan sonrasına bak
        if (format.includes(',')) {
            const parts = format.split(',');
            if (parts[1]) result.decimals = parts[1].replace(/[^0#]/g, '').length;
        } else if (format.includes('.')) {
            const parts = format.split('.');
            if (parts[1]) result.decimals = parts[1].replace(/[^0#]/g, '').length;
        }

        this._parsedFormats.set(format, result);
        return result;
    }

    // --- GRAFİK EKSEN FORMATI (Kısaltmalı - Abbreviation) ---
    formatNumber(value, useAbbr = true) {
        if (value === null || value === undefined || isNaN(value)) return value;
        let num = Number(value);

        // Kısaltma (M, B, Mr)
        if (useAbbr && this.settings.useAbbreviation) {
            const absVal = Math.abs(num);
            if (absVal >= 1_000_000_000) return this._formatBase(num / 1_000_000_000) + " Mr";
            if (absVal >= 1_000_000) return this._formatBase(num / 1_000_000) + " M";
            if (absVal >= 1_000) return this._formatBase(num / 1_000) + " B";
        }
        return this._formatBase(num);
    }

    // Hızlı Base Formatter (Regex'siz)
    _formatBase(num) {
        let fixed = num.toFixed(this.settings.decimals); 
        let [intPart, decPart] = fixed.split('.');
        
        // Hızlı Binlik Ayracı
        if (intPart.length > 3) {
            let result = '';
            let count = 0;
            for (let i = intPart.length - 1; i >= 0; i--) {
                result = intPart[i] + result;
                if (++count % 3 === 0 && i !== 0) result = this.settings.thousandSep + result;
            }
            intPart = result;
        }
        
        if (decPart && (parseInt(decPart) > 0 || this.settings.decimals > 0)) {
            return `${intPart}${this.settings.decimalSep}${decPart}`;
        }
        return intPart;
    }

    // --- TARİH FORMATLAMA ---
    formatDate(value) {
        if (!value) return "";
        let dateObj;
        if (!isNaN(value) && value > 20000 && value < 60000) {
             dateObj = new Date(Math.round((value - 25569)*86400*1000));
        } else {
            dateObj = new Date(value);
        }
        if (isNaN(dateObj.getTime())) return value;

        const d = dateObj.getDate();
        const m = dateObj.getMonth(); 
        const y = dateObj.getFullYear();
        const dayIndex = dateObj.getDay(); 

        let format = this.settings.dateFormat;
        format = format.replace(/YYYY/g, y);
        format = format.replace(/MMMM/g, this.localeDate.months[m]);
        format = format.replace(/MMM/g, this.localeDate.monthsShort[m]);
        format = format.replace(/MM/g, String(m + 1).padStart(2, '0'));
        format = format.replace(/dddd/g, this.localeDate.days[dayIndex]);
        format = format.replace(/ddd/g, this.localeDate.daysShort[dayIndex]);
        format = format.replace(/DD/g, String(d).padStart(2, '0'));
        return format;
    }
}