// src/column.rs

use roaring::RoaringBitmap;
use std::collections::HashMap; // AHashMap yerine bunu kullanıyoruz
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Copy)]
pub enum DataType {
    Null, Utf8, Boolean, Integer, Float, Date, DateTime, Time, Currency, Percentage, Email, Phone, Url, IpAddress,
}

#[derive(Serialize, Deserialize)]
pub struct Column {
    pub symbol_table: HashMap<String, u32>, // HashMap oldu
    pub reverse_symbol: Vec<String>,
    pub data: Vec<u32>,
    pub bitmaps: Vec<RoaringBitmap>,
    pub col_type: DataType,
    pub type_confidence: f32, 
}

impl Column {
    pub fn new() -> Self {
        Self {
            symbol_table: HashMap::new(), // HashMap::new()
            reverse_symbol: Vec::new(),
            data: Vec::new(),
            bitmaps: Vec::new(),
            col_type: DataType::Utf8,
            type_confidence: 0.0,
        }
    }
    
    pub fn set_type(&mut self, t: DataType, confidence: f32) {
        self.col_type = t;
        self.type_confidence = confidence;
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