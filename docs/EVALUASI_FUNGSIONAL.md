# Evaluasi Fungsional Menyeluruh

Dokumen ini merangkum sesi evaluasi fungsional end-to-end terhadap Project-POS: setiap fitur
benar-benar dioperasikan lewat browser sungguhan (Playwright), bukan sekadar dibaca kodenya.
Tujuannya melengkapi `REKOMENDASI_ARSITEKTUR.md` (yang membahas kesehatan struktur kode) dengan
bukti bahwa *perilaku* aplikasi memang sesuai harapan di setiap layar.

## Mengapa Ini Penting

Sepanjang sesi ini, `tsc --noEmit` dan `vite build` **lolos bersih** di setiap titik - tapi tetap
ditemukan beberapa bug nyata yang akan merusak pengalaman pengguna di dunia nyata. Ini
menegaskan satu hal: lolos pengecekan tipe dan build sukses bukan jaminan aplikasi bebas bug -
keduanya tidak bisa menangkap pelanggaran *aturan runtime* (React Hooks) atau *ketahanan
terhadap data yang tidak sesuai tipe* (data lama/rusak di `localStorage`).

## Temuan & Perbaikan

### 1. PERBAIKAN KRITIS — `ReceiveFuelModal` crash total (`f79d42b`)

Tombol "Bongkar" di layar Pemesanan DO Pertamina membuat **seluruh aplikasi crash** (React error
#310, "Rendered more hooks than during the previous render"). Pola yang sama seperti bug
`PriceManagementModal` di sesi sebelumnya, tapi ternyata tidak pernah ikut diperbaiki di modal
ini: `if (!isOpen || !order) return null` diletakkan sebelum sebagian besar `useState`-nya.
Diperbaiki dengan memindahkan early-return ke setelah semua hook, dan membuat setiap akses
`order.xxx` di inisialisasi hook aman dari `null`. Diverifikasi dengan test regresi
(`tests/component/ReceiveFuelModal.test.tsx`) yang sengaja dibuktikan gagal dulu dengan kode
lama, baru dikonfirmasi lolos dengan perbaikannya.

### 2. Dua kelas bug ketahanan data (`b5a6916`)

**Crash pada data tidak lengkap** - satu record rusak di `localStorage` (skenario realistis:
backup terpotong, data dimodifikasi manual) bisa meng-crash total layar Ringkasan Penjualan dan
Beban & Pengeluaran, karena beberapa filter/pencarian memanggil `.toLowerCase()` /
`.startsWith()` / `.substring()` langsung pada field yang diasumsikan selalu ada. Ditemukan
dalam 2 tahap - pemindaian pertama menangkap sebagian, lalu **test regresi yang ditulis untuk
itu menangkap 2 titik lain yang terlewat** (`SalesTable.tsx` filter "Bulan Ini"/"Bulan Lalu",
`ExpensesView.tsx` daftar bulan tersedia). Pelajaran: jalankan test yang ditulis, jangan cuma
menduga sudah benar.

**Desync setelah Reset Aplikasi** - pesan sukses mengklaim "seluruh data terhapus total tanpa
sisa", tapi state React untuk karyawan/profil/produk/histori harga di memori TIDAK ikut
disinkronkan ulang (hanya `localStorage` yang ditulis ulang oleh `StorageService.resetToDefault()`).
Dikonfirmasi lewat screenshot langsung: layar Master Data Karyawan tetap menampilkan data LAMA
sampai halaman dimuat ulang manual. Diperbaiki dengan `window.location.reload()` yang dijadwalkan
tidak bersyarat, terlepas bagaimana dialog sukses ditutup.

### 3. Referensi teks usang (`eb9700a`)

Panduan update di layar Pengaturan masih menyebut "pilih nomor [5]" padahal menu
`Pertashop.bat` sudah dinomori ulang jadi [4] sejak Electron dihapus - lolos dari pencarian teks
sebelumnya karena pola kalimatnya berbeda.

## Temuan yang Didokumentasikan, Sengaja Tidak Diubah

- **`handleDeletePayroll` adalah kode mati** - diterima sebagai prop oleh
  `AttendancePayrollView` tapi tidak pernah dipanggil di UI manapun. Logikanya benar (diuji unit
  test), tapi fitur hapus-slip-gaji-langsung memang tidak masuk akal untuk alur kerja Pertashop
  (slip selalu dibuat otomatis dari absensi) - dibiarkan sebagai bukan bug.
- **Tombol "Batal Bongkar (Rollback)" DO** memakai `window.confirm()` bawaan browser, bukan
  modal konfirmasi kustom seperti di tempat lain - inkonsistensi tampilan, bukan bug fungsional.
- **`aria-label="Open Sidebar"`** masih berbahasa Inggris, sementara seluruh aplikasi lain
  berbahasa Indonesia - inkonsistensi kecil untuk pembaca teknologi bantu.

## Cakupan Pengujian

Fitur-fitur berikut dioperasikan langsung dan dikonfirmasi berfungsi benar:

**Penjualan**: input baru, edit, hapus (termasuk pembersihan lintas-domain: stok tangki &
absensi otomatis), import via Excel/CSV, import via paste tabel.

**DO Pertamina**: pesan baru, terima/bongkar, edit DO yang belum dibongkar, batalkan
penerimaan (rollback), hapus DO (termasuk DO yang sudah selesai dibongkar), import via
Excel/paste tabel.

**Sounding Tangki**: catat baru, edit (termasuk aturan "hanya sounding terbaru yang menimpa
stok"), hapus satu catatan, hapus sebulan penuh (3 efek lintas-domain: sounding, beban terkait,
tautan ke penjualan).

**Absensi & Gaji**: 6 modal (form absensi, form karyawan, bayar satu slip, bayar batch, cetak
slip, peringatan kelayakan), hapus absensi, hapus karyawan, edit nominal gaji, batal bayar.

**Beban & Pengeluaran**: catat baru (umum & kategori cepat), hapus (termasuk penandaan sumber
sounding/DO terkait).

**Rekap Bulanan & Tahunan**: tampilan bulanan dan tahunan, evaluasi losses vs toleransi resmi
Pertamina (0,50%), hapus data sebulan penuh, cetak laporan resmi (harian & rekap).

**Analisis & Margin**: tren 30 hari, komposisi pembayaran, kalkulator simulasi laba.

**Backup & Restore**: export, restore (upload file & paste JSON manual), pindai memori browser
untuk data tersesat & pulihkan, riwayat error aplikasi.

**Pengaturan**: simpan perubahan profil & konfigurasi tangki, reset aplikasi ke kondisi baru,
cek update GitHub (termasuk penanganan gagal koneksi).

**Lainnya**: simulasi 1 tahun penuh (730 transaksi) lewat seluruh layar sekaligus, tampilan
mobile/responsive (sidebar, navigasi, transaksi penuh end-to-end).

## Status Akhir

40 commit total sepanjang riwayat proyek, 83 test otomatis lolos, `tsc --noEmit` dan
`vite build` bersih, 4 test `bats` lolos. Tidak ada fitur tersisa dari daftar evaluasi yang
belum disentuh.
