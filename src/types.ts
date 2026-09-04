export interface Product {
  id: string;
  code: string;
  name: string;
  ron: number;
  currentPrice: number; // Harga jual per liter
  buyPrice: number; // Harga tebus ke Pertamina per liter
  marginPerLiter: number; // Keuntungan per liter
  color: string;
  badgeColor: string;
  description: string;
}

export interface PriceHistory {
  id: string;
  productId: string;
  effectiveDate: string; // YYYY-MM-DD HH:mm
  oldPrice: number;
  newPrice: number;
  oldBuyPrice: number;
  newBuyPrice: number;
  marginPerLiter: number;
  referenceDoc?: string; // misal Surat Edaran Pertamina No. xxx
  notes?: string;
  updatedBy: string;
  updatedAt: string;
}

export interface SaleRecord {
  id: string;
  transactionDate: string; // YYYY-MM-DD
  time: string; // HH:mm
  shift: 'Shift 1 (05.30 - 13.30)' | 'Shift 2 (13.30 - 19.30)' | 'Full Day' | string;
  operatorName: string;
  productId: string;
  productName: string;
  
  // Totalisator / Stand Meter
  meterAwal?: number;
  meterAkhir?: number;
  literSold: number;
  unitPrice: number;
  buyPriceSnapshot: number;
  
  // Keuangan
  totalRevenue: number;
  totalProfit: number;
  
  // Metode Bayar
  paymentCash: number;
  paymentQris: number;
  paymentEdc: number;
  
  // Rekonsiliasi Kas
  actualCashInHand: number;
  cashDifference: number; // actualCashInHand - paymentCash
  
  // Uji Tera / Uji Takar
  teraTestLiters?: number; // biasanya 5L per bejana ukur untuk kalibrasi
  
  // Sounding Tangki Modular saat Shift
  hasSounding?: boolean; // Indikator apakah sounding diukur pada shift ini
  soundingStickCm?: number; // Tinggi stik celup (cm)
  soundingCalculatedLiters?: number; // Volume tera fisik tangki (Liter)
  soundingTheoreticalLiters?: number; // Stok buku / sistem setelah penjualan (Liter)
  soundingVarianceLiters?: number; // Selisih Fisik vs Sistem (Loss / Gain Liter)
  soundingWaterCm?: number; // Uji pasta air dasar tangki (cm)
  syncToSoundingLog?: boolean; // Apakah dicatat juga ke log resmi sounding tangki
  syncToAttendance?: boolean; // Apakah shift ini otomatis dicatat ke Buku Absensi Karyawan

  notes?: string;
  createdAt: string;
}

export type OrderVolumePecahan = 1 | 2 | 3 | 4 | 5; // dalam KiloLiter (KL)

export type POStatus = 'DRAFT' | 'DIPESAN' | 'PENGIRIMAN' | 'SELESAI' | 'BATAL';

export interface PurchaseOrder {
  id: string;
  poNumber: string; // e.g. PO-PT-202608-001
  soPertaminaNumber?: string; // Nomor Sales Order Pertamina
  doPertaminaNumber?: string; // Nomor Delivery Order
  orderDate: string;
  estimatedDeliveryDate: string;
  actualDeliveryDate?: string;
  
  productId: string;
  productName: string;
  volumeKL: OrderVolumePecahan; // 1, 2, atau 3 KL
  volumeLiters: number; // volumeKL * 1000
  
  buyPricePerLiter: number;
  pbbkbPercent?: number; // misal 5% atau sudah include
  ppnPercent?: number; // misal 11%
  totalAmount: number;
  
  supplyDepot: string; // TBBM Pengirim (e.g. TBBM Rewulu / TBBM Tanjung Gerem)
  truckPlateNumber?: string; // Plat Mobil Tangki Pertamina (e.g. B 9283 PFU)
  driverName?: string;
  
  status: POStatus;
  
  // Verifikasi Bongkar Tangki (Sounding saat terima)
  soundingBeforeCm?: number;
  soundingBeforeLiters?: number;
  soundingAfterCm?: number;
  soundingAfterLiters?: number;
  actualLitersReceived?: number;
  varianceLiters?: number; // Selisih DO vs Diterima
  density?: number; // g/ml (e.g. 0.745)
  temperature?: number; // °C (e.g. 29.5)
  
  notes?: string;
  createdAt: string;
  completedAt?: string;
}

export interface TankConfig {
  tankId: string;
  tankName: string;
  productId: string;
  totalCapacityLiters: number; // Standar 3.000 L (3 KL) atau 5.000 L (5 KL)
  currentStockLiters: number;
  deadStockLiters: number; // Minimum sisa tidak bisa dipompa (misal 300L)
  warningThresholdLiters: number; // Batas kuning/siaga (misal 1.200L)
  criticalThresholdLiters: number; // Batas merah/kritis (misal 600L)
  lastSoundingDate?: string;
  lastSoundingLiters?: number;
}

