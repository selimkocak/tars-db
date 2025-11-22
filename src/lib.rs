// tars_db/src/lib.rs

mod utils;
mod column;
mod engine; // engine klasörünü modül olarak ekle

// JavaScript'e engine::TarsEngine'i doğrudan açıyoruz
pub use crate::engine::TarsEngine;

// Bellek optimizasyonu
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;