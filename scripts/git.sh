#!/bin/bash
# ==========================================
# 🚀 TarsDB – GitHub Sync Script
# ==========================================
set -e # Hata olursa durdur

# --- AYARLAR ---
# Projenin bulunduğu dizin
PROJECT_DIR="/var/www/TarsDbProject/tars_db"

# GitHub Repo Adresi (Sizin verdiğiniz adres)
REMOTE_URL="git@github.com:selimkocak/tars-db.git"

# Branch Adı (Modern Git standartı 'main'dir)
BRANCH="main"

# Tarih Damgası (Commit mesajı için)
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

echo "========================================"
echo "🚀 TarsDB GitHub Senkronizasyonu Başlıyor..."
echo "📂 Dizin: $PROJECT_DIR"
echo "========================================"

# 1. Proje dizinine git
cd "$PROJECT_DIR"

# 2. Git başlatılmış mı kontrol et, yoksa başlat
if [ ! -d ".git" ]; then
    echo "⚙️  Git repository başlatılıyor (git init)..."
    git init
    # Varsayılan branch adını 'main' yap
    git branch -M "$BRANCH"
fi

# 3. Remote (Origin) kontrolü
# Eğer 'origin' diye bir remote yoksa ekle, varsa URL'ini güncelle (garanti olsun)
if ! git remote | grep -q "^origin$"; then
    echo "🔗 Remote 'origin' ekleniyor..."
    git remote add origin "$REMOTE_URL"
else
    echo "🔗 Remote URL güncelleniyor/doğrulanıyor..."
    git remote set-url origin "$REMOTE_URL"
fi

# 4. Dosyaları Sahneye Al (Staging)
echo "📦 Dosyalar ekleniyor (git add .)..."
git add .

# 5. Commit İşlemi
# Eğer commit edilecek değişiklik yoksa hata vermesin diye kontrol ediyoruz
if git diff-index --quiet HEAD --; then
    echo "⚠️  Değişiklik yok, commit atlanıyor."
else
    echo "📝 Commit oluşturuluyor..."
    git commit -m "TarsDB Update: $TIMESTAMP"
fi

# 6. GitHub'a Gönder (Push)
echo "⬆️  GitHub'a gönderiliyor (Push to $BRANCH)..."
git push -u origin "$BRANCH"

echo "========================================"
echo "✅ [BAŞARILI] TarsDB senkronize edildi!"
echo "🌍 Link: https://github.com/selimkocak/tars-db"
echo "========================================"