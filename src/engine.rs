// tars_db/src/engine.rs
use wasm_bindgen::prelude::*;
use roaring::RoaringBitmap;
use ahash::AHashMap;
use rand::Rng;
use std::io::Cursor;
use serde::{Serialize, Deserialize};
use crate::column::Column; // Diğer dosyayı çağırıyoruz!

#[derive(Serialize, Deserialize)]
#[wasm_bindgen]
pub struct TarsEngine {
    pub(crate) columns: AHashMap<String, Column>, // pub(crate): Sadece bu proje içinden erişilebilir
    pub(crate) row_count: u32,
    
    #[serde(skip)]
    current_selection: Option<RoaringBitmap>,
    #[serde(skip)]
    selected_field: Option<String>,
    #[serde(skip)]
    selected_value: Option<String>,
}

#[wasm_bindgen]
impl TarsEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        crate::utils::set_panic_hook(); // Utils dosyasını çağırıyoruz
        Self {
            columns: AHashMap::new(),
            row_count: 0,
            current_selection: None,
            selected_field: None,
            selected_value: None,
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
        engine.current_selection = None;
        engine.selected_field = None;
        engine.selected_value = None;
        engine
    }

    // --- QUERY LOGIC ---
    pub fn toggle_selection(&mut self, field: &str, value: &str) -> String {
        if let Some(f) = &self.selected_field {
            if f == field && self.selected_value.as_deref() == Some(value) {
                self.current_selection = None; self.selected_field = None; self.selected_value = None;
                return "Seçim Kaldırıldı".to_string();
            }
        }
        let col = self.columns.get(field).unwrap();
        if let Some(&sym_id) = col.symbol_table.get(value) {
            self.current_selection = Some(col.bitmaps[sym_id as usize].clone());
            self.selected_field = Some(field.to_string());
            self.selected_value = Some(value.to_string());
            return format!("{} = {}", field, value);
        }
        "Hata".to_string()
    }

    pub fn query_count(&self, field: &str, value: &str) -> u32 {
        let col = match self.columns.get(field) { Some(c) => c, None => return 0 };
        let field_bitmap = match col.symbol_table.get(value) { Some(&id) => &col.bitmaps[id as usize], None => return 0 };
        match &self.current_selection { Some(sel) => (field_bitmap & sel).len() as u32, None => field_bitmap.len() as u32 }
    }

    pub fn query_global_count(&self, field: &str, value: &str) -> u32 {
        if let Some(col) = self.columns.get(field) {
            if let Some(&symbol_id) = col.symbol_table.get(value) {
                return col.bitmaps[symbol_id as usize].len() as u32;
            }
        }
        0
    }

    pub fn get_state(&self, field: &str, value: &str) -> u8 {
        if let Some(sel_f) = &self.selected_field {
            if sel_f == field && self.selected_value.as_deref() == Some(value) { return 2; }
        }
        match &self.current_selection {
            None => 1, 
            Some(sel) => {
                let col = self.columns.get(field).unwrap();
                if let Some(&sym_id) = col.symbol_table.get(value) {
                    let field_bitmap = &col.bitmaps[sym_id as usize];
                    if !field_bitmap.is_disjoint(sel) { 1 } else { 0 }
                } else { 0 }
            }
        }
    }

    pub fn get_total_filtered(&self) -> u32 {
        match &self.current_selection { Some(s) => s.len() as u32, None => self.row_count }
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
