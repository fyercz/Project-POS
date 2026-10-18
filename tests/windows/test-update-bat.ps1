# Test update.bat pada Windows SUNGGUHAN (dijalankan lewat GitHub Actions windows-latest).
#
# Ini satu-satunya cara skrip .bat proyek ini benar-benar DIEKSEKUSI oleh cmd.exe asli,
# bukan sekadar dibaca/dianalisis secara statis (sandbox pengembangan tidak punya Windows).
# Test ini meniru persis skenario yang pernah menyebabkan force-close di komputer kasir:
# menjalankan update.bat yang menimpa dirinya sendiri lewat git reset --hard, memastikan
# prosesnya selesai dengan bersih (exit code 0) dan hasilnya benar.
#
# Jalankan manual: powershell -File tests/windows/test-update-bat.ps1

$ErrorActionPreference = 'Stop'
$repoRoot = Resolve-Path "$PSScriptRoot\..\.."
$work = Join-Path $env:TEMP "pertashop-update-bat-test-$(Get-Random)"
New-Item -ItemType Directory -Path $work | Out-Null

try {
    $remote = Join-Path $work 'remote'
    $install = Join-Path $work 'install'
    New-Item -ItemType Directory -Path $remote, $install | Out-Null

    # --- Siapkan "GitHub palsu" lokal (versi baru) ---
    Push-Location $remote
    git init -q
    git config user.email a@b.com
    git config user.name test
    '{"name":"fake","version":"2.0.0","scripts":{"build":"echo BUILD_OK"}}' | Set-Content package.json
    "console.log('VERSI BARU dari GitHub')" | Set-Content app.js
    Copy-Item (Join-Path $repoRoot 'update.bat') .
    git add -A
    git commit -qm "v2"
    git branch -M main
    Pop-Location

    # --- Siapkan folder instalasi "lama" ---
    Push-Location $install
    git init -q
    git config user.email a@b.com
    git config user.name test
    '{"name":"fake","version":"1.0.0","scripts":{"build":"echo BUILD_OK"}}' | Set-Content package.json
    "console.log('versi lama')" | Set-Content app.js
    Copy-Item (Join-Path $repoRoot 'update.bat') .
    git add -A
    git commit -qm "v1"

    # Arahkan ke remote palsu, bukan GitHub sungguhan
    (Get-Content update.bat) -replace 'https://github\.com/fyercz/Project-POS\.git', $remote.Replace('\', '\\') | Set-Content update.bat -Encoding ASCII

    # File backup yang TIDAK di-track git - harus tetap ada setelah update
    "DATA BACKUP PENTING - JANGAN HILANG" | Set-Content backup_pertashop_untracked.json

    # --- Jalankan update.bat SUNGGUHAN ---
    $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "update.bat" -WorkingDirectory $install -NoNewWindow -PassThru -RedirectStandardOutput "$work\stdout.log" -RedirectStandardError "$work\stderr.log"
    $proc.WaitForExit(120000) | Out-Null

    if (-not $proc.HasExited) {
        $proc.Kill()
        Write-Error "GAGAL: update.bat tidak selesai dalam 120 detik (kemungkinan macet menunggu input)."
        exit 1
    }
    if ($proc.ExitCode -ne 0) {
        Get-Content "$work\stdout.log" -ErrorAction SilentlyContinue
        Write-Error "GAGAL: update.bat keluar dengan kode $($proc.ExitCode)."
        exit 1
    }

    # --- Verifikasi hasil ---
    $pkg = Get-Content (Join-Path $install 'package.json') -Raw
    if ($pkg -notmatch '2\.0\.0') {
        Write-Error "GAGAL: package.json tidak ter-update ke versi 2.0.0. Isi: $pkg"
        exit 1
    }

    $appJs = Get-Content (Join-Path $install 'app.js') -Raw
    if ($appJs -notmatch 'VERSI BARU') {
        Write-Error "GAGAL: app.js tidak ter-update ke versi baru. Isi: $appJs"
        exit 1
    }

    $backupPath = Join-Path $install 'backup_pertashop_untracked.json'
    if (-not (Test-Path $backupPath)) {
        Write-Error "GAGAL: file backup yang tidak di-track git IKUT TERHAPUS oleh update.bat!"
        exit 1
    }
    $backupContent = Get-Content $backupPath -Raw
    if ($backupContent -notmatch 'JANGAN HILANG') {
        Write-Error "GAGAL: isi file backup berubah/rusak setelah update."
        exit 1
    }

    Write-Host "SUKSES: update.bat berhasil menarik kode terbaru, build selesai, dan file backup tetap utuh." -ForegroundColor Green
}
finally {
    Remove-Item -Recurse -Force $work -ErrorAction SilentlyContinue
}
