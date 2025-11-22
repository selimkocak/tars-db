# 1. Kilidi ve eski derlemeleri temizle
rm Cargo.lock
cargo clean

# 2. Yeni bağımlılıkları indir ve derle
wasm-pack build --target web


Sayın Meslektaşım,

Enerjinize hayranım. Cuma öğleden sonrası, rehavet zamanı değil, **devrim zamanıdır.** Hemen "Motorun Direksiyonunu" (Etkileşim Mekanizmasını) takıyoruz.

Şu an TarsDB "Devlet İstatistik Enstitüsü" gibi çalışıyor; soruyorsunuz, cevap veriyor ama duruşunu bozmuyor.
Şimdi onu **"Qlik Sense"** gibi akıllı yapacağız. Bir şeye dokunduğunuzda, tüm evren o dokunuşa göre yeniden şekillenecek.

Bunu başarmak için Motorun (Rust) beynine bir **"Hafıza" (State)** eklememiz lazım. Motorun şunu bilmesi gerek: *"Şu an kullanıcının elinde hangi filtreler var?"*

Hadi, 3 adımda bu işi bitirelim.

-----

### Adım 1: Rust Koduna "Hafıza" Ekliyoruz (`lib.rs`)

VS Code'da `src/lib.rs` dosyasını açın.
Mevcut kodun üzerine, **Seçim Mantığını (Selection Logic)** ekleyeceğiz.

Aşağıdaki kodda ne değişti?

1.  `selection_state`: Motorun içine, o an seçili olan satırları tutan bir Bitmap ekledik.
2.  `select_toggle`: Bir şehre tıkladığınızda seçimi yapan (veya kaldıran) fonksiyon.
3.  `query_filtered`: Artık sayım yaparken sadece seçili olanların içinden sayıyor.

**Lütfen `src/lib.rs` içeriğini tamamen silip, bu güncellenmiş motoru yapıştırın:**

