// tars_db/src/utils.rs
use wasm_bindgen::prelude::*;

pub fn set_panic_hook() {
    // Hata olursa tarayıcı konsolunda kırmızı yazsın diye
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

// Console.log makrosu için bir wrapper (Opsiyonel ama temizlik için iyi)
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    pub fn log(s: &str);
}