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

// Permanent Unversioned Safeguard Mirrors (Never wiped by version bumps)
const SAFEGUARD_KEYS = {
  SALES_ARCHIVE: 'pertashop_sales_permanent_archive',
  SALES_UNVERSIONED: 'pertashop_sales',
  SALES_V5: 'pertashop_sales_v5',
  LATEST_BACKUP: 'pertashop_auto_backup_latest',
  EMERGENCY_BACKUP: 'pertashop_emergency_auto_backup',
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

// Perkiraan batas aman localStorage (dalam karakter). Chromium/Firefox membatasi ~5 juta karakter per origin.
export const STORAGE_SOFT_LIMIT_CHARS = 5_000_000;
export const STORAGE_ERROR_EVENT = 'pertashop:storage-error';

// Kunci cermin lama yang hanya duplikat dari kunci utama (aman dihapus bila isinya identik / saat ruang penuh)
const LEGACY_MIRRORS: Record<string, string> = {
  pertashop_sales: 'pertashop_sales_v5_fresh',
  pertashop_sales_v5: 'pertashop_sales_v5_fresh',
  pertashop_sales_permanent_archive: 'pertashop_sales_v5_fresh',
  pertashop_profile: 'pertashop_profile_v5_fresh',
  pertashop_products: 'pertashop_products_v5_fresh',
  pertashop_tank: 'pertashop_tank_v5_fresh',
  pertashop_price_hist: 'pertashop_price_hist_v5_fresh',
  pertashop_purchases: 'pertashop_purchases_v5_fresh',
  pertashop_soundings: 'pertashop_soundings_v5_fresh',
  pertashop_expenses: 'pertashop_expenses_v5_fresh',
  pertashop_employees: 'pertashop_employees_v5_fresh',
  pertashop_attendance: 'pertashop_attendance_v5_fresh',
  pertashop_payrolls: 'pertashop_payrolls_v5_fresh',
};

function isQuotaError(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false;
  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error.code === 22 ||
    error.code === 1014
  );
}

// Bebaskan ruang dengan menghapus salinan/snapshot yang bisa dibuat ulang (BUKAN data utama)
function freeRedundantSpace(exceptKey?: string): void {
  const disposable = [
    'pertashop_emergency_auto_backup',
    'pertashop_auto_backup_latest',
    ...Object.keys(LEGACY_MIRRORS).filter((k) => k !== 'pertashop_sales_permanent_archive'),
  ];
  disposable.forEach((k) => {
    if (k === exceptKey) return;
    try {
      localStorage.removeItem(k);
    } catch {}
  });
}

function notifyStorageError(key: string, error: unknown): void {
  console.error(`Error saving ${key} to localStorage:`, error);
  try {
    window.dispatchEvent(
      new CustomEvent(STORAGE_ERROR_EVENT, {
        detail: { key, quota: isQuotaError(error), message: String((error as any)?.message || error) },
      })
    );
  } catch {}
}

function setStorageItem<T>(key: string, value: T): boolean {
  const json = JSON.stringify(value);
  try {
    localStorage.setItem(key, json);
    return true;
  } catch (error) {
    if (isQuotaError(error)) {
      // Coba bebaskan ruang dari salinan cadangan, lalu ulangi sekali
      freeRedundantSpace(key);
      try {
        localStorage.setItem(key, json);
        return true;
      } catch (retryError) {
        notifyStorageError(key, retryError);
        return false;
      }
    }
    notifyStorageError(key, error);
    return false;
  }
}

// Check if an object looks like a valid SaleRecord
function isSaleRecord(item: any): boolean {
  return (
    item &&
    typeof item === 'object' &&
    typeof item.transactionDate === 'string' &&
    (typeof item.literSold === 'number' ||
      typeof item.totalRevenue === 'number' ||
      typeof item.totalisatorAwal === 'number' ||
      typeof item.shift === 'string')
  );
}