```rust
use wasm_bindgen::prelude::*;
use roaring::RoaringBitmap;
use ahash::AHashMap;
use rand::Rng;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

struct Column {
    symbol_table: AHashMap<String, u32>,
    reverse_symbol: Vec<String>,
    data: Vec<u32>,
    bitmaps: Vec<RoaringBitmap>,
}

impl Column {
    fn new() -> Self {
        Self {
            symbol_table: AHashMap::new(),
            reverse_symbol: Vec::new(),
            data: Vec::new(),
            bitmaps: Vec::new(),
        }
    }

    fn insert(&mut self, value: &str, row_id: u32) {
        let symbol_id = if let Some(&id) = self.symbol_table.get(value) {
            id
        } else {
            let new_id = self.reverse_symbol.len() as u32;
            self.symbol_table.insert(value.to_string(), new_id);
            self.reverse_symbol.push(value.to_string());
            self.bitmaps.push(RoaringBitmap::new());
            new_id
        };
        self.data.push(symbol_id);
        self.bitmaps[symbol_id as usize].insert(row_id);
    }
}

#[wasm_bindgen]
pub struct TarsEngine {
    columns: AHashMap<String, Column>,
    row_count: u32,
    // --- YENİ: SEÇİM HAFIZASI ---
    // O anki geçerli (filtrelenmiş) satırların listesi.
    // Eğer boşsa (None), filtre yok demektir.
    current_selection: Option<RoaringBitmap>,
}

#[wasm_bindgen]
impl TarsEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        console_error_panic_hook::set_once();
        Self {
            columns: AHashMap::new(),
            row_count: 0,
            current_selection: None, // Başlangıçta seçim yok
        }
    }

    pub fn load_random_data(&mut self, count: u32) -> String {
        let start = js_sys::Date::now();
        
        let cities = vec!["Istanbul", "Ankara", "Izmir", "Antalya", "Bursa", "Trabzon", "Gaziantep", "Konya", "Adana", "Diyarbakir"];
        let depts = vec!["IT", "IK", "Satis", "Finans", "Lojistik", "Uretim", "ArGe", "Yonetim"];
        let mut rng = rand::thread_rng();

        for _ in 0..count {
            let city = cities[rng.gen_range(0..cities.len())];
            let dept = depts[rng.gen_range(0..depts.len())];
            let row_id = self.row_count;
            
            self.columns.entry("City".to_string()).or_insert_with(Column::new).insert(city, row_id);
            self.columns.entry("Department".to_string()).or_insert_with(Column::new).insert(dept, row_id);
            self.row_count += 1;
        }

        let end = js_sys::Date::now();
        format!("TarsDB: {} satır yüklendi ({:.2} ms)", count, end - start)
    }

    // --- YENİ: SEÇİM FONKSİYONU ---
    // Kullanıcı bir şehre tıkladığında burası çalışacak
    pub fn toggle_selection(&mut self, field: &str, value: &str) -> String {
        // 1. Tıklanan değerin Bitmap'ini bul (Örn: Ankara'nın kartviziti)
        let target_bitmap = if let Some(col) = self.columns.get(field) {
            if let Some(&sym_id) = col.symbol_table.get(value) {
                col.bitmaps[sym_id as usize].clone()
            } else {
                RoaringBitmap::new()
            }
        } else {
            RoaringBitmap::new()
        };

        // 2. Basit Logic: Seçim varsa kaldır, yoksa uygula (Toggle)
        // Gerçek bir Associative Engine'de burada AND/OR mantığı döner.
        // Şimdilik basit tutuyoruz: Tıklananı seç.
        
        match &self.current_selection {
            Some(current) => {
                if current == &target_bitmap {
                    // Zaten bu seçiliymiş, seçimi kaldır (Clear)
                    self.current_selection = None;
                    "Seçim Temizlendi".to_string()
                } else {
                    // Yeni seçim yap
                    self.current_selection = Some(target_bitmap);
                    format!("Filtre: {} = {}", field, value)
                }
            },
            None => {
                // Hiç seçim yokmuş, yeni seç
                self.current_selection = Some(target_bitmap);
                format!("Filtre: {} = {}", field, value)
            }
        }
    }

    // --- GÜNCELLENMİŞ SORGU ---
    // Artık "Current Selection" ile kesişim alıyor (AND işlemi)
    pub fn query_count(&self, field: &str, value: &str) -> u32 {
        let col = match self.columns.get(field) {
            Some(c) => c,
            None => return 0,
        };

        let field_bitmap = match col.symbol_table.get(value) {
            Some(&sym_id) => &col.bitmaps[sym_id as usize],
            None => return 0,
        };

        // Eğer bir filtre varsa, KESİŞİM (AND) al
        match &self.current_selection {
            Some(selection) => (field_bitmap & selection).len() as u32,
            None => field_bitmap.len() as u32, // Filtre yoksa hepsini say
        }
    }
    
    // Toplam seçili satır sayısını verir
    pub fn get_total_filtered_rows(&self) -> u32 {
        match &self.current_selection {
            Some(s) => s.len() as u32,
            None => self.row_count,
        }
    }
}

mod console_error_panic_hook {
    use std::panic;
    use wasm_bindgen::prelude::*;
    #[wasm_bindgen]
    extern "C" { #[wasm_bindgen(js_namespace = console)] fn error(msg: String); }
    pub fn set_once() { panic::set_hook(Box::new(|info| { error(info.to_string()); })); }
}
```

*(Kaydedin: CTRL+S)*

-----

### Adım 2: Motoru Tekrar Paketleyin (WASM Build)

Rust kodunu değiştirdiğimiz için tekrar derlememiz lazım. Terminalde:

```bash
wasm-pack build --target web
```

*(Yeşil INFO yazısını bekleyin. 10-20 saniye sürer.)*

-----

### Adım 3: Arayüzü Etkileşimli Yapın (`index.html`)

Şimdi `index.html` dosyasını güncelleyeceğiz. Chart.js kütüphanesinin `onClick` özelliğini kullanıp, tıklanan şehri yakalayacağız ve TarsDB'ye göndereceğiz.

**Mevcut `index.html` dosyasını silin ve bunu yapıştırın:**

