# Panduan Menjalankan & Mengelola Aplikasi Pertashop

Dokumen ini berisi panduan praktis untuk menginstall, memperbarui (update), dan menjalankan **Sistem Manajemen & Laporan Pertashop** di komputer kasir atau kantor (Windows, Linux, macOS).

---

## 📋 Prasyarat Sistem
- **Komputer / Laptop**: Windows 10/11, Linux, atau macOS.
- **Node.js**: Versi LTS terbaru (minimal v18+ atau v20+).  
  *Jika belum terinstall, unduh dari: [https://nodejs.org/](https://nodejs.org/)*

---

## 🪟 Panduan untuk Pengguna Windows

Untuk pengguna Windows di komputer kasir Pertashop, cukup gunakan file `.bat` yang telah disediakan (bisa langsung **klik ganda / double-click**):

### 1. 🚀 Jalankan Aplikasi (Run)
- **Klik ganda file `run.bat`** (atau `auto-run.bat`).
- Script akan otomatis:
  1. Memeriksa apakah dependensi sudah terinstall (jika belum, otomatis menginstall).
  2. Membuka peramban (browser Edge / Chrome) ke alamat `http://localhost:3000`.
  3. Memulai server aplikasi.
- *Tips*: Anda dapat membuat **Shortcut ke Desktop** dari file `run.bat` agar operator kasir mudah membukanya setiap pergantian shift.

### 2. ⚡ Auto-Runner Serbaguna (`auto-run.bat`)
- **Klik ganda file `auto-run.bat`** untuk menu serbaguna:
  - `[1]` Jalankan Aplikasi langsung.
  - `[2]` Cek Update lalu jalankan aplikasi.
  - `[3]` Install ulang / perbaiki dependensi aplikasi.

### 3. 🔄 Pembaruan Otomatis (Auto-Update)
- **Klik ganda file `update.bat`** saat ada pembaruan kode atau fitur baru.
- Script akan otomatis melakukan:
  - `git pull` (mengambil pembaruan terbaru dari repository jika menggunakan Git).
  - `npm install` (memperbarui paket pustaka).
  - `npm run build` (memvalidasi kompilasi kode).

### 4. 📦 Instalasi Manual Pertama Kali (Auto-Install)
- **Klik ganda file `install.bat`**.
- Script akan otomatis menyiapkan file konfigurasi `.env` dan mengunduh seluruh dependensi aplikasi yang dibutuhkan.

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
