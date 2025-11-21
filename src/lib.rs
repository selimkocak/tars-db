// tars_db/src/lib.rs
// Modülleri tanımla
mod utils;
mod column;
mod engine;

// Sadece Engine'i dışarıya (JavaScript'e) aç
pub use crate::engine::TarsEngine;

// Bellek optimizasyonu için allocator (Opsiyonel ama iyi practice)
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;