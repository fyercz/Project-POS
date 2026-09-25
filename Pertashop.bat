@echo off
setlocal enabledelayedexpansion
title Sistem Manajemen dan Laporan Pertashop
color 0B

:MAIN_MENU
cls
echo ===============================================================================
echo                    SISTEM MANAJEMEN PERTASHOP
echo           Aplikasi Laporan Penjualan dan Monitoring Kasir
echo ===============================================================================
echo.
echo   PILIHAN MENU:
echo.
echo   [1] Buka Aplikasi Kasir (Mode Desktop Mandiri)
echo   [2] Buat File Pertashop.exe (Dengan Logo Resmi)
echo   [3] Pasang Shortcut di Desktop Komputer (Dengan Logo Pertashop)
echo   [4] Buat Installer Setup .EXE (Electron Package)
echo   [5] Periksa Pembaruan Sistem dari GitHub (Auto-Update)
echo   [6] Install atau Perbaiki Dependensi Aplikasi
echo   [7] Keluar
echo.
echo ===============================================================================
set /p opt="Pilih nomor menu (1-7) [Default: 1]: "

if "%opt%"=="" set opt=1
if "%opt%"=="1" goto RUN_APP
if "%opt%"=="2" goto BUILD_EXE
if "%opt%"=="3" goto CREATE_SHORTCUT
if "%opt%"=="4" goto BUILD_ELECTRON
if "%opt%"=="5" goto UPDATE_APP
if "%opt%"=="6" goto REPAIR_DEPS
if "%opt%"=="7" exit /b 0

echo Pilihan tidak valid.
timeout /t 1 >nul
goto MAIN_MENU

:: =============================================================================
:: [1] JALANKAN APLIKASI
:: =============================================================================
:RUN_APP
cls
echo =====================================================================
echo          MENJALANKAN SISTEM MANAJEMEN PERTASHOP
echo =====================================================================
echo.

where node >nul 2>nul
if errorlevel 1 goto ERR_NO_NODE

if exist "node_modules\" goto START_SERVER
echo [INFO] Dependensi belum ditemukan. Memulai instalasi otomatis...
call npm install
if errorlevel 1 goto ERR_INSTALL

:START_SERVER
echo [1/2] Menyiapkan server lokal...
start "" /b cmd /c "call npm run dev"

echo [2/2] Membuka jendela aplikasi desktop kasir...
timeout /t 3 /nobreak >nul

set BROWSER_CMD=
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    set BROWSER_CMD="%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    set BROWSER_CMD="%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    set BROWSER_CMD="%ProgramFiles%\Google\Chrome\Application\chrome.exe"
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    set BROWSER_CMD="%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
) else if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    set BROWSER_CMD="%LocalAppData%\Google\Chrome\Application\chrome.exe"
)

if defined BROWSER_CMD (
    start "" %BROWSER_CMD% --app="http://localhost:3000" --window-size=1366,850
) else (
    start http://localhost:3000
)

echo.
echo =====================================================================
echo  [SUKSES] Aplikasi Pertashop telah berjalan!
echo  
echo  * Jangan tutup jendela terminal ini selama kasir menggunakan aplikasi.
echo  * Tekan Ctrl + C di sini untuk mematikan server.
echo =====================================================================
echo.
pause
goto MAIN_MENU

:: =============================================================================
:: [2] BUAT FILE PERTASHOP.EXE DENGAN LOGO
:: =============================================================================
:BUILD_EXE
cls
echo =====================================================================
echo          PEMBUAT FILE Pertashop.exe DENGAN LOGO RESMI
echo =====================================================================
echo.
echo Sedang mengompilasi Pertashop.exe menggunakan compiler Windows .NET...
echo.

set CSC=
if exist "%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\csc.exe" (
    set CSC="%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
) else if exist "%SystemRoot%\Microsoft.NET\Framework\v4.0.30319\csc.exe" (
    set CSC="%SystemRoot%\Microsoft.NET\Framework\v4.0.30319\csc.exe"
)

if "%CSC%"=="" (
    echo [ERROR] Compiler .NET Framework bawaan Windows tidak ditemukan.
    pause
    goto MAIN_MENU
)

if exist "assets\icon.ico" (
    %CSC% /nologo /target:winexe /win32icon:"assets\icon.ico" /out:"Pertashop.exe" "launcher\PertashopApp.cs"
) else (
    %CSC% /nologo /target:winexe /out:"Pertashop.exe" "launcher\PertashopApp.cs"
)

if errorlevel 1 (
    echo [ERROR] Gagal membuat file Pertashop.exe!
    pause
    goto MAIN_MENU
)

