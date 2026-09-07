import {
  Product,
  PurchaseOrder,
  SaleRecord,
  TankConfig,
  PertashopProfile,
  PriceHistory,
  SoundingRecord,
  ExpenseRecord,
  Employee,
  AttendanceRecord,
  PayrollRecord,
} from '../types';

export const INITIAL_PERTASHOP_PROFILE: PertashopProfile = {
  pertashopCode: '4P.633.08',
  pertashopName: 'Pertashop Pertamina',
  location: 'Jl. Raya Pertashop Utama',
  ownerName: 'Pengelola / Pemilik Pertashop',
  contactNumber: '0812-3456-7890',
  tbbmDepot: 'TBBM Pertamina',
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-pertamax-92',
    code: 'PTX-92',
    name: 'Pertamax 92 (BBM Non-Subsidi)',
    ron: 92,
    currentPrice: 15850,
    buyPrice: 15046,
    marginPerLiter: 804,
    color: '#00529B', // Biru Pertamax
    badgeColor: 'bg-blue-600 text-white',
    description: 'Bahan Bakar Bensin Berkualitas Tinggi dengan RON 92 Standar Euro IV',
  },
  {
    id: 'prod-dexlite-51',
    code: 'DXL-51',
    name: 'Dexlite CN 51 (Diesel Ramah Lingkungan)',
    ron: 51,
    currentPrice: 16200,
    buyPrice: 15350,
    marginPerLiter: 850,
    color: '#008542', // Hijau Dexlite
    badgeColor: 'bg-emerald-600 text-white',
    description: 'Bahan Bakar Diesel Cetane Number 51 dengan Sulfur Maksimal 1.200 ppm',
  },
];

export const INITIAL_TANK_CONFIG: TankConfig = {
  tankId: 'TANK-01',
  tankName: 'Tangki Pendam Modular Pertamax',
  productId: 'prod-pertamax-92',
  totalCapacityLiters: 5000,
  currentStockLiters: 0,
  deadStockLiters: 300,
  warningThresholdLiters: 1500,
  criticalThresholdLiters: 800,
  lastSoundingDate: '',
  lastSoundingLiters: 0,
};

export const INITIAL_PRICE_HISTORY: PriceHistory[] = [
  {
    id: 'price-hist-001',
    productId: 'prod-pertamax-92',
    effectiveDate: '2026-08-01 00:00',
    oldPrice: 16150,
    newPrice: 15850,
    oldBuyPrice: 15347,
    newBuyPrice: 15046,
    marginPerLiter: 804,
    referenceDoc: 'SK Penyesuaian Harga Pertamina',
    notes: 'Harga standar aktif Pertamax',
    updatedBy: 'Pengelola Pertashop',
    updatedAt: '2026-08-01 06:00',
  },
];

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-001',
    nik: '3520081204960001',
    name: 'Daslam',
    role: 'OPERATOR_DISPENSER',
    phone: '0812-3456-7890',
    bankName: 'BRI',
    bankAccountNumber: '6338-01-009281-53-4',
    dailyRate: 40000,
    overtimeRate: 30000,
    mealAllowanceDaily: 10000,
    isActive: true,
    joinDate: '2026-01-01',
    notes: 'Operator shift 1 pagi & teknisi dispenser',
  },
  {
    id: 'emp-002',
    nik: '3520082408980002',
    name: 'Angga',
    role: 'OPERATOR_DISPENSER',
    phone: '0857-9876-5432',
    bankName: 'BSI',
    bankAccountNumber: '7192834011',
    dailyRate: 40000,
    overtimeRate: 30000,
    mealAllowanceDaily: 10000,
    isActive: true,
    joinDate: '2026-01-01',
    notes: 'Operator shift 2 sore & sounding tangki',
  },
];

// Kosong untuk aplikasi baru (Fresh State)
export const INITIAL_SALES: SaleRecord[] = [];
export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [];
export const INITIAL_EXPENSES: ExpenseRecord[] = [];
export const INITIAL_SOUNDING_RECORDS: SoundingRecord[] = [];
export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];
export const INITIAL_PAYROLLS: PayrollRecord[] = [];
