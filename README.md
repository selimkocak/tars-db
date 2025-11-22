# 🚀 TarsDB Sense v2.0 "Quantum Matrix"

Dünyanın en hızlı, açık kaynak, sunucusuz (local-first) ve **akıllı** İş Zekası (BI) motoru.

## 🔥 Neden TarsDB?

| Özellik | Qlik Sense | TarsDB Sense |
|---------|------------|--------------|
| **Motor** | Associative (QIX) | Associative (Tars/WASM) |
| **Hız** | Çok Hızlı | **Ultra Hızlı (Rust)** |
| **Veri Tipi** | Otomatik (Temel) | **Kuantum Matrisi (Gelişmiş)** |
| **Gizlilik** | Bulut / Sunucu | **%100 Yerel (Tarayıcı)** |
| **Maliyet** | $$$ Lisans | **Ücretsiz & Açık Kaynak** |

## 🧠 Quantum Matrix Teknolojisi

TarsDB, verinizi yüklediğiniz anda analiz eder ve tipini "koklar":
* ✅ **Otomatik Tarih Algılama:** `2025-01-01`, `01.01.2025`
* ✅ **Para Birimi:** `₺1.250,00`, `$100`
* ✅ **İletişim Bilgileri:** E-posta, TR Telefon Numaraları (`+90...`)
* ✅ **Teknik:** IP Adresleri, JSON nesneleri

## 📦 Kurulum

1. Repo'yu klonlayın.
2. `python3 -m http.server 8080` (veya herhangi bir web sunucusu).
3. Tarayıcıda `localhost:8080` adresine gidin.
4. Excel/CSV dosyanızı sürükleyin ve analize başlayın.

---
*Designed by Prof. Dr. Tars All & Built with Rust 🦀*






#####
# 🚀 TarsDB: In-Memory Associative Engine (WASM)

> **The world's first open-source, client-side associative engine powered by Rust & WebAssembly.**

![License](https://img.shields.io/badge/license-MIT-blue)
![Rust](https://img.shields.io/badge/built_with-Rust-orange)
![WASM](https://img.shields.io/badge/platform-WebAssembly-purple)

## 🌟 What is TarsDB?
**TarsDB** is a high-performance, in-memory data engine that runs entirely in the browser (Client-Side). It eliminates the need for a backend server for data filtering and analysis.

It replicates the **Associative Experience** (Green/White/Gray logic) found in enterprise BI tools like Qlik Sense, but does it with **zero latency** using **Rust** and **WebAssembly**.

## ⚡ Key Features
* **Serverless:** Runs 100% in the client's browser. No API latency.
* **Associative Logic:** Selecting a value (Green) reveals relationships (White) and exclusions (Gray).
* **Blazing Fast:** Filters 1 Million rows in **< 1ms** using Roaring Bitmaps.
* **Cross-Filtering:** Interactive dashboards where charts filter each other instantly.

## 📊 Benchmark (Browser Performance)
Tested on a standard laptop browser via WebAssembly thread.

| Dataset Size | Operation | Time (Avg) |
| :--- | :--- | :--- |
| **1 Million Rows** | Data Ingestion | ~450ms |
| **1 Million Rows** | **Complex Query** | **0.25ms** |
| **10 Million Rows** | Complex Query | **3.50ms** |

## 🛠 Architecture
TarsDB uses a columnar storage layout optimized for SIMD operations.
* **Language:** Rust 🦀
* **Compilation:** WebAssembly (WASM) 🕸️
* **Indexing:** Roaring Bitmaps (Compressed Bitsets)
* **Hashing:** AHash (High-performance hashing)

## 🚀 Quick Start (Run Locally)

### Prerequisites
* Rust & Cargo
* Python 3 (for local server)

### 1. Clone & Build
```bash
git clone [https://github.com/selimkocak/tars-db.git](https://github.com/selimkocak/tars-db.git)
cd tars-db
wasm-pack build --target web
