import { Product, PurchaseOrder, SaleRecord, TankConfig, PertashopProfile, PriceHistory, SoundingRecord, ExpenseRecord } from '../types';
import {
  INITIAL_PERTASHOP_PROFILE,
  INITIAL_PRODUCTS,
  INITIAL_TANK_CONFIG,
  INITIAL_PRICE_HISTORY,
  INITIAL_SALES,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_SOUNDING_RECORDS,
  INITIAL_EXPENSES,
} from '../data/initialData';

const KEYS = {
  PROFILE: 'pertashop_profile_v1',
  PRODUCTS: 'pertashop_products_v1',
  TANK: 'pertashop_tank_v1',
  PRICE_HISTORY: 'pertashop_price_hist_v1',
  SALES: 'pertashop_sales_v1',
  PURCHASES: 'pertashop_purchases_v1',
  SOUNDINGS: 'pertashop_soundings_v1',
  EXPENSES: 'pertashop_expenses_v1',
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

  getExpenses: (): ExpenseRecord[] => getStorageItem(KEYS.EXPENSES, INITIAL_EXPENSES),
  setExpenses: (expenses: ExpenseRecord[]) => setStorageItem(KEYS.EXPENSES, expenses),

  resetToDefault: () => {
    localStorage.removeItem(KEYS.PROFILE);
    localStorage.removeItem(KEYS.PRODUCTS);
    localStorage.removeItem(KEYS.TANK);
    localStorage.removeItem(KEYS.PRICE_HISTORY);
    localStorage.removeItem(KEYS.SALES);
    localStorage.removeItem(KEYS.PURCHASES);
    localStorage.removeItem(KEYS.SOUNDINGS);
    localStorage.removeItem(KEYS.EXPENSES);
  },
};

