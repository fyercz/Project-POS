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

function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
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
  // 1. Check primary key first
  const primary = getStorageItem<SaleRecord[]>(KEYS.SALES, []);
  if (Array.isArray(primary) && primary.length > 0) {
    return primary;
  }

  console.info('[StorageService] Primary sales key is empty. Initiating deep rescue scan across browser storage...');

  // 2. Candidate legacy and backup keys
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

  // 3. Deep Scan every single key in localStorage if still empty
  if (foundLists.length === 0) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const keyName = localStorage.key(i);
        if (!keyName || keyName === KEYS.SALES) continue;
        try {
          const raw = localStorage.getItem(keyName);
          if (!raw || raw.length < 20) continue;
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0 && isSaleRecord(parsed[0])) {
            console.info(`[StorageService] Deep scan found ${parsed.length} sales in key: ${keyName}`);
            foundLists.push(parsed);
          } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.sales) && parsed.sales.length > 0) {
            console.info(`[StorageService] Deep scan found ${parsed.sales.length} sales in backup object: ${keyName}`);
            foundLists.push(parsed.sales);
          }
        } catch {
          // not JSON, continue
        }
      }
    } catch {
      // localStorage iteration blocked
    }
  }

  if (foundLists.length > 0) {
    const merged = mergeSalesArrays(...foundLists);
    if (merged.length > 0) {
      console.info(`[StorageService] Successfully recovered and merged ${merged.length} total sales records!`);
      // Restore to active and permanent safeguard keys
      setStorageItem(KEYS.SALES, merged);
      setStorageItem(SAFEGUARD_KEYS.SALES_ARCHIVE, merged);
      setStorageItem(SAFEGUARD_KEYS.SALES_UNVERSIONED, merged);
      return merged;
    }
  }

  return INITIAL_SALES;
}

// Deep Rescue for Purchases
function rescuePurchasesFromStorage(): PurchaseOrder[] {
  const primary = getStorageItem<PurchaseOrder[]>(KEYS.PURCHASES, []);
  if (Array.isArray(primary) && primary.length > 0) return primary;

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
        setStorageItem('pertashop_purchases', parsed);
        return parsed;
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.purchases) && parsed.purchases.length > 0) {
        setStorageItem(KEYS.PURCHASES, parsed.purchases);
        setStorageItem('pertashop_purchases', parsed.purchases);
        return parsed.purchases;
      }
    } catch {}
  }
  return INITIAL_PURCHASE_ORDERS;
}

// Deep Rescue for Soundings
function rescueSoundingsFromStorage(): SoundingRecord[] {
  const primary = getStorageItem<SoundingRecord[]>(KEYS.SOUNDINGS, []);
  if (Array.isArray(primary) && primary.length > 0) return primary;

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
        setStorageItem('pertashop_soundings', parsed);
        return parsed;
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.soundings) && parsed.soundings.length > 0) {
        setStorageItem(KEYS.SOUNDINGS, parsed.soundings);
        setStorageItem('pertashop_soundings', parsed.soundings);
        return parsed.soundings;
      }
    } catch {}
  }
  return INITIAL_SOUNDING_RECORDS;
}

// Deep Rescue for Expenses
function rescueExpensesFromStorage(): ExpenseRecord[] {
  const primary = getStorageItem<ExpenseRecord[]>(KEYS.EXPENSES, []);
  if (Array.isArray(primary) && primary.length > 0) return primary;

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
        setStorageItem('pertashop_expenses', parsed);
        return parsed;
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.expenses) && parsed.expenses.length > 0) {
        setStorageItem(KEYS.EXPENSES, parsed.expenses);
        setStorageItem('pertashop_expenses', parsed.expenses);
        return parsed.expenses;
      }
    } catch {}
  }
  return INITIAL_EXPENSES;
}

// Deep Rescue for Employees
function rescueEmployeesFromStorage(): Employee[] {
  const primary = getStorageItem<Employee[]>(KEYS.EMPLOYEES, []);
  if (Array.isArray(primary) && primary.length > 0) return primary;

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
        setStorageItem('pertashop_employees', parsed);
        return parsed;
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.employees) && parsed.employees.length > 0) {
        setStorageItem(KEYS.EMPLOYEES, parsed.employees);
        setStorageItem('pertashop_employees', parsed.employees);
        return parsed.employees;
      }
    } catch {}
  }
  return INITIAL_EMPLOYEES;
}

