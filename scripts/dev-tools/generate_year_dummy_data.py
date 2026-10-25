"""
Generate 1 tahun data dummy realistis untuk simulasi penuh Pertashop POS:
penjualan, DO, beban operasional - lewat fitur Import Batch Excel Multi-Bulan.

Pola yang disengaja (bukan angka acak flat) supaya simulasi bermakna:
- Volume naik saat musim liburan (Juni-Juli, Desember - mudik/Natal&Tahun Baru)
- Harga jual naik bertahap mengikuti pola penyesuaian harga BBM non-subsidi riil
- DO dipesan sedikit di bawah konsumsi (realistis - stok tidak pernah pas)
- Losses minyak proporsional kecil (~0.3-0.8% dari volume, wajar untuk BBM)

CARA PAKAI (dibuat & diverifikasi lewat evaluasi simulasi 1 tahun penuh):
1. pip install openpyxl --break-system-packages
2. python3 generate_year_dummy_data.py  -> hasilkan rekap_1_tahun_2026.xlsx
3. Di aplikasi: tambahkan minimal 1 karyawan dulu (Absensi & Gaji > Master
   Data Karyawan), lalu buka Pemesanan DO Pertamina > Import Batch 1 Bulan &
   DO > "Buka Input Rekap Bulanan" > tab "Import Multi-Bulan Sekaligus
   (Excel)" > unggah file ini.
4. Pilih mode sinkronisasi stok "Mutasi Penuh" agar DO menambah & penjualan
   mengurangi stok tangki secara realistis sepanjang tahun.
5. Hasilnya: ~730 transaksi penjualan (2 shift x 365 hari, auto-distribute),
   12 DO, ~75 entri beban, absensi tersinkron otomatis, 24 slip gaji
   (otomatis berstatus DIBAYAR - ini perilaku SENGAJA untuk data historis,
   lihat processMonthlyBatches di App.tsx).

CATATAN: skrip ini murni men-generate file .xlsx; tidak menyentuh data
aplikasi atau localStorage itu sendiri - aman dijalankan kapan saja.
"""
import openpyxl
from openpyxl import Workbook

wb = Workbook()
ws = wb.active
ws.title = "Rekap Bulanan 2026"

headers = [
    "Bulan (YYYY-MM)", "Total Liter", "Harga Jual", "Harga Beli",
    "Tunai (Rp)", "QRIS/EDC (Rp)", "Total DO Liter", "TBBM Depot",
    "Gaji Operator (Rp)", "Token Listrik (Rp)", "PDAM (Rp)", "Maintenance (Rp)",
    "Losses Minyak Liter", "Dividen Owner (Rp)", "Lain-lain (Rp)", "Catatan"
]
ws.append(headers)

# Pola volume bulanan (liter) - musim ramai Juni/Juli (liburan sekolah+mudik awal) & Desember (nataru)
monthly_liters = {
    "2026-01": 6200, "2026-02": 5800, "2026-03": 6400, "2026-04": 6900,
    "2026-05": 7200, "2026-06": 8600, "2026-07": 9100, "2026-08": 6700,
    "2026-09": 6300, "2026-10": 6500, "2026-11": 6800, "2026-12": 8900,
}

# Harga jual naik bertahap sepanjang tahun (pola penyesuaian harga BBM non-subsidi riil)
base_price = 15650
price_increments = {  # bulan -> harga jual per liter
    "2026-01": 15650, "2026-02": 15650, "2026-03": 15750, "2026-04": 15750,
    "2026-05": 15750, "2026-06": 15850, "2026-07": 15850, "2026-08": 15850,
    "2026-09": 15950, "2026-10": 15850, "2026-11": 15850, "2026-12": 15950,
}
buy_price = 15046  # relatif stabil sepanjang tahun (harga tebus Pertamina)

for month, liters in monthly_liters.items():
    sell_price = price_increments[month]
    # DO dipesan ~98% dari konsumsi bulan itu (realistis - sedikit dari stok carry-over)
    do_liters = round(liters * 0.98 / 1000) * 1000  # dibulatkan ke kelipatan 1000L (1 KL)
    # Losses minyak proporsional kecil, bervariasi tiap bulan (0.3%-0.8%)
    import random
    random.seed(hash(month))  # deterministik tapi bervariasi per bulan
    losses_pct = random.uniform(0.003, 0.008)
    losses_liters = round(liters * losses_pct, 1)

    omzet = liters * sell_price
    tunai = round(omzet * 0.82)  # 82% tunai, sisanya QRIS/EDC (realistis utk SPBU kecil)
    qris = omzet - tunai

    gaji = 2 * 25 * 40000  # 2 operator x ~25 hari kerja x Rp 40.000/hari
    listrik = random.randint(320000, 420000)
    pdam = random.randint(90000, 130000)
    maintenance = random.randint(100000, 250000)
    dividen = random.choice([0, 0, 0, 500000])  # owner ambil dividen beberapa bulan saja
    lain = random.randint(50000, 150000)

    ws.append([
        month, liters, sell_price, buy_price,
        tunai, qris, do_liters, "TBBM Rewulu",
        gaji, listrik, pdam, maintenance,
        losses_liters, dividen, lain,
        f"Rekap historis {month} - data simulasi uji coba"
    ])

import os
out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'rekap_1_tahun_2026.xlsx')
wb.save(out_path)
print(f'File dibuat: {out_path}')
print(f"Total 12 baris bulan, total liter setahun: {sum(monthly_liters.values())} L")
