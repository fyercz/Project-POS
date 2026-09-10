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
  PertashopBackupData,
} from '../types';
import {
  INITIAL_PERTASHOP_PROFILE,
  INITIAL_PRODUCTS,
  INITIAL_TANK_CONFIG,
  INITIAL_PRICE_HISTORY,
  INITIAL_SALES,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_SOUNDING_RECORDS,
  INITIAL_EXPENSES,
  INITIAL_EMPLOYEES,
  INITIAL_ATTENDANCE,
  INITIAL_PAYROLLS,
} from '../data/initialData';

const KEYS = {
  PROFILE: 'pertashop_profile_v5_fresh',
  PRODUCTS: 'pertashop_products_v5_fresh',
  TANK: 'pertashop_tank_v5_fresh',
  PRICE_HISTORY: 'pertashop_price_hist_v5_fresh',
  SALES: 'pertashop_sales_v5_fresh',
  PURCHASES: 'pertashop_purchases_v5_fresh',
  SOUNDINGS: 'pertashop_soundings_v5_fresh',
  EXPENSES: 'pertashop_expenses_v5_fresh',
  EMPLOYEES: 'pertashop_employees_v5_fresh',
  ATTENDANCE: 'pertashop_attendance_v5_fresh',
  PAYROLLS: 'pertashop_payrolls_v5_fresh',
  LAST_SALES_DATE: 'pertashop_last_sales_date_v5',
  LAST_PO_DATE: 'pertashop_last_po_date_v5',
};

// Automatic cleanup of legacy mock/test datasets in user's browser
try {
  const legacyKeys = [
    'pertashop_profile_v4_krajan',
    'pertashop_products_v4_krajan',
    'pertashop_tank_v4_krajan',
    'pertashop_price_hist_v4_krajan',
    'pertashop_sales_v4_krajan',
    'pertashop_purchases_v4_krajan',
    'pertashop_soundings_v4_krajan',
    'pertashop_expenses_v4_krajan',
    'pertashop_employees_v4_krajan',
    'pertashop_attendance_v4_krajan',
    'pertashop_payrolls_v4_krajan',
    'pertashop_sales_v2',
    'pertashop_purchases_v2',
    'pertashop_expenses_v2',
    'pertashop_profile_v1',
    'pertashop_products_v1',
    'pertashop_tank_v1',
  ];
  legacyKeys.forEach((key) => localStorage.removeItem(key));
} catch (err) {
  // localStorage might be restricted in some iframe contexts
}

function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
}

function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
}

