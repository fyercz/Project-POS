# Arsitektur & Model Data

Dokumen ini untuk developer yang baru pertama kali masuk ke codebase ini. Fokusnya: bagaimana
data saling terhubung, dan aturan bisnis apa yang WAJIB dipahami sebelum mengubah logika di
`App.tsx` atau `src/utils/`. Untuk cara menjalankan/build/deploy, lihat
[README.md](./README.md) dan [PANDUAN_MENJALANKAN_APLIKASI.md](./PANDUAN_MENJALANKAN_APLIKASI.md).
Untuk strategi test, lihat [TESTING.md](./TESTING.md).

## Gambaran Umum

Ini aplikasi **client-side murni** - tidak ada backend/server/database. Seluruh data (penjualan,
stok, gaji, dsb.) tersimpan di `localStorage` browser komputer tempat aplikasi dijalankan.
Konsekuensi penting:

- **Tidak ada sinkronisasi multi-perangkat.** Dua komputer kasir yang membuka aplikasi ini
  punya data LOKAL masing-masing, tidak otomatis sinkron. Fitur "Backup & Restore" (ekspor/impor
  file JSON) adalah satu-satunya cara memindahkan data antar perangkat.
- **Tidak ada database relasional.** Setiap "tabel" (penjualan, DO, sounding, dst.) adalah array
  JSON terpisah yang disimpan sebagai satu kunci `localStorage`. Relasi antar tabel (lihat bagian
  berikutnya) dijaga manual lewat field ID, bukan foreign key sungguhan.
- **Kuota penyimpanan terbatas** (~5-10 MB per origin, tergantung browser). `src/utils/storage.ts`
  punya mekanisme pembersihan otomatis dan peringatan dini saat kuota mendekati penuh - lihat
  `STORAGE_ERROR_EVENT` dan `getUsageInfo()`.

## Peta Komponen Utama

```
App.tsx                  "God component" - menyimpan SEMUA state (sales, purchases, soundings,
                          dsb.) dan SEMUA handler (handleSaveSale, handleCompleteReceiving, dst.)
                          Ini file terbesar kedua di proyek (~2.700 baris). Perubahan logika
                          bisnis hampir selalu dimulai/berakhir di sini.

src/types.ts              Definisi SEMUA interface data (SaleRecord, PurchaseOrder, dst.) -
                          baca ini LEBIH DULU sebelum menyentuh data apa pun.

src/utils/
  storage.ts               Baca/tulis localStorage, validasi backup, deteksi kuota penuh.
  pricing.ts                Perhitungan harga, margin, tanggal berlaku harga.
  attendanceSync.ts          Sinkronisasi penjualan -> absensi -> gaji, dan isPayrollLocked().
  formatters.ts              Format Rupiah/Liter/tanggal, helper shift, sumExpensesNetOfFuelGain().

src/components/            Satu file per layar/modal. TIDAK ada komponen UI bersama (Button,
                          Badge, Modal) - setiap modal menulis ulang struktur JSX-nya sendiri.
                          Lihat src/hooks/useModalA11y.ts untuk SATU pengecualian: logika
                          Escape/focus-trap/ARIA dialog memang sudah dibagikan lewat hook ini.
```

## Model Data & Relasinya

Semua interface ada di `src/types.ts`. Diagram di bawah menunjukkan hubungan LOGIS antar tabel -
sekali lagi, ini BUKAN foreign key database sungguhan, hanya konvensi field ID yang harus dijaga
konsisten secara manual di kode:

```
SaleRecord (penjualan 1 shift)
  │
  ├─ soundingRecordId ──────────► SoundingRecord
  │                               (dibuat otomatis jika kasir mengisi hasil stik celup
  │                                saat closing shift; lihat findSoundingForSale() di App.tsx)
  │
  ├─ attendanceRecordId ────────► AttendanceRecord
  │   attendanceCreatedBySale      (dibuat/diperbarui otomatis dari shift; flag
  │                                 attendanceCreatedBySale membedakan absensi yang DIBUAT
  │                                 sistem vs yang sudah ada sebelumnya/dibuat manual -
  │                                 penting agar hapus/edit penjualan tidak menghapus
  │                                 absensi manual yang tidak terkait)
  │
  └─ productId ──────────────────► Product (master harga & nama BBM)

PurchaseOrder (DO Pertamina)
  └─ saat status='SELESAI' (bongkar) ──► mengubah TankConfig.currentStockLiters
      (lihat effectiveStockAdded: volume yang BENAR-BENAR masuk tangki, dibatasi kapasitas
       maksimal - BUKAN selalu sama dengan volumeLiters yang dipesan/dikirim)

AttendanceRecord ──(employeeId + month)──► PayrollRecord
      (recalculateMonthlyPayrolls() di attendanceSync.ts menghitung ulang slip gaji dari
       absensi sebulan - TAPI lihat "Aturan Kunci Gaji" di bawah)

TankConfig (SATU record, bukan array - kondisi tangki saat ini)
      currentStockLiters diubah oleh: penjualan (mengurangi), penerimaan DO (menambah),
      sounding manual (mengoreksi ke angka fisik hasil ukur)
```