```html
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TarsDB - Interactive</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background-color: #121212; color: #e0e0e0; padding: 20px; }
        .container { max-width: 1000px; margin: 0 auto; }
        h1 { background: linear-gradient(45deg, #00d4ff, #00ff9d); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 5px; }
        
        .badge { background: #333; padding: 4px 10px; border-radius: 10px; font-size: 0.8rem; color: #aaa; border: 1px solid #444; }
        
        .control-panel { background: #1e1e1e; padding: 20px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; margin: 20px 0; border: 1px solid #333; }
        button { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; }
        button:disabled { background: #444; cursor: not-allowed; color: #888; }
        
        .stats { display: flex; gap: 30px; }
        .stat-value { font-size: 1.5rem; font-weight: bold; color: #fff; text-align: right;}
        .stat-label { font-size: 0.8rem; color: #888; text-align: right;}
        
        .chart-container { background: #1e1e1e; padding: 20px; border-radius: 12px; border: 1px solid #333; height: 400px; position: relative; }
        
        /* Seçim Bilgisi */
        #selectionInfo { color: #00ff9d; font-weight: bold; margin-left: 10px; display: none; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🚀 TarsDB v0.2 (Interactive)</h1>
            <span class="badge">Associative Engine Active</span>
            <span id="selectionInfo"></span>
        </header>

        <div class="control-panel">
            <button id="btnLoad">💾 1 Milyon Veri Yükle</button>
            <div class="stats">
                <div>
                    <div class="stat-value" id="filteredRows">0</div>
                    <div class="stat-label">Filtrelenmiş Satır</div>
                </div>
                <div>
                    <div class="stat-value" id="queryTime">-</div>
                    <div class="stat-label">Hesaplama Süresi</div>
                </div>
            </div>
        </div>

        <div class="chart-container">
            <canvas id="myChart"></canvas>
        </div>
        <p style="text-align: center; color: #666; font-size: 0.9rem;">Grafikteki bir şehre tıklayarak filtreleyin.</p>
    </div>

    <script type="module">
        import init, { TarsEngine } from './pkg/tars_db.js';

        let db = null;
        let myChart = null;
        let isDataLoaded = false;
        const cities = ["Istanbul", "Ankara", "Izmir", "Antalya", "Bursa", "Trabzon", "Gaziantep", "Konya", "Adana", "Diyarbakir"];

        async function run() {
            await init();
            db = new TarsEngine();
            
            initChart();

            document.getElementById('btnLoad').onclick = function() {
                this.innerHTML = "Yükleniyor...";
                this.disabled = true;
                setTimeout(() => {
                    db.load_random_data(1000000);
                    isDataLoaded = true;
                    this.innerHTML = "✅ Veri Yüklendi";
                    this.classList.add('success');
                    updateDashboard();
                }, 50);
            };
        }

        function initChart() {
            const ctx = document.getElementById('myChart').getContext('2d');
            Chart.defaults.color = '#888';
            Chart.defaults.borderColor = '#333';
            
            myChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: cities,
                    datasets: [{
                        label: 'Çalışan Sayısı',
                        data: Array(cities.length).fill(0),
                        backgroundColor: 'rgba(0, 212, 255, 0.6)',
                        hoverBackgroundColor: 'rgba(0, 255, 157, 0.8)', // Hover rengi
                        borderWidth: 0,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    onClick: handleChartClick, // TIKLAMA OLAYI!
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.raw.toLocaleString() + " Kişi";
                                }
                            }
                        }
                    },
                    scales: {
                        y: { beginAtZero: true },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // --- SİHİRLİ DOKUNUŞ ---
        function handleChartClick(evt, elements) {
            if (!isDataLoaded || elements.length === 0) return;

            // 1. Tıklanan şehri bul
            const index = elements[0].index;
            const selectedCity = cities[index];

            // 2. RUST MOTORUNA GÖNDER! (Selection)
            const statusMsg = db.toggle_selection("City", selectedCity);

            // 3. Arayüzü Güncelle
            const infoSpan = document.getElementById('selectionInfo');
            infoSpan.style.display = 'inline';
            infoSpan.innerText = " | " + statusMsg;
            
            // 4. TÜM RAKAMLARI YENİDEN HESAPLA
            updateDashboard();
        }

        function updateDashboard() {
            const start = performance.now();
            
            // Rust'tan güncel sayıları çek (Filtre varsa otomatik uygulanır)
            const counts = cities.map(city => db.query_count("City", city));
            const totalFiltered = db.get_total_filtered_rows();
            
            const end = performance.now();

            // Grafiği Güncelle
            myChart.data.datasets[0].data = counts;
            
            // Renkleri Güncelle (Seçili olanı vurgula)
            // Basit bir mantık: Eğer sayı > 0 ise renkli, 0 ise gri yapabiliriz
            // veya tıklananı JS tarafında da tutabiliriz. 
            // Şimdilik TarsDB sonucu direkt yansıtıyor.
            
            myChart.update();

            // İstatistikleri Yaz
            document.getElementById('filteredRows').innerText = totalFiltered.toLocaleString();
            document.getElementById('queryTime').innerText = (end - start).toFixed(2) + " ms";
        }

        run();
    </script>
</body>
</html>
```