// Merge multiple sales arrays avoiding duplicates (by ID or composite date+shift+meter)
function mergeSalesArrays(...arrays: (SaleRecord[] | undefined)[]): SaleRecord[] {
  const map = new Map<string, SaleRecord>();
  for (const arr of arrays) {
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      if (!isSaleRecord(item)) continue;
      const meterStart = item.meterAwal ?? (item as any).totalisatorAwal ?? (item as any).totalisatorAkhir ?? item.literSold;
      const key =
        item.id ||
        `${item.transactionDate}_${item.shift || '1'}_${meterStart}`;
      if (!map.has(key)) {
        map.set(key, item);
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    const timeA = new Date(`${a.transactionDate}T${a.time || '00:00'}`).getTime();
    const timeB = new Date(`${b.transactionDate}T${b.time || '00:00'}`).getTime();
    return timeB - timeA;
  });
}

// Deep Rescue: Search all keys in browser localStorage for lost sales records
function rescueSalesFromStorage(): SaleRecord[] {
  // 1. Check primary key first: if key exists in storage (even as empty array []), honor it!
  const rawPrimary = localStorage.getItem(KEYS.SALES);
  if (rawPrimary !== null) {
    try {
      const parsed = JSON.parse(rawPrimary);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {}
  }

  // 2. Candidate legacy and backup keys (only check if primary key has never been initialized)
  console.info('[StorageService] Primary sales key not initialized. Scanning for legacy/backup keys...');
  const candidateKeys = [
    SAFEGUARD_KEYS.SALES_ARCHIVE,
    SAFEGUARD_KEYS.SALES_UNVERSIONED,
    SAFEGUARD_KEYS.SALES_V5,
    'pertashop_sales_v4_krajan',
    'pertashop_sales_v4',
    'pertashop_sales_v3',
    'pertashop_sales_v2',
    'pertashop_sales_v1',
    'pertashop_sales_records',
    'pertashop_sales_backup',
    'pertashop_backup_sales',
    SAFEGUARD_KEYS.LATEST_BACKUP,
    SAFEGUARD_KEYS.EMERGENCY_BACKUP,
    'pertashop_backup_data',
    'pertashop_backup_data_v1',
  ];

  const foundLists: SaleRecord[][] = [];

  for (const key of candidateKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0 && isSaleRecord(parsed[0])) {
        console.info(`[StorageService] Found ${parsed.length} sales in legacy key: ${key}`);
        foundLists.push(parsed);
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.sales) && parsed.sales.length > 0) {
        console.info(`[StorageService] Found ${parsed.sales.length} sales in backup object at: ${key}`);
        foundLists.push(parsed.sales);
      }
    } catch {
      // Ignore unparseable item
    }
  }

  if (foundLists.length > 0) {
    const merged = mergeSalesArrays(...foundLists);
    if (merged.length > 0) {
      console.info(`[StorageService] Successfully recovered and merged ${merged.length} total sales records!`);
      // Restore to active and permanent safeguard keys
      setStorageItem(KEYS.SALES, merged);
      setStorageItem(SAFEGUARD_KEYS.SALES_ARCHIVE, merged);
      return merged;
    }
  }

  return INITIAL_SALES;
}

// Deep Rescue for Purchases
function rescuePurchasesFromStorage(): PurchaseOrder[] {
  const rawPrimary = localStorage.getItem(KEYS.PURCHASES);
  if (rawPrimary !== null) {
    try {
      const parsed = JSON.parse(rawPrimary);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  const candidateKeys = [
    'pertashop_purchases',
    'pertashop_purchases_v5',
    'pertashop_purchases_v4_krajan',
    'pertashop_purchases_v4',
    'pertashop_purchases_v3',
    'pertashop_purchases_v2',
    SAFEGUARD_KEYS.LATEST_BACKUP,
    'pertashop_backup_data',
  ];

  for (const key of candidateKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.orderDate) {
        setStorageItem(KEYS.PURCHASES, parsed);
        return parsed;
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.purchases) && parsed.purchases.length > 0) {
        setStorageItem(KEYS.PURCHASES, parsed.purchases);
        return parsed.purchases;
      }
    } catch {}
  }
  return INITIAL_PURCHASE_ORDERS;
}

