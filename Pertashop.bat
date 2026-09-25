@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Sistem Manajemen & Laporan Pertashop
color 0B

:MAIN_MENU
cls
echo ===============================================================================
echo   ██████╗ ███████╗██████╗ ████████╗ █████╗ ███████╗██╗  ██╗ ██████╗ ██████╗ 
echo   ██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██╔══██╗██╔════╝██║  ██║██╔═══██╗██╔══██╗
echo   ██████╔╝█████╗  ██████╔╝   ██║   ███████║███████╗███████║██║   ██║██████╔╝
echo   ██╔═══╝ ██╔══╝  ██╔══██╗   ██║   ██╔══██║╚════██║██╔══██║██║   ██║██╔═══╝ 
echo   ██║     ███████╗██║  ██║   ██║   ██║  ██║███████║██║  ██║╚██████╔╝██║     
echo   ╚═╝     ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝     
echo                  SISTEM MANAJEMEN & LAPORAN PERTASHOP
echo ===============================================================================
echo.
echo   PILIHAN MENU:
echo.
echo   [1] 🚀 Buka Aplikasi Kasir (Mode Desktop Mandiri - Rekomendasi Kasir)
echo   [2] 📦 Buat File "Pertashop.exe" (Hanya 1 Detik + Logo Resmi Pertashop)
echo   [3] 📌 Pasang Shortcut di Desktop Komputer (Dengan Logo Pertashop)
echo   [4] 🛠️ Buat Installer Setup .EXE Lengkap (Electron Package)
echo   [5] 🔄 Periksa Pembaruan Sistem (Auto-Update)
echo   [6] ⚙️ Install / Perbaiki Dependensi Aplikasi
echo   [7] ❌ Keluar
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

if not exist "node_modules\" (
    echo [INFO] Dependensi belum ditemukan. Memulai instalasi otomatis...
    call npm install
    if errorlevel 1 goto ERR_INSTALL
)

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
echo  * Tekan [Ctrl + C] di sini untuk mematikan server.
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
echo          PEMBUAT FILE "Pertashop.exe" DENGAN LOGO RESMI
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
echo  [SUKSES!] File "Pertashop.exe" telah selesai dibuat!
echo.
echo  Fitur Pertashop.exe:
echo  1. Memiliki icon logo resmi Pertashop.
echo  2. Bersih tanpa jendela CMD/prompt hitam yang mengganggu kasir.
echo  3. Menjalankan server otomatis & membuka jendela kasir mandiri.
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

echo Membuat shortcut "Pertashop Kasir" di Desktop Windows...
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

if not exist "node_modules\electron\" (
    echo Mengunduh paket electron & builder (memerlukan internet)...
    call npm install --save-dev --legacy-peer-deps electron electron-builder
    if errorlevel 1 (
        echo [ERROR] Gagal mengunduh paket Electron.
        pause
        goto MAIN_MENU
    )
)

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
echo [SUKSES!] File installer telah dibuat di folder dist-electron\
echo =====================================================================
if exist "dist-electron\" start "" explorer dist-electron
pause
goto MAIN_MENU

:: =============================================================================
:: [5] UPDATE APLIKASI
:: =============================================================================
:UPDATE_APP
cls
echo =====================================================================
echo          PEMBARUAN APLIKASI (AUTO-UPDATE)
echo =====================================================================
echo.

where git >nul 2>nul
if not errorlevel 1 (
    echo Mengambil update kode dari repository Git...
    git pull
)

echo Memperbarui paket pustaka aplikasi...
call npm install
echo.
echo Memvalidasi build sistem...
call npm run build
echo.
echo [SUKSES] Sistem Pertashop berhasil diperbarui!
pause
goto MAIN_MENU

:: =============================================================================
:: [6] REPAIR DEPENDENCIES
:: =============================================================================
:REPAIR_DEPS
cls
echo =====================================================================
echo          INSTALL / REPAIR DEPENDENSI APLIKASI
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
