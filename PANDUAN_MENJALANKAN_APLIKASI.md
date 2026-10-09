# Panduan Menjalankan & Mengelola Aplikasi Pertashop

Dokumen ini berisi panduan praktis untuk menginstall, memperbarui (update), dan menjalankan **Sistem Manajemen & Laporan Pertashop** di komputer kasir atau kantor (Windows, Linux, macOS).

---

## 📋 Prasyarat Sistem
- **Komputer / Laptop**: Windows 10/11, Linux, atau macOS.
- **Node.js**: Versi LTS terbaru (minimal v18+ atau v20+).  
  *Jika belum terinstall, unduh dari: [https://nodejs.org/](https://nodejs.org/)*

---

## 🪟 Panduan untuk Pengguna Windows

Kini file `.bat` telah dioptimalkan agar sangat mudah digunakan di komputer kasir Pertashop:

### 1. 🌟 `Pertashop.bat` (Pusat Kontrol Utama All-in-One)
**Klik ganda file `Pertashop.bat`** untuk membuka menu kontrol berlogo resmi:
- `[1] 🚀 Buka Aplikasi Kasir`: Membuka sistem langsung dalam jendela aplikasi kasir modern tanpa tab/address bar.
- `[2] 📦 Buat File "Pertashop.exe"`: Menghasilkan file `Pertashop.exe` berlogo resmi hanya dalam 1-2 detik tanpa perlu download modul berat.
- `[3] 📌 Pasang Shortcut di Desktop Komputer`: Otomatis membuat icon shortcut dengan logo Pertashop di Desktop layar kasir.
- `[4] 🛠️ Buat Installer Setup .EXE`: Untuk membuat installer paket Electron (.exe setup).
- `[5] 🔄 Periksa Pembaruan Sistem (Auto-Update GitHub)`: Otomatis tersinkronisasi ke repository resmi **`https://github.com/fyercz/Project-POS.git`** untuk menarik update kode & modul terbaru.
- `[6] ⚙️ Install / Perbaiki Dependensi`: Memperbaiki paket library jika ada kendala.

### 2. ⚡ `run.bat` (1-Klik Langsung Buka Aplikasi Kasir)
- **Klik ganda file `run.bat`** saat pergantian shift.
- Tidak memunculkan menu pertanyaan: langsung menjalankan server dan membuka jendela desktop kasir seketika.
- *Tips*: Anda bisa klik kanan `run.bat` (atau `Pertashop.exe`) lalu pilih **Send to ➜ Desktop (create shortcut)**.

### 3. 🔄 `update.bat` / `update.ps1` (1-Klik Auto-Update GitHub Resmi)
- **Klik ganda file `update.bat`** (atau `update.ps1`) untuk memperbarui sistem kapan saja ke versi paling aktual dari GitHub.
- **Mengapa jendela prompt sebelumnya menutup mendadak?**
  1. *Perilaku Windows CMD*: Di Windows, saat file `.bat` menimpa dirinya sendiri dari git/zip, CMD kehilangan posisi file pointer dan langsung menutup (exit) sebelum proses selesai.
  2. *Solusi Runner Terisolasi*: `update.bat` versi baru kini otomatis menduplikasi proses eksekusi ke runner mandiri di `%TEMP%`. File script di folder aplikasi dapat diperbarui dengan aman tanpa mengganggu eksekusi CMD.
  3. *Verifikasi Lengkap*: Script menyelesaikan seluruh tahapan: git reset / download ZIP, `npm install`, `npm run build`, pembaruan `Pertashop.exe`, dan berhenti di layar konfirmasi status commit (tidak akan menutup sendiri sampai Anda menekan sembarang tombol).
  4. Seluruh data transaksi penjualan Anda tetap 100% AMAN di LocalStorage!
  5. Setelah update selesai, jika tampilan belum berubah di browser kasir, tekan **`Ctrl + F5`** (Hard Refresh).

---

### 🌐 Repository Resmi GitHub
- **URL**: `https://github.com/fyercz/Project-POS.git`
- Seluruh pembaruan di repository ini dapat langsung ditarik ke komputer kasir kapan saja menggunakan menu `[5]` di `Pertashop.bat`.

---

## 🐧 Panduan untuk Pengguna Linux / macOS

Buka terminal di direktori proyek ini, lalu jalankan perintah berikut:

### 1. Jalankan Aplikasi
```bash
./run.sh
```
*Script akan otomatis memeriksa dependensi, membuka browser, dan menjalankan server di port 3000.*

### 2. Pembaruan Aplikasi (Auto-Update)
```bash
./update.sh
```

### 3. Instalasi Dependensi (Auto-Install)
```bash
./install.sh
```

---

## 🌐 Mengakses Aplikasi dari HP atau Tablet di Pertashop
Aplikasi ini dapat dibuka oleh manager atau pengawas melalui HP/Tablet yang terhubung ke jaringan Wi-Fi lokal Pertashop yang sama:
1. Jalankan aplikasi di komputer kasir/server.
2. Cari tahu alamat IP lokal komputer kasir (contoh: `192.168.1.50`).
3. Buka browser di HP/Tablet dan ketik: `http://192.168.1.50:3000`.

---

## 💾 Cara Mengamankan & Memindahkan Data (Fitur Backup & Restore)

### Mengapa data transaksi tidak otomatis terbawa saat "Export Code"?
Fitur **Export Code (ZIP / GitHub)** hanya mengunduh *source code* program aplikasi. Seluruh data transaksi penjualan harian, pemesanan DO BBM, absensi operator, dan sounding tangki yang Anda input tersimpan secara aman di **Penyimpanan Lokal Browser (LocalStorage)** perangkat Anda demi kecepatan kerja tanpa perlu koneksi internet (offline-first).

### Langkah Memindahkan Data Saat Export Code atau Ganti Komputer:
1. **Pencadangan (Backup)**:
   - Pada aplikasi, klik tombol **"Backup & Restore"** pada sidebar kiri (atau di Pengaturan Profil).
   - Pada tab **"1. Backup / Unduh Data"**, klik tombol **"Unduh File Backup (.json)"**.
   - File JSON (contoh: `backup_pertashop_4P.633.08_2026-09-10.json`) akan tersimpan di komputer Anda. Simpan file ini di flashdisk atau Google Drive.
2. **Export & Jalankan Aplikasi di Komputer Kasir**:
   - Download ZIP dari menu AI Studio & ekstrak di komputer kasir.
   - Jalankan `run.bat` di komputer kasir.
3. **Pemulihan (Restore)**:
   - Di aplikasi baru, buka menu **"Backup & Restore"**.
   - Pilih tab **"2. Restore / Muat Data"**.
   - Pilih atau seret file JSON backup Anda, lalu klik **"Terapkan & Pulihkan Data Ini Sekarang"**.
   - Seluruh data transaksi, histori DO, profil, dan rekap penggajian Anda langsung aktif kembali 100%!

---

## 🛑 Menghentikan Aplikasi
- Pada jendela hitam/terminal (Command Prompt atau Terminal), tekan tombol kombinasi keyboard **`Ctrl + C`**.