// Deep Rescue for Soundings
function rescueSoundingsFromStorage(): SoundingRecord[] {
  const rawPrimary = localStorage.getItem(KEYS.SOUNDINGS);
  if (rawPrimary !== null) {
    try {
      const parsed = JSON.parse(rawPrimary);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  const candidateKeys = [
    'pertashop_soundings',
    'pertashop_soundings_v5',
    'pertashop_soundings_v4_krajan',
    'pertashop_soundings_v4',
    SAFEGUARD_KEYS.LATEST_BACKUP,
    'pertashop_backup_data',
  ];

  for (const key of candidateKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0 && (parsed[0]?.soundingDate || parsed[0]?.stickCm !== undefined)) {
        setStorageItem(KEYS.SOUNDINGS, parsed);
        return parsed;
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.soundings) && parsed.soundings.length > 0) {
        setStorageItem(KEYS.SOUNDINGS, parsed.soundings);
        return parsed.soundings;
      }
    } catch {}
  }
  return INITIAL_SOUNDING_RECORDS;
}

// Deep Rescue for Expenses
function rescueExpensesFromStorage(): ExpenseRecord[] {
  const rawPrimary = localStorage.getItem(KEYS.EXPENSES);
  if (rawPrimary !== null) {
    try {
      const parsed = JSON.parse(rawPrimary);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  const candidateKeys = [
    'pertashop_expenses',
    'pertashop_expenses_v5',
    'pertashop_expenses_v4_krajan',
    'pertashop_expenses_v4',
    'pertashop_expenses_v2',
    SAFEGUARD_KEYS.LATEST_BACKUP,
    'pertashop_backup_data',
  ];

  for (const key of candidateKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0 && (parsed[0]?.expenseDate || parsed[0]?.amount !== undefined)) {
        setStorageItem(KEYS.EXPENSES, parsed);
        return parsed;
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.expenses) && parsed.expenses.length > 0) {
        setStorageItem(KEYS.EXPENSES, parsed.expenses);
        return parsed.expenses;
      }
    } catch {}
  }
  return INITIAL_EXPENSES;
}

// Deep Rescue for Employees
function rescueEmployeesFromStorage(): Employee[] {
  const rawPrimary = localStorage.getItem(KEYS.EMPLOYEES);
  if (rawPrimary !== null) {
    try {
      const parsed = JSON.parse(rawPrimary);
      // Daftar kosong adalah pilihan pengguna (semua karyawan dihapus) - jangan munculkan data contoh lagi
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  const candidateKeys = [
    'pertashop_employees',
    'pertashop_employees_v5',
    'pertashop_employees_v4_krajan',
    'pertashop_employees_v4',
    SAFEGUARD_KEYS.LATEST_BACKUP,
    'pertashop_backup_data',
  ];

  for (const key of candidateKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.name && parsed[0]?.role) {
        setStorageItem(KEYS.EMPLOYEES, parsed);
        return parsed;
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.employees) && parsed.employees.length > 0) {
        setStorageItem(KEYS.EMPLOYEES, parsed.employees);
        return parsed.employees;
      }
    } catch {}
  }
  return INITIAL_EMPLOYEES;
}

// Deep Rescue for Attendance & Payroll
function rescueAttendanceFromStorage(): AttendanceRecord[] {
  const rawPrimary = localStorage.getItem(KEYS.ATTENDANCE);
  if (rawPrimary !== null) {
    try {
      const parsed = JSON.parse(rawPrimary);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  const candidateKeys = ['pertashop_attendance', 'pertashop_attendance_v5', 'pertashop_attendance_v4_krajan', 'pertashop_attendance_v4'];
  for (const key of candidateKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setStorageItem(KEYS.ATTENDANCE, parsed);
        return parsed;
      }
    } catch {}
  }
  return INITIAL_ATTENDANCE;
}

function rescuePayrollsFromStorage(): PayrollRecord[] {
  const rawPrimary = localStorage.getItem(KEYS.PAYROLLS);
  if (rawPrimary !== null) {
    try {
      const parsed = JSON.parse(rawPrimary);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  const candidateKeys = ['pertashop_payrolls', 'pertashop_payrolls_v5', 'pertashop_payrolls_v4_krajan', 'pertashop_payrolls_v4'];
  for (const key of candidateKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setStorageItem(KEYS.PAYROLLS, parsed);
        return parsed;
      }
    } catch {}
  }
  return INITIAL_PAYROLLS;
}

