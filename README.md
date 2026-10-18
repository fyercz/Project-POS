# Sistem Manajemen & Laporan Pertashop

Aplikasi pencatatan transaksi harian untuk Pertashop (SPBU Pertamina mini): penjualan per shift, pemesanan & penerimaan DO BBM, sounding tangki, absensi & penggajian karyawan, pengeluaran operasional, hingga rekap laba-rugi bulanan. Berjalan sepenuhnya **offline** di browser komputer kasir — data tersimpan lokal di perangkat, tidak butuh koneksi internet untuk pemakaian sehari-hari.

---

## 🚀 Mulai Cepat

### Windows (komputer kasir)
1. Pastikan [Node.js](https://nodejs.org/) (versi LTS) sudah terpasang.
2. Klik ganda **`Pertashop.bat`**.
3. Pilih **`[1] Buka Aplikasi Kasir`** (atau cukup tekan Enter, karena ini pilihan default).
4. Aplikasi terbuka otomatis di jendela desktop, siap dipakai.

Dependensi (`npm install`) terpasang otomatis saat pertama kali dijalankan — tidak perlu langkah tambahan.

### Linux / macOS
```bash
./run.sh
```
Skrip ini otomatis memasang dependensi (lewat `install.sh`) bila diperlukan, lalu membuka aplikasi di `http://localhost:3000`.

Panduan lengkap semua menu, cara bikin shortcut 1-klik, dan akses dari HP/tablet lewat WiFi lokal ada di **[PANDUAN_MENJALANKAN_APLIKASI.md](./PANDUAN_MENJALANKAN_APLIKASI.md)**.

---

## 🧭 Fitur Utama

- **Penjualan per shift** — input stand meter atau liter manual, pembayaran tunai/QRIS/EDC, rekonsiliasi kas otomatis.
- **Sounding tangki** — catat stik celup, deteksi selisih losses/gain BBM, sinkron otomatis ke pembukuan.
- **DO Pertamina** — pemesanan, penerimaan/bongkar, koreksi volume, riwayat harga tebus.
- **Absensi & penggajian** — rekap kehadiran per shift, hitung gaji & lembur otomatis, slip gaji bulanan.
- **Pengeluaran operasional** — listrik, PDAM, gaji, losses/gain BBM, dividen pemilik.
- **Rekap & laporan** — ringkasan bulanan/tahunan, laba rugi, cetak berita acara harian.
- **Backup & restore** — ekspor/impor seluruh data sebagai satu file JSON.
- **Impor Excel/CSV** — migrasi data penjualan atau DO dari catatan lama.

## 💾 Backup Data — Wajib Dibaca

Data transaksi tersimpan di **penyimpanan lokal browser** (localStorage) pada komputer tempat aplikasi dijalankan — **bukan** di kode aplikasi atau di GitHub. Artinya:

- Mengambil kode terbaru dari GitHub (`update.bat` / `./update.sh`) **tidak menyentuh** data transaksi Anda.
- Tapi kalau Anda pindah komputer, instal ulang Windows, atau membersihkan data browser, data **akan hilang** kecuali sudah di-backup.

**Sebelum melakukan hal besar apa pun** (update, pindah komputer, instal ulang): buka menu **Backup & Restore** di aplikasi → **Unduh File Backup (.json)** → simpan di flashdisk/Google Drive.

## 🔄 Memperbarui Aplikasi

| Platform | Perintah |
|---|---|
| Windows | `Pertashop.bat` → `[5] Periksa Pembaruan Sistem` |
| Linux/macOS | `./update.sh` |

Update menarik kode terbaru dari [repo resmi](https://github.com/fyercz/Project-POS), memasang ulang dependensi, dan build ulang — otomatis, tanpa mengubah data transaksi.

## 🛠️ Troubleshooting

**Jendela `.bat` tertutup sendiri / force close**
Sudah diperbaiki di versi terbaru (akar masalahnya ada tiga: line ending file yang salah, perintah `chcp 65001` yang bermasalah di sebagian Windows, dan cara menu memanggil proses update). Kalau Anda masih memakai versi lama yang bermasalah, **jangan** pakai `update.bat` versi itu untuk menarik perbaikan ini (karena file itu sendiri yang rusak) — download ulang manual: **Code → Download ZIP** di halaman GitHub, lalu timpa folder aplikasi Anda.

**Server tidak bisa diakses / port 3000 dipakai aplikasi lain**
Tutup aplikasi lain yang memakai port itu, atau jalankan `npx vite --port=3001` secara manual lalu buka `http://localhost:3001`.

**Mau diakses dari HP/tablet manager di WiFi yang sama**
Lihat bagian "Mengakses Aplikasi dari HP atau Tablet" di [PANDUAN_MENJALANKAN_APLIKASI.md](./PANDUAN_MENJALANKAN_APLIKASI.md).

Masalah lain tidak ada di sini? Buka halaman [Issues](https://github.com/fyercz/Project-POS/issues) di GitHub, atau hubungi pengelola repo.

## 📁 Struktur Proyek (ringkas)

```
Pertashop.bat / update.bat      Peluncur & pembaru untuk Windows
run.sh / update.sh / install.sh Peluncur, pembaru & pemasang dependensi untuk Linux/macOS
launcher/PertashopApp.cs        Sumber Pertashop.exe (launcher desktop tanpa jendela CMD)
electron/main.cjs               Pembungkus Electron (opsional, untuk build aplikasi desktop)
src/                            Kode sumber aplikasi (React + TypeScript)
src/App.tsx                     Logika bisnis utama (penjualan, stok, gaji, dsb.)
src/components/                 Tampilan tiap menu/modal
src/utils/                      Fungsi bantu (penyimpanan, harga, absensi, format)
```

## 🧰 Perintah Developer

```bash
npm install      # pasang dependensi
npm run dev      # jalankan server pengembangan (http://localhost:3000)
npm run build    # build produksi ke folder dist/
npm run lint     # periksa tipe TypeScript (tsc --noEmit)
npm test         # jalankan unit test (Vitest)
npm run test:bats # jalankan test skrip shell (butuh bats-core terpasang)
```

Lihat **[TESTING.md](./TESTING.md)** untuk strategi testing lengkap (unit test logika bisnis, test skrip shell, dan CI yang menjalankan `.bat` di Windows sungguhan).

---

Dikembangkan untuk kebutuhan operasional Pertashop. Lisensi internal — hubungi pengelola repo untuk pertanyaan penggunaan.