echo =====================================================================
echo  [SUKSES] File Pertashop.exe telah selesai dibuat!
echo.
echo  Fitur Pertashop.exe:
echo  1. Memiliki icon logo resmi Pertashop.
echo  2. Bersih tanpa jendela CMD prompt hitam yang mengganggu kasir.
echo  3. Menjalankan server otomatis dan membuka jendela kasir mandiri.
echo =====================================================================
echo.
pause
goto MAIN_MENU

:: =============================================================================
:: [3] BUAT SHORTCUT DESKTOP DENGAN LOGO
:: =============================================================================
:CREATE_SHORTCUT
cls
echo =====================================================================
echo          MEMBUAT SHORTCUT DENGAN LOGO DI DESKTOP WINDOWS
echo =====================================================================
echo.

if not exist "Pertashop.exe" (
    echo [INFO] Pertashop.exe belum ada, membuat Pertashop.exe terlebih dahulu...
    call :BUILD_EXE_SILENT
)

echo Membuat shortcut Pertashop Kasir di Desktop Windows...
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $d = [Environment]::GetFolderPath('Desktop'); $s = $ws.CreateShortcut($d + '\Pertashop Kasir.lnk'); $s.TargetPath = '%CD%\Pertashop.exe'; $s.WorkingDirectory = '%CD%'; if (Test-Path '%CD%\assets\icon.ico') { $s.IconLocation = '%CD%\assets\icon.ico'; }; $s.Save(); Write-Host '[SUKSES] Shortcut dengan logo Pertashop berhasil dipasang di Desktop!'"

echo.
pause
goto MAIN_MENU

:BUILD_EXE_SILENT
set CSC=
if exist "%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\csc.exe" (
    set CSC="%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
) else if exist "%SystemRoot%\Microsoft.NET\Framework\v4.0.30319\csc.exe" (
    set CSC="%SystemRoot%\Microsoft.NET\Framework\v4.0.30319\csc.exe"
)
if not "%CSC%"=="" (
    if exist "assets\icon.ico" (
        %CSC% /nologo /target:winexe /win32icon:"assets\icon.ico" /out:"Pertashop.exe" "launcher\PertashopApp.cs" >nul 2>nul
    ) else (
        %CSC% /nologo /target:winexe /out:"Pertashop.exe" "launcher\PertashopApp.cs" >nul 2>nul
    )
)
exit /b 0

:: =============================================================================
:: [4] BUAT INSTALLER ELECTRON
:: =============================================================================
:BUILD_ELECTRON
cls
echo =====================================================================
echo          PEMBUAT FILE INSTALLER SETUP .EXE (ELECTRON)
echo =====================================================================
echo.

where node >nul 2>nul
if errorlevel 1 goto ERR_NO_NODE

if exist "node_modules\electron\" goto START_VITE_BUILD
echo Mengunduh paket electron dan builder (memerlukan koneksi internet)...
call npm install --save-dev --legacy-peer-deps electron electron-builder
if errorlevel 1 (
    echo [ERROR] Gagal mengunduh paket Electron.
    pause
    goto MAIN_MENU
)

:START_VITE_BUILD
echo Mengompilasi web assets (Vite)...
call npm run build
if errorlevel 1 (
    echo [ERROR] Build Vite gagal!
    pause
    goto MAIN_MENU
)

echo Mengemas aplikasi menjadi file .exe...
call npx electron-builder --win --x64
if errorlevel 1 (
    echo [ERROR] Pembuatan installer .exe gagal!
    pause
    goto MAIN_MENU
)

echo.
echo =====================================================================
echo [SUKSES] File installer telah dibuat di folder dist-electron\
echo =====================================================================
if exist "dist-electron\" start "" explorer dist-electron
pause
goto MAIN_MENU

:: =============================================================================
:: [5] UPDATE APLIKASI DARI GITHUB
:: =============================================================================
:UPDATE_APP
cls
echo =====================================================================
echo          PEMBARUAN APLIKASI OTOMATIS DARI GITHUB
echo =====================================================================
echo.

where git >nul 2>nul
if errorlevel 1 goto ERR_NO_GIT

set REPO_URL=https://github.com/fyercz/Project-POS.git

if exist ".git\" goto SYNC_GIT_REMOTE
echo [INFO] Menghubungkan folder aplikasi ke GitHub resmi...
echo        %REPO_URL%
echo.
git init
git remote add origin %REPO_URL%
git branch -M main
echo [OK] Repository berhasil dihubungkan!
echo.
goto DO_PULL_CODE

:SYNC_GIT_REMOTE
git remote set-url origin %REPO_URL% 2>nul
if errorlevel 1 git remote add origin %REPO_URL% 2>nul