// Deep Rescue for Tank Config
function rescueTankConfigFromStorage(): TankConfig {
  const rawPrimary = localStorage.getItem(KEYS.TANK);
  if (rawPrimary !== null) {
    try {
      const parsed = JSON.parse(rawPrimary);
      if (parsed && typeof parsed === 'object' && parsed.tankId) return parsed;
    } catch {}
  }

  const candidateKeys = ['pertashop_tank', 'pertashop_tank_v5', 'pertashop_tank_v4_krajan', 'pertashop_tank_v4', 'pertashop_tank_v1'];
  for (const key of candidateKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.totalCapacityLiters > 0) {
        setStorageItem(KEYS.TANK, parsed);
        return parsed;
      }
    } catch {}
  }
  return INITIAL_TANK_CONFIG;
}

// Deep Rescue for Profile
function rescueProfileFromStorage(): PertashopProfile {
  const rawPrimary = localStorage.getItem(KEYS.PROFILE);
  if (rawPrimary !== null) {
    try {
      const parsed = JSON.parse(rawPrimary);
      if (parsed && typeof parsed === 'object' && parsed.pertashopCode) return parsed;
    } catch {}
  }

  const candidateKeys = ['pertashop_profile', 'pertashop_profile_v5', 'pertashop_profile_v4_krajan', 'pertashop_profile_v4', 'pertashop_profile_v1'];
  for (const key of candidateKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.pertashopCode) {
        setStorageItem(KEYS.PROFILE, parsed);
        return parsed;
      }
    } catch {}
  }
  return INITIAL_PERTASHOP_PROFILE;
}

export interface StorageScanResult {
  key: string;
  category: string;
  count: number;
  description: string;
  sampleDate?: string;
  data: any;
}

