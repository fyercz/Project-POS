@echo off
chcp 65001 >nul
title Sistem Manajemen Pertashop
color 0B

echo =====================================================================
echo          SISTEM MANAJEMEN & LAPORAN PERTASHOP
echo                  MEMULAI APLIKASI KASIR
echo =====================================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    color 0C
    echo [ERROR] Node.js belum terinstall!
    echo Silakan install Node.js dari https://nodejs.org/
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo [INFO] Menyiapkan dependensi pertama kali...
    call npm install
)

echo [1/2] Menyiapkan server lokal...
start "" /b cmd /c "call npm run dev"

echo [2/2] Membuka jendela desktop kasir...
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

echo =====================================================================
echo  [SUKSES] Aplikasi aktif!
echo  Tekan [Ctrl + C] untuk menutup server.
echo =====================================================================
pause
