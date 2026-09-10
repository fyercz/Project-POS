@echo off
chcp 65001 >nul
title [Pertashop] - Auto-Runner & Launcher
color 09

echo =====================================================================
echo          SISTEM MANAJEMEN & LAPORAN PERTASHOP
echo                  SMART LAUNCHER ALL-IN-ONE
echo =====================================================================
echo.
echo  Pilih opsi yang diinginkan:
echo.
echo  [1] Jalankan Aplikasi (Start App & Buka Browser)
echo  [2] Cek Update Lalu Jalankan (Auto-Update & Run)
echo  [3] Install / Repair Dependensi (Auto-Install)
echo  [4] Keluar
echo.
echo =====================================================================
set /p opt="Masukkan pilihan (1-4) [default: 1]: "

if "%opt%"=="" set opt=1
if "%opt%"=="1" goto RUN_APP
if "%opt%"=="2" goto UPDATE_THEN_RUN
if "%opt%"=="3" goto INSTALL_ONLY
if "%opt%"=="4" exit /b 0

echo Pilihan tidak valid, menjalankan aplikasi...
timeout /t 1 >nul

:RUN_APP
cls
call run.bat
exit /b 0

:UPDATE_THEN_RUN
cls
call update.bat
echo.
echo Memulai aplikasi...
timeout /t 2 >nul
cls
call run.bat
exit /b 0

:INSTALL_ONLY
cls
call install.bat
echo.
echo Selesai. Kembali ke menu dalam 3 detik...
timeout /t 3 >nul
call auto-run.bat
exit /b 0
