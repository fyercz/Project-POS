@echo off
chcp 65001 >nul
title [Pertashop] - Auto-Update Aplikasi
color 0E

echo =====================================================================
echo          SISTEM MANAJEMEN & LAPORAN PERTASHOP
echo                  PROSES UPDATE OTOMATIS
echo =====================================================================
echo.

:: 1. Periksa ketersediaan Git jika direktori merupakan git repo
echo [1/3] Memeriksa pembaruan kode sumber (Git Pull)...
if exist ".git" (
    where git >nul 2>nul
    if %errorlevel% equ 0 (
        echo Menarik update terbaru dari repository...
        git pull
        if %errorlevel% neq 0 (
            echo [PERINGATAN] Gagal melakukan git pull. Melanjutkan pembaruan dependensi...
        ) else (
            echo [OK] Kode sumber berhasil diperbarui.
        )
    ) else (
        echo [INFO] Git tidak ditemukan di PATH sistem, melewati git pull.
    )
) else (
    echo [INFO] Direktori bukan git repository, melewati git pull.
)
echo.

:: 2. Perbarui dependensi jika ada paket baru
echo [2/3] Memperbarui dependensi paket (npm install)...
call npm install
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Gagal memperbarui paket npm. Periksa koneksi internet Anda.
    pause
    exit /b 1
)
echo [OK] Dependensi terverifikasi dan diperbarui.
echo.

:: 3. Build ulang file aplikasi (opsional untuk verifikasi kompilasi)
echo [3/3] Memvalidasi dan kompilasi build produksi (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Proses build aplikasi mengalami kendala.
    pause
    exit /b 1
)
echo [OK] Kompilasi build aplikasi berhasil.
echo.

color 0A
echo =====================================================================
echo [SUKSES] Aplikasi Pertashop berhasil diperbarui ke versi terbaru!
echo.
echo Silakan jalankan kembali aplikasi dengan "run.bat".
echo =====================================================================
echo.
pause