## Aturan Bisnis yang WAJIB Dipahami

Ini aturan-aturan yang kalau dilanggar menyebabkan bug data yang SULIT terlihat sampai laporan
bulanan salah. Sebagian besar ditemukan lewat debugging nyata, bukan desain di awal.

### 1. Satu operator, satu shift, satu hari
Seorang operator (kasir) tidak boleh tercatat dua kali di tanggal yang sama (lihat
`hasOperatorConflict`/`isShiftConflict` di `App.tsx`). Aturan ini SENGAJA membuat sinkronisasi
absensi aman disederhanakan: setiap pasangan (karyawan, tanggal) maksimal berasal dari SATU
transaksi penjualan, jadi tidak perlu logika penggabungan multi-shift yang rumit. **Jangan
longgarkan aturan ini** tanpa menulis ulang `resyncAttendanceForDate()` di `App.tsx` dan
`syncSalesToAttendance()` di `attendanceSync.ts` sekaligus.

### 2. Sounding adalah pengukuran FISIK, bukan tebakan
`hasSounding` pada `SaleRecord` HARUS hanya `true` kalau kasir benar-benar mengukur stik celup.
Nilai yang terisi otomatis (perkiraan dari stok teoritis) tidak boleh dianggap sounding
sungguhan - kalau dianggap, selisih pembulatan kecil (akibat konversi cm↔liter) akan tercatat
sebagai "losses/gain BBM" palsu setiap shift. Lihat `isSoundingTouched` di `SalesEntryModal.tsx`.

### 3. Hanya sounding/penerimaan TERBARU yang boleh menimpa stok tangki saat ini
Mengedit sounding atau DO yang SUDAH LAMA (bukan yang terakhir secara kronologis) tidak boleh
menimpa `TankConfig.currentStockLiters` dengan angka lama itu - itu akan "menghapus" semua
penjualan yang terjadi SESUDAHNYA dari catatan stok. Pola yang dipakai: selalu cek dulu apakah
record yang diedit itu `isLatestSale`/`isLatestSounding` (bandingkan tanggal+jam) sebelum
mengizinkannya menulis ke `TankConfig`.

### 4. Slip gaji yang sudah DIBAYAR itu FINAL
`isPayrollLocked()` di `attendanceSync.ts` adalah SATU-SATUNYA fungsi yang boleh dipakai untuk
memeriksa ini - jangan tulis pengecekan `paymentStatus === 'DIBAYAR'` secara terpisah di tempat
lain. Riwayat proyek ini sudah dua kali kedapatan logika kunci ini ditulis ulang di tempat
berbeda dan salah satunya lupa dikunci, menyebabkan nominal gaji yang sudah dibayar bisa
tertimpa diam-diam.

### 5. Harga jual/beli adalah "angka buku", kas fisik adalah fakta historis
Mengoreksi harga di `PriceManagementModal` boleh mengubah `unitPrice`/`totalRevenue`/`totalProfit`
pada `SaleRecord` lama, tapi **TIDAK PERNAH** boleh mengubah `paymentCash`/`paymentQris`/
`paymentEdc`/`actualCashInHand` - itu catatan uang yang SUNGGUHAN sudah diterima kasir saat
shift itu terjadi, tidak boleh ditulis ulang oleh koreksi harga di kemudian hari.

### 6. Gain BBM mengurangi beban, bukan menambah
Kategori beban `GAIN_MINYAK` (surplus BBM saat sounding) harus selalu diperlakukan sebagai
PENGURANG total beban operasional di semua laporan - pakai `sumExpensesNetOfFuelGain()` di
`formatters.ts`, jangan jumlahkan `amount` secara polos. Proyek ini sempat punya dua layar
laporan yang menghitung ini dengan arah berlawanan.

## Validasi/Linting

- `npm run lint` menjalankan `tsc --noEmit` dengan **`strict: true`** aktif (lihat
  `tsconfig.json`). Pastikan `@types/react` dan `@types/react-dom` selalu ikut ter-install -
  tanpa keduanya, TypeScript diam-diam memperlakukan seluruh prop komponen React sebagai `any`
  dan strict mode kehilangan sebagian besar manfaatnya tanpa menunjukkan error apa pun.
- `npm test` menjalankan unit test (lihat `TESTING.md` untuk filosofi lengkapnya) - setiap test
  yang ada merepresentasikan bug nyata yang pernah terjadi, bukan cakupan generik.
