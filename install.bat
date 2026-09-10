@echo off
chcp 65001 >nul
title [Pertashop] - Auto-Install Dependencies
color 0B

echo =====================================================================
echo          SISTEM MANAJEMEN & LAPORAN PERTASHOP
echo                PROSES INSTALASI OTOMATIS
echo =====================================================================
echo.

:: 1. Periksa ketersediaan Node.js
echo [1/3] Memeriksa instalasi Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js belum terinstall di komputer ini!
    echo.
    echo Silakan unduh dan install Node.js (LTS Version) dari:
    echo https://nodejs.org/
    echo.
    echo Setelah selesai install Node.js, buka kembali file ini.
    echo =====================================================================
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
for /f "tokens=*" %%i in ('npm -v') do set NPM_VER=%%i
echo [OK] Node.js terdeteksi: %NODE_VER% (npm: %NPM_VER%)
echo.

:: 2. Siapkan file konfigurasi environment (.env) jika belum ada
echo [2/3] Memeriksa konfigurasi environment (.env)...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [OK] File .env berhasil dibuat dari .env.example.
    ) else (
        type nul > .env
        echo [OK] File .env kosong berhasil dibuat.
    )
) else (
    echo [OK] File .env sudah ada.
)
echo.

:: 3. Menginstall paket dan dependensi aplikasi
echo [3/3] Mengunduh dan menginstall dependensi (npm install)...
echo Mohon tunggu beberapa saat, proses ini membutuhkan koneksi internet...
echo.
call npm install
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERROR] Gagal menginstall dependensi. Periksa koneksi internet Anda.
    echo =====================================================================
    pause
    exit /b 1
)

echo.
color 0A
echo =====================================================================
echo [SUKSES] Instalasi dependensi selesai dengan lancar!
echo.
echo Anda sekarang dapat menjalankan aplikasi dengan cara:
echo - Klik ganda file "run.bat" atau "auto-run.bat"
echo =====================================================================
echo.
pause
