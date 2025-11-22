// tars_db/src/engine/table.rs

use wasm_bindgen::prelude::*;
use crate::engine::TarsEngine;

#[wasm_bindgen]
impl TarsEngine {
    pub fn get_table_data(
        &self, 
        columns_str: &str, 
        offset: usize, 
        limit: usize, 
        sort_by: Option<String>, 
        sort_desc: bool
    ) -> String {
        let col_names: Vec<&str> = columns_str.split(',').map(|s| s.trim()).filter(|s| !s.is_empty()).collect();
        if col_names.is_empty() { return "[]".to_string(); }

        // 1. Filtreleri Uygula
        let filter = self.get_combined_filter(None);
        
        // 2. Geçerli Satırları Bul
        let mut valid_rows: Vec<u32> = match filter {
            Some(bitmap) => bitmap.iter().map(|i| i as u32).collect(),
            None => (0..self.row_count).collect(),
        };

        // 3. Sıralama
        if let Some(sort_col_name) = sort_by {
            if let Some(col) = self.columns.get(&sort_col_name) {
                valid_rows.sort_by(|&a, &b| {
                    let val_a = &col.reverse_symbol[col.data[a as usize] as usize];
                    let val_b = &col.reverse_symbol[col.data[b as usize] as usize];
                    
                    if let (Ok(na), Ok(nb)) = (val_a.parse::<f64>(), val_b.parse::<f64>()) {
                        if sort_desc { nb.partial_cmp(&na).unwrap() } else { na.partial_cmp(&nb).unwrap() }
                    } else {
                        if sort_desc { val_b.cmp(val_a) } else { val_a.cmp(val_b) }
                    }
                });
            }
        }

        // 4. Sayfalama
        let total_rows = valid_rows.len();
        let start = if offset >= total_rows { total_rows } else { offset };
        let end = if start + limit > total_rows { total_rows } else { start + limit };
        let page_rows = &valid_rows[start..end];

        // 5. JSON Çıktısı
        let mut result = String::with_capacity(page_rows.len() * col_names.len() * 20);
        result.push('[');
        
        for (i, &row_id) in page_rows.iter().enumerate() {
            if i > 0 { result.push(','); }
            result.push('{');
            
            for (j, &col_name) in col_names.iter().enumerate() {
                if let Some(col) = self.columns.get(col_name) {
                    let symbol_id = col.data[row_id as usize];
                    let value = &col.reverse_symbol[symbol_id as usize];
                    
                    if j > 0 { result.push(','); }
                    let escaped_val = value.replace("\"", "\\\"");
                    result.push_str(&format!("\"{}\":\"{}\"", col_name, escaped_val));
                }
            }
            result.push('}');
        }
        result.push(']');
        
        result
    }
}
