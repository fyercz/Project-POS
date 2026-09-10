#!/usr/bin/env bash
# =====================================================================
# SISTEM MANAJEMEN & LAPORAN PERTASHOP - RUN SCRIPT (Linux/macOS)
# =====================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=====================================================================${NC}"
echo -e "${BLUE}          SISTEM MANAJEMEN & LAPORAN PERTASHOP                       ${NC}"
echo -e "${BLUE}                  MENJALANKAN APLIKASI                               ${NC}"
echo -e "${BLUE}=====================================================================${NC}"
echo ""

# Periksa Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js belum terinstall!${NC}"
    echo "Silakan install Node.js terlebih dahulu dari https://nodejs.org/"
    exit 1
fi

# Periksa apakah folder node_modules ada
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[INFO] Folder dependensi belum ditemukan. Menjalankan auto-install...${NC}"
    chmod +x install.sh 2>/dev/null || true
    ./install.sh
    echo ""
fi

# Fungsi membuka browser di background
open_browser() {
    sleep 2
    URL="http://localhost:3000"
    if command -v xdg-open &> /dev/null; then
        xdg-open "$URL" &> /dev/null &
    elif command -v open &> /dev/null; then
        open "$URL" &> /dev/null &
    fi
}

echo -e "${YELLOW}[1/2] Menyiapkan browser ke http://localhost:3000 ...${NC}"
open_browser &

echo -e "${GREEN}[2/2] Memulai server aplikasi Pertashop...${NC}"
echo ""
echo -e "${BLUE}=====================================================================${NC}"
echo -e " Server aktif di:"
echo -e " - Lokal  : ${GREEN}http://localhost:3000/${NC}"
echo -e " - Jaringan: ${GREEN}http://0.0.0.0:3000/${NC}"
echo ""
echo -e " * Tekan [Ctrl + C] untuk menghentikan aplikasi."
echo -e "${BLUE}=====================================================================${NC}"
echo ""

npm run dev
