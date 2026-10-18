@echo off
rem Pertashop POS - ambil kode terbaru dari GitHub lalu build ulang.
rem Data transaksi tersimpan di localStorage browser kasir - TIDAK disentuh sama sekali
rem oleh proses ini, apa pun hasilnya.
rem
rem Skrip ini berpindah ke salinan di folder TEMP tanpa "call" (tidak kembali lagi),
rem karena update.bat sendiri ikut ditimpa oleh git saat proses update berjalan.
if not "%~1"=="--dari-temp" (
    copy /y "%~f0" "%TEMP%\pertashop-update.bat" >nul
    "%TEMP%\pertashop-update.bat" --dari-temp "%~dp0"
)
setlocal
title Pertashop POS - Update
cd /d "%~2"
set "REPO_URL=https://github.com/fyercz/Project-POS.git"
set "ZIP_URL=https://github.com/fyercz/Project-POS/archive/refs/heads/main.zip"

echo ===============================================================================
echo          SISTEM MANAJEMEN DAN LAPORAN PERTASHOP - AUTO-UPDATE
echo ===============================================================================
echo.

where git >nul 2>nul
if errorlevel 1 (
    echo [PERINGATAN] Git tidak ditemukan di komputer ini. Mengunduh ZIP langsung dari GitHub...
    goto DOWNLOAD_ZIP
)

echo [1/4] Menyiapkan repositori Git...
if not exist ".git" (git init -q & git remote add origin %REPO_URL% 2>nul)
git remote set-url origin %REPO_URL% 2>nul || git remote add origin %REPO_URL% 2>nul

echo [2/4] Mengambil kode terbaru dari GitHub (origin/main)...
git fetch origin main
if errorlevel 1 (
    echo [PERINGATAN] Git fetch gagal ^(koneksi/autentikasi^). Beralih ke unduhan ZIP...
    goto DOWNLOAD_ZIP
)
git reset --hard origin/main
if errorlevel 1 (
    echo [PERINGATAN] Git reset gagal. Beralih ke unduhan ZIP...
    goto DOWNLOAD_ZIP
)
git branch -M main >nul 2>nul
goto AFTER_CODE_UPDATE

:DOWNLOAD_ZIP
set "ZIP_TEMP=%TEMP%\pertashop-update.zip"
set "EXTRACT_TEMP=%TEMP%\pertashop-extracted"
if exist "%ZIP_TEMP%" del /f /q "%ZIP_TEMP%" >nul 2>nul
if exist "%EXTRACT_TEMP%" rmdir /s /q "%EXTRACT_TEMP%" >nul 2>nul
echo       Mengunduh arsip kode sumber dari GitHub...
powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol='Tls12'; $ProgressPreference='SilentlyContinue'; Invoke-WebRequest -UseBasicParsing -Uri '%ZIP_URL%' -OutFile '%ZIP_TEMP%'"
if errorlevel 1 goto GAGAL
echo       Mengekstrak pembaruan ke folder sementara...
powershell -NoProfile -Command "$ProgressPreference='SilentlyContinue'; Expand-Archive -Path '%ZIP_TEMP%' -DestinationPath '%EXTRACT_TEMP%' -Force"
if errorlevel 1 goto GAGAL
echo       Menyalin file terbaru ke folder aplikasi...
rem robocopy /MIR membuat folder aplikasi jadi cerminan PERSIS isi ZIP (termasuk menghapus
rem file yang sudah dihapus dari repo GitHub) - menyamai perilaku "git reset --hard" yang
rem dipakai jalur Git. Folder build/cache/konfigurasi lokal dikecualikan agar TIDAK ikut
rem terhapus (xcopy sebelumnya tidak pernah menghapus apa pun, hanya menambah/menimpa).
for /d %%D in ("%EXTRACT_TEMP%\*") do robocopy "%%D" "." /MIR /XD .git node_modules dist coverage /XF .env *.log >nul
del /f /q "%ZIP_TEMP%" >nul 2>nul
rmdir /s /q "%EXTRACT_TEMP%" >nul 2>nul

:AFTER_CODE_UPDATE
echo [3/4] Membersihkan cache lama...
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite" >nul 2>nul
if exist "dist" rmdir /s /q "dist" >nul 2>nul
del /f /q *.tmp npm-debug.log* >nul 2>nul

where npm >nul 2>nul
if errorlevel 1 (
    echo [PERINGATAN] Node.js/npm tidak ditemukan di PATH. Pasang Node.js versi LTS
    echo              dari https://nodejs.org lalu jalankan update.bat ini lagi.
    pause
    exit /b 1
)

echo [4/4] Memasang ulang dependensi dan membangun aplikasi...
call npm install --no-audit --no-fund
if errorlevel 1 goto GAGAL
call npm run build
if errorlevel 1 goto GAGAL

rem Build ulang Pertashop.exe bila compiler .NET tersedia (opsional - tidak menggagalkan
rem update bila tidak ada; Pertashop.bat tetap bisa dipakai tanpa file .exe ini)
set "CSC="
if exist "%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\csc.exe" set "CSC=%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not defined CSC if exist "%SystemRoot%\Microsoft.NET\Framework\v4.0.30319\csc.exe" set "CSC=%SystemRoot%\Microsoft.NET\Framework\v4.0.30319\csc.exe"
if defined CSC if exist "launcher\PertashopApp.cs" if exist "assets\icon.ico" "%CSC%" /nologo /target:winexe /win32icon:"assets\icon.ico" /out:"Pertashop.exe" "launcher\PertashopApp.cs" >nul 2>nul

echo.
echo ===============================================================================
echo  [SUKSES] APLIKASI PERTASHOP TELAH BERHASIL DIPERBARUI KE VERSI TERKINI!
echo ===============================================================================
where git >nul 2>nul
if not errorlevel 1 if exist ".git" git log -1 --pretty=format:"  Versi sekarang : %%h - %%s" 2>nul & echo.
echo.
echo  * Seluruh data transaksi, laporan, dan profil kasir tetap 100%% AMAN
echo    (tersimpan di penyimpanan browser, tidak pernah disentuh proses update ini).
echo  * Jalankan Pertashop.bat untuk membuka aplikasi.
echo ===============================================================================
echo.
echo Tekan sembarang tombol untuk menutup jendela ini...
pause >nul
exit /b 0

:GAGAL
echo.
echo ===============================================================================
echo  [GAGAL] Pembaruan belum berhasil diselesaikan secara otomatis.
echo  Pastikan koneksi internet aktif, atau unduh ZIP manual dari:
echo  https://github.com/fyercz/Project-POS  ^(tombol hijau Code - Download ZIP^)
echo ===============================================================================
echo.
pause
exit /b 1
