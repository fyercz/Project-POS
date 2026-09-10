#!/usr/bin/env bash
# =====================================================================
# SISTEM MANAJEMEN & LAPORAN PERTASHOP - AUTO-INSTALL SCRIPT (Linux/macOS)
# =====================================================================

set -e

# Warna terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=====================================================================${NC}"
echo -e "${BLUE}          SISTEM MANAJEMEN & LAPORAN PERTASHOP                       ${NC}"
echo -e "${BLUE}                PROSES INSTALASI OTOMATIS                            ${NC}"
echo -e "${BLUE}=====================================================================${NC}"
echo ""

# 1. Periksa ketersediaan Node.js dan npm
echo -e "${YELLOW}[1/3] Memeriksa instalasi Node.js & npm...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js belum terinstall!${NC}"
    echo "Silakan install Node.js (LTS version) dari https://nodejs.org/"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}[ERROR] npm belum terinstall!${NC}"
    exit 1
fi

NODE_VER=$(node -v)
NPM_VER=$(npm -v)
echo -e "${GREEN}[OK] Node.js terdeteksi: ${NODE_VER} (npm: ${NPM_VER})${NC}"
echo ""

# 2. Siapkan file .env jika belum ada
echo -e "${YELLOW}[2/3] Memeriksa konfigurasi environment (.env)...${NC}"
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}[OK] File .env berhasil dibuat dari .env.example.${NC}"
    else
        touch .env
        echo -e "${GREEN}[OK] File .env kosong berhasil dibuat.${NC}"
    fi
else
    echo -e "${GREEN}[OK] File .env sudah ada.${NC}"
fi
echo ""

# 3. Berikan permission execute pada semua script .sh
chmod +x *.sh 2>/dev/null || true

# 4. Install dependensi dengan npm
echo -e "${YELLOW}[3/3] Mengunduh dan menginstall dependensi (npm install)...${NC}"
npm install

echo ""
echo -e "${GREEN}=====================================================================${NC}"
echo -e "${GREEN}[SUKSES] Instalasi dependensi selesai dengan lancar!                ${NC}"
echo -e "${GREEN}Anda dapat menjalankan aplikasi dengan: ./run.sh                    ${NC}"
echo -e "${GREEN}=====================================================================${NC}"
