// tars_db/src/column.rs
use roaring::RoaringBitmap;
use ahash::AHashMap;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct Column {
    pub symbol_table: AHashMap<String, u32>,
    pub reverse_symbol: Vec<String>,
    pub data: Vec<u32>,
    pub bitmaps: Vec<RoaringBitmap>,
}

impl Column {
    pub fn new() -> Self {
        Self {
            symbol_table: AHashMap::new(),
            reverse_symbol: Vec::new(),
            data: Vec::new(),
            bitmaps: Vec::new(),
        }
    }

    pub fn insert(&mut self, value: &str, row_id: u32) {
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