use wasm_bindgen::prelude::*;
use roaring::RoaringBitmap;
use ahash::AHashMap;
use rand::Rng;

// --- COLUMN YAPISI ---
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
    current_selection: Option<RoaringBitmap>,
    selected_field: Option<String>,
    selected_value: Option<String>,
}

#[wasm_bindgen]
impl TarsEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        console_error_panic_hook::set_once();
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

    pub fn toggle_selection(&mut self, field: &str, value: &str) -> String {
        if let Some(f) = &self.selected_field {
            if f == field && self.selected_value.as_deref() == Some(value) {
                self.current_selection = None;
                self.selected_field = None;
                self.selected_value = None;
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

        match &self.current_selection {
            Some(sel) => (field_bitmap & sel).len() as u32,
            None => field_bitmap.len() as u32,
        }
    }
    
    pub fn get_state(&self, field: &str, value: &str) -> u8 {
        if let Some(sel_f) = &self.selected_field {
            if sel_f == field && self.selected_value.as_deref() == Some(value) {
                return 2;
            }
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

    // DÜZELTME BURADA: Bu fonksiyon artık 'impl' bloğunun İÇİNDE.
    pub fn query_global_count(&self, field: &str, value: &str) -> u32 {
        if let Some(col) = self.columns.get(field) {
            if let Some(&symbol_id) = col.symbol_table.get(value) {
                return col.bitmaps[symbol_id as usize].len() as u32;
            }
        }
        0
    }
} // <--- KAPANIŞ PARANTEZİ BURADA OLMALI

mod console_error_panic_hook {
    use std::panic;
    use wasm_bindgen::prelude::*;
    #[wasm_bindgen]
    extern "C" { #[wasm_bindgen(js_namespace = console)] fn error(msg: String); }
    pub fn set_once() { panic::set_hook(Box::new(|info| { error(info.to_string()); })); }
}