# =====================================================================
# SISTEM MANAJEMEN & LAPORAN PERTASHOP
# PEMBARUAN OTOMATIS DARI GITHUB RESMI (PowerShell Engine)
# =====================================================================

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$appDir = $PSScriptRoot
if (-not $appDir) {
    $appDir = (Get-Location).Path
}
Set-Location -Path $appDir

Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "         SISTEM MANAJEMEN DAN LAPORAN PERTASHOP" -ForegroundColor Cyan
Write-Host "                 AUTO-UPDATE DARI GITHUB RESMI" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Lokasi Folder Aplikasi : $appDir"
Write-Host "  Repository Target      : https://github.com/fyercz/Project-POS.git"
Write-Host "  Cabang (Branch)        : main"
Write-Host ""
Write-Host "  * Seluruh data transaksi kasir dijamin 100% AMAN di LocalStorage browser." -ForegroundColor Green
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

$repoUrl = "https://github.com/fyercz/Project-POS.git"
$zipUrl = "https://github.com/fyercz/Project-POS/archive/refs/heads/main.zip"
$updatedSuccess = $false

# 1. Coba sinkronisasi menggunakan Git
$gitCmd = Get-Command "git" -ErrorAction SilentlyContinue

if ($gitCmd) {
    try {
        Write-Host "[1/5] Memeriksa koneksi repositori Git..." -ForegroundColor Yellow
        if (-not (Test-Path ".git")) {
            Write-Host "      - Menginisialisasi repositori Git lokal..."
            & git init *>$null
            & git remote add origin $repoUrl *>$null
            & git branch -M main *>$null
        } else {
            & git remote set-url origin $repoUrl *>$null
        }

        Write-Host "[2/5] Menarik pembaruan kode terbaru dari GitHub..." -ForegroundColor Yellow
        & git fetch origin main --prune

        if ($LASTEXITCODE -eq 0) {
            Write-Host "[3/5] Menerapkan kode program terbaru ke direktori aplikasi..." -ForegroundColor Yellow
            & git branch -M main *>$null
            & git reset --hard origin/main
            & git clean -fd -e .env *>$null
            $updatedSuccess = $true
        } else {
            Write-Host "[PERINGATAN] Git fetch mengalami kendala, beralih ke download ZIP..." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[PERINGATAN] Terjadi kendala Git: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# 2. Metode Cadangan: Unduh ZIP via PowerShell
if (-not $updatedSuccess) {
    try {
        Write-Host ""
        Write-Host "[METODE CADANGAN] Mengunduh arsip kode sumber terbaru dari GitHub..." -ForegroundColor Yellow
        Write-Host "                   URL: $zipUrl"
        
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $ProgressPreference = 'SilentlyContinue'

        $tempZip = Join-Path $env:TEMP "pertashop_update_temp.zip"
        $tempExtract = Join-Path $env:TEMP "pertashop_extracted"

        if (Test-Path $tempZip) { Remove-Item -Path $tempZip -Force -ErrorAction SilentlyContinue }
        if (Test-Path $tempExtract) { Remove-Item -Path $tempExtract -Recurse -Force -ErrorAction SilentlyContinue }

        Invoke-WebRequest -UseBasicParsing -Uri $zipUrl -OutFile $tempZip
        Write-Host "[INFO] Mengekstrak file pembaruan..." -ForegroundColor Yellow
        Expand-Archive -Path $tempZip -DestinationPath $tempExtract -Force

        $extractedSubfolder = Join-Path $tempExtract "Project-POS-main"
        if (Test-Path $extractedSubfolder) {
            Copy-Item -Path "$extractedSubfolder\*" -Destination $appDir -Recurse -Force
        } else {
            $firstFolder = Get-ChildItem -Path $tempExtract -Directory | Select-Object -First 1
            if ($firstFolder) {
                Copy-Item -Path "$($firstFolder.FullName)\*" -Destination $appDir -Recurse -Force
            }
        }

        Remove-Item -Path $tempZip -Force -ErrorAction SilentlyContinue
        Remove-Item -Path $tempExtract -Recurse -Force -ErrorAction SilentlyContinue
        $updatedSuccess = $true
        Write-Host "[OK] File kode sumber berhasil diperbarui via ZIP." -ForegroundColor Green
    } catch {
        Write-Host ""
        Write-Host "[ERROR] Gagal mengunduh pembaruan dari GitHub: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Pastikan komputer terhubung ke internet." -ForegroundColor Red
        Write-Host ""
        Read-Host "Tekan Enter untuk menutup jendela ini..."
        exit 1
    }
}

# 3. Bersihkan cache dan perbarui dependensi
Write-Host ""
Write-Host "[4/5] Membersihkan cache lama dan memverifikasi dependensi..." -ForegroundColor Yellow

if (Test-Path "node_modules\.vite") { Remove-Item -Path "node_modules\.vite" -Recurse -Force -ErrorAction SilentlyContinue }
if (Test-Path "dist") { Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue }
Get-ChildItem -Path $appDir -Filter "*.tmp" -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem -Path $appDir -Filter "npm-debug.log*" -ErrorAction SilentlyContinue | Remove-Item -Force

$npmCmd = Get-Command "npm" -ErrorAction SilentlyContinue
if ($npmCmd) {
    Write-Host "      - Memverifikasi paket library (npm install)..."
    & npm prune *>$null
    & npm install
    Write-Host ""
    Write-Host "      - Mengompilasi aplikasi web (Vite build)..."
    & npm run build
} else {
    Write-Host "[PERINGATAN] Node.js / npm tidak ditemukan di PATH sistem." -ForegroundColor Yellow
}

# 4. Rebuild Pertashop.exe jika compiler Windows ada
$cscPaths = @(
    "$env:SystemRoot\Microsoft.NET\Framework64\v4.0.30319\csc.exe",
    "$env:SystemRoot\Microsoft.NET\Framework\v4.0.30319\csc.exe"
)
$cscExe = $cscPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($cscExe -and (Test-Path "launcher\PertashopApp.cs")) {
    Write-Host ""
    Write-Host "[5/5] Memperbarui file executable Pertashop.exe..." -ForegroundColor Yellow
    if (Test-Path "assets\icon.ico") {
        & $cscExe /nologo /target:winexe /win32icon:"assets\icon.ico" /out:"Pertashop.exe" "launcher\PertashopApp.cs" *>$null
    } else {
        & $cscExe /nologo /target:winexe /out:"Pertashop.exe" "launcher\PertashopApp.cs" *>$null
    }
}

# 5. Selesai
Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Green
Write-Host " [SUKSES] APLIKASI PERTASHOP TELAH BERHASIL DIPERBARUI KE VERSI TERKINI!" -ForegroundColor Green
Write-Host "===============================================================================" -ForegroundColor Green

if ($gitCmd -and (Test-Path ".git")) {
    Write-Host ""
    Write-Host " Status Versi Kode Terbaru:" -ForegroundColor Cyan
    & git log -1 --pretty=format:"  - Commit ID : %h%n  - Tanggal   : %ci%n  - Catatan   : %s" 2>$null
    Write-Host ""
}

Write-Host ""
Write-Host "  * Seluruh file program, skrip, dan modul sekarang 100% AKTUAL sesuai GitHub."
Write-Host "  * Data transaksi penjualan, laporan, dan profil kasir tetap utuh dan aman."
Write-Host ""
Write-Host "  Silakan jalankan aplikasi dengan membuka:"
Write-Host "  - run.bat        (Buka langsung kasir desktop)"
Write-Host "  - Pertashop.bat  (Menu utama lengkap)"
Write-Host "  - Pertashop.exe  (Jika menggunakan file .exe mandiri)"
Write-Host "===============================================================================" -ForegroundColor Green
Write-Host ""
Read-Host "Tekan Enter untuk menutup jendela ini..."
