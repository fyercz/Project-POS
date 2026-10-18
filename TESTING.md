# Strategi Testing

Proyek ini sebelumnya tidak punya infrastruktur test otomatis sama sekali — setiap bug
ditemukan lewat pembacaan kode manual atau skrip Playwright ad-hoc yang tidak tersimpan.
Dokumen ini menjelaskan strategi testing yang sekarang terpasang, dan kenapa dibagi tiga
lapisan berbeda sesuai jenis kode yang sangat berbeda karakternya di proyek ini.

## Piramida Testing untuk Proyek Ini

```
        /  Windows CI (nyata)  \      Sedikit, lambat, tapi SATU-SATUNYA yang
       /    (.bat di Windows)   \     benar-benar menjalankan cmd.exe sungguhan
      /----------------------------\
     /   Shell script (bats)        \  Sedang, cepat, dijalankan sungguhan di Linux
    /--------------------------------\
   /   Unit test logika bisnis (vitest) \  Banyak, sangat cepat, fungsi murni
  /----------------------------------------\
```

## 1. Unit test — logika bisnis (`tests/unit/*.test.ts`, Vitest)

**Cakupan**: fungsi murni di `src/utils/` — perhitungan stok, harga, absensi, gaji, dan
validasi backup. Sengaja **bukan** test komponen React (belum ada test render/interaksi UI)
karena nilai tertinggi saat ini ada di logika bisnis yang sudah terbukti berulang kali jadi
sumber bug nyata (stok tangki, gaji lembur, harga vs kas fisik).

**Setiap test di sini merepresentasikan bug nyata yang pernah terjadi di produksi**, bukan
cakupan generik. Contoh: `syncSalesToAttendance` idempotensi (bug lembur bertambah terus),
`recalculateSaleWithPrice` tidak boleh ubah kas fisik, `sumExpensesNetOfFuelGain` konsistensi
gain/loss BBM antar laporan, `isPayrollLocked` mengunci slip yang sudah dibayar.

Jalankan: `npm test` (sekali) atau `npm run test:watch` (mode pantau saat development).

## 2. Shell script — bats-core (`tests/bats/*.bats`)

**Cakupan**: `run.sh`, `install.sh`, `update.sh` dijalankan **sungguhan** (bukan dibaca),
termasuk skenario yang sebelumnya hanya diverifikasi manual sekali lewat terminal:
auto-install gagal → server tidak boleh tetap start; file backup yang tak di-track git
harus selamat dari `git reset --hard`; edit lokal yang belum di-commit harus terganti;
skrip aman menimpa dirinya sendiri saat berjalan (self-overwrite).

Install: `sudo apt-get install bats` (Ubuntu/Debian) atau `brew install bats-core` (macOS).
Jalankan: `npm run test:bats`.

## 3. Skrip Windows — pemeriksaan statis + CI Windows sungguhan

Ini lapisan paling rumit, karena **lingkungan pengembangan proyek ini adalah Linux**, sementara
`Pertashop.bat` dan `update.bat` hanya benar-benar berjalan di `cmd.exe` Windows. Dipecah jadi dua:

### a. Pemeriksaan statis (`tests/unit/batchScripts.test.ts`, jalan di `npm test`)
Tidak mengeksekusi file `.bat` sama sekali — hanya memeriksa pola teks yang **sudah terbukti**
menyebabkan force-close di masa lalu: line ending harus CRLF murni, tidak boleh ada
`chcp 65001`, tanda kurung harus seimbang, setiap `goto` harus punya label tujuan, tidak boleh
ada pola `cmd.exe /c` dengan kutip bersarang. Ini **tidak membuktikan skrip benar**, hanya
mencegah regresi ke pola-pola yang sudah diketahui berbahaya.

### b. Eksekusi sungguhan di Windows (`tests/windows/test-update-bat.ps1`, jalan di GitHub Actions)
Satu-satunya lapisan yang benar-benar menjalankan `cmd.exe` asli. Jalan otomatis di CI
(`.github/workflows/test.yml`, job `windows-batch-tests`) tiap kali ada push/PR ke `main`,
di runner `windows-latest` milik GitHub — bukan di sandbox pengembangan. Test ini membuat
"GitHub palsu" lokal, menjalankan `update.bat` sungguhan melawannya, dan memverifikasi: kode
ter-update, build selesai, dan file backup yang tak di-track git tetap utuh.

**Keterbatasan yang jujur perlu diketahui**: skrip ini ditulis dan diverifikasi sintaksnya
dari lingkungan Linux (parentheses seimbang, CRLF benar, dll.) tapi **baru benar-benar
teruji begitu CI ini jalan di GitHub** atau dicoba manual di komputer Windows. Kalau
menambah skenario baru yang menyentuh `Pertashop.bat`/`update.bat`, pertimbangkan menambah
test serupa di `tests/windows/`.

## Menjalankan Semua Test

```bash
npm test          # unit test TypeScript (Vitest)
npm run test:bats # shell script (butuh bats terpasang)
npm run lint      # type-check (tsc --noEmit)
npm run build     # build produksi
```

CI (`.github/workflows/test.yml`) menjalankan keempatnya plus eksekusi Windows sungguhan
otomatis setiap push/PR ke `main`.

## Yang Belum Dicakup (Peluang ke Depan)

- **Test komponen React** (interaksi form, modal) — saat ini hanya diverifikasi manual
  lewat Playwright ad-hoc. Kandidat kuat: `SalesEntryModal`, karena punya logika validasi
  shift/operator yang kompleks.
- **Test end-to-end lintas-layar** (mis. "simpan penjualan → cek stok tangki berkurang →
  cek laporan bulanan berubah") — perlu Playwright asli dengan browser, bukan Vitest.
- **Test `Pertashop.exe`** (`launcher/PertashopApp.cs`) — baru diverifikasi lewat kompilasi
  Mono + smoke-test alur logika (lihat riwayat commit), belum ada test otomatis permanen.
