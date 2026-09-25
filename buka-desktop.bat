@echo off
chcp 65001 >nul
title [Pertashop] - Mode Aplikasi Desktop (Standalone)
color 0B

echo =====================================================================
echo          SISTEM MANAJEMEN & LAPORAN PERTASHOP
echo               MODE APLIKASI DESKTOP (JENDELA MANDIRI)
echo =====================================================================
echo.
echo Mode ini membuka aplikasi dalam jendela desktop tersendiri (tanpa tab,
echo tanpa address bar) menyerupai aplikasi .EXE native untuk kenyamanan kasir.
echo.

:: Periksa lokasi Microsoft Edge atau Google Chrome
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

:: Jalankan server lokal di background
echo [1/2] Menyiapkan server lokal...
start "" /b cmd /c "call npm run dev"

echo [2/2] Membuka jendela aplikasi desktop...
timeout /t 3 /nobreak >nul

if defined BROWSER_CMD (
    start "" %BROWSER_CMD% --app="http://localhost:3000" --window-size=1366,850
) else (
    start http://localhost:3000
)

echo.
echo =====================================================================
echo  Aplikasi Sistem Pertashop telah aktif dalam Jendela Desktop!
echo  
echo  * Jangan tutup jendela terminal ini selama aplikasi sedang digunakan.
echo  * Tekan [Ctrl + C] untuk menghentikan server.
echo =====================================================================
echo.

pause
