# Rekomendasi Arsitektur: Komponen Raksasa & Penyimpanan Data

Dua item terakhir dari audit tech debt (#7 dan #8). Keduanya **sengaja tidak langsung
dieksekusi** sebagai refactor besar - ini aplikasi yang sudah berjalan nyata di sebuah SPBU,
dan risiko regresi dari perubahan arsitektur besar jauh lebih mahal daripada manfaat "kerapian
kode" semata. Dokumen ini memberi rekomendasi konkret + langkah pertama yang aman, bukan
eksekusi penuh.

---

## #7: Pecah Komponen Raksasa

### Temuan Konkret (bukan perkiraan)

| File | Baris | Karakteristik |
|---|---|---|
| `AttendancePayrollView.tsx` | 2.882 | 1 domain (absensi/gaji), 7 modal + 3 tab dengan batas yang SUDAH ditandai komentar section di kode |
| `App.tsx` | 2.680 | SEMUA domain (penjualan, DO, sounding, beban, gaji, harga), 38 fungsi handler, 40 `useState`, banyak saling silang antar domain |
| `SummaryReportView.tsx` | 2.038 | 1 domain (laporan), kemungkinan pola serupa `AttendancePayrollView` |

**Kedua file ini TIDAK setara risikonya untuk dipecah** - ini poin terpenting dari rekomendasi
ini:

### `AttendancePayrollView.tsx`: RISIKO RENDAH, bisa dikerjakan sekarang

7 modal di dalamnya (Cetak Slip Gaji, Catat Absensi, Tambah Karyawan, Konfirmasi Pembayaran
Batch, Edit Nominal Gaji, Jadwal Hitung Gaji, Toast) sudah menjadi unit JSX yang cukup
berdiri sendiri - masing-masing sudah punya pemanggilan `useModalA11y`-nya sendiri sejak audit
aksesibilitas. Memindahkan masing-masing jadi file terpisah (persis seperti `ConfirmModal.tsx`,
`SalesEntryModal.tsx`, dkk yang SUDAH jadi konvensi di proyek ini) adalah **langkah mekanis**,
bukan menulis ulang logika:

1. Pindahkan JSX + state lokal + handler yang HANYA dipakai modal itu ke file baru.
2. Props yang dibutuhkan (data karyawan, callback simpan, dsb.) dioper biasa - pola yang sama
   persis seperti modal lain yang sudah ada.
3. Hasil akhir: `AttendancePayrollView.tsx` tersisa jadi "shell" (3 tab + pemanggilan 7 modal),
   mungkin turun ke ~800-1.000 baris.

**Effort**: menengah (2-5 hari kerja per modal, dikerjakan satu-satu, test setelah setiap
modal dipindah). **Risiko**: rendah, karena pola yang sama sudah terbukti jalan di 22+ modal
lain di proyek ini.

### `App.tsx`: RISIKO TINGGI, JANGAN dikerjakan sebagai proyek terpisah

38 handler dan 40 state yang BANYAK saling bergantung lintas domain (satu transaksi penjualan
menyentuh stok tangki, absensi, DAN gaji sekaligus - lihat `ARCHITECTURE.md` bagian "Aturan
Bisnis"). Memecah ini butuh strategi state management yang jelas dulu (mis. custom hook
per domain: `useSalesState`, `useAttendanceState`, dst.) - bukan sekadar memindah JSX ke file
lain. Mengerjakan ini sebagai proyek refactor terpisah berisiko tinggi menimbulkan regresi
yang baru ketahuan di produksi, persis seperti risiko yang berkali-kali kita hindari sepanjang
sesi-sesi perbaikan sebelumnya.

**Rekomendasi**: JANGAN jadikan proyek refactor tersendiri. Pecah **bertahap, hanya saat
menyentuh area itu untuk alasan lain** (mis. menambah fitur baru di bagian penjualan - saat itu
pindahkan handler terkait penjualan ke `useSalesLogic.ts` sebagai bagian dari pekerjaan fitur
itu, bukan proyek terpisah).

---

## #8: Evaluasi Arsitektur Penyimpanan (localStorage-only)

### Masalah Nyata yang Sudah Terbukti (bukan teori)

Sepanjang sesi-sesi perbaikan proyek ini, SUDAH ditemukan kasus nyata kuota `localStorage`
mendekati penuh (lihat mekanisme `freeRedundantSpace`, peringatan kuota di `storage.ts`).
`localStorage` punya batas keras ~5-10 MB tergantung browser, dan SEMUA data (bertahun-tahun
transaksi penjualan, DO, sounding, gaji) menumpuk di satu tempat itu tanpa batas alami.

### Opsi yang Dipertimbangkan

| Opsi | Kapasitas | Kompleksitas Tambahan | Rekomendasi |
|---|---|---|---|
| **Tetap localStorage**, perbaiki pengelolaan (arsip otomatis data lama) | Tetap terbatas | Rendah | Cukup untuk sekarang kalau volume transaksi masih wajar |
| **IndexedDB** (browser native, SUDAH tersedia tanpa dependency baru) | Jauh lebih besar (puluhan-ratusan MB, tergantung disk) | Menengah (API lebih rumit dari localStorage, butuh lapisan abstraksi) | **Rekomendasi utama jangka menengah** |
| **SQLite lokal via Electron/Node** | Besar, query SQL sungguhan | Tinggi (baru saja menghapus Electron karena tidak dipakai - menambahkannya lagi untuk alasan BERBEDA perlu pertimbangan ulang) | Hanya kalau kebutuhan laporan jadi jauh lebih kompleks |
| **Backend terpusat + sinkronisasi multi-SPBU** | Tidak terbatas, multi-lokasi | Sangat tinggi (perlu server, biaya hosting, koneksi internet wajib) | Hanya relevan kalau bisnis berkembang ke banyak lokasi |

### Rekomendasi Konkret

**Jangka pendek (tidak perlu aksi sekarang)**: mekanisme pembersihan kuota yang sudah ada di
`storage.ts` cukup sebagai jaring pengaman. Tidak ada tindakan mendesak diperlukan.

**Jangka menengah (kalau volume data terus bertambah, atau usia tangki/omzet SPBU bertambah
besar)**: migrasi dari `localStorage` ke `IndexedDB` untuk tabel-tabel yang paling cepat
bertambah volumenya (penjualan, DO) sambil TETAP memakai `localStorage` untuk konfigurasi kecil
(profil, master karyawan, master produk). Ini **bukan** proyek "ganti semua sekaligus" -
`StorageService` di `storage.ts` sudah jadi satu lapisan abstraksi; migrasi bisa dilakukan
per-tabel di belakang lapisan itu tanpa mengubah pemanggil di `App.tsx`.

**Jangan dikerjakan sekarang**: backend terpusat atau SQLite. Keduanya menambah kompleksitas
operasional (server yang harus di-maintain, atau dependency native yang baru saja sengaja
dihapus) untuk masalah yang belum benar-benar terjadi. Revisit kalau bisnis benar-benar
berkembang ke multi-lokasi atau volume data sudah benar-benar jadi masalah harian.

---

## Ringkasan Keputusan

| Item | Keputusan | Kapan |
|---|---|---|
| Pecah `AttendancePayrollView.tsx` (7 modal) | Kerjakan, risiko rendah, pola sudah terbukti | Bisa mulai kapan saja, satu modal per sesi |
| Pecah `App.tsx` | JANGAN sebagai proyek terpisah | Bertahap saat menyentuh area itu untuk alasan lain |
| Migrasi ke IndexedDB | Siapkan rencana, jangan eksekusi sekarang | Saat volume data jadi masalah nyata (bukan sebelum itu) |
| Backend terpusat / SQLite | Jangan dikerjakan | Hanya kalau bisnis berkembang multi-lokasi |