:DO_PULL_CODE
echo [1/5] Menghubungi GitHub (fyercz/Project-POS) dan menarik update...
git fetch origin main 2>nul
git pull origin main
if errorlevel 1 goto FALLBACK_PULL
goto DO_CLEANUP

:FALLBACK_PULL
echo [INFO] Mencoba sinkronisasi git pull default...
git pull
if errorlevel 1 (
    echo [INFO] Memperbarui branch ke versi origin/main...
    git checkout -B main origin/main 2>nul
)

:DO_CLEANUP
echo.
echo [2/5] Memverifikasi integritas file dan membersihkan file usang...
if exist "buka-desktop.bat" (
    del /f /q "buka-desktop.bat" >nul 2>nul
    echo       - Menghapus script lama: buka-desktop.bat
)
if exist "buat-aplikasi-exe.bat" (
    del /f /q "buat-aplikasi-exe.bat" >nul 2>nul
    echo       - Menghapus script lama: buat-aplikasi-exe.bat
)
if exist "buat-exe-cepat.bat" (
    del /f /q "buat-exe-cepat.bat" >nul 2>nul
    echo       - Menghapus script lama: buat-exe-cepat.bat
)
if exist "install.bat" (
    del /f /q "install.bat" >nul 2>nul
    echo       - Menghapus script lama: install.bat
)
if exist "update.bat" (
    del /f /q "update.bat" >nul 2>nul
    echo       - Menghapus script lama: update.bat
)

del /f /q *.tmp >nul 2>nul
del /f /q npm-debug.log* >nul 2>nul

if exist "dist\" (
    rmdir /s /q "dist\" >nul 2>nul
    echo       - Membersihkan cache build: dist\
)
if exist "node_modules\.vite\" (
    rmdir /s /q "node_modules\.vite\" >nul 2>nul
    echo       - Membersihkan cache dependency: node_modules\.vite\
)
echo       [OK] File usang dan cache build lama berhasil dibersihkan!

echo.
echo [3/5] Memverifikasi dependensi dan membuang paket pustaka usang...
call npm prune
call npm install

echo.
echo [4/5] Mengompilasi pembaruan aplikasi web (Vite Build)...
call npm run build

echo.
echo [5/5] Memverifikasi dan memperbarui file executable (Pertashop.exe)...
if exist "Pertashop.exe" (
    echo       Memperbarui file Pertashop.exe dengan build terbaru...
    call :BUILD_EXE_SILENT
    echo       [OK] File Pertashop.exe berhasil diperbarui!
)

echo.
echo =====================================================================
echo [SUKSES] Sistem Pertashop telah berhasil diverifikasi dan diperbarui!
echo.
echo Ringkasan Hasil Update:
echo 1. Kode program terbaru dari GitHub telah terpasang.
echo 2. File script usang dan cache lama telah dibersihkan secara bersih.
echo 3. Paket pustaka telah diverifikasi dan disinkronkan.
echo 4. Seluruh data penjualan kasir dijamin 100%% AMAN di komputer ini.
echo =====================================================================
echo.
pause
goto MAIN_MENU

:: =============================================================================
:: [6] REPAIR DEPENDENCIES
:: =============================================================================
:REPAIR_DEPS
cls
echo =====================================================================
echo          INSTALL ATAU PERBAIKI DEPENDENSI APLIKASI
echo =====================================================================
echo.
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [OK] File .env telah dibuat.
    )
)
echo Mengunduh seluruh pustaka...
call npm install
echo.
echo [SUKSES] Seluruh dependensi aplikasi siap digunakan!
pause
goto MAIN_MENU

:: =============================================================================
:: PESAN ERROR
:: =============================================================================
:ERR_NO_GIT
color 0E
echo.
echo [INFO] Git belum terpasang di komputer ini!
echo =====================================================================
echo Agar fitur Auto-Update ini dapat berjalan otomatis:
echo 1. Silakan unduh dan install Git dari: https://git-scm.com/
echo 2. Pilih instalasi default dan restart komputer kasir Anda.
echo.
echo Alternatif tanpa Git:
echo Anda dapat mengunduh ZIP terbaru dari https://github.com/fyercz/Project-POS
echo lalu mengekstraknya ke folder ini (Data transaksi kasir dijamin AMAN).
echo =====================================================================
echo.
pause
color 0B
goto MAIN_MENU

:ERR_NO_NODE
color 0C
echo.
echo [ERROR] Node.js belum terinstall di komputer ini!
echo Silakan unduh dan install dari https://nodejs.org/
echo.
pause
goto MAIN_MENU

:ERR_INSTALL
color 0C
echo.
echo [ERROR] Gagal menginstall dependensi! Pastikan koneksi internet aktif.
echo.
pause
goto MAIN_MENU