-----

### Final Testi

1.  **Sunucuyu Çalıştır:** `python3 -m http.server 8080`
2.  **Tarayıcıyı Yenile:** `http://192.168.2.170:8080`
3.  **Veri Yükle:** Butona basın.
4.  **ETKİLEŞİM ANI:**
      * Grafikteki **"Ankara"** çubuğuna tıklayın.
      * **Ne Olacak?**
          * "Filtrelenmiş Satır" sayısı düşecek (Sadece Ankara'dakiler kalacak).
          * Diğer şehirlerin barları **sıfıra inecek** (Çünkü Ankara'yı seçtiğinizde diğer şehirlerde çalışan olamaz - Mantık doğru).
          * Ankara çubuğuna **tekrar tıklarsanız**, filtre kalkacak ve hepsi geri gelecek.

Hocam, bu etkileşimi (Tıkla -\> Rust Hesapla -\> Grafik Güncelle) **milisaniyeler içinde** yapabiliyorsanız, TarsDB artık gerçek bir Associative Engine olmuştur.

Sonucu (Tıklanmış halinin görüntüsünü) bekliyorum\! 🚀

###
****************
Sayın Meslektaşım,

Çok haklısınız, o "hayalet" sunucuyu orada bırakmak olmaz.

Sizin denediğiniz `python kill ...` komutunun çalışmama sebebi şu: `kill` bir Python dosyası değil, Linux'un kendi **"Yok Etme"** komutudur. O yüzden başına `python` yazmadan, direkt işletim sistemine emir vermemiz gerekir.

İşte o inatçı sunucuyu (8080 portunu işgal edeni) susturmanın en kestirme yolları:

### Yöntem 1: "Limanı Temizle" (En Kolayı - Sniper Atışı) 🎯

Bu komut, doğrudan "8080 portunu kim kullanıyorsa onu bul ve bitir" der.

Terminalde şunu çalıştırın:

```bash
fuser -k 8080/tcp
```

*(Eğer komut yok derse `sudo apt install psmisc` ile yükleyebilirsiniz, ama Ubuntu'da genelde vardır).*

-----

### Yöntem 2: "Tüm Python'ları Durdur" (Bazuka Atışı) 💣

Eğer o sanal makinede çalışan başka kritik bir Python işiniz yoksa (ki şu an sadece bu proje var), en garantisi budur. Tüm çalışan Python süreçlerini sonlandırır.

```bash
pkill -f python3
```

*veya*

```bash
killall -9 python3
```

-----

### Yöntem 3: "Manuel Tespit" (Cerrah Titizliği) 🔍

Eğer "Ben görerek vurmak istiyorum" derseniz:

1.  Önce suçluyu bulun (PID numarasını öğrenin):

    ```bash
    lsof -i :8080
    ```

    *(Size `python3  12345 ...` gibi bir satır verecek. Oradaki `12345` PID numarasıdır.)*

2.  Sonra o numarayı hedef alarak vurun:

    ```bash
    kill -9 <PID_NUMARASI>
    ```

    *(Örneğin: `kill -9 12345`)*

-----

### Temizlik Sonrası

Komutu uyguladıktan sonra tekrar orijinal komutunuzu çalıştırabilirsiniz:

```bash
python3 -m http.server 8080
```

Artık hata vermeyecektir. Sunucuyu açın, tarayıcıdan girin ve o **Tıklanabilir Grafiği** test edin.

Sonucu heyecanla bekliyorum\! 🚀
