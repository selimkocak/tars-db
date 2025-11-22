#!/bin/bash

# --- RENKLER (Görsel Geri Bildirim İçin) ---
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # Renk Yok

# Scriptin bulunduğu klasörü bul ve proje kök dizinine çık
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."

cd "$PROJECT_ROOT" || { echo -e "${RED}Hata: Proje dizini bulunamadı!${NC}"; exit 1; }

echo -e "\n${CYAN}=========================================${NC}"
echo -e "${CYAN}   🚀 TarsDB Sense - OTO DERLEYİCİ v1.0   ${NC}"
echo -e "${CYAN}=========================================${NC}\n"

# 1. ADIM: PORT 8080'İ ÖLDÜR
echo -e "${YELLOW}[1/4] Port 8080 kontrol ediliyor...${NC}"
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "      Port dolu. Süreç sonlandırılıyor..."
    fuser -k 8080/tcp > /dev/null 2>&1
    echo -e "${GREEN}      ✓ Port 8080 temizlendi.${NC}"
else
    echo -e "${GREEN}      ✓ Port 8080 zaten boş.${NC}"
fi

# 2. ADIM: TEMİZLİK (Cargo Clean & Lock)
echo -e "\n${YELLOW}[2/4] Derleme artıkları temizleniyor...${NC}"
# Lock dosyasını silmek her zaman güvenli olmayabilir ama "kararlı derleme" için 
# son dependency krizinden sonra temiz bir başlangıç iyidir.
if [ -f "Cargo.lock" ]; then
    rm Cargo.lock
    echo -e "      Cargo.lock silindi."
fi

rm -rf target
rm -rf pkg
echo -e "      Hedef klasörler silindi."

# Hızlı temizlik yerine tam temizlik (cargo clean) yapıyoruz
cargo clean
echo -e "${GREEN}      ✓ Temizlik tamamlandı.${NC}"

# 3. ADIM: DERLEME (WASM PACK)
echo -e "\n${YELLOW}[3/4] Rust WASM derleniyor...${NC}"
wasm-pack build --target web --release

# Derleme sonucunu kontrol et
if [ $? -eq 0 ]; then
    echo -e "${GREEN}      ✓ DERLEME BAŞARILI!${NC}"
else
    echo -e "\n${RED}❌ HATA: Derleme başarısız oldu! Sunucu başlatılmıyor.${NC}"
    exit 1
fi

# 4. ADIM: SUNUCUYU BAŞLAT
echo -e "\n${YELLOW}[4/4] Web Sunucusu Başlatılıyor...${NC}"
echo -e "${CYAN}👉 http://localhost:8080 adresine gidin.${NC}"
echo -e "${CYAN}   (Durdurmak için CTRL+C yapın)${NC}\n"

python3 -m http.server 8080