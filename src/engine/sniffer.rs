// src/engine/sniffer.rs

use crate::column::DataType;
use regex::Regex;
use lazy_static::lazy_static;
use std::collections::HashMap;

// Regex'leri derle (static ref kullanımı)
lazy_static! {
    static ref RE_DATE_ISO: Regex = Regex::new(r"^\d{4}-\d{2}-\d{2}$").unwrap();
    static ref RE_DATE_TR: Regex = Regex::new(r"^\d{2}\.\d{2}\.\d{4}$").unwrap();
    static ref RE_EMAIL: Regex = Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$").unwrap();
    static ref RE_PHONE: Regex = Regex::new(r"^\+?90\s?[\d\s\-\(\)]+$").unwrap();
    static ref RE_CURRENCY: Regex = Regex::new(r"^[₺$€£]").unwrap();
    static ref RE_IP: Regex = Regex::new(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$").unwrap();
    static ref RE_URL: Regex = Regex::new(r"^https?://").unwrap();
}

// Tip Algılama Fonksiyonu
pub fn detect_column_type(samples: &[&str]) -> (DataType, f32) {
    if samples.is_empty() { return (DataType::Utf8, 0.0); }

    let mut scores: HashMap<String, f64> = HashMap::new();
    let total = samples.len() as f64;

    for val in samples {
        let v = val.trim();
        
        // Boş değerleri atla ama toplam skora etki etmesin
        if v.is_empty() || v == "-" || v.to_lowercase() == "null" { 
            continue; 
        }

        // 1. Boolean
        if ["true", "false", "1", "0", "evet", "hayır"].contains(&v.to_lowercase().as_str()) {
            *scores.entry("Boolean".to_string()).or_insert(0.0) += 1.0;
        }

        // 2. Sayısal
        let clean_num = v.replace('.', "").replace(',', "."); 
        if let Ok(_) = clean_num.parse::<f64>() {
            if v.contains('%') {
                *scores.entry("Percentage".to_string()).or_insert(0.0) += 1.0;
            } else if RE_CURRENCY.is_match(v) {
                *scores.entry("Currency".to_string()).or_insert(0.0) += 1.0;
            } else if v.contains(',') || v.contains('.') {
                *scores.entry("Float".to_string()).or_insert(0.0) += 1.0;
            } else {
                *scores.entry("Integer".to_string()).or_insert(0.0) += 1.0;
            }
        }

        // 3. Tarih
        if RE_DATE_ISO.is_match(v) || RE_DATE_TR.is_match(v) {
            *scores.entry("Date".to_string()).or_insert(0.0) += 1.0;
        }

        // 4. Özel
        if RE_EMAIL.is_match(v) { *scores.entry("Email".to_string()).or_insert(0.0) += 1.0; }
        if RE_PHONE.is_match(v) { *scores.entry("Phone".to_string()).or_insert(0.0) += 1.0; }
        if RE_IP.is_match(v) { *scores.entry("IpAddress".to_string()).or_insert(0.0) += 1.0; }
        if RE_URL.is_match(v) { *scores.entry("Url".to_string()).or_insert(0.0) += 1.0; }
    }

    // En iyi skoru bul
    let threshold = total * 0.8; // %80 eşik değeri
    let mut best_type = DataType::Utf8;
    let mut max_score = 0.0;

    // Yardımcı closure yerine manuel kontrol (daha güvenli)
    let types = vec![
        ("Date", DataType::Date),
        ("Boolean", DataType::Boolean),
        ("Integer", DataType::Integer),
        ("Float", DataType::Float),
        ("Currency", DataType::Currency),
        ("Percentage", DataType::Percentage),
        ("Email", DataType::Email),
        ("Phone", DataType::Phone),
        ("IpAddress", DataType::IpAddress),
        ("Url", DataType::Url),
    ];

    for (key, t) in types {
        if let Some(&score) = scores.get(key) {
            if score > max_score && score >= threshold {
                max_score = score;
                best_type = t;
            }
        }
    }

    (best_type, (max_score / total) as f32)
}