@echo off
chcp 65001 >nul
title [Pertashop] - Pembuat File Aplikasi Windows (.EXE)
color 0E

echo =====================================================================
echo          SISTEM MANAJEMEN & LAPORAN PERTASHOP
echo             BUILDER APLIKASI DESKTOP WINDOWS (.EXE)
echo =====================================================================
echo.
echo Script ini akan mengemas sistem Pertashop menjadi file installer/portable (.exe)
echo yang bisa langsung dijalankan di komputer kasir Windows offline.
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js belum terinstall di komputer ini!
    echo Silakan install Node.js terlebih dahulu dari https://nodejs.org/
    pause
    exit /b 1
)

echo [Langkah 1/3] Memeriksa paket Electron & Electron-Builder...
if not exist "node_modules\electron\" (
    echo Mengunduh paket pendukung Electron (hanya perlu diunduh sekali di awal)...
    call npm install --save-dev electron electron-builder
    if %errorlevel% neq 0 (
        echo [ERROR] Gagal mengunduh paket Electron. Pastikan koneksi internet aktif.
        pause
        exit /b 1
    )
)

echo.
echo [Langkah 2/3] Mengompilasi kode program web (Vite Build)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Kompilasi Vite gagal!
    pause
    exit /b 1
)

echo.
echo [Langkah 3/3] Mengemas aplikasi menjadi file .EXE Windows...
echo Mohon tunggu sejenak, electron-builder sedang membungkus aplikasi...
call npx electron-builder --win

if %errorlevel% neq 0 (
    echo [ERROR] Pembuatan file .exe gagal!
    pause
    exit /b 1
)

echo.
echo =====================================================================
echo [SUKSES!] File aplikasi Windows .EXE berhasil dibuat!
echo.
echo Lokasi hasil build ada di folder:
echo dist-electron\
echo.
echo Di dalam folder tersebut tersedia:
echo 1. Installer (.exe)  - File installer setup untuk komputer kasir
echo 2. Portable (.exe)   - File executable yang bisa langsung jalan tanpa install
echo =====================================================================
echo.

pause
if exist "dist-electron\" explorer dist-electron
