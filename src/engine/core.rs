// tars_db/src/engine/core.rs

use wasm_bindgen::prelude::*;
use crate::engine::TarsEngine;
use crate::column::Column;
use ahash::AHashMap;
use rand::Rng;
use std::io::Cursor;

#[wasm_bindgen]
impl TarsEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        crate::utils::set_panic_hook();
        Self {
            columns: AHashMap::new(),
            row_count: 0,
            selections: AHashMap::new(),
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

    pub fn export_db(&self) -> Vec<u8> {
        bincode::serialize(self).unwrap()
    }

    pub fn import_db(data: &[u8]) -> TarsEngine {
        let mut engine: TarsEngine = bincode::deserialize(data).expect("Dosya bozuk");
        engine.selections = AHashMap::new(); 
        engine
    }
}