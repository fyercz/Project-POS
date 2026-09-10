@echo off
chcp 65001 >nul
title [Pertashop] - Sistem Manajemen & Laporan Pertashop
color 0A

echo =====================================================================
echo          SISTEM MANAJEMEN & LAPORAN PERTASHOP
echo                  MENJALANKAN APLIKASI
echo =====================================================================
echo.

:: Periksa Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js belum terinstall!
    echo Silakan install Node.js terlebih dahulu dari https://nodejs.org/
    echo =====================================================================
    pause
    exit /b 1
)

:: Periksa apakah node_modules sudah ada
if not exist "node_modules\" (
    echo [INFO] Folder dependensi belum ditemukan. Menjalankan auto-install...
    echo.
    call install.bat
    if %errorlevel% neq 0 exit /b 1
    cls
    echo =====================================================================
    echo          SISTEM MANAJEMEN & LAPORAN PERTASHOP
    echo                  MENJALANKAN APLIKASI
    echo =====================================================================
    echo.
)

:: Buka browser otomatis di latar belakang setelah jeda 2.5 detik
echo [1/2] Menyiapkan browser otomatis ke http://localhost:3000 ...
start "" /b cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

echo [2/2] Memulai server aplikasi Pertashop...
echo.
echo =====================================================================
echo  Server aktif di:
echo  - Lokal  : http://localhost:3000/
echo  - Jaringan: http://0.0.0.0:3000/
echo.
echo  * Tekan [Ctrl + C] pada jendela ini untuk menghentikan aplikasi.
echo =====================================================================
echo.

call npm run dev
pause
