// src/engine/mod.rs

pub mod core;
pub mod query;
pub mod table;
pub mod sniffer;

use wasm_bindgen::prelude::*;
use std::collections::HashMap; // AHashMap yerine
use roaring::RoaringBitmap;
use serde::{Serialize, Deserialize};
use crate::column::Column;

#[derive(Serialize, Deserialize)]
#[wasm_bindgen]
pub struct TarsEngine {
    pub(crate) columns: HashMap<String, Column>, // HashMap
    pub(crate) row_count: u32,
    
    #[serde(skip)]
    pub(crate) selections: HashMap<String, RoaringBitmap>, // HashMap
}