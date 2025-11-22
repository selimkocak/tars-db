// tars_db/src/engine.rs
use wasm_bindgen::prelude::*;
use roaring::RoaringBitmap;
use ahash::AHashMap;
use rand::Rng;
use std::io::Cursor;
use serde::{Serialize, Deserialize};
use crate::column::Column; 

#[derive(Serialize, Deserialize)]
#[wasm_bindgen]
pub struct TarsEngine {
    pub(crate) columns: AHashMap<String, Column>,
    pub(crate) row_count: u32,
    
    // DEĞİŞİKLİK 1: Tek seçim yerine, Field Bazlı Bitmap Haritası
    // #[serde(skip)] ile diske kaydederken bu geçici seçimleri yoksayıyoruz.
    #[serde(skip)]
    selections: AHashMap<String, RoaringBitmap>,
}

#[wasm_bindgen]
impl TarsEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        crate::utils::set_panic_hook();
        Self {
            columns: AHashMap::new(),
            row_count: 0,
            selections: AHashMap::new(), // Yeni yapı başlatılıyor
        }
    }

    pub fn load_random_data(&mut self, count: u32) {
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
    }

    pub fn load_csv_data(&mut self, content: &str) -> String {
        let mut rdr = csv::ReaderBuilder::new().has_headers(true).from_reader(Cursor::new(content));
        let headers = match rdr.headers() { Ok(h) => h.clone(), Err(_) => return "Hata: Başlık okunamadı".to_string() };
        let col_names: Vec<String> = headers.iter().map(|h| h.to_string()).collect();
        
        let start_count = self.row_count;
        for result in rdr.records() {
            if let Ok(record) = result {
                let row_id = self.row_count;
                for (i, field_value) in record.iter().enumerate() {
                    if i < col_names.len() {
                        self.columns.entry(col_names[i].clone()).or_insert_with(Column::new).insert(field_value, row_id);
                    }
                }
                self.row_count += 1;
            }
        }
        format!("CSV Yüklendi: {} satır, {} kolon.", self.row_count - start_count, col_names.len())
    }

    // --- PERSISTENCE ---
    pub fn export_db(&self) -> Vec<u8> {
        bincode::serialize(self).unwrap()
    }

    pub fn import_db(data: &[u8]) -> TarsEngine {
        let mut engine: TarsEngine = bincode::deserialize(data).expect("Dosya bozuk");
        // Import ederken seçimleri sıfırla
        engine.selections = AHashMap::new();
        engine
    }

    // --- QUERY LOGIC (MULTI-SELECT CORE) ---
    
    // Yardımcı Fonksiyon: Belirli bir alan hariç diğer tüm alanların kesişimini (AND) al.
    // Bu, "White/Possible" alanını hesaplamak için kritiktir.
    fn get_combined_filter(&self, exclude_field: Option<&str>) -> Option<RoaringBitmap> {
        let mut iter = self.selections.iter();
        
        // İlk geçerli bitmap'i bul
        let mut result_bitmap: Option<RoaringBitmap> = None;

        for (field, bitmap) in iter {
            // Eğer exclude_field verilmişse, o alanı hesaplamaya katma
            if let Some(ex) = exclude_field {
                if field == ex { continue; }
            }

            match result_bitmap {
                None => result_bitmap = Some(bitmap.clone()),
                Some(ref mut res) => *res &= bitmap, // AND işlemi
            }
        }
        result_bitmap
    }

    // Seçim Yap / Kaldır (Toggle)
    pub fn toggle_selection(&mut self, field: &str, value: &str) -> String {
        let col = match self.columns.get(field) {
            Some(c) => c,
            None => return "Hata: Kolon bulunamadı".to_string(),
        };

        if let Some(&sym_id) = col.symbol_table.get(value) {
            let val_bitmap = &col.bitmaps[sym_id as usize];
            
            // Bu alan için zaten bir seçim listesi var mı? Yoksa oluştur.
            let selection = self.selections.entry(field.to_string()).or_insert_with(RoaringBitmap::new);
            
            // XOR İşlemi: Varsa çıkarır, Yoksa ekler.
            *selection ^= val_bitmap;

            // Eğer bu alanda hiç seçim kalmadıysa, map'ten sil (Performans için önemli)
            if selection.is_empty() {
                self.selections.remove(field);
                return format!("Seçim temizlendi: {}", field);
            }
            
            return format!("{} güncellendi", field);
        }
        "Hata: Değer bulunamadı".to_string()
    }

    // Bir değerin durumunu hesapla: 2=Yeşil (Selected), 1=Mavi/Beyaz (Possible), 0=Gri (Excluded)
    pub fn get_state(&self, field: &str, value: &str) -> u8 {
        let col = self.columns.get(field).unwrap();
        
        // Sembol yoksa direkt gri
        let sym_id = match col.symbol_table.get(value) {
            Some(&id) => id,
            None => return 0,
        };
        let val_bitmap = &col.bitmaps[sym_id as usize];

        // 1. DURUM: SELECTED (Yeşil)
        // Eğer bu alan 'selections' içinde varsa ve bu değer o bitmap'in içindeyse
        if let Some(sel_bitmap) = self.selections.get(field) {
            // intersection_len > 0 yerine !is_disjoint daha hızlıdır
            // Ancak tam eşleşme kontrolü için: Bu değer, seçim setinin bir parçası mı?
            // Qlik mantığında: Seçili kümenin içinde bu değerin satırları var mı? Evet.
            // Ama buradaki 'sel_bitmap' birden fazla değerin birleşimi (OR).
            // O yüzden kesişim kontrolü yeterli: Eğer kesişiyorsa bu değer SEÇİLMİŞTİR.
            if !sel_bitmap.is_disjoint(val_bitmap) {
                return 2; // YEŞİL
            }
        }

        // 2. DURUM: EXCLUDED vs POSSIBLE
        // Bu alan HARİÇ diğer tüm filtrelerin kesişimini al (Global Context)
        let other_filters = self.get_combined_filter(Some(field));

        match other_filters {
            None => 1, // Hiçbir dış filtre yoksa her şey mümkündür (BEYAZ/MAVİ)
            Some(global_filter) => {
                if !global_filter.is_disjoint(val_bitmap) {
                    1 // Kesişim var -> POSSIBLE (BEYAZ/MAVİ)
                } else {
                    0 // Kesişim yok -> EXCLUDED (GRİ)
                }
            }
        }
    }

    // Seçimlere göre bir değerin kaç satır içerdiğini hesapla
    pub fn query_count(&self, field: &str, value: &str) -> u32 {
        let col = match self.columns.get(field) { Some(c) => c, None => return 0 };
        let field_bitmap = match col.symbol_table.get(value) { Some(&id) => &col.bitmaps[id as usize], None => return 0 };
        
        // Tüm aktif filtreleri (bu alan dahil) birleştir
        let all_filters = self.get_combined_filter(None); // None -> Hiçbir alanı hariç tutma

        match all_filters {
            Some(filter) => (field_bitmap & &filter).len() as u32,
            None => field_bitmap.len() as u32
        }
    }

    // Global (seçimden bağımsız) o değerin toplam satır sayısı (Gri renkli barların tam boyu için)
    pub fn query_global_count(&self, field: &str, value: &str) -> u32 {
        if let Some(col) = self.columns.get(field) {
            if let Some(&symbol_id) = col.symbol_table.get(value) {
                return col.bitmaps[symbol_id as usize].len() as u32;
            }
        }
        0
    }

    // Toplam filtrelenmiş satır sayısı (Üstteki sayaç için)
    pub fn get_total_filtered(&self) -> u32 {
        // Tüm filtrelerin kesişimi
        match self.get_combined_filter(None) {
            Some(filter) => filter.len() as u32,
            None => self.row_count // Filtre yoksa tüm satırlar
        }
    }

    pub fn get_column_names(&self) -> String {
        let keys: Vec<String> = self.columns.keys().cloned().collect();
        keys.join(",")
    }

    pub fn get_top_values(&self, field: &str) -> String {
         if let Some(col) = self.columns.get(field) {
             let values: Vec<String> = col.reverse_symbol.iter().take(15).cloned().collect();
             values.join(",")
         } else { "".to_string() }
    }
}