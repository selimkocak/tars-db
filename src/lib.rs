// tars_db/src/lib.rs

mod utils;
mod column;
mod engine; // Artık engine klasöründeki mod.rs'i arayacak

pub use crate::engine::TarsEngine;

#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;