export const StorageService = {
  getProfile: (): PertashopProfile => getStorageItem(KEYS.PROFILE, INITIAL_PERTASHOP_PROFILE),
  setProfile: (profile: PertashopProfile) => setStorageItem(KEYS.PROFILE, profile),

  getProducts: (): Product[] => getStorageItem(KEYS.PRODUCTS, INITIAL_PRODUCTS),
  setProducts: (products: Product[]) => setStorageItem(KEYS.PRODUCTS, products),

  getTankConfig: (): TankConfig => getStorageItem(KEYS.TANK, INITIAL_TANK_CONFIG),
  setTankConfig: (tank: TankConfig) => setStorageItem(KEYS.TANK, tank),

  getPriceHistory: (): PriceHistory[] => getStorageItem(KEYS.PRICE_HISTORY, INITIAL_PRICE_HISTORY),
  setPriceHistory: (history: PriceHistory[]) => setStorageItem(KEYS.PRICE_HISTORY, history),

  getSales: (): SaleRecord[] => getStorageItem(KEYS.SALES, INITIAL_SALES),
  setSales: (sales: SaleRecord[]) => setStorageItem(KEYS.SALES, sales),

  getPurchases: (): PurchaseOrder[] => getStorageItem(KEYS.PURCHASES, INITIAL_PURCHASE_ORDERS),
  setPurchases: (purchases: PurchaseOrder[]) => setStorageItem(KEYS.PURCHASES, purchases),

  getSoundings: (): SoundingRecord[] => getStorageItem(KEYS.SOUNDINGS, INITIAL_SOUNDING_RECORDS),
  setSoundings: (soundings: SoundingRecord[]) => setStorageItem(KEYS.SOUNDINGS, soundings),

  getExpenses: (): ExpenseRecord[] => getStorageItem(KEYS.EXPENSES, INITIAL_EXPENSES),
  setExpenses: (expenses: ExpenseRecord[]) => setStorageItem(KEYS.EXPENSES, expenses),

  getEmployees: (): Employee[] => getStorageItem(KEYS.EMPLOYEES, INITIAL_EMPLOYEES),
  setEmployees: (employees: Employee[]) => setStorageItem(KEYS.EMPLOYEES, employees),

  getAttendance: (): AttendanceRecord[] => getStorageItem(KEYS.ATTENDANCE, INITIAL_ATTENDANCE),
  setAttendance: (records: AttendanceRecord[]) => setStorageItem(KEYS.ATTENDANCE, records),

  getPayrolls: (): PayrollRecord[] => getStorageItem(KEYS.PAYROLLS, INITIAL_PAYROLLS),
  setPayrolls: (payrolls: PayrollRecord[]) => setStorageItem(KEYS.PAYROLLS, payrolls),

  getLastSalesDate: (): string | null => getStorageItem(KEYS.LAST_SALES_DATE, null),
  setLastSalesDate: (date: string) => setStorageItem(KEYS.LAST_SALES_DATE, date),

  getLastPoDate: (): string | null => getStorageItem(KEYS.LAST_PO_DATE, null),
  setLastPoDate: (date: string) => setStorageItem(KEYS.LAST_PO_DATE, date),

  resetToDefault: () => {
    Object.values(KEYS).forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    });
  },

  createBackupData: (customProfile?: PertashopProfile): PertashopBackupData => {
    const prof = customProfile || StorageService.getProfile();
    const now = new Date();
    const isoString = now.toISOString();
    const dateFormatted = new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'full',
      timeStyle: 'medium',
    }).format(now);

    return {
      appName: 'Sistem Manajemen & Laporan Pertashop',
      schemaVersion: 1,
      backupDate: isoString,
      backupDateFormatted: dateFormatted,
      sourceCode: prof.pertashopCode || '4P.633.08',
      sourcePertashopName: prof.pertashopName || 'Pertashop Pertamina',
      profile: prof,
      products: StorageService.getProducts(),
      tank: StorageService.getTankConfig(),
      priceHistory: StorageService.getPriceHistory(),
      sales: StorageService.getSales(),
      purchases: StorageService.getPurchases(),
      soundings: StorageService.getSoundings(),
      expenses: StorageService.getExpenses(),
      employees: StorageService.getEmployees(),
      attendance: StorageService.getAttendance(),
      payrolls: StorageService.getPayrolls(),
      lastSalesDate: StorageService.getLastSalesDate(),
      lastPoDate: StorageService.getLastPoDate(),
    };
  },

  downloadBackupJSON: (customProfile?: PertashopProfile): void => {
    const backup = StorageService.createBackupData(customProfile);
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeCode = (backup.sourceCode || 'pertashop').replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `backup_pertashop_${safeCode}_${dateStamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  validateAndParseBackup: (jsonString: string): PertashopBackupData => {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Format file tidak valid (bukan objek JSON).');
    }
    // Basic verification of required arrays/objects
    if (!parsed.profile || !Array.isArray(parsed.products) || !parsed.tank) {
      throw new Error('Struktur file backup tidak sesuai (field profil/produk/tangki tidak ditemukan).');
    }
    return {
      appName: parsed.appName || 'Sistem Manajemen & Laporan Pertashop',
      schemaVersion: parsed.schemaVersion || 1,
      backupDate: parsed.backupDate || new Date().toISOString(),
      backupDateFormatted: parsed.backupDateFormatted || '',
      sourceCode: parsed.sourceCode || parsed.profile?.pertashopCode || '',
      sourcePertashopName: parsed.sourcePertashopName || parsed.profile?.pertashopName || '',
      profile: parsed.profile,
      products: parsed.products,
      tank: parsed.tank,
      priceHistory: Array.isArray(parsed.priceHistory) ? parsed.priceHistory : [],
      sales: Array.isArray(parsed.sales) ? parsed.sales : [],
      purchases: Array.isArray(parsed.purchases) ? parsed.purchases : [],
      soundings: Array.isArray(parsed.soundings) ? parsed.soundings : [],
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      employees: Array.isArray(parsed.employees) ? parsed.employees : [],
      attendance: Array.isArray(parsed.attendance) ? parsed.attendance : [],
      payrolls: Array.isArray(parsed.payrolls) ? parsed.payrolls : [],
      lastSalesDate: parsed.lastSalesDate || null,
      lastPoDate: parsed.lastPoDate || null,
    };
  },

  restoreAllData: (backup: PertashopBackupData): void => {
    StorageService.setProfile(backup.profile);
    StorageService.setProducts(backup.products);
    StorageService.setTankConfig(backup.tank);
    StorageService.setPriceHistory(backup.priceHistory);
    StorageService.setSales(backup.sales);
    StorageService.setPurchases(backup.purchases);
    StorageService.setSoundings(backup.soundings);
    StorageService.setExpenses(backup.expenses);
    StorageService.setEmployees(backup.employees);
    StorageService.setAttendance(backup.attendance);
    StorageService.setPayrolls(backup.payrolls);
    if (backup.lastSalesDate) StorageService.setLastSalesDate(backup.lastSalesDate);
    if (backup.lastPoDate) StorageService.setLastPoDate(backup.lastPoDate);
  },
};
