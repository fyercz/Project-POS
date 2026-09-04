import { Product, PurchaseOrder, SaleRecord, TankConfig, PertashopProfile, PriceHistory, SoundingRecord, ExpenseRecord, Employee, AttendanceRecord, PayrollRecord } from '../types';
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
import { syncSalesToAttendance, recalculateMonthlyPayrolls } from './attendanceSync';

const KEYS = {
  PROFILE: 'pertashop_profile_v4_krajan',
  PRODUCTS: 'pertashop_products_v4_krajan',
  TANK: 'pertashop_tank_v4_krajan',
  PRICE_HISTORY: 'pertashop_price_hist_v4_krajan',
  SALES: 'pertashop_sales_v4_krajan',
  PURCHASES: 'pertashop_purchases_v4_krajan',
  SOUNDINGS: 'pertashop_soundings_v4_krajan',
  EXPENSES: 'pertashop_expenses_v4_krajan',
  EMPLOYEES: 'pertashop_employees_v4_krajan',
  ATTENDANCE: 'pertashop_attendance_v4_krajan',
  PAYROLLS: 'pertashop_payrolls_v4_krajan',
};

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

  getSales: (): SaleRecord[] => {
    const rawSales = getStorageItem(KEYS.SALES, INITIAL_SALES);
    return rawSales.map((s) => {
      let shift = s.shift;
      if (shift === 'Shift 1 (Pagi)') shift = 'Shift 1 (05.30 - 13.30)';
      if (shift === 'Shift 2 (Sore)') shift = 'Shift 2 (13.30 - 19.30)';
      return { ...s, shift };
    });
  },
  setSales: (sales: SaleRecord[]) => setStorageItem(KEYS.SALES, sales),

  getPurchases: (): PurchaseOrder[] => getStorageItem(KEYS.PURCHASES, INITIAL_PURCHASE_ORDERS),
  setPurchases: (purchases: PurchaseOrder[]) => setStorageItem(KEYS.PURCHASES, purchases),

  getSoundings: (): SoundingRecord[] => getStorageItem(KEYS.SOUNDINGS, INITIAL_SOUNDING_RECORDS),
  setSoundings: (soundings: SoundingRecord[]) => setStorageItem(KEYS.SOUNDINGS, soundings),

  getExpenses: (): ExpenseRecord[] => {
    const rawExpenses = getStorageItem(KEYS.EXPENSES, INITIAL_EXPENSES);
    // Ensure August 2026 expenses are removed
    return rawExpenses.filter((e) => !e.date.startsWith('2026-08'));
  },
  setExpenses: (expenses: ExpenseRecord[]) => setStorageItem(KEYS.EXPENSES, expenses),

  getEmployees: (): Employee[] => getStorageItem(KEYS.EMPLOYEES, INITIAL_EMPLOYEES),
  setEmployees: (employees: Employee[]) => setStorageItem(KEYS.EMPLOYEES, employees),

  getAttendance: (): AttendanceRecord[] => {
    const rawAttendance = getStorageItem(KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
    const rawSales = getStorageItem(KEYS.SALES, INITIAL_SALES);
    const employees = getStorageItem(KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
    
    // Guarantee synchronization with sales (especially August 2026 and other months)
    const { updatedAttendance } = syncSalesToAttendance(rawSales, rawAttendance, employees);
    return updatedAttendance;
  },
  setAttendance: (records: AttendanceRecord[]) => setStorageItem(KEYS.ATTENDANCE, records),

  getPayrolls: (): PayrollRecord[] => {
    const rawPayrolls = getStorageItem(KEYS.PAYROLLS, INITIAL_PAYROLLS);
    const attendance = StorageService.getAttendance();
    const employees = getStorageItem(KEYS.EMPLOYEES, INITIAL_EMPLOYEES);

    // Recompute August 2026 payroll to match synced attendance perfectly
    return recalculateMonthlyPayrolls(attendance, employees, rawPayrolls, '2026-08');
  },
  setPayrolls: (payrolls: PayrollRecord[]) => setStorageItem(KEYS.PAYROLLS, payrolls),

  resetToDefault: () => {
    // Clear all versions
    const allKeys = Object.values(KEYS);
    allKeys.forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem('pertashop_sales_v2');
    localStorage.removeItem('pertashop_purchases_v2');
    localStorage.removeItem('pertashop_expenses_v2');
    localStorage.removeItem('pertashop_profile_v1');
    localStorage.removeItem('pertashop_products_v1');
    localStorage.removeItem('pertashop_tank_v1');
  },
};

