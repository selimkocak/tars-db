// tars_db/src/engine/mod.rs
pub mod core;
pub mod query;
pub mod table;

use wasm_bindgen::prelude::*;
use ahash::AHashMap;
use roaring::RoaringBitmap;
use serde::{Serialize, Deserialize};
use crate::column::Column;

// --- ANA YAPI (STRUCT DEFINITION) ---
#[derive(Serialize, Deserialize)]
#[wasm_bindgen]
pub struct TarsEngine {
    pub(crate) columns: AHashMap<String, Column>,
    pub(crate) row_count: u32,
    
    // Geçici seçimler (diske kaydedilmez)
    #[serde(skip)]
    pub(crate) selections: AHashMap<String, RoaringBitmap>,
}