export const StorageService = {
  getProfile: (): PertashopProfile => rescueProfileFromStorage(),
  setProfile: (profile: PertashopProfile) => {
    setStorageItem(KEYS.PROFILE, profile);
  },

  getProducts: (): Product[] => getStorageItem(KEYS.PRODUCTS, INITIAL_PRODUCTS),
  setProducts: (products: Product[]) => {
    setStorageItem(KEYS.PRODUCTS, products);
  },

  getTankConfig: (): TankConfig => rescueTankConfigFromStorage(),
  setTankConfig: (tank: TankConfig) => {
    setStorageItem(KEYS.TANK, tank);
  },

  getPriceHistory: (): PriceHistory[] => getStorageItem(KEYS.PRICE_HISTORY, INITIAL_PRICE_HISTORY),
  setPriceHistory: (history: PriceHistory[]) => {
    setStorageItem(KEYS.PRICE_HISTORY, history);
  },

  getSales: (): SaleRecord[] => rescueSalesFromStorage(),
  setSales: (sales: SaleRecord[]): boolean => {
    const ok = setStorageItem(KEYS.SALES, sales);
    if (!ok) return false;
    // Satu cermin arsip permanen saja (dulu 4 salinan) agar kuota localStorage tidak cepat habis
    if (Array.isArray(sales) && sales.length > 0) {
      setStorageItem(SAFEGUARD_KEYS.SALES_ARCHIVE, sales);
    } else {
      setStorageItem(SAFEGUARD_KEYS.SALES_ARCHIVE, []);
    }
    // Salinan lama tidak lagi ditulis; hapus agar ruang kembali
    [SAFEGUARD_KEYS.SALES_UNVERSIONED, SAFEGUARD_KEYS.SALES_V5, SAFEGUARD_KEYS.EMERGENCY_BACKUP].forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {}
    });
    return true;
  },

  getPurchases: (): PurchaseOrder[] => rescuePurchasesFromStorage(),
  setPurchases: (purchases: PurchaseOrder[]) => {
    setStorageItem(KEYS.PURCHASES, purchases);
  },

  getSoundings: (): SoundingRecord[] => rescueSoundingsFromStorage(),
  setSoundings: (soundings: SoundingRecord[]) => {
    setStorageItem(KEYS.SOUNDINGS, soundings);
  },

  getExpenses: (): ExpenseRecord[] => rescueExpensesFromStorage(),
  setExpenses: (expenses: ExpenseRecord[]) => {
    setStorageItem(KEYS.EXPENSES, expenses);
  },

  getEmployees: (): Employee[] => rescueEmployeesFromStorage(),
  setEmployees: (employees: Employee[]) => {
    setStorageItem(KEYS.EMPLOYEES, employees);
  },

  getAttendance: (): AttendanceRecord[] => rescueAttendanceFromStorage(),
  setAttendance: (records: AttendanceRecord[]) => {
    setStorageItem(KEYS.ATTENDANCE, records);
  },

  getPayrolls: (): PayrollRecord[] => rescuePayrollsFromStorage(),
  setPayrolls: (payrolls: PayrollRecord[]) => {
    setStorageItem(KEYS.PAYROLLS, payrolls);
  },

  getLastSalesDate: (): string | null => getStorageItem(KEYS.LAST_SALES_DATE, null),
  setLastSalesDate: (date: string) => setStorageItem(KEYS.LAST_SALES_DATE, date),

  getLastPoDate: (): string | null => getStorageItem(KEYS.LAST_PO_DATE, null),
  setLastPoDate: (date: string) => setStorageItem(KEYS.LAST_PO_DATE, date),

  // Scan entire browser storage for recoverable sales and other datasets
  scanBrowserMemory: (): StorageScanResult[] => {
    const results: StorageScanResult[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const keyName = localStorage.key(i);
        if (!keyName) continue;
        try {
          const raw = localStorage.getItem(keyName);
          if (!raw || raw.length < 10) continue;
          const parsed = JSON.parse(raw);

          // 1. Sales arrays
          if (Array.isArray(parsed) && parsed.length > 0 && isSaleRecord(parsed[0])) {
            const minDate = parsed[parsed.length - 1]?.transactionDate;
            const maxDate = parsed[0]?.transactionDate;
            results.push({
              key: keyName,
              category: 'Penjualan',
              count: parsed.length,
              description: `${parsed.length} transaksi penjualan (${minDate || '?'} s/d ${maxDate || '?'})`,
              sampleDate: maxDate,
              data: parsed,
            });
          }
          // 2. Full backup objects with .sales
          else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.sales) && parsed.sales.length > 0) {
            results.push({
              key: keyName,
              category: 'Arsip Backup Lengkap',
              count: parsed.sales.length,
              description: `Backup Pertashop berisi ${parsed.sales.length} transaksi, ${parsed.purchases?.length || 0} DO, ${parsed.expenses?.length || 0} beban`,
              sampleDate: parsed.backupDate || parsed.backupDateFormatted,
              data: parsed.sales,
            });
          }
          // 3. Purchase Orders
          else if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.orderDate && parsed[0]?.volumeKL) {
            results.push({
              key: keyName,
              category: 'Pemesanan DO',
              count: parsed.length,
              description: `${parsed.length} data pemesanan DO Pertamina`,
              sampleDate: parsed[0]?.orderDate,
              data: parsed,
            });
          }
          // 4. Expenses
          else if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.expenseDate && parsed[0]?.amount !== undefined) {
            results.push({
              key: keyName,
              category: 'Pengeluaran/Beban',
              count: parsed.length,
              description: `${parsed.length} catatan pengeluaran operasional`,
              sampleDate: parsed[0]?.expenseDate,
              data: parsed,
            });
          }
        } catch {}
      }
    } catch {}
    return results;
  },

  // Restore directly from any detected key in browser storage
  restoreSalesFromKey: (keyName: string): SaleRecord[] => {
    try {
      const raw = localStorage.getItem(keyName);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      let targetSales: SaleRecord[] = [];

      if (Array.isArray(parsed) && parsed.length > 0 && isSaleRecord(parsed[0])) {
        targetSales = parsed;
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.sales)) {
        targetSales = parsed.sales;
      }

      if (targetSales.length > 0) {
        setStorageItem(KEYS.SALES, targetSales);
        setStorageItem(SAFEGUARD_KEYS.SALES_ARCHIVE, targetSales);
        setStorageItem(SAFEGUARD_KEYS.SALES_UNVERSIONED, targetSales);
        return targetSales;
      }
    } catch (e) {
      console.error('Failed to restore from key:', keyName, e);
    }
    return [];
  },

  // Hapus salinan lama yang isinya identik dengan kunci utama (aman, tidak menghilangkan data)
  compactStorage: (): number => {
    let freed = 0;
    Object.entries(LEGACY_MIRRORS).forEach(([mirror, primary]) => {
      if (mirror === SAFEGUARD_KEYS.SALES_ARCHIVE) return; // arsip permanen dipertahankan
      try {
        const m = localStorage.getItem(mirror);
        const p = localStorage.getItem(primary);
        if (m !== null && p !== null && m === p) {
          freed += m.length;
          localStorage.removeItem(mirror);
        }
      } catch {}
    });
    try {
      const em = localStorage.getItem(SAFEGUARD_KEYS.EMERGENCY_BACKUP);
      const primarySales = localStorage.getItem(KEYS.SALES);
      if (em && primarySales && primarySales !== '[]') {
        freed += em.length;
        localStorage.removeItem(SAFEGUARD_KEYS.EMERGENCY_BACKUP);
      }
    } catch {}
    return freed;
  },

  // Perkiraan pemakaian localStorage (karakter) untuk peringatan dini sebelum penuh
  getUsageInfo: (): { usedChars: number; percent: number } => {
    let usedChars = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        usedChars += k.length + (localStorage.getItem(k)?.length || 0);
      }
    } catch {}
    return { usedChars, percent: Math.round((usedChars / STORAGE_SOFT_LIMIT_CHARS) * 100) };
  },

  // Minta browser agar data situs tidak dihapus otomatis saat disk penuh
  requestPersistentStorage: async (): Promise<boolean> => {
    try {
      if (navigator.storage && navigator.storage.persist) {
        return await navigator.storage.persist();
      }
    } catch {}
    return false;
  },

  resetToDefault: () => {
    // 1. Wipe all pertashop keys from browser localStorage
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.toLowerCase().startsWith('pertashop') || k.toLowerCase().includes('pertashop'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch {}
      });
    } catch {}

    // 2. Explicitly wipe all defined keys and safeguards
    Object.values(KEYS).forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    });
    Object.values(SAFEGUARD_KEYS).forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    });

    // 3. Re-initialize cleanly with empty / initial state
    setStorageItem(KEYS.PROFILE, INITIAL_PERTASHOP_PROFILE);
    setStorageItem(KEYS.PRODUCTS, INITIAL_PRODUCTS);
    setStorageItem(KEYS.TANK, INITIAL_TANK_CONFIG);
    setStorageItem(KEYS.PRICE_HISTORY, INITIAL_PRICE_HISTORY);
    setStorageItem(KEYS.SALES, []);
    setStorageItem(KEYS.PURCHASES, []);
    setStorageItem(KEYS.SOUNDINGS, []);
    setStorageItem(KEYS.EXPENSES, []);
    setStorageItem(KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
    setStorageItem(KEYS.ATTENDANCE, []);
    setStorageItem(KEYS.PAYROLLS, []);
    setStorageItem(SAFEGUARD_KEYS.SALES_ARCHIVE, []);
    setStorageItem(SAFEGUARD_KEYS.SALES_UNVERSIONED, []);
    setStorageItem(SAFEGUARD_KEYS.SALES_V5, []);
    try {
      localStorage.removeItem(SAFEGUARD_KEYS.EMERGENCY_BACKUP);
      localStorage.removeItem(SAFEGUARD_KEYS.LATEST_BACKUP);
    } catch {}
  },

  createBackupData: (customProfile?: PertashopProfile): PertashopBackupData => {
    const prof = customProfile || StorageService.getProfile();
    const now = new Date();
    const isoString = now.toISOString();
    const dateFormatted = new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'full',
      timeStyle: 'medium',
    }).format(now);

    const backup: PertashopBackupData = {
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

    // Catatan: snapshot otomatis ke localStorage dihapus karena menggandakan seluruh data
    // dan mempercepat habisnya kuota. Backup yang aman adalah file JSON yang diunduh.
    return backup;
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
