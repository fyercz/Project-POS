@echo off
setlocal enabledelayedexpansion
:: CATATAN: "chcp 65001" (ganti ke UTF-8) SENGAJA DIHAPUS - pada sebagian build Windows
:: perintah ini membuat cmd.exe kehilangan posisi baca file .bat dan keluar mendadak
:: tanpa pesan di awal eksekusi. File ini 100%% ASCII polos, jadi tidak membutuhkannya.
cd /d "%~dp0"
title Sistem Manajemen dan Laporan Pertashop
color 0B

:: Jalankan "Pertashop.bat run" (tanpa tanda kutip) untuk langsung membuka aplikasi tanpa
:: menu - buat file pintasan 1 baris berisi "call Pertashop.bat run" bila ingin tombol
:: 1-klik untuk pergantian shift, tanpa perlu menekan [1] + Enter setiap kali.
if /i "%~1"=="run" goto RUN_APP

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
echo   [7] Reset / Format Total Data Aplikasi ke Kondisi Bersih Baru
echo   [8] Keluar
echo.
echo ===============================================================================
set /p opt="Pilih nomor menu (1-8) [Default: 1]: "

if "%opt%"=="" set opt=1
if "%opt%"=="1" goto RUN_APP
if "%opt%"=="2" goto BUILD_EXE
if "%opt%"=="3" goto CREATE_SHORTCUT
if "%opt%"=="4" goto BUILD_ELECTRON
if "%opt%"=="5" goto UPDATE_APP
if "%opt%"=="6" goto REPAIR_DEPS
if "%opt%"=="7" goto RESET_APP_DATA
if "%opt%"=="8" exit /b 0

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
:: PENTING: update.bat TIDAK PERNAH dijalankan inline di sini (lewat "call" atau logika
:: git reset langsung di proses Pertashop.bat ini). Itu persis bug yang pernah membuat
:: jendela force-close - git reset --hard menimpa Pertashop.bat sendiri selagi file ini
:: masih aktif dibaca cmd.exe. Satu-satunya cara aman: proses update SELALU dijalankan
:: di jendela proses terpisah (lihat di bawah), termasuk saat update.bat perlu diunduh
:: ulang terlebih dahulu karena hilang dari folder.
if exist "update.bat" goto LAUNCH_UPDATE

echo =====================================================================
echo          MENGUNDUH MODUL PEMBARUAN (update.bat tidak ditemukan)
echo =====================================================================
echo.
echo [INFO] File update.bat tidak ada di folder ini. Mengunduh salinan resmi
echo        dari GitHub terlebih dahulu...
powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol='Tls12'; $ProgressPreference='SilentlyContinue'; Invoke-WebRequest -UseBasicParsing -Uri 'https://raw.githubusercontent.com/fyercz/Project-POS/main/update.bat' -OutFile 'update.bat'"
if errorlevel 1 (
    echo.
    echo [GAGAL] Tidak bisa mengunduh update.bat. Pastikan internet aktif,
    echo         atau unduh manual dari https://github.com/fyercz/Project-POS
    echo         ^(tombol hijau Code - Download ZIP^).
    echo.
    pause
    goto MAIN_MENU
)
echo [OK] update.bat berhasil diunduh.
echo.

:LAUNCH_UPDATE
echo =====================================================================
echo          MEMBUKA MODUL PEMBARUAN DI JENDELA TERPISAH
echo =====================================================================
echo.
echo [INFO] Proses update (termasuk Pertashop.bat ini sendiri) akan
echo        berjalan di jendela terpisah. Jendela menu ini akan DITUTUP
echo        sekarang - ini NORMAL, bukan error.
echo.
echo        Setelah update selesai, buka kembali Pertashop.bat untuk
echo        melanjutkan ke menu seperti biasa.
echo.
timeout /t 3 /nobreak >nul
start "Update Pertashop" "update.bat"
exit /b 0

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
:: [7] RESET / FORMAT TOTAL DATA APLIKASI
:: =============================================================================
:RESET_APP_DATA
cls
color 0C
echo =====================================================================
echo          FORMAT TOTAL / RESET DATA APLIKASI KE KONDISI AWAL
echo =====================================================================
echo.
echo PERINGATAN:
echo Tindakan ini akan mengembalikan aplikasi ke kondisi bersih seperti baru:
echo 1. Membersihkan cache build internal Vite (dist\ dan node_modules\.vite\).
echo 2. Membersihkan seluruh sisa file temporary .tmp dan cache compiler.
echo 3. Mengatur ulang aplikasi agar siap dibuka dengan data awal baru.
echo.
echo * Catatan: Anda juga dapat menggunakan tombol "Reset Aplikasi ke Kondisi Baru"
echo   di dalam menu Pengaturan Profil pada aplikasi kasir untuk memformat
echo   seluruh database secara aman dan langsung.
echo =====================================================================
echo.
set /p confirm="Ketik Y untuk konfirmasi format bersih [Y/T, Default: T]: "
if /i not "!confirm!"=="Y" (
    color 0B
    goto MAIN_MENU
)

echo.
echo [1/3] Membersihkan folder build dist\...
if exist "dist\" (
    rmdir /s /q "dist\" >nul 2>nul
    echo       [OK] Folder dist\ berhasil dibersihkan.
)

echo [2/3] Membersihkan cache dependency Vite...
if exist "node_modules\.vite\" (
    rmdir /s /q "node_modules\.vite\" >nul 2>nul
    echo       [OK] Cache node_modules\.vite\ berhasil dibersihkan.
)

del /f /q *.tmp >nul 2>nul
del /f /q npm-debug.log* >nul 2>nul

echo [3/3] Mengompilasi ulang web build bersih...
call npm run build

echo.
color 0A
echo =====================================================================
echo [SUKSES] Cache dan build aplikasi telah berhasil diformat bersih!
echo.
echo Langkah selanjutnya:
echo 1. Jalankan aplikasi melalui menu [1].
echo 2. Di dalam aplikasi, klik "Profil Pertashop" di pojok kanan atas,
echo    lalu klik tombol "Reset Aplikasi ke Kondisi Baru" untuk memastikan
echo    seluruh database transaksi lama terhapus total tanpa sisa.
echo =====================================================================
echo.
pause
color 0B
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
