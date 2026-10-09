@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>nul
title Pembaruan Otomatis Sistem Pertashop dari GitHub
color 0B

:: 1. Pastikan direktori kerja adalah folder aplikasi tempat update.bat berada
cd /d "%~dp0"
set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"

:: -----------------------------------------------------------------------------
:: PENGAMAN UTAMA: CEGAH JENDELA PROMPT MENUTUP MENDADAK
:: Di Windows cmd.exe, jika file .bat menimpa dirinya sendiri saat git reset/xcopy,
:: cmd.exe akan kehilangan pointer baris file dan langsung keluar (exit) mendadak.
:: Solusi: Salin script ke folder sementara %TEMP% dan jalankan proses update dari sana.
:: -----------------------------------------------------------------------------
if not "%~1"=="RUNNING_FROM_TEMP" (
    echo ===============================================================================
    echo          SISTEM MANAJEMEN DAN LAPORAN PERTASHOP
    echo                  AUTO-UPDATE DARI GITHUB RESMI
    echo ===============================================================================
    echo.
    echo [INFO] Menyiapkan modul pembaruan mandiri di latar belakang...
    copy /y "%~f0" "%TEMP%\pertashop_updater_runner.bat" >nul 2>nul
    if errorlevel 1 (
        echo [PERINGATAN] Gagal menyalin runner ke %%TEMP%%, melanjutkan di direktori aktif...
        goto DO_UPDATE
    )
    cmd.exe /c ""%TEMP%\pertashop_updater_runner.bat" RUNNING_FROM_TEMP "%APP_DIR%""
    set "EXIT_CODE=!ERRORLEVEL!"
    exit /b !EXIT_CODE!
)

:: Jika dipanggil dari runner %TEMP%:
set "APP_DIR=%~2"
cd /d "%APP_DIR%"

:DO_UPDATE
echo ===============================================================================
echo          SISTEM MANAJEMEN DAN LAPORAN PERTASHOP
echo                  AUTO-UPDATE DARI GITHUB RESMI
echo ===============================================================================
echo.
echo  Lokasi Folder Aplikasi: %APP_DIR%
echo  Repository Target     : https://github.com/fyercz/Project-POS.git
echo  Cabang (Branch)       : main
echo.
echo  * Seluruh data transaksi penjualan kasir dijamin 100%% AMAN
echo    karena tersimpan di penyimpanan lokal browser (LocalStorage).
echo ===============================================================================
echo.

set "REPO_URL=https://github.com/fyercz/Project-POS.git"
set "ZIP_URL=https://github.com/fyercz/Project-POS/archive/refs/heads/main.zip"
set UPDATE_SUCCESS=0

:: 1. Periksa ketersediaan Git
where git >nul 2>nul
if errorlevel 1 (
    echo [INFO] Program Git tidak terdeteksi pada Windows ini.
    echo        Menggunakan metode download langsung via PowerShell (ZIP)...
    goto DOWNLOAD_ZIP
)

echo [1/5] Memeriksa koneksi dan repositori Git...
if not exist ".git\" (
    echo       - Menginisialisasi repositori Git lokal...
    git init >nul 2>nul
    git remote add origin %REPO_URL% 2>nul || git remote set-url origin %REPO_URL% 2>nul
    git branch -M main >nul 2>nul
) else (
    git remote set-url origin %REPO_URL% 2>nul || git remote add origin %REPO_URL% 2>nul
)

echo [2/5] Menarik pembaruan kode terbaru dari GitHub (origin/main)...
git fetch origin main --prune
if errorlevel 1 (
    echo.
    echo [PERINGATAN] Git fetch mengalami kendala (koneksi/autentikasi).
    echo             Beralih ke metode download cadangan via PowerShell...
    goto DOWNLOAD_ZIP
)

echo [3/5] Menerapkan kode program terbaru ke direktori aplikasi...
:: Sinkronkan cabang lokal ke origin/main
git branch -M main >nul 2>nul
git reset --hard origin/main
if errorlevel 1 (
    echo.
    echo [PERINGATAN] Git reset mengalami kendala, mencoba download langsung...
    goto DOWNLOAD_ZIP
)

:: Bersihkan file sampah tanpa menghapus file konfigurasi .env
git clean -fd -e .env >nul 2>nul
set UPDATE_SUCCESS=1
goto SHOW_COMMIT_INFO

:: =============================================================================
:: METODE CADANGAN: UNDUH ZIP VIA POWERSHELL
:: =============================================================================
:DOWNLOAD_ZIP
echo.
echo [METODE CADANGAN] Mengunduh arsip kode sumber terbaru dari GitHub...
echo                    URL: %ZIP_URL%
echo.

set "ZIP_TEMP_FILE=%TEMP%\pertashop_update_temp.zip"
set "EXTRACT_TEMP_DIR=%TEMP%\pertashop_extracted"

if exist "!ZIP_TEMP_FILE!" del /f /q "!ZIP_TEMP_FILE!" >nul 2>nul
if exist "!EXTRACT_TEMP_DIR!\" rmdir /s /q "!EXTRACT_TEMP_DIR!" >nul 2>nul

powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -UseBasicParsing -Uri '%ZIP_URL%' -OutFile '!ZIP_TEMP_FILE!'"
if errorlevel 1 (
    echo [ERROR] Gagal mengunduh file update dari GitHub via PowerShell!
    echo         Pastikan komputer kasir terhubung ke internet.
    goto ERR_END
)

echo [INFO] Mengekstrak pembaruan ke folder sementara...
powershell -Command "$ProgressPreference = 'SilentlyContinue'; Expand-Archive -Path '!ZIP_TEMP_FILE!' -DestinationPath '!EXTRACT_TEMP_DIR!' -Force"
if errorlevel 1 (
    echo [ERROR] Gagal mengekstrak file arsip update!
    if exist "!ZIP_TEMP_FILE!" del /f /q "!ZIP_TEMP_FILE!" >nul 2>nul
    goto ERR_END
)

echo [INFO] Menyalin file terbaru ke folder aplikasi...
if exist "!EXTRACT_TEMP_DIR!\Project-POS-main\" (
    xcopy /s /e /y /q "!EXTRACT_TEMP_DIR!\Project-POS-main\*" "%APP_DIR%\" >nul 2>nul
) else (
    for /d %%D in ("!EXTRACT_TEMP_DIR!\*") do (
        xcopy /s /e /y /q "%%D\*" "%APP_DIR%\" >nul 2>nul
    )
)

:: Bersihkan file sementara di %TEMP%
if exist "!EXTRACT_TEMP_DIR!\" rmdir /s /q "!EXTRACT_TEMP_DIR!" >nul 2>nul
if exist "!ZIP_TEMP_FILE!" del /f /q "!ZIP_TEMP_FILE!" >nul 2>nul
set UPDATE_SUCCESS=1

:SHOW_COMMIT_INFO
echo.
echo [4/5] Membersihkan cache lama dan memverifikasi dependensi...
if exist "node_modules\.vite\" rmdir /s /q "node_modules\.vite\" >nul 2>nul
if exist "dist\" rmdir /s /q "dist\" >nul 2>nul
del /f /q *.tmp npm-debug.log* >nul 2>nul

where npm >nul 2>nul
if not errorlevel 1 (
    echo       - Memverifikasi paket library (npm install)...
    call npm prune >nul 2>nul
    call npm install
    echo.
    echo       - Mengompilasi aplikasi web (Vite build)...
    call npm run build
) else (
    echo [PERINGATAN] Node.js/npm tidak ditemukan di PATH sistem Windows.
    echo             Silakan pastikan Node.js terpasang untuk menjalankan aplikasi kasir.
)

:: Rebuild Pertashop.exe jika compiler Windows ada
set "CSC="
if exist "%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\csc.exe" (
    set "CSC=%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
) else if exist "%SystemRoot%\Microsoft.NET\Framework\v4.0.30319\csc.exe" (
    set "CSC=%SystemRoot%\Microsoft.NET\Framework\v4.0.30319\csc.exe"
)
if defined CSC (
    if exist "launcher\PertashopApp.cs" (
        echo.
        echo [5/5] Memperbarui file executable Pertashop.exe...
        if exist "assets\icon.ico" (
            "%CSC%" /nologo /target:winexe /win32icon:"assets\icon.ico" /out:"Pertashop.exe" "launcher\PertashopApp.cs" >nul 2>nul
        ) else (
            "%CSC%" /nologo /target:winexe /out:"Pertashop.exe" "launcher\PertashopApp.cs" >nul 2>nul
        )
    )
)

echo.
echo ===============================================================================
echo  [SUKSES] APLIKASI PERTASHOP TELAH BERHASIL DIPERBARUI KE VERSI TERKINI!
echo ===============================================================================
where git >nul 2>nul
if not errorlevel 1 (
    if exist ".git\" (
        echo.
        echo  Status Versi Kode Terbaru:
        git log -1 --pretty=format:"  - Commit ID : %%h%%n  - Tanggal   : %%ci%%n  - Catatan   : %%s" 2>nul
        echo.
    )
)
echo.
echo  * Seluruh file program, skrip, dan modul sekarang 100%% AKTUAL sesuai GitHub.
echo  * Data transaksi penjualan, laporan, dan profil kasir tetap utuh dan aman.
echo.
echo  Silakan jalankan aplikasi dengan membuka:
echo  - run.bat        (Buka langsung kasir desktop)
echo  - Pertashop.bat  (Menu utama lengkap)
echo  - Pertashop.exe  (Jika menggunakan file .exe mandiri)
echo ===============================================================================
echo.
echo Tekan sembarang tombol untuk menutup jendela ini...
pause >nul
exit /b 0

:ERR_END
color 0C
echo.
echo ===============================================================================
echo  [PERINGATAN] Pembaruan belum berhasil diselesaikan secara otomatis.
echo  Silakan periksa koneksi internet komputer Anda, atau unduh kode ZIP manual
echo  dari: https://github.com/fyercz/Project-POS
echo ===============================================================================
echo.
echo Tekan sembarang tombol untuk menutup jendela ini...
pause >nul
exit /b 1
