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

# 1. Periksa ketersediaan Git dan lakukan pull
echo -e "${YELLOW}[1/3] Memeriksa pembaruan kode sumber (Git Pull)...${NC}"
REPO_URL="https://github.com/fyercz/Project-POS.git"
if command -v git &> /dev/null; then
    if [ ! -d ".git" ]; then
        echo "Menghubungkan direktori ke $REPO_URL..."
        git init
        git remote add origin "$REPO_URL"
        git branch -M main
    else
        git remote set-url origin "$REPO_URL" 2>/dev/null || git remote add origin "$REPO_URL" 2>/dev/null
    fi
    echo "Menarik update terbaru dari GitHub ($REPO_URL)..."
    git fetch origin main 2>/dev/null || true
    git pull origin main || git pull || echo -e "${YELLOW}[PERINGATAN] Git pull mengalami kendala, melanjutkan proses...${NC}"
else
    echo -e "${YELLOW}[INFO] Git tidak terdeteksi, melewati git pull.${NC}"
fi
echo ""

# 2. Perbarui dependensi
echo -e "${YELLOW}[2/3] Memperbarui dependensi paket (npm install)...${NC}"
npm install
echo -e "${GREEN}[OK] Dependensi terverifikasi dan diperbarui.${NC}"
echo ""

# 3. Validasi kompilasi build
echo -e "${YELLOW}[3/3] Memvalidasi kompilasi build produksi (npm run build)...${NC}"
npm run build
echo -e "${GREEN}[OK] Kompilasi build aplikasi berhasil.${NC}"
echo ""

# Pastikan script tetap executable
chmod +x *.sh 2>/dev/null || true

echo -e "${GREEN}=====================================================================${NC}"
echo -e "${GREEN}[SUKSES] Aplikasi Pertashop berhasil diperbarui ke versi terbaru!   ${NC}"
echo -e "${GREEN}Silakan jalankan aplikasi dengan: ./run.sh                           ${NC}"
echo -e "${GREEN}=====================================================================${NC}"
