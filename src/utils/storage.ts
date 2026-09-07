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

  resetToDefault: () => {
    Object.values(KEYS).forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    });
  },
};
