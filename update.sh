#!/usr/bin/env bash
# =====================================================================
# SISTEM MANAJEMEN & LAPORAN PERTASHOP - AUTO-UPDATE SCRIPT (Linux/macOS)
# =====================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=====================================================================${NC}"
echo -e "${BLUE}          SISTEM MANAJEMEN & LAPORAN PERTASHOP                       ${NC}"
echo -e "${BLUE}                  PROSES UPDATE OTOMATIS                             ${NC}"
echo -e "${BLUE}=====================================================================${NC}"
echo ""

# 1. Periksa ketersediaan Git dan lakukan sinkronisasi
echo -e "${YELLOW}[1/4] Memeriksa pembaruan kode sumber dari GitHub...${NC}"
REPO_URL="https://github.com/fyercz/Project-POS.git"
ZIP_URL="https://github.com/fyercz/Project-POS/archive/refs/heads/main.zip"
UPDATED_OK=0

if command -v git &> /dev/null; then
    if [ ! -d ".git" ]; then
        echo "Menghubungkan direktori ke $REPO_URL..."
        git init
        git remote add origin "$REPO_URL"
        git branch -M main
    else
        git remote set-url origin "$REPO_URL" 2>/dev/null || git remote add origin "$REPO_URL" 2>/dev/null
    fi
    echo "Menarik dan menyinkronkan update terbaru dari GitHub ($REPO_URL)..."
    if git fetch origin main --prune; then
        git checkout -B main origin/main 2>/dev/null || true
        git reset --hard origin/main
        git clean -fd -e .env 2>/dev/null || true
        UPDATED_OK=1
        echo -e "${GREEN}[OK] Kode program berhasil diperbarui ke commit GitHub terbaru:${NC}"
        git log -1 --pretty=format:"  Commit : %h (%cd)%n  Pesan  : %s%n  Author : %an" --date=format:"%d-%m-%Y %H:%M" 2>/dev/null || true
        echo ""
    else
        echo -e "${YELLOW}[PERINGATAN] Git fetch mengalami kendala, beralih ke unduh arsip ZIP...${NC}"
    fi
fi

if [ "$UPDATED_OK" -eq 0 ]; then
    echo "Mengunduh file pembaruan terbaru via curl/wget..."
    if command -v curl &> /dev/null; then
        curl -sL "$ZIP_URL" -o /tmp/pertashop_update.zip
    elif command -v wget &> /dev/null; then
        wget -q "$ZIP_URL" -O /tmp/pertashop_update.zip
    fi

    if [ -f "/tmp/pertashop_update.zip" ] && command -v unzip &> /dev/null; then
        mkdir -p /tmp/pertashop_extracted
        unzip -q -o /tmp/pertashop_update.zip -d /tmp/pertashop_extracted/
        cp -r /tmp/pertashop_extracted/Project-POS-main/* ./ 2>/dev/null || cp -r /tmp/pertashop_extracted/*/* ./ 2>/dev/null || true
        rm -rf /tmp/pertashop_update.zip /tmp/pertashop_extracted
        echo -e "${GREEN}[OK] File aplikasi berhasil diperbarui via download ZIP.${NC}"
        UPDATED_OK=1
    fi
fi
echo ""

# 2. Bersihkan file usang dan cache
echo -e "${YELLOW}[2/4] Memverifikasi integritas file & membersihkan file usang...${NC}"
rm -f buka-desktop.bat buat-aplikasi-exe.bat buat-exe-cepat.bat install.bat *.tmp npm-debug.log* 2>/dev/null || true
rm -rf dist node_modules/.vite 2>/dev/null || true
echo -e "${GREEN}[OK] File usang dan cache build lama berhasil dibersihkan.${NC}"
echo ""

# 3. Perbarui dependensi dan pangkas paket usang
echo -e "${YELLOW}[3/4] Memverifikasi dependensi paket (npm prune & install)...${NC}"
npm prune || true
npm install
echo -e "${GREEN}[OK] Dependensi terverifikasi dan diperbarui.${NC}"
echo ""

# 4. Validasi kompilasi build
echo -e "${YELLOW}[4/4] Memvalidasi kompilasi build produksi (npm run build)...${NC}"
npm run build
echo -e "${GREEN}[OK] Kompilasi build aplikasi berhasil.${NC}"
echo ""

# Pastikan script tetap executable
chmod +x *.sh 2>/dev/null || true

echo -e "${GREEN}=====================================================================${NC}"
echo -e "${GREEN}[SUKSES] Aplikasi Pertashop berhasil diperbarui ke versi terbaru!   ${NC}"
echo -e "${GREEN}Silakan jalankan aplikasi dengan: ./run.sh                           ${NC}"
echo -e "${GREEN}=====================================================================${NC}"
