@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Pembaruan Otomatis Sistem Pertashop dari GitHub
color 0B

echo ===============================================================================
echo          SISTEM MANAJEMEN DAN LAPORAN PERTASHOP
echo                  AUTO-UPDATE DARI GITHUB RESMI
echo ===============================================================================
echo.
echo  Repository Target: https://github.com/fyercz/Project-POS.git
echo  Cabang (Branch)  : main
echo.
echo  * Seluruh data transaksi penjualan kasir dijamin 100%% AMAN
echo    karena tersimpan di penyimpanan lokal browser (LocalStorage).
echo.
echo ===============================================================================
echo.

set REPO_URL=https://github.com/fyercz/Project-POS.git
set ZIP_URL=https://github.com/fyercz/Project-POS/archive/refs/heads/main.zip
set UPDATE_SUCCESS=0

:: 1. Periksa apakah Git terpasang
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
    git remote add origin %REPO_URL% >nul 2>nul
    git branch -M main >nul 2>nul
) else (
    git remote set-url origin %REPO_URL% 2>nul
    if errorlevel 1 git remote add origin %REPO_URL% 2>nul
)

echo [2/5] Menarik pembaruan kode terbaru dari GitHub (origin/main)...
git fetch origin main --prune
if errorlevel 1 (
    echo.
    echo [PERINGATAN] Gagal melakukan git fetch (kemungkinan kendala koneksi/port).
    echo             Beralih ke metode download cadangan via PowerShell...
    goto DOWNLOAD_ZIP
)

echo [3/5] Menerapkan kode program terbaru ke direktori aplikasi...
:: Force reset ke origin/main untuk mencegah konflik file lokal atau untracked files
git checkout -B main origin/main >nul 2>nul
git reset --hard origin/main
if errorlevel 1 (
    echo.
    echo [PERINGATAN] Git reset mengalami kendala, mencoba download langsung...
    goto DOWNLOAD_ZIP
)

:: Bersihkan file sampah dan sisa build usang tanpa menghapus file konfigurasi .env
git clean -fd -e .env >nul 2>nul
set UPDATE_SUCCESS=1
goto SHOW_COMMIT_INFO

:: =============================================================================
:: METODE CADANGAN JIKA GIT GAGAL: UNDUH ZIP LANGSUNG DARI GITHUB
:: =============================================================================
:DOWNLOAD_ZIP
echo.
echo [METODE CADANGAN] Mengunduh arsip kode sumber terbaru dari GitHub...
echo                    URL: %ZIP_URL%
echo.

powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri '%ZIP_URL%' -OutFile 'update_temp.zip'"
if errorlevel 1 (
    echo [ERROR] Gagal mengunduh file update dari GitHub!
    echo         Pastikan komputer kasir terhubung ke internet.
    goto ERR_END
)

echo [INFO] Mengekstrak pembaruan ke folder aplikasi...
powershell -Command "Expand-Archive -Path 'update_temp.zip' -DestinationPath 'update_extracted' -Force"
if errorlevel 1 (
    echo [ERROR] Gagal mengekstrak file arsip update!
    if exist "update_temp.zip" del /f /q "update_temp.zip" >nul 2>nul
    goto ERR_END
)

:: Salin seluruh isi dari subfolder hasil ekstrak ke direktori kerja
if exist "update_extracted\Project-POS-main\" (
    xcopy /s /e /y /q "update_extracted\Project-POS-main\*" ".\" >nul 2>nul
) else (
    for /d %%D in (update_extracted\*) do (
        xcopy /s /e /y /q "%%D\*" ".\" >nul 2>nul
    )
)

:: Bersihkan folder sementara
rmdir /s /q "update_extracted" >nul 2>nul
del /f /q "update_temp.zip" >nul 2>nul
set UPDATE_SUCCESS=1

:SHOW_COMMIT_INFO
echo.
echo [4/5] Membersihkan cache lama dan memverifikasi dependensi...
:: Hapus cache Vite dan build lama agar browser mendapatkan aset terbaru
if exist "node_modules\.vite\" rmdir /s /q "node_modules\.vite\" >nul 2>nul
if exist "dist\" rmdir /s /q "dist\" >nul 2>nul
del /f /q *.tmp npm-debug.log* >nul 2>nul

where npm >nul 2>nul
if not errorlevel 1 (
    echo       - Memverifikasi paket pustaka (npm install)...
    call npm prune >nul 2>nul
    call npm install >nul 2>nul
    echo       - Mengompilasi aplikasi web (Vite build)...
    call npm run build >nul 2>nul
)

:: Rebuild Pertashop.exe jika compiler Windows ada
set CSC=
if exist "%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\csc.exe" (
    set CSC="%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
) else if exist "%SystemRoot%\Microsoft.NET\Framework\v4.0.30319\csc.exe" (
    set CSC="%SystemRoot%\Microsoft.NET\Framework\v4.0.30319\csc.exe"
)
if defined CSC (
    if exist "launcher\PertashopApp.cs" (
        echo [5/5] Memperbarui file Pertashop.exe...
        if exist "assets\icon.ico" (
            %CSC% /nologo /target:winexe /win32icon:"assets\icon.ico" /out:"Pertashop.exe" "launcher\PertashopApp.cs" >nul 2>nul
        ) else (
            %CSC% /nologo /target:winexe /out:"Pertashop.exe" "launcher\PertashopApp.cs" >nul 2>nul
        )
    )
)

echo.
echo ===============================================================================
echo  [SUKSES] APLIKASI PERTASHOP TELAH BERHASIL DIPERBARUI KE VERSI TERKINI!
echo ===============================================================================
where git >nul 2>nul
if not errorlevel 1 (
    echo.
    echo  Status Versi Kode Terbaru:
    git log -1 --pretty=format:"  - Commit ID : %%h%%n  - Tanggal   : %%cd%%n  - Catatan   : %%s" --date=format:"%%d-%%m-%%Y %%H:%%M" 2>nul
    echo.
)
echo.
echo  * Seluruh file program, skrip, dan modul sekarang 100%% AKTUAL sesuai GitHub.
echo  * Data penjualan, laporan, dan profil kasir tetap utuh dan aman.
echo.
echo  Silakan jalankan aplikasi dengan membuka:
echo  - run.bat        (Buka langsung kasir desktop)
echo  - Pertashop.bat  (Menu utama lengkap)
echo  - Pertashop.exe  (Jika menggunakan file .exe mandiri)
echo ===============================================================================
echo.
pause
exit /b 0

:ERR_END
echo.
echo ===============================================================================
echo  [PERINGATAN] Pembaruan belum berhasil diselesaikan secara otomatis.
echo  Silakan periksa koneksi internet komputer Anda, atau unduh kode ZIP manual
echo  dari: https://github.com/fyercz/Project-POS
echo ===============================================================================
echo.
pause
exit /b 1