export interface SoundingRecord {
  id: string;
  date: string;
  time: string;
  operatorName: string;
  stickDipCm: number;
  calculatedLiters: number;
  systemStockLiters: number;
  varianceLiters: number; // calculatedLiters - systemStockLiters (Loss/Gain)
  waterBottomCm: number; // Deteksi pasta air di dasar tangki (harus 0)
  notes?: string;
}

export interface PertashopProfile {
  pertashopCode: string; // e.g. 4P.552.01
  pertashopName: string;
  location: string;
  ownerName: string;
  contactNumber: string;
  tbbmDepot: string;
}

export type ExpenseCategoryType =
  | 'GAJI_OPERATOR'
  | 'LEMBURAN'
  | 'TOKEN_LISTRIK'
  | 'PDAM'
  | 'MAINTENANCE_ALAT'
  | 'LOSSES_MINYAK'
  | 'LAINNYA';

export interface ExpenseRecord {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  category: ExpenseCategoryType;
  title: string;
  amount: number;
  quantity?: number; // e.g. 1 hari, 2 shift, atau volume loss (L)
  unitRate?: number; // e.g. 40000 (gaji/hari), 30000 (lembur/shift), atau harga beli/L
  fuelLossLiters?: number; // Volume susut/losses minyak dalam Liter
  fuelLossBuyPriceSnapshot?: number; // Harga tebus Pertamina/L saat terjadi losses
  personOrVendor?: string; // e.g. "Ahmad Fauzi", "PLN Token", "PDAM Tirta", "Teknisi Nozzle", "Susut Penguapan / Tera"
  shift?: 'Shift 1 (05.30 - 13.30)' | 'Shift 2 (13.30 - 19.30)' | 'Full Day' | 'Non-Shift' | string;
  paymentSource: 'KAS_HARIAN' | 'REKENING_BANK';
  notes?: string;
  createdAt: string;
}

export const EXPENSE_RATES = {
  GAJI_OPERATOR_PER_HARI: 40000,
  LEMBURAN_PER_SHIFT: 30000,
};

// ==================== SISTEM KEPEGAWAIAN, ABSENSI & PENGGAJIAN ====================

export type EmployeeRole = 'OPERATOR_DISPENSER' | 'KEPALA_REGU' | 'ADMINISTRASI' | 'TEKNISI_KEBERSIHAN';
export type AttendanceStatus = 'HADIR' | 'LEMBUR' | 'IZIN' | 'SAKIT' | 'ALPA' | 'LIBUR';

export interface Employee {
  id: string;
  nik?: string;
  name: string;
  role: EmployeeRole;
  phone: string;
  bankName?: string;
  bankAccountNumber?: string;
  dailyRate: number; // Tarif harian (misal: Rp 40.000 / shift atau hari)
  overtimeRate: number; // Tarif lembur per shift (misal: Rp 30.000)
  mealAllowanceDaily: number; // Uang makan / kehadiran harian (opsional, misal Rp 10.000)
  isActive: boolean;
  joinDate: string;
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  shift: 'Shift 1 (05.30 - 13.30)' | 'Shift 2 (13.30 - 19.30)' | 'Full Day' | 'Non-Shift' | string;
  status: AttendanceStatus;
  checkInTime?: string; // HH:mm
  checkOutTime?: string; // HH:mm
  overtimeShifts: number; // Jumlah shift lembur (0, 1, 2)
  notes?: string;
  createdAt: string;
}

export interface PayrollRecord {
  id: string;
  payrollNumber: string; // e.g. SLIP-2026-08-001
  month: string; // YYYY-MM (e.g. 2026-08)
  employeeId: string;
  employeeName: string;
  employeeRole: EmployeeRole;
  periodStartDate: string;
  periodEndDate: string;
  
  // Rangkuman Absensi Bulan Ini
  totalHadir: number;
  totalLemburShifts: number;
  totalIzin: number;
  totalSakit: number;
  totalAlpa: number;

  // Komponen Penghasilan (Gaji Kotor)
  dailyRate: number;
  basicSalary: number; // totalHadir * dailyRate
  overtimeRate: number;
  overtimePay: number; // totalLemburShifts * overtimeRate
  mealAllowance: number; // totalHadir * mealAllowanceDaily
  incentiveBonus?: number; // (Opsional/Deprecated)
  
  // Potongan
  kasbonDeduction: number;
  penaltyDeduction: number;
  otherDeductions: number;

  // Gaji Bersih (Take Home Pay)
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;

  // Status & Pembayaran
  paymentStatus: 'DRAFT' | 'DIBAYAR' | 'TERTUNDA';
  paymentDate?: string;
  paymentSource: 'KAS_HARIAN' | 'REKENING_BANK';
  linkedExpenseId?: string; // Tautan ke tabel Pengeluaran Kas/Bank
  
  notes?: string;
  createdAt: string;
}