// Deep Rescue for Attendance & Payroll
function rescueAttendanceFromStorage(): AttendanceRecord[] {
  const primary = getStorageItem<AttendanceRecord[]>(KEYS.ATTENDANCE, []);
  if (Array.isArray(primary) && primary.length > 0) return primary;

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
  const primary = getStorageItem<PayrollRecord[]>(KEYS.PAYROLLS, []);
  if (Array.isArray(primary) && primary.length > 0) return primary;

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
  const primary = getStorageItem<TankConfig>(KEYS.TANK, INITIAL_TANK_CONFIG);
  if (primary && primary.totalCapacityLiters > 0 && primary.tankId) return primary;

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
  const primary = getStorageItem<PertashopProfile>(KEYS.PROFILE, INITIAL_PERTASHOP_PROFILE);
  if (primary && primary.pertashopCode) return primary;

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
    setStorageItem('pertashop_profile', profile);
  },

  getProducts: (): Product[] => getStorageItem(KEYS.PRODUCTS, INITIAL_PRODUCTS),
  setProducts: (products: Product[]) => {
    setStorageItem(KEYS.PRODUCTS, products);
    setStorageItem('pertashop_products', products);
  },

  getTankConfig: (): TankConfig => rescueTankConfigFromStorage(),
  setTankConfig: (tank: TankConfig) => {
    setStorageItem(KEYS.TANK, tank);
    setStorageItem('pertashop_tank', tank);
  },

  getPriceHistory: (): PriceHistory[] => getStorageItem(KEYS.PRICE_HISTORY, INITIAL_PRICE_HISTORY),
  setPriceHistory: (history: PriceHistory[]) => {
    setStorageItem(KEYS.PRICE_HISTORY, history);
    setStorageItem('pertashop_price_hist', history);
  },

  getSales: (): SaleRecord[] => rescueSalesFromStorage(),
  setSales: (sales: SaleRecord[]) => {
    setStorageItem(KEYS.SALES, sales);
    // Double safeguard: Mirror to permanent unversioned key and archive whenever records exist
    if (Array.isArray(sales) && sales.length > 0) {
      setStorageItem(SAFEGUARD_KEYS.SALES_ARCHIVE, sales);
      setStorageItem(SAFEGUARD_KEYS.SALES_UNVERSIONED, sales);
      setStorageItem(SAFEGUARD_KEYS.SALES_V5, sales);
      // Rolling timestamped snapshot
      try {
        localStorage.setItem(
          SAFEGUARD_KEYS.EMERGENCY_BACKUP,
          JSON.stringify({
            savedAt: new Date().toISOString(),
            sales,
          })
        );
      } catch {}
    }
  },

  getPurchases: (): PurchaseOrder[] => rescuePurchasesFromStorage(),
  setPurchases: (purchases: PurchaseOrder[]) => {
    setStorageItem(KEYS.PURCHASES, purchases);
    if (Array.isArray(purchases) && purchases.length > 0) {
      setStorageItem('pertashop_purchases', purchases);
    }
  },

  getSoundings: (): SoundingRecord[] => rescueSoundingsFromStorage(),
  setSoundings: (soundings: SoundingRecord[]) => {
    setStorageItem(KEYS.SOUNDINGS, soundings);
    if (Array.isArray(soundings) && soundings.length > 0) {
      setStorageItem('pertashop_soundings', soundings);
    }
  },

  getExpenses: (): ExpenseRecord[] => rescueExpensesFromStorage(),
  setExpenses: (expenses: ExpenseRecord[]) => {
    setStorageItem(KEYS.EXPENSES, expenses);
    if (Array.isArray(expenses) && expenses.length > 0) {
      setStorageItem('pertashop_expenses', expenses);
    }
  },

  getEmployees: (): Employee[] => rescueEmployeesFromStorage(),
  setEmployees: (employees: Employee[]) => {
    setStorageItem(KEYS.EMPLOYEES, employees);
    if (Array.isArray(employees) && employees.length > 0) {
      setStorageItem('pertashop_employees', employees);
    }
  },

  getAttendance: (): AttendanceRecord[] => rescueAttendanceFromStorage(),
  setAttendance: (records: AttendanceRecord[]) => {
    setStorageItem(KEYS.ATTENDANCE, records);
    if (Array.isArray(records) && records.length > 0) {
      setStorageItem('pertashop_attendance', records);
    }
  },

  getPayrolls: (): PayrollRecord[] => rescuePayrollsFromStorage(),
  setPayrolls: (payrolls: PayrollRecord[]) => {
    setStorageItem(KEYS.PAYROLLS, payrolls);
    if (Array.isArray(payrolls) && payrolls.length > 0) {
      setStorageItem('pertashop_payrolls', payrolls);
    }
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

    // Keep an automatic rolling snapshot in localStorage
    try {
      localStorage.setItem(SAFEGUARD_KEYS.LATEST_BACKUP, JSON.stringify(backup));
    } catch {}

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
