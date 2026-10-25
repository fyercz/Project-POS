import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { OrderAlertBanner } from './components/OrderAlertBanner';
import { StockTankGauge } from './components/StockTankGauge';
import { StatsCards } from './components/StatsCards';
import { SalesTable } from './components/SalesTable';
import { PurchaseHistoryTable } from './components/PurchaseHistoryTable';
import { AnalyticsView } from './components/AnalyticsView';
import { ExpensesView } from './components/ExpensesView';
import { SummaryReportView } from './components/SummaryReportView';
import { SalesEntryModal } from './components/SalesEntryModal';
import { PriceManagementModal } from './components/PriceManagementModal';
import { PurchaseOrderModal } from './components/PurchaseOrderModal';
import { ReceiveFuelModal } from './components/ReceiveFuelModal';
import { SoundingLogModal } from './components/SoundingLogModal';
import { PrintDailyReportModal } from './components/PrintDailyReportModal';
import { PrintSummaryReportModal } from './components/PrintSummaryReportModal';
import { PertashopProfileModal } from './components/PertashopProfileModal';
import { ExpenseEntryModal } from './components/ExpenseEntryModal';
import { ImportSalesModal } from './components/ImportSalesModal';
import { HistoricalMonthlyBatchModal, MonthlyBatchPayload } from './components/HistoricalMonthlyBatchModal';
import { AttendancePayrollView } from './components/AttendancePayrollView';
import { ConfirmModal } from './components/ConfirmModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { StorageService, STORAGE_ERROR_EVENT } from './utils/storage';
import { syncSalesToAttendance, recalculateMonthlyPayrolls, findEmployeeByOperatorName, isPayrollLocked } from './utils/attendanceSync';
import { useAttendancePayrollLogic } from './hooks/useAttendancePayrollLogic';
import { useExpenseLogic } from './hooks/useExpenseLogic';
import { useSoundingLogic } from './hooks/useSoundingLogic';
import { recalculateSaleWithPrice, recalculatePurchaseWithPrice, formatMonthYearId, getEffectivePriceForDate } from './utils/pricing';
import { syncFuelVarianceToExpenses } from './utils/fuelVarianceSync';
import {
  Product,
  PurchaseOrder,
  SaleRecord,
  TankConfig,
  PertashopProfile,
  PriceHistory,
  SoundingRecord,
  OrderVolumePecahan,
  ExpenseRecord,
  ExpenseCategoryType,
  Employee,
  AttendanceRecord,
  PayrollRecord,
  PertashopBackupData,
} from './types';
import { getTodayDateString, getCurrentTimeString, getShiftCategory, getShiftHoursInfo, STANDARD_SHIFTS, formatRupiah, formatNumber, formatShortDate, formatMonthYear } from './utils/formatters';
import { Gauge, Plus, Pencil, Trash2 } from 'lucide-react';

export default function App() {
  // State from Storage with lazy initializer & auto-rescue
  const [profile, setProfile] = useState<PertashopProfile>(() => StorageService.getProfile());
  const [products, setProducts] = useState<Product[]>(() => StorageService.getProducts());
  const [tank, setTank] = useState<TankConfig>(() => StorageService.getTankConfig());
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>(() => StorageService.getPriceHistory());
  const [sales, setSales] = useState<SaleRecord[]>(() => StorageService.getSales());
  const [purchases, setPurchases] = useState<PurchaseOrder[]>(() => StorageService.getPurchases());
  const [soundings, setSoundings] = useState<SoundingRecord[]>(() => StorageService.getSoundings());
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => StorageService.getExpenses());
  const [employees, setEmployees] = useState<Employee[]>(() => StorageService.getEmployees());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => StorageService.getAttendance());
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>(() => StorageService.getPayrolls());

  // Navigation Tab & Mobile Drawer State
  const [activeTab, setActiveTab] = useState<'sales' | 'purchases' | 'soundings' | 'expenses' | 'attendance' | 'summary' | 'analytics'>('sales');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Modals & Editing States
  const [isSalesModalOpen, setIsSalesModalOpen] = useState<boolean>(false);
  const [isImportSalesModalOpen, setIsImportSalesModalOpen] = useState<boolean>(false);
  const [isHistoricalBatchModalOpen, setIsHistoricalBatchModalOpen] = useState<boolean>(false);
  const [editingSale, setEditingSale] = useState<SaleRecord | null>(null);
  const [lastSalesInputDate, setLastSalesInputDate] = useState<string | null>(() => StorageService.getLastSalesDate());

  const [isPriceModalOpen, setIsPriceModalOpen] = useState<boolean>(false);

  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [selectedOrderKL, setSelectedOrderKL] = useState<OrderVolumePecahan>(2);
  const [lastPurchaseOrderDate, setLastPurchaseOrderDate] = useState<string | null>(() => StorageService.getLastPoDate());

  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState<boolean>(false);
  const [activeReceivingOrder, setActiveReceivingOrder] = useState<PurchaseOrder | null>(null);

  const [isSoundingModalOpen, setIsSoundingModalOpen] = useState<boolean>(false);
  const [editingSounding, setEditingSounding] = useState<SoundingRecord | null>(null);

  const [isPrintReportModalOpen, setIsPrintReportModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [soundingDeleteMonth, setSoundingDeleteMonth] = useState<string>('');
  const [storageAlert, setStorageAlert] = useState<{ level: 'error' | 'warning'; message: string } | null>(null);

  // Summary Report Modal State
  const [isPrintSummaryModalOpen, setIsPrintSummaryModalOpen] = useState<boolean>(false);
  const [summaryPrintMode, setSummaryPrintMode] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [summaryPrintMonth, setSummaryPrintMonth] = useState<string>(() => getTodayDateString().substring(0, 7));
  const [summaryPrintYear, setSummaryPrintYear] = useState<number>(() => new Date().getFullYear());

  // Expense Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<ExpenseCategoryType>('GAJI_OPERATOR');
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);

  // Global In-App Confirm Modal State (bypasses iframe window.confirm blocks)
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string | React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Sync to localStorage with Data Loss Prevention Safeguards
  useEffect(() => {
    StorageService.setProfile(profile);
  }, [profile]);

  useEffect(() => {
    StorageService.setProducts(products);
  }, [products]);

  useEffect(() => {
    StorageService.setTankConfig(tank);
  }, [tank]);

  useEffect(() => {
    StorageService.setPriceHistory(priceHistory);
  }, [priceHistory]);

  useEffect(() => {
    StorageService.setSales(sales);
  }, [sales]);

  useEffect(() => {
    StorageService.setPurchases(purchases);
  }, [purchases]);

  useEffect(() => {
    StorageService.setSoundings(soundings);
  }, [soundings]);

  useEffect(() => {
    StorageService.setExpenses(expenses);
  }, [expenses]);

  useEffect(() => {
    StorageService.setEmployees(employees);
  }, [employees]);

  useEffect(() => {
    StorageService.setAttendance(attendance);
  }, [attendance]);

  useEffect(() => {
    StorageService.setPayrolls(payrolls);
  }, [payrolls]);

  // ===== Pengaman penyimpanan lokal =====
  // 1) Hapus salinan duplikat lama, 2) minta penyimpanan permanen, 3) tampilkan peringatan bila gagal simpan
  useEffect(() => {
    const freed = StorageService.compactStorage();
    if (freed > 0) console.info(`[StorageService] Membersihkan ${freed} karakter salinan duplikat.`);
    StorageService.requestPersistentStorage();

    const onStorageError = (ev: Event) => {
      const detail = (ev as CustomEvent).detail || {};
      setStorageAlert({
        level: 'error',
        message: detail.quota
          ? 'PENYIMPANAN PENUH: data terbaru GAGAL disimpan dan akan hilang bila aplikasi ditutup. Segera unduh Backup JSON, lalu hapus data bulan lama yang sudah dibackup.'
          : `Gagal menyimpan data (${detail.key || 'tidak diketahui'}). Segera unduh Backup JSON agar data aman.`,
      });
    };
    window.addEventListener(STORAGE_ERROR_EVENT, onStorageError);
    return () => window.removeEventListener(STORAGE_ERROR_EVENT, onStorageError);
  }, []);

  // Peringatan dini saat kapasitas penyimpanan mendekati batas
  useEffect(() => {
    const { percent } = StorageService.getUsageInfo();
    setStorageAlert((prev) => {
      if (prev?.level === 'error') return prev;
      if (percent >= 80) {
        return {
          level: 'warning',
          message: `Penyimpanan browser sudah terpakai sekitar ${percent}%. Unduh Backup JSON secara rutin dan hapus data bulan lama yang sudah dibackup agar data baru tetap tersimpan.`,
        };
      }
      return null;
    });
  }, [sales, purchases, expenses, attendance, payrolls, soundings]);

  // Otomatis sinkronkan riwayat sounding & DO yang memiliki selisih ke pembukuan jika belum tercatat
  useEffect(() => {
    let hasChanges = false;
    const reconciled = [...expenses];

    soundings.forEach((snd) => {
      if (!snd.varianceExpenseExcluded && Math.abs(snd.varianceLiters) > 0.001) {
        const exists = reconciled.some((e) => e.sourceReferenceId === snd.id);
        if (!exists) {
          const absVar = Math.abs(snd.varianceLiters);
          const isLoss = snd.varianceLiters < 0;
          const eff = getEffectivePriceForDate('prod-pertamax-92', snd.date, products, priceHistory, sales);
          const bp = eff.buyPrice || primaryProduct.buyPrice || 12100;
          const amt = Math.round(absVar * bp);
          reconciled.push({
            id: `exp-fuel-${snd.id}`,
            date: snd.date,
            time: snd.time,
            category: isLoss ? 'LOSSES_MINYAK' : 'GAIN_MINYAK',
            title: isLoss
              ? `Beban Losses Minyak Tangki (${formatNumber(absVar, 1)} L)`
              : `Surplus / Gain Stok BBM Tangki (+${formatNumber(absVar, 1)} L)`,
            amount: amt,
            quantity: absVar,
            unitRate: bp,
            fuelLossLiters: absVar,
            fuelLossBuyPriceSnapshot: bp,
            personOrVendor: `Tera Stick Ukur Tangki (Op. ${snd.operatorName})`,
            paymentSource: 'KAS_HARIAN',
            notes: `Otomatis dari Tera Sounding Tangki Fisik (${snd.calculatedLiters} L vs Sistem ${snd.systemStockLiters} L). ${snd.notes || ''}`.trim(),
            createdAt: `${snd.date} ${snd.time}`,
            sourceReferenceId: snd.id,
            sourceType: 'SOUNDING_TANGKI',
            varianceType: isLoss ? 'LOSS' : 'GAIN',
          });
          hasChanges = true;
        }
      }
    });

    purchases.forEach((po) => {
      if (!po.varianceExpenseExcluded && po.status === 'SELESAI' && po.varianceLiters && Math.abs(po.varianceLiters) > 0.001) {
        const exists = reconciled.some((e) => e.sourceReferenceId === po.id);
        if (!exists) {
          const absVar = Math.abs(po.varianceLiters);
          const isLoss = po.varianceLiters < 0;
          const bp = po.buyPricePerLiter || primaryProduct.buyPrice || 12100;
          const amt = Math.round(absVar * bp);
          reconciled.push({
            id: `exp-fuel-${po.id}`,
            date: po.actualDeliveryDate || po.orderDate,
            time: '12:00',
            category: isLoss ? 'LOSSES_MINYAK' : 'GAIN_MINYAK',
            title: isLoss
              ? `Beban Susut Bongkar DO ${po.poNumber} (${formatNumber(absVar, 1)} L)`
              : `Surplus Penerimaan DO ${po.poNumber} (+${formatNumber(absVar, 1)} L)`,
            amount: amt,
            quantity: absVar,
            unitRate: bp,
            fuelLossLiters: absVar,
            fuelLossBuyPriceSnapshot: bp,
            personOrVendor: `Mobil Tangki Pertamina (${po.truckPlateNumber || po.supplyDepot || 'TBBM'})`,
            paymentSource: 'KAS_HARIAN',
            notes: `Selisih DO ${po.volumeLiters} L vs Diterima ${po.actualLitersReceived || po.volumeLiters} L. Supir: ${po.driverName || '-'}`.trim(),
            createdAt: `${po.actualDeliveryDate || po.orderDate} 12:00`,
            sourceReferenceId: po.id,
            sourceType: 'PENERIMAAN_DO',
            varianceType: isLoss ? 'LOSS' : 'GAIN',
          });
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      setExpenses(reconciled);
      StorageService.setExpenses(reconciled);
    }
  }, []);

  // Daftar bulan yang punya data sounding (untuk fitur hapus sounding per bulan)
  const soundingMonths: string[] = Array.from(new Set<string>(soundings.map((r) => (r.date || '').substring(0, 7)).filter((m) => /^\d{4}-\d{2}$/.test(m))))
    .sort()
    .reverse();

  // Primary product (Pertamax 92)
  const primaryProduct = products.find((p) => p.id === 'prod-pertamax-92') || products[0];


  // Daily Calculations
  const todayStr = getTodayDateString();
  const todaySales = sales.filter((s) => s.transactionDate === todayStr);

  const totalVolumeAll = sales.reduce((acc, s) => acc + s.literSold, 0);
  const uniqueDatesCount = Array.from(new Set(sales.map((s) => s.transactionDate))).length || 1;
  const avgDailySalesLiters = totalVolumeAll / uniqueDatesCount;

  // Last meter reading
  // Ambil meter akhir dari transaksi TERBARU (berdasarkan tanggal & jam), bukan urutan array
  const lastSaleWithMeter = sales
    .filter((s) => s.meterAkhir !== undefined && s.meterAkhir !== null)
    .reduce<SaleRecord | undefined>(
      (best, s) => (!best || `${s.transactionDate}T${s.time || '00:00'}` > `${best.transactionDate}T${best.time || '00:00'}` ? s : best),
      undefined
    );
  const lastMeterReading = lastSaleWithMeter ? lastSaleWithMeter.meterAkhir! : 0;

  // Handlers
  const handleOpenAddSale = () => {
    setEditingSale(null);
    setIsSalesModalOpen(true);
  };

  const handleEditSale = (sale: SaleRecord) => {
    setEditingSale(sale);
    setIsSalesModalOpen(true);
  };

  // ===== Helper penjualan =====
  const saleSortKey = (s: Pick<SaleRecord, 'transactionDate' | 'time'>) => `${s.transactionDate}T${s.time || '00:00'}`;

  // Apakah dua penjualan bentrok slot shift pada tanggal yang sama
  const isShiftConflict = (
    a: Pick<SaleRecord, 'transactionDate' | 'shift'>,
    b: Pick<SaleRecord, 'transactionDate' | 'shift'>
  ) => {
    if (a.transactionDate !== b.transactionDate) return false;
    const ca = getShiftCategory(a.shift);
    const cb = getShiftCategory(b.shift);
    return ca === cb || ca === 'fullday' || cb === 'fullday';
  };

  // Apakah transaksi ini adalah transaksi paling akhir (stok tangki saat ini "milik" transaksi ini)
  const isLatestSale = (candidate: Pick<SaleRecord, 'transactionDate' | 'time'>, excludeId: string | null, list: SaleRecord[]) => {
    const key = saleSortKey(candidate);
    return !list.some((s) => s.id !== excludeId && saleSortKey(s) > key);
  };

  // Cari record sounding milik penjualan (termasuk data lama yang belum punya tautan ID)
  const findSoundingForSale = (sale: SaleRecord): SoundingRecord | undefined => {
    if (sale.soundingRecordId) return soundings.find((r) => r.id === sale.soundingRecordId);
    if (!sale.hasSounding) return undefined;
    const legacyPrefix = `Sounding closing saat ${sale.shift} (${sale.operatorName})`;
    return soundings.find(
      (r) => r.date === sale.transactionDate && r.time === sale.time && (r.notes || '').startsWith(legacyPrefix)
    );
  };

  // Karena satu operator hanya boleh tercatat SATU penjualan per tanggal (lihat pengecekan
  // hasOperatorConflict di bawah), setiap pasangan (karyawan, tanggal) maksimal berasal dari
  // satu transaksi penjualan. Ini membuat sinkronisasi absensi aman dihitung ulang dari nol
  // setiap kali tanpa risiko salah gabung dengan transaksi operator lain.
  const resyncAttendanceForDate = (
    dateStr: string,
    salesSnapshot: SaleRecord[],
    attList: AttendanceRecord[]
  ): { list: AttendanceRecord[]; recordId?: string; created: boolean } => {
    const daySales = salesSnapshot.filter((s) => s.transactionDate === dateStr);
    if (daySales.length === 0) return { list: attList, created: false };
    const matchedEmp = findEmployeeByOperatorName(daySales[0].operatorName, employees);
    const hadBefore = !!matchedEmp && attList.some((a) => a.employeeId === matchedEmp.id && a.date === dateStr);
    const { updatedAttendance } = syncSalesToAttendance(daySales, attList, employees);
    const rec = matchedEmp ? updatedAttendance.find((a) => a.employeeId === matchedEmp.id && a.date === dateStr) : undefined;
    return { list: updatedAttendance, recordId: rec?.id, created: !hadBefore };
  };

  // Terapkan daftar absensi baru + hitung ulang slip gaji untuk bulan-bulan yang terdampak
  const commitAttendance = (nextList: AttendanceRecord[], months: string[]) => {
    if (nextList === attendance) return;
    setAttendance(nextList);
    let nextPayrolls = payrolls;
    Array.from(new Set(months.filter(Boolean))).forEach((m) => {
      nextPayrolls = recalculateMonthlyPayrolls(nextList, employees, nextPayrolls, m);
    });
    setPayrolls(nextPayrolls);
  };

  // Mengembalikan null bila berhasil disimpan, atau pesan error (string) bila DITOLAK karena
  // bentrok shift/operator - supaya modal bisa menampilkan pesan yang jelas ke kasir dan TIDAK
  // menutup diri begitu saja. Sebelumnya penolakan ini hanya console.warn (tidak terlihat sama
  // sekali oleh kasir), sehingga tombol Simpan tampak "tidak melakukan apa-apa" tanpa penjelasan -
  // ini bisa terjadi saat dua perangkat (mis. 2 komputer kasir atau HP/tablet manager di jaringan
  // yang sama) menyimpan data hampir bersamaan.
  const handleSaveSale = (saleData: Omit<SaleRecord, 'id' | 'createdAt'>): string | null => {
    // Safety check: Prevent duplicate shift or conflict on the same date
    const hasConflict = sales.some((s) => {
      if (editingSale && s.id === editingSale.id) return false;
      return isShiftConflict(s, saleData);
    });

    if (hasConflict) {
      return `Shift '${saleData.shift}' sudah terisi pada ${saleData.transactionDate} (kemungkinan baru saja disimpan dari perangkat/tab lain). Silakan muat ulang halaman dan periksa data terbaru sebelum menyimpan lagi.`;
    }

    // Safety check: Prevent duplicate operator on the same date (aturan operasional pemilik)
    const targetOperator = saleData.operatorName.trim().toLowerCase();
    const hasOperatorConflict = sales.some((s) => {
      if (editingSale && s.id === editingSale.id) return false;
      if (s.transactionDate !== saleData.transactionDate) return false;
      return s.operatorName.trim().toLowerCase() === targetOperator;
    });

    if (hasOperatorConflict) {
      return `Operator '${saleData.operatorName}' sudah bertugas pada ${saleData.transactionDate} (kemungkinan baru saja disimpan dari perangkat/tab lain). Silakan muat ulang halaman dan periksa data terbaru sebelum menyimpan lagi.`;
    }

    const soundingApplies =
      !!saleData.hasSounding && !!saleData.syncToSoundingLog && saleData.soundingCalculatedLiters !== undefined;

    if (editingSale) {
      const original = editingSale;
      const diffLiters = saleData.literSold - original.literSold;
      const latest = isLatestSale(saleData, original.id, sales);

      // --- Sounding terkait ---
      const linkedSnd = findSoundingForSale(original);
      let soundingRecordId: string | undefined = linkedSnd?.id;
      const wantsSoundingRecord =
        !!saleData.hasSounding &&
        saleData.soundingCalculatedLiters !== undefined &&
        (saleData.syncToSoundingLog ||
          (saleData.soundingVarianceLiters !== undefined && Math.abs(saleData.soundingVarianceLiters) > 0.001));

      if (wantsSoundingRecord) {
        const sndId = linkedSnd?.id || `snd-shift-${Date.now()}`;
        const theoretical = saleData.soundingTheoreticalLiters ?? 0;
        const variance = saleData.soundingVarianceLiters ?? (saleData.soundingCalculatedLiters! - theoretical);
        const rec: SoundingRecord = {
          id: sndId,
          date: saleData.transactionDate,
          time: saleData.time,
          operatorName: saleData.operatorName,
          stickDipCm: saleData.soundingStickCm || 0,
          calculatedLiters: saleData.soundingCalculatedLiters!,
          systemStockLiters: theoretical,
          varianceLiters: variance,
          waterBottomCm: saleData.soundingWaterCm || 0,
          notes: `Sounding closing saat ${saleData.shift} (${saleData.operatorName}). ${saleData.notes || ''}`.trim(),
        };
        setSoundings((prev) => (prev.some((r) => r.id === sndId) ? prev.map((r) => (r.id === sndId ? rec : r)) : [rec, ...prev]));
        syncFuelVarianceToExpenses(fuelVarianceDeps, 
          sndId,
          'CLOSING_SHIFT',
          saleData.transactionDate,
          saleData.time,
          variance,
          `Sounding Shift (${saleData.operatorName})`,
          `Sounding closing ${saleData.shift} (Fisik ${saleData.soundingCalculatedLiters} L vs Sistem ${theoretical} L)`
        );
        soundingRecordId = sndId;
      } else if (linkedSnd) {
        // Sounding dimatikan saat edit: hapus record & beban selisihnya
        setSoundings((prev) => prev.filter((r) => r.id !== linkedSnd.id));
        setExpenses((prev) => prev.filter((e) => e.sourceReferenceId !== linkedSnd.id));
        soundingRecordId = undefined;
      }

      // --- Absensi terkait ---
      // Pakai array penjualan HASIL EDIT untuk resync, supaya tanggal lama & baru merefleksikan
      // keadaan sesungguhnya setelah perubahan ini (aman dihitung ulang berkali-kali / idempoten).
      const provisionalSale: SaleRecord = { ...saleData, id: original.id, createdAt: original.createdAt };
      const salesAfterEdit = sales.map((s) => (s.id === original.id ? provisionalSale : s));

      let attendanceRecordId = original.attendanceRecordId;
      let attendanceCreatedBySale = original.attendanceCreatedBySale;
      let nextAttendance = attendance;

      // Hapus dulu absensi lama yang dibuat otomatis oleh sale ini, jika tanggal/operator berubah
      // atau sinkronisasi dimatikan (karena operator hanya boleh 1 penjualan/hari, aman dihapus
      // outright tanpa bentrok dengan transaksi lain).
      const dateOrOperatorChanged =
        original.transactionDate !== saleData.transactionDate ||
        original.operatorName.trim().toLowerCase() !== saleData.operatorName.trim().toLowerCase();
      if (
        original.attendanceCreatedBySale &&
        original.attendanceRecordId &&
        (dateOrOperatorChanged || saleData.syncToAttendance === false)
      ) {
        nextAttendance = nextAttendance.filter((a) => a.id !== original.attendanceRecordId);
        attendanceRecordId = undefined;
        attendanceCreatedBySale = undefined;
      }

      if (saleData.syncToAttendance !== false) {
        const r = resyncAttendanceForDate(saleData.transactionDate, salesAfterEdit, nextAttendance);
        nextAttendance = r.list;
        if (r.recordId) {
          attendanceRecordId = r.recordId;
          attendanceCreatedBySale = r.created;
        }
      }
      commitAttendance(nextAttendance, [original.transactionDate.substring(0, 7), saleData.transactionDate.substring(0, 7)]);

      const updatedSale: SaleRecord = {
        ...provisionalSale,
        soundingRecordId,
        attendanceRecordId,
        attendanceCreatedBySale,
      };
      setSales(sales.map((s) => (s.id === original.id ? updatedSale : s)));

      // --- Stok tangki ---
      // Hanya sounding pada transaksi TERAKHIR yang mewakili stok fisik saat ini.
      // Mengedit transaksi lama cukup mengoreksi selisih liternya.
      setTank((prev) => {
        const useSounding = latest && soundingApplies;
        const nextStock = useSounding
          ? saleData.soundingCalculatedLiters!
          : Math.max(0, Math.min(prev.totalCapacityLiters, prev.currentStockLiters - diffLiters));
        return {
          ...prev,
          currentStockLiters: nextStock,
          lastSoundingDate: useSounding ? saleData.transactionDate : prev.lastSoundingDate,
          lastSoundingLiters: useSounding ? saleData.soundingCalculatedLiters : prev.lastSoundingLiters,
        };
      });
      setEditingSale(null);
    } else {
      const saleId = `sale-${Date.now()}`;
      const theoreticalStock = Math.max(0, tank.currentStockLiters - saleData.literSold);
      const finalStock = soundingApplies ? saleData.soundingCalculatedLiters! : theoreticalStock;

      setTank((prev) => ({
        ...prev,
        currentStockLiters: finalStock,
        lastSoundingDate: saleData.hasSounding ? saleData.transactionDate : prev.lastSoundingDate,
        lastSoundingLiters: saleData.hasSounding && saleData.soundingCalculatedLiters !== undefined ? saleData.soundingCalculatedLiters : prev.lastSoundingLiters,
      }));

      // If sounding was recorded, add to sounding history and auto sync to bookkeeping
      let soundingRecordId: string | undefined;
      if (saleData.hasSounding && (saleData.syncToSoundingLog || (saleData.soundingVarianceLiters !== undefined && Math.abs(saleData.soundingVarianceLiters) > 0.001)) && saleData.soundingCalculatedLiters !== undefined) {
        const sndId = `snd-shift-${Date.now()}`;
        const sVariance = saleData.soundingVarianceLiters ?? (saleData.soundingCalculatedLiters - theoreticalStock);
        const newSoundingRecord: SoundingRecord = {
          id: sndId,
          date: saleData.transactionDate,
          time: saleData.time,
          operatorName: saleData.operatorName,
          stickDipCm: saleData.soundingStickCm || 0,
          calculatedLiters: saleData.soundingCalculatedLiters,
          systemStockLiters: saleData.soundingTheoreticalLiters ?? theoreticalStock,
          varianceLiters: sVariance,
          waterBottomCm: saleData.soundingWaterCm || 0,
          notes: `Sounding closing saat ${saleData.shift} (${saleData.operatorName}). ${saleData.notes || ''}`.trim(),
        };
        setSoundings((prev) => [newSoundingRecord, ...prev]);
        soundingRecordId = sndId;

        // Otomatis catat selisih loss atau gain BBM ke dalam pembukuan keuangan
        syncFuelVarianceToExpenses(fuelVarianceDeps, 
          sndId,
          'CLOSING_SHIFT',
          saleData.transactionDate,
          saleData.time,
          sVariance,
          `Sounding Shift (${saleData.operatorName})`,
          `Sounding closing ${saleData.shift} (Fisik ${saleData.soundingCalculatedLiters} L vs Sistem ${saleData.soundingTheoreticalLiters ?? theoreticalStock} L)`
        );
      }

      // SINKRONISASI OTOMATIS KE ABSENSI KARYAWAN
      let attendanceRecordId: string | undefined;
      let attendanceCreatedBySale: boolean | undefined;
      if (saleData.syncToAttendance !== false) {
        const provisionalSale: SaleRecord = { ...saleData, id: saleId, createdAt: '' };
        const r = resyncAttendanceForDate(saleData.transactionDate, [provisionalSale, ...sales], attendance);
        attendanceRecordId = r.recordId;
        attendanceCreatedBySale = r.created;
        commitAttendance(r.list, [saleData.transactionDate.substring(0, 7)]);
      }

      const newSale: SaleRecord = {
        ...saleData,
        id: saleId,
        createdAt: `${getTodayDateString()} ${getCurrentTimeString()}`,
        soundingRecordId,
        attendanceRecordId,
        attendanceCreatedBySale,
      };
      setSales([newSale, ...sales]);
      setLastSalesInputDate(saleData.transactionDate);
      StorageService.setLastSalesDate(saleData.transactionDate);
    }

    // Auto-sync price history if this month doesn't have an explicit entry yet.
    // PENTING: hanya dibuat bila harga di input penjualan SAMA PERSIS dengan harga resmi produk
    // saat ini (sekadar backfill histori bulan tsb). Bila berbeda - entah itu perubahan harga
    // yang disengaja atau sekadar salah ketik kasir - tarif resmi bulan tidak diubah di sini.
    // Perubahan tarif resmi WAJIB lewat menu "Ubah Harga" yang meminta konfirmasi eksplisit.
    // Tanpa penjagaan ini, satu salah ketik di satu shift bisa mengubah "tarif resmi" sebulan
    // penuh yang dipakai laporan lain, sampai disadari dan diperbaiki manual.
    if (saleData.unitPrice > 0) {
      const saleMonth = saleData.transactionDate.substring(0, 7);
      const existingHist = priceHistory.find(
        (h) => h.productId === saleData.productId && h.effectiveDate.startsWith(saleMonth)
      );
      const prodForCheck = products.find((p) => p.id === saleData.productId) || primaryProduct;
      const matchesOfficialPrice = Math.abs(saleData.unitPrice - prodForCheck.currentPrice) < 1;
      if (!existingHist && matchesOfficialPrice) {
        const prod = prodForCheck;
        const buyPrice = saleData.buyPriceSnapshot || prod.buyPrice;
        const newHistEntry: PriceHistory = {
          id: `price-hist-${Date.now()}`,
          productId: saleData.productId,
          effectiveDate: `${saleData.transactionDate} 00:00`,
          oldPrice: prod.currentPrice,
          newPrice: saleData.unitPrice,
          oldBuyPrice: prod.buyPrice,
          newBuyPrice: buyPrice,
          marginPerLiter: saleData.unitPrice - buyPrice,
          referenceDoc: 'Pencatatan Penjualan',
          notes: `Tarif dari input penjualan ${formatMonthYearId(saleMonth)}`,
          updatedBy: saleData.operatorName,
          updatedAt: `${getTodayDateString()} ${getCurrentTimeString()}`,
        };
        const updatedHistory = [newHistEntry, ...priceHistory];
        setPriceHistory(updatedHistory);
        StorageService.setPriceHistory(updatedHistory);
      }
    }
    return null;
  };

  const handleImportSales = (
    rawImportedSales: SaleRecord[],
    mode: 'append' | 'replace',
    syncStock: boolean | 'LOSSES_ONLY' | 'FULL_MUTATION' | 'NONE',
    importedPurchases?: PurchaseOrder[],
    syncAttendance: boolean = true
  ) => {
    // Saring duplikat: baris yang bentrok shift dengan data yang sudah ada (mode append)
    // atau dengan baris lain di file yang sama, dilewati agar penjualan & stok tidak terhitung ganda.
    const importedSales: SaleRecord[] = [];
    const skippedSales: SaleRecord[] = [];
    const baseForConflict = mode === 'replace' ? [] : sales;
    rawImportedSales.forEach((s) => {
      const clash =
        baseForConflict.some((x) => isShiftConflict(x, s)) || importedSales.some((x) => isShiftConflict(x, s));
      if (clash) skippedSales.push(s);
      else importedSales.push(s);
    });

    let updatedSales: SaleRecord[];
    if (mode === 'replace') {
      updatedSales = importedSales;
    } else {
      // Append imported sales
      updatedSales = [...importedSales, ...sales];
    }
    setSales(updatedSales);

    // Update last sales input date
    if (importedSales.length > 0) {
      const sortedDates = [...importedSales].map((s) => s.transactionDate).sort();
      const latestDate = sortedDates[sortedDates.length - 1];
      setLastSalesInputDate(latestDate);
      StorageService.setLastSalesDate(latestDate);
    }

    // Proses import DO Pertamina (Delivery Order) jika ada
    let updatedPurchases = purchases;
    if (importedPurchases && importedPurchases.length > 0) {
      if (mode === 'replace') {
        updatedPurchases = importedPurchases;
      } else {
        const existingPoNumbers = new Set(purchases.map((p) => p.poNumber));
        const newPurchases = importedPurchases.filter((p) => !existingPoNumbers.has(p.poNumber));
        updatedPurchases = [...newPurchases, ...purchases];
      }
      setPurchases(updatedPurchases);
      StorageService.setPurchases(updatedPurchases);
    }

    // Sinkronisasi shift penjualan batch 1 bulan ke buku absensi karyawan
    if (syncAttendance && importedSales.length > 0) {
      const syncResult = syncSalesToAttendance(importedSales, attendance, employees);
      setAttendance(syncResult.updatedAttendance);
      StorageService.setAttendance(syncResult.updatedAttendance);
    }

    const totalImportLitersSold = importedSales.reduce((acc, s) => acc + s.literSold, 0);
    const totalImportLosses = importedSales.reduce((acc, s) => acc + (s.fuelLossLiters || 0), 0);
    const totalImportLitersReceived = (importedPurchases || [])
      .filter((p) => p.status === 'SELESAI')
      .reduce((acc, p) => acc + (p.actualLitersReceived || p.volumeLiters), 0);

    const isFull = syncStock === true || syncStock === 'FULL_MUTATION';
    const isLossesOnly = syncStock === 'LOSSES_ONLY';

    if (isFull) {
      setTank((prev) => {
        const net = totalImportLitersReceived - totalImportLitersSold - totalImportLosses;
        const newStock = Math.min(
          prev.totalCapacityLiters,
          Math.max(0, prev.currentStockLiters + net)
        );
        const updatedTank = {
          ...prev,
          currentStockLiters: newStock,
        };
        StorageService.setTankConfig(updatedTank);
        return updatedTank;
      });
    } else if (isLossesOnly || (totalImportLosses > 0 && syncStock !== false && syncStock !== 'NONE')) {
      // Potong losses secara langsung dari stok tangki
      setTank((prev) => {
        const newStock = Math.max(0, prev.currentStockLiters - totalImportLosses);
        const updatedTank = {
          ...prev,
          currentStockLiters: newStock,
        };
        StorageService.setTankConfig(updatedTank);
        return updatedTank;
      });
    }

    // Catat beban LOSSES_MINYAK jika ada losses di data penjualan yang diimpor
    const importedLossExpenses: ExpenseRecord[] = [];
    importedSales.forEach((s) => {
      if (s.fuelLossLiters && s.fuelLossLiters > 0) {
        const bp = s.buyPriceSnapshot || primaryProduct.buyPrice || 12100;
        importedLossExpenses.push({
          id: `exp-loss-imp-${s.id}`,
          date: s.transactionDate,
          time: s.time || '18:00',
          category: 'LOSSES_MINYAK',
          title: `Beban Losses Minyak Tangki (${formatNumber(s.fuelLossLiters, 1)} L)`,
          amount: Math.round(s.fuelLossLiters * bp),
          quantity: s.fuelLossLiters,
          unitRate: bp,
          fuelLossLiters: s.fuelLossLiters,
          fuelLossBuyPriceSnapshot: bp,
          personOrVendor: `Tera Tangki (${s.operatorName || 'Operator'})`,
          paymentSource: 'KAS_HARIAN',
          notes: `Susut fisik BBM dari import batch (-${formatNumber(s.fuelLossLiters, 1)} L). Otomatis mengurangi stok tangki sistem.`,
          createdAt: `${s.transactionDate} ${s.time || '18:00'}`,
        });
      }
    });

    if (importedLossExpenses.length > 0) {
      setExpenses((prev) => [...importedLossExpenses, ...prev]);
      StorageService.setExpenses([...importedLossExpenses, ...expenses]);
    }

    // Notifikasi hasil import
    const lossInfo = totalImportLosses > 0
      ? ` Stok tangki telah dikurangi sebesar losses (-${formatNumber(totalImportLosses, 1)} L).`
      : '';
    setConfirmConfig({
      isOpen: true,
      title: 'Import Data Penjualan Berhasil',
      message: `Berhasil mengimpor ${importedSales.length} transaksi penjualan (${formatNumber(totalImportLitersSold, 1)} L) dan ${importedPurchases?.length || 0} DO Pertamina.${lossInfo}${
        skippedSales.length > 0
          ? ` ${skippedSales.length} baris dilewati karena tanggal & shift-nya sudah tercatat (duplikat): ${skippedSales
              .slice(0, 5)
              .map((x) => `${x.transactionDate} ${x.shift}`)
              .join(', ')}${skippedSales.length > 5 ? ', ...' : ''}.`
          : ''
      }`,
      confirmLabel: 'Selesai',
      cancelLabel: 'Tutup',
      isDestructive: false,
      onConfirm: () => {},
    });
  };

  const handleDeleteSale = (saleId: string) => {
    const saleToDelete = sales.find((s) => s.id === saleId);
    if (!saleToDelete) return;

    const latest = isLatestSale(saleToDelete, saleToDelete.id, sales);
    const linkedSnd = findSoundingForSale(saleToDelete);

    // Pulihkan stok. Jika ini transaksi terakhir dan stok saat ini berasal dari sounding-nya,
    // kembalikan ke stok sebelum shift (stok buku teoritis + liter terjual).
    setTank((prev) => {
      const stockFromSounding =
        latest &&
        saleToDelete.hasSounding &&
        saleToDelete.syncToSoundingLog &&
        saleToDelete.soundingTheoreticalLiters !== undefined;
      const restored = stockFromSounding
        ? saleToDelete.soundingTheoreticalLiters! + saleToDelete.literSold
        : prev.currentStockLiters + saleToDelete.literSold;
      return {
        ...prev,
        currentStockLiters: Math.max(0, Math.min(prev.totalCapacityLiters, restored)),
      };
    });

    // Bersihkan data turunan: sounding shift, beban losses/gain, losses import, dan absensi otomatis
    if (linkedSnd) {
      setSoundings((prev) => prev.filter((r) => r.id !== linkedSnd.id));
    }
    setExpenses((prev) =>
      prev.filter(
        (e) =>
          !(linkedSnd && e.sourceReferenceId === linkedSnd.id) &&
          e.id !== `exp-loss-imp-${saleToDelete.id}`
      )
    );
    if (saleToDelete.attendanceCreatedBySale && saleToDelete.attendanceRecordId) {
      commitAttendance(
        attendance.filter((a) => a.id !== saleToDelete.attendanceRecordId),
        [saleToDelete.transactionDate.substring(0, 7)]
      );
    }

    setSales(sales.filter((s) => s.id !== saleId));
  };

  const processMonthlyBatches = (batches: MonthlyBatchPayload[]): string[] => {
    if (!batches || batches.length === 0) return [];
    const skippedMonths: string[] = [];

    let allSales = [...sales];
    let allPurchases = [...purchases];
    let allExpenses = [...expenses];
    let allPayrolls = [...payrolls];
    let allAttendance = [...attendance];
    let allPriceHistory = [...priceHistory];
    let netTankStockChange = 0;

    batches.forEach((batchData) => {
      const targetMonth = batchData.targetMonth;
      const [yearStr, monthStr] = targetMonth.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const daysInMonth = new Date(year, month, 0).getDate();
      const endOfMonthDate = `${targetMonth}-${String(daysInMonth).padStart(2, '0')}`;

      // Cegah duplikasi: bila bulan ini SUDAH ADA data penjualan/DO (dari input manual, impor,
      // atau rekap historis sebelumnya) dan pengguna TIDAK memilih "ganti data bulan", lewati
      // batch ini sepenuhnya. Tanpa pengecekan ini, menjalankan rekap historis dua kali untuk
      // bulan yang sama akan menduplikasi seluruh penjualan & DO dengan ID yang identik.
      const monthAlreadyHasData =
        allSales.some((s) => s.transactionDate.startsWith(targetMonth)) ||
        allPurchases.some(
          (p) => p.orderDate.startsWith(targetMonth) || (p.actualDeliveryDate && p.actualDeliveryDate.startsWith(targetMonth))
        );
      if (monthAlreadyHasData && !batchData.replaceExistingMonthData) {
        skippedMonths.push(targetMonth);
        return;
      }

      // Remove existing data for targetMonth if replace requested
      if (batchData.replaceExistingMonthData) {
        allSales = allSales.filter((s) => !s.transactionDate.startsWith(targetMonth));
        allPurchases = allPurchases.filter(
          (p) => !(p.orderDate.startsWith(targetMonth) || (p.actualDeliveryDate && p.actualDeliveryDate.startsWith(targetMonth)))
        );
        allExpenses = allExpenses.filter((e) => !e.date.startsWith(targetMonth));
        // Slip gaji yang sudah DIBAYAR tetap dipertahankan meski "ganti data bulan ini" dicentang -
        // nominal yang sudah lunas dibayarkan ke karyawan adalah fakta final (lihat isPayrollLocked).
        allPayrolls = allPayrolls.filter((p) => p.month !== targetMonth || isPayrollLocked(p));
        allAttendance = allAttendance.filter((a) => !a.date.startsWith(targetMonth));
      }

      // 1. Sales Records
      const newSalesForMonth: SaleRecord[] = [];
      if (batchData.distributionMode === 'AUTO_DISTRIBUTE') {
        const totalShifts = daysInMonth * 2;
        const baseLiterPerShift = Math.floor(batchData.totalLitersSold / totalShifts);
        let remainder = batchData.totalLitersSold - (baseLiterPerShift * totalShifts);
        let currentMeter = batchData.meterAwal ?? 100000;

        // Proporsikan tunai/non-tunai SESUAI TOTAL yang diinput pengguna untuk bulan ini,
        // bukan asumsi karangan "QRIS 15%". Dengan ini, jumlah seluruh shift akan sama persis
        // dengan batchData.cashPayment & batchData.nonCashPayment yang dimasukkan pemilik.
        const totalRevenueForMonth = batchData.totalLitersSold * batchData.unitPrice;
        const cashRatio = totalRevenueForMonth > 0 ? batchData.cashPayment / totalRevenueForMonth : 1;
        const nonCashRatio = totalRevenueForMonth > 0 ? batchData.nonCashPayment / totalRevenueForMonth : 0;

        // Nama operator TIDAK ditanam ke kode. Diambil dari 2 karyawan aktif pertama (urut nama);
        // bila karyawan belum didata, pakai label generik agar tidak salah atribusi ke orang tertentu.
        const activeEmpNames = employees.filter((e) => e.isActive).sort((a, b) => a.name.localeCompare(b.name));
        const shift1OperatorName = activeEmpNames[0]?.name || 'Operator Shift 1';
        const shift2OperatorName = activeEmpNames[1]?.name || activeEmpNames[0]?.name || 'Operator Shift 2';

        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${targetMonth}-${String(day).padStart(2, '0')}`;

          // Shift 1 (05.30 - 13.30)
          let add1 = 0;
          if (remainder > 0) { add1 = 1; remainder--; }
          const s1Liters = baseLiterPerShift + add1;
          const meterAwal1 = currentMeter;
          const meterAkhir1 = currentMeter + s1Liters;
          currentMeter = meterAkhir1;
          const s1Rev = s1Liters * batchData.unitPrice;
          const s1Profit = s1Liters * (batchData.unitPrice - batchData.buyPrice);
          const s1Qris = Math.round(s1Rev * nonCashRatio);
          const s1Cash = Math.round(s1Rev * cashRatio);

          newSalesForMonth.push({
            id: `sale-hist-${targetMonth}-${String(day).padStart(2, '0')}-s1`,
            transactionDate: dateStr,
            time: '06:00',
            shift: 'Shift 1 (05.30 - 13.30)',
            operatorName: shift1OperatorName,
            productId: primaryProduct.id,
            productName: primaryProduct.name,
            meterAwal: meterAwal1,
            meterAkhir: meterAkhir1,
            literSold: s1Liters,
            unitPrice: batchData.unitPrice,
            buyPriceSnapshot: batchData.buyPrice,
            totalRevenue: s1Rev,
            totalProfit: s1Profit,
            paymentCash: s1Cash,
            paymentQris: s1Qris,
            paymentEdc: 0,
            actualCashInHand: s1Cash,
            cashDifference: 0,
            teraTestLiters: 5,
            notes: `Distribusi penjualan historis ${formatMonthYearId(targetMonth)} (Shift 1)`,
            createdAt: `${dateStr} 06:00`,
          });

          // Shift 2 (13.30 - 19.30)
          let add2 = 0;
          if (remainder > 0) { add2 = 1; remainder--; }
          const s2Liters = baseLiterPerShift + add2;
          const meterAwal2 = currentMeter;
          const meterAkhir2 = currentMeter + s2Liters;
          currentMeter = meterAkhir2;
          const s2Rev = s2Liters * batchData.unitPrice;
          const s2Profit = s2Liters * (batchData.unitPrice - batchData.buyPrice);
          const s2Qris = Math.round(s2Rev * nonCashRatio);
          const s2Cash = Math.round(s2Rev * cashRatio);

          newSalesForMonth.push({
            id: `sale-hist-${targetMonth}-${String(day).padStart(2, '0')}-s2`,
            transactionDate: dateStr,
            time: '14:00',
            shift: 'Shift 2 (13.30 - 19.30)',
            operatorName: shift2OperatorName,
            productId: primaryProduct.id,
            productName: primaryProduct.name,
            meterAwal: meterAwal2,
            meterAkhir: meterAkhir2,
            literSold: s2Liters,
            unitPrice: batchData.unitPrice,
            buyPriceSnapshot: batchData.buyPrice,
            totalRevenue: s2Rev,
            totalProfit: s2Profit,
            paymentCash: s2Cash,
            paymentQris: s2Qris,
            paymentEdc: 0,
            actualCashInHand: s2Cash,
            cashDifference: 0,
            teraTestLiters: 5,
            notes: `Distribusi penjualan historis ${formatMonthYearId(targetMonth)} (Shift 2)`,
            createdAt: `${dateStr} 14:00`,
          });
        }
      } else {
        const rev = batchData.totalLitersSold * batchData.unitPrice;
        const profit = batchData.totalLitersSold * (batchData.unitPrice - batchData.buyPrice);
        newSalesForMonth.push({
          id: `sale-rekap-${targetMonth}`,
          transactionDate: endOfMonthDate,
          time: '19:30',
          shift: 'Rekap Bulanan (Closing Akhir Bulan)',
          operatorName: 'Admin / Closing Bulanan',
          productId: primaryProduct.id,
          productName: primaryProduct.name,
          meterAwal: batchData.meterAwal,
          meterAkhir: batchData.meterAkhir,
          literSold: batchData.totalLitersSold,
          unitPrice: batchData.unitPrice,
          buyPriceSnapshot: batchData.buyPrice,
          totalRevenue: rev,
          totalProfit: profit,
          paymentCash: batchData.cashPayment,
          paymentQris: batchData.nonCashPayment,
          paymentEdc: 0,
          actualCashInHand: batchData.cashPayment,
          cashDifference: 0,
          teraTestLiters: 5,
          notes: `Rekapitulasi total penjualan historis ${formatMonthYearId(targetMonth)} (${formatNumber(batchData.totalLitersSold)} L)`,
          createdAt: `${endOfMonthDate} 19:30`,
        });
      }

      allSales = [...newSalesForMonth, ...allSales];

      // 2. DO Pertamina
      if (batchData.totalDOLiters > 0) {
        allPurchases.unshift({
          id: `po-rekap-${targetMonth}`,
          poNumber: `DO-REKAP-${targetMonth.replace('-', '')}`,
          doPertaminaNumber: `DO/PTM/${targetMonth.replace('-', '')}/001`,
          soPertaminaNumber: `SO-PTM-${targetMonth.replace('-', '')}`,
          orderDate: `${targetMonth}-05`,
          estimatedDeliveryDate: `${targetMonth}-05`,
          actualDeliveryDate: `${targetMonth}-05`,
          productId: primaryProduct.id,
          productName: primaryProduct.name,
          volumeLiters: batchData.totalDOLiters,
          volumeKL: Math.max(1, Math.min(5, Math.round(batchData.totalDOLiters / 1000))) as OrderVolumePecahan,
          buyPricePerLiter: batchData.buyPrice,
          totalAmount: batchData.doAmount || (batchData.totalDOLiters * batchData.buyPrice),
          supplyDepot: batchData.tbbmDepot || 'TBBM Rewulu / Boyolali',
          truckPlateNumber: 'AD 8492 FB',
          driverName: 'Pak Joko Santoso',
          status: 'SELESAI',
          actualLitersReceived: batchData.totalDOLiters,
          effectiveStockAdded: batchData.totalDOLiters,
          varianceLiters: 0,
          notes: `Rekap pasokan DO Pertamina bulan ${formatMonthYearId(targetMonth)} (${formatNumber(batchData.totalDOLiters)} L)`,
          createdAt: `${targetMonth}-05 10:00`,
          completedAt: `${targetMonth}-05 14:00`,
        });
      }

      // 3. Expenses (Gaji akhir bulan maks 20:00, token, pdam, dll)
      const exp = batchData.expenses;
      if (exp.gajiOperator > 0) {
        allExpenses.unshift({
          id: `exp-salary-hist-${targetMonth}`,
          date: endOfMonthDate,
          time: '20:00',
          category: 'GAJI_OPERATOR',
          title: `Pembayaran Gaji Akhir Bulan: Operator (${formatMonthYearId(targetMonth)})`,
          amount: exp.gajiOperator,
          quantity: daysInMonth,
          unitRate: Math.round(exp.gajiOperator / daysInMonth),
          personOrVendor: 'Operator Pertashop',
          paymentSource: 'REKENING_BANK',
          notes: `Pengeluaran gaji pasti dilakukan pada akhir bulan (${endOfMonthDate}), cut-off maksimal pukul 20:00 WIB. Rekap gaji historis ${formatMonthYearId(targetMonth)}.`,
          createdAt: `${endOfMonthDate} 20:00`,
        });
      }

      if (exp.tokenListrik > 0) {
        allExpenses.unshift({
          id: `exp-pln-hist-${targetMonth}`,
          date: `${targetMonth}-10`,
          time: '10:00',
          category: 'TOKEN_LISTRIK',
          title: `Beli Token Listrik PLN (${formatMonthYearId(targetMonth)})`,
          amount: exp.tokenListrik,
          personOrVendor: 'PLN Prabayar',
          paymentSource: 'KAS_HARIAN',
          notes: `Rekap beban listrik ${formatMonthYearId(targetMonth)}`,
          createdAt: `${targetMonth}-10 10:00`,
        });
      }

      if (exp.pdam > 0) {
        allExpenses.unshift({
          id: `exp-pdam-hist-${targetMonth}`,
          date: `${targetMonth}-15`,
          time: '11:00',
          category: 'PDAM',
          title: `Tagihan Air PDAM (${formatMonthYearId(targetMonth)})`,
          amount: exp.pdam,
          personOrVendor: 'PDAM Tirta',
          paymentSource: 'KAS_HARIAN',
          notes: `Rekap beban air ${formatMonthYearId(targetMonth)}`,
          createdAt: `${targetMonth}-15 11:00`,
        });
      }

      if (exp.maintenance > 0) {
        allExpenses.unshift({
          id: `exp-maint-hist-${targetMonth}`,
          date: `${targetMonth}-20`,
          time: '14:00',
          category: 'MAINTENANCE_ALAT',
          title: `Maintenance & Servis Alat (${formatMonthYearId(targetMonth)})`,
          amount: exp.maintenance,
          personOrVendor: 'Teknisi Dispenser',
          paymentSource: 'KAS_HARIAN',
          notes: `Rekap beban servis ${formatMonthYearId(targetMonth)}`,
          createdAt: `${targetMonth}-20 14:00`,
        });
      }

      const monthLossLiters = (exp.lossesLiters && exp.lossesLiters > 0)
        ? exp.lossesLiters
        : (exp.lossesMinyak > 0 && batchData.buyPrice > 0 ? parseFloat((exp.lossesMinyak / batchData.buyPrice).toFixed(1)) : 0);
      const monthLossAmount = exp.lossesMinyak > 0
        ? exp.lossesMinyak
        : Math.round(monthLossLiters * batchData.buyPrice);

      if (monthLossAmount > 0 || monthLossLiters > 0) {
        allExpenses.unshift({
          id: `exp-loss-hist-${targetMonth}`,
          date: endOfMonthDate,
          time: '18:00',
          category: 'LOSSES_MINYAK',
          title: `Beban Losses / Susut Minyak Tangki (${formatMonthYearId(targetMonth)})`,
          amount: monthLossAmount,
          quantity: monthLossLiters,
          unitRate: batchData.buyPrice,
          fuelLossLiters: monthLossLiters,
          fuelLossBuyPriceSnapshot: batchData.buyPrice,
          personOrVendor: 'Susut Tangki & Tera',
          paymentSource: 'KAS_HARIAN',
          notes: `Rekap susut fisik BBM ${formatMonthYearId(targetMonth)} (-${monthLossLiters} L). Otomatis mengurangi stok tangki sistem.`,
          createdAt: `${endOfMonthDate} 18:00`,
        });
      }

      if (exp.dividenOwner > 0) {
        allExpenses.unshift({
          id: `exp-prive-hist-${targetMonth}`,
          date: endOfMonthDate,
          time: '19:00',
          category: 'DIVIDEN_OWNER',
          title: `Dividen / Prive Pemilik (${formatMonthYearId(targetMonth)})`,
          amount: exp.dividenOwner,
          personOrVendor: 'Owner Pertashop',
          paymentSource: 'REKENING_BANK',
          notes: `Rekap dividen/bagi hasil ${formatMonthYearId(targetMonth)}`,
          createdAt: `${endOfMonthDate} 19:00`,
        });
      }

      if (exp.lainnya > 0) {
        allExpenses.unshift({
          id: `exp-other-hist-${targetMonth}`,
          date: endOfMonthDate,
          time: '17:00',
          category: 'LAINNYA',
          title: `Pengeluaran Operasional Lainnya (${formatMonthYearId(targetMonth)})`,
          amount: exp.lainnya,
          paymentSource: 'KAS_HARIAN',
          notes: exp.notes || `Beban lain-lain ${formatMonthYearId(targetMonth)}`,
          createdAt: `${endOfMonthDate} 17:00`,
        });
      }

      // 4. Payroll Slips
      if (exp.gajiOperator > 0) {
        const activeEmps = employees.filter((e) => e.isActive);
        const splitAmount = Math.round(exp.gajiOperator / (activeEmps.length || 1));

        activeEmps.forEach((emp, idx) => {
          // Jangan timpa slip yang sudah DIBAYAR untuk karyawan & bulan ini (lihat isPayrollLocked).
          // Tanpa pengecekan ini, dua objek dengan id yang sama bisa berakhir di array yang sama.
          if (allPayrolls.some((p) => p.month === targetMonth && p.employeeId === emp.id && isPayrollLocked(p))) {
            return;
          }
          allPayrolls.unshift({
            id: `pay-hist-${targetMonth}-${emp.id}`,
            payrollNumber: `SLIP-${targetMonth.replace('-', '')}-${String(idx + 1).padStart(3, '0')}`,
            month: targetMonth,
            employeeId: emp.id,
            employeeName: emp.name,
            employeeRole: emp.role,
            periodStartDate: `${targetMonth}-01`,
            periodEndDate: endOfMonthDate,
            totalHadir: daysInMonth,
            totalLemburShifts: 0,
            totalIzin: 0,
            totalSakit: 0,
            totalAlpa: 0,
            dailyRate: emp.dailyRate,
            basicSalary: splitAmount,
            overtimeRate: emp.overtimeRate,
            overtimePay: 0,
            bonusAllowance: 0,
            kasbonDeduction: 0,
            penaltyDeduction: 0,
            otherDeductions: 0,
            grossSalary: splitAmount,
            totalDeductions: 0,
            netSalary: splitAmount,
            paymentStatus: 'DIBAYAR',
            paymentDate: endOfMonthDate,
            paymentSource: 'REKENING_BANK',
            notes: `Gaji historis periode ${formatMonthYearId(targetMonth)} (Lunas akhir bulan cut-off 20:00 WIB)`,
            createdAt: `${endOfMonthDate} 20:00`,
          });
        });
      }

      // 5. Attendance
      if (batchData.distributionMode === 'AUTO_DISTRIBUTE') {
        const syncResult = syncSalesToAttendance(newSalesForMonth, allAttendance, employees);
        allAttendance = syncResult.updatedAttendance;
      }

      // 6. Tank change (Pasokan DO masuk, Penjualan keluar, Losses/susut fisik keluar)
      const mode = batchData.tankSyncMode || (batchData.syncTankStock ? 'FULL_MUTATION' : 'NONE');
      if (mode === 'FULL_MUTATION') {
        netTankStockChange += (batchData.totalDOLiters - batchData.totalLitersSold - monthLossLiters);
      } else if (mode === 'LOSSES_ONLY') {
        netTankStockChange -= monthLossLiters;
      }

      // 7. Price History
      const existingHist = allPriceHistory.find((h) => h.effectiveDate.startsWith(targetMonth));
      if (!existingHist) {
        allPriceHistory.unshift({
          id: `price-hist-${targetMonth}`,
          productId: primaryProduct.id,
          effectiveDate: `${targetMonth}-01 00:00`,
          oldPrice: batchData.unitPrice,
          newPrice: batchData.unitPrice,
          oldBuyPrice: batchData.buyPrice,
          newBuyPrice: batchData.buyPrice,
          marginPerLiter: batchData.unitPrice - batchData.buyPrice,
          referenceDoc: 'Rekap Historis Bulanan',
          notes: `Tarif historis ${formatMonthYearId(targetMonth)}`,
          updatedBy: 'Admin Pertashop',
          updatedAt: `${getTodayDateString()} ${getCurrentTimeString()}`,
        });
      }
    });

    // Sort All Sales
    allSales.sort(
      (a, b) => b.transactionDate.localeCompare(a.transactionDate) || (b.time || '').localeCompare(a.time || '')
    );
    setSales(allSales);
    StorageService.setSales(allSales);

    // Save Purchases
    setPurchases(allPurchases);
    StorageService.setPurchases(allPurchases);

    // Save Expenses
    setExpenses(allExpenses);
    StorageService.setExpenses(allExpenses);

    // Save Payrolls
    setPayrolls(allPayrolls);
    StorageService.setPayrolls(allPayrolls);

    // Save Attendance
    setAttendance(allAttendance);
    StorageService.setAttendance(allAttendance);

    // Save Price History
    setPriceHistory(allPriceHistory);
    StorageService.setPriceHistory(allPriceHistory);

    // Update Tank if net change exists
    if (netTankStockChange !== 0) {
      setTank((prev) => {
        const nextStock = Math.min(prev.totalCapacityLiters, Math.max(0, prev.currentStockLiters + netTankStockChange));
        const updated = { ...prev, currentStockLiters: nextStock };
        StorageService.setTankConfig(updated);
        return updated;
      });
    }
    return skippedMonths;
  };

  const handleSaveMonthlyBatch = (batchData: MonthlyBatchPayload) => {
    const skippedMonths = processMonthlyBatches([batchData]);
    if (skippedMonths.length > 0) {
      setConfirmConfig({
        isOpen: true,
        title: 'Bulan Ini Sudah Memiliki Data',
        message: `Rekap untuk ${formatMonthYearId(batchData.targetMonth)} DIBATALKAN karena bulan ini sudah memiliki data penjualan/DO (dari input manual, impor, atau rekap sebelumnya). Centang "Ganti Data Bulan Ini" bila Anda memang ingin menimpa data lama, lalu coba lagi.`,
        confirmLabel: 'Mengerti',
        cancelLabel: '',
        isDestructive: true,
        onConfirm: () => {},
      });
      return;
    }
    const lossLit = (batchData.expenses.lossesLiters && batchData.expenses.lossesLiters > 0)
      ? batchData.expenses.lossesLiters
      : (batchData.expenses.lossesMinyak > 0 && batchData.buyPrice > 0 ? parseFloat((batchData.expenses.lossesMinyak / batchData.buyPrice).toFixed(1)) : 0);
    const lossNote = lossLit > 0 ? `, pemotongan susut stok tangki (-${formatNumber(lossLit, 1)} L)` : '';

    const syncMode = batchData.tankSyncMode || (batchData.syncTankStock ? 'FULL_MUTATION' : 'NONE');
    let tankNote = '';
    if (syncMode === 'LOSSES_ONLY' && lossLit > 0) {
      const zeroHint = tank.currentStockLiters === 0
        ? ' (Catatan: Saldo tangki Anda saat ini 0 L. Lakukan sounding/isi saldo awal tangki agar pengurangan losses terlihat riil).'
        : '';
      tankNote = ` Stok tangki dipotong sebesar losses (-${formatNumber(lossLit, 1)} L).${zeroHint}`;
    } else if (syncMode === 'FULL_MUTATION') {
      const net = batchData.totalDOLiters - batchData.totalLitersSold - lossLit;
      tankNote = ` Mutasi stok tangki: ${net >= 0 ? '+' : ''}${formatNumber(net, 1)} L.`;
    }

    setConfirmConfig({
      isOpen: true,
      title: 'Rekap Bulanan Historis Berhasil Disimpan',
      message: `Data pembukuan periode ${formatMonthYearId(batchData.targetMonth)} (penjualan ${formatNumber(batchData.totalLitersSold)} L, pasokan DO, pengeluaran gaji akhir bulan, biaya operasional${lossNote}) berhasil disimpan dan stok tangki telah disinkronkan.${tankNote}`,
      confirmLabel: 'Selesai',
      cancelLabel: 'Tutup',
      isDestructive: false,
      onConfirm: () => {},
    });
  };

  const handleSaveMultiMonthBatches = (batches: MonthlyBatchPayload[]) => {
    const skippedMonths = processMonthlyBatches(batches);
    const skippedNote =
      skippedMonths.length > 0
        ? ` ${skippedMonths.length} periode DILEWATI karena sudah memiliki data (${skippedMonths.map(formatMonthYearId).join(', ')}) - centang "Ganti Data Bulan Ini" pada periode tsb bila ingin menimpanya.`
        : '';
    const totalLossLit = batches.reduce((acc, b) => {
      const l = (b.expenses.lossesLiters && b.expenses.lossesLiters > 0)
        ? b.expenses.lossesLiters
        : (b.expenses.lossesMinyak > 0 && b.buyPrice > 0 ? parseFloat((b.expenses.lossesMinyak / b.buyPrice).toFixed(1)) : 0);
      return acc + l;
    }, 0);
    const lossNote = totalLossLit > 0 ? ` Total losses tangki ${formatNumber(totalLossLit, 1)} L telah berhasil memotong stok tangki.` : '';

    setConfirmConfig({
      isOpen: true,
      title: 'Import Multi-Bulan Berhasil',
      message: `Berhasil mengimpor rekapitulasi data historis untuk ${batches.length - skippedMonths.length} dari ${batches.length} periode bulan yang diminta (termasuk DO Pertamina, penjualan nozzle, beban opEx, dan gaji akhir bulan).${lossNote}${skippedNote}`,
      confirmLabel: 'Selesai',
      cancelLabel: 'Tutup',
      isDestructive: false,
      onConfirm: () => {},
    });
  };

  const handleUpdateProductPrice = (priceData: {
    productId: string;
    newPrice: number;
    newBuyPrice: number;
    effectiveDate: string;
    referenceDoc?: string;
    notes?: string;
    autoUpdateMonthSales?: boolean;
    syncScope?: 'FROM_EFFECTIVE_DATE' | 'FULL_MONTH' | 'NONE';
  }) => {
    const targetProduct = products.find((p) => p.id === priceData.productId);
    if (!targetProduct) return;

    const oldPrice = targetProduct.currentPrice;
    const oldBuyPrice = targetProduct.buyPrice;
    const newMargin = priceData.newPrice - priceData.newBuyPrice;
    const targetMonth = priceData.effectiveDate.substring(0, 7);
    const effectiveDateOnly = priceData.effectiveDate.substring(0, 10);
    const syncScope = priceData.syncScope || (priceData.autoUpdateMonthSales === false ? 'NONE' : 'FROM_EFFECTIVE_DATE');

    // 1. Update Product Master - HANYA bila tanggal efektif ini adalah yang PALING BARU di antara
    // seluruh histori harga produk. Mengoreksi tarif bulan LAMA (tanggal efektif mundur) tidak
    // boleh menimpa harga resmi yang sedang berlaku sekarang dengan angka historis tersebut.
    const latestExistingDate = priceHistory
      .filter((h) => h.productId === priceData.productId && h.effectiveDate.substring(0, 10) !== effectiveDateOnly)
      .reduce((latest, h) => (h.effectiveDate > latest ? h.effectiveDate : latest), '');
    const isLatestPrice = !latestExistingDate || priceData.effectiveDate >= latestExistingDate;

    if (isLatestPrice) {
      const updatedProducts = products.map((p) => {
        if (p.id === priceData.productId) {
          return {
            ...p,
            currentPrice: priceData.newPrice,
            buyPrice: priceData.newBuyPrice,
            marginPerLiter: newMargin,
          };
        }
        return p;
      });
      setProducts(updatedProducts);
      StorageService.setProducts(updatedProducts);
    }

    // 2. Add / Update Price History (by exact date to preserve early-month and mid-month entries)
    const existingHistIdx = priceHistory.findIndex(
      (h) => h.productId === priceData.productId && h.effectiveDate.substring(0, 10) === effectiveDateOnly
    );

    const newHistoryEntry: PriceHistory = {
      id: existingHistIdx >= 0 ? priceHistory[existingHistIdx].id : `price-hist-${Date.now()}`,
      productId: priceData.productId,
      effectiveDate: priceData.effectiveDate,
      oldPrice: existingHistIdx >= 0 ? priceHistory[existingHistIdx].oldPrice : oldPrice,
      newPrice: priceData.newPrice,
      oldBuyPrice: existingHistIdx >= 0 ? priceHistory[existingHistIdx].oldBuyPrice : oldBuyPrice,
      newBuyPrice: priceData.newBuyPrice,
      marginPerLiter: newMargin,
      referenceDoc: priceData.referenceDoc,
      notes: priceData.notes || `Penyesuaian tarif ${formatMonthYearId(targetMonth)} (${formatShortDate(effectiveDateOnly)})`,
      updatedBy: 'Admin Pertashop',
      updatedAt: `${getTodayDateString()} ${getCurrentTimeString()}`,
    };

    let updatedHistory: PriceHistory[];
    if (existingHistIdx >= 0) {
      updatedHistory = priceHistory.map((h, idx) => (idx === existingHistIdx ? newHistoryEntry : h));
    } else {
      updatedHistory = [newHistoryEntry, ...priceHistory];
    }
    // Urutkan histori dari tanggal paling baru
    updatedHistory.sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
    setPriceHistory(updatedHistory);
    StorageService.setPriceHistory(updatedHistory);

    // 3. Sinkronisasi penjualan & DO BBM sesuai cakupan (syncScope)
    if (syncScope !== 'NONE') {
      const isRecordEligible = (dateStr: string) => {
        if (!dateStr) return false;
        if (syncScope === 'FULL_MONTH') {
          return dateStr.startsWith(targetMonth);
        }
        // FROM_EFFECTIVE_DATE: hanya transaksi pada atau setelah tanggal efektif dalam bulan tersebut
        return dateStr >= effectiveDateOnly && dateStr.startsWith(targetMonth);
      };

      // Update penjualan yang memenuhi syarat
      const updatedSales = sales.map((sale) => {
        if (sale.productId === priceData.productId && isRecordEligible(sale.transactionDate)) {
          return recalculateSaleWithPrice(sale, priceData.newPrice, priceData.newBuyPrice);
        }
        return sale;
      });
      setSales(updatedSales);
      StorageService.setSales(updatedSales);

      // Sinkronisasi data absensi & penggajian jika ada perubahan
      const syncResult = syncSalesToAttendance(updatedSales, attendance, employees, targetMonth);
      setAttendance(syncResult.updatedAttendance);
      StorageService.setAttendance(syncResult.updatedAttendance);

      const updatedPayrolls = recalculateMonthlyPayrolls(syncResult.updatedAttendance, employees, payrolls, targetMonth);
      setPayrolls(updatedPayrolls);
      StorageService.setPayrolls(updatedPayrolls);

      // Update DO BBM (pembelian) yang memenuhi syarat
      const updatedPurchases = purchases.map((po) => {
        if (po.productId === priceData.productId && isRecordEligible(po.orderDate)) {
          return recalculatePurchaseWithPrice(po, priceData.newBuyPrice);
        }
        return po;
      });
      setPurchases(updatedPurchases);
      StorageService.setPurchases(updatedPurchases);

      // Update estimasi nilai kerugian BBM (losses minyak) & surplus gain BBM
      const updatedExpenses = expenses.map((exp) => {
        if (
          (exp.category === 'LOSSES_MINYAK' || exp.category === 'GAIN_MINYAK') &&
          isRecordEligible(exp.date) &&
          exp.fuelLossLiters
        ) {
          const recalculatedLossAmount = Math.round(exp.fuelLossLiters * priceData.newBuyPrice);
          return {
            ...exp,
            amount: recalculatedLossAmount,
            unitRate: priceData.newBuyPrice,
            fuelLossBuyPriceSnapshot: priceData.newBuyPrice,
            notes: `${exp.notes ? exp.notes + ' | ' : ''}Disesuaikan ke tarif tebus baru (${formatRupiah(priceData.newBuyPrice)}/L)`,
          };
        }
        return exp;
      });
      setExpenses(updatedExpenses);
      StorageService.setExpenses(updatedExpenses);
    }
  };

  // Helper fungsi untuk mencatat selisih loss atau gain BBM secara otomatis ke dalam pembukuan keuangan
  // Diekstrak ke src/utils/fuelVarianceSync.ts - dipakai bersama oleh 3 domain (Penjualan, DO,
  // Sounding), bukan khusus satu domain. deps dikumpulkan sekali di sini, dioper eksplisit di
  // setiap pemanggilan supaya tidak ada closure tersembunyi atas state App.tsx.
  const fuelVarianceDeps = { products, priceHistory, sales, setExpenses };

  const handleEditOrder = (order: PurchaseOrder) => {
    setEditingOrder(order);
    setSelectedOrderKL(order.volumeKL);
    setIsOrderModalOpen(true);
  };

  const handleSavePurchaseOrder = (poData: Omit<PurchaseOrder, 'id' | 'createdAt'>) => {
    setLastPurchaseOrderDate(poData.orderDate);
    StorageService.setLastPoDate(poData.orderDate);

    if (editingOrder) {
      const updated = purchases.map((p) =>
        p.id === editingOrder.id
          ? {
              ...editingOrder,
              ...poData,
              id: editingOrder.id,
              createdAt: editingOrder.createdAt,
              status: editingOrder.status,
            }
          : p
      );
      setPurchases(updated);

      // Sinkronisasi ulang beban selisih BBM jika DO yang diedit sudah SELESAI
      if (editingOrder.status === 'SELESAI' && editingOrder.varianceLiters !== undefined) {
        syncFuelVarianceToExpenses(fuelVarianceDeps, 
          editingOrder.id,
          'PENERIMAAN_DO',
          editingOrder.actualDeliveryDate || poData.orderDate,
          getCurrentTimeString(),
          editingOrder.varianceLiters,
          `Mobil Tangki Pertamina (${poData.truckPlateNumber || poData.supplyDepot || 'TBBM'})`,
          `Verifikasi bongkar DO ${poData.poNumber}. Supir: ${poData.driverName || '-'}. ${poData.notes || ''}`.trim(),
          poData.buyPricePerLiter
        );
      }

      setEditingOrder(null);
    } else {
      const newPO: PurchaseOrder = {
        ...poData,
        id: `po-${Date.now()}`,
        createdAt: `${getTodayDateString()} ${getCurrentTimeString()}`,
      };

      setPurchases([newPO, ...purchases]);
    }
  };

  const handleOpenReceiveModal = (order: PurchaseOrder) => {
    setActiveReceivingOrder(order);
    setIsReceiveModalOpen(true);
  };

  const handleCompleteReceiving = (
    orderId: string,
    receivingData: {
      actualDeliveryDate: string;
      soundingBeforeCm: number;
      soundingBeforeLiters: number;
      soundingAfterCm: number;
      soundingAfterLiters: number;
      actualLitersReceived: number;
      varianceLiters: number;
      density: number;
      temperature: number;
      notes?: string;
    }
  ) => {
    const targetOrder = purchases.find((p) => p.id === orderId);
    if (!targetOrder) return;

    const maxCapacity = tank.totalCapacityLiters;
    const isEditOfCompleted = targetOrder.status === 'SELESAI';

    let effectiveStockAdded: number;
    let safeResultingStock: number;

    if (isEditOfCompleted) {
      // KOREKSI data DO yang sudah SELESAI dibongkar: data "sounding sebelum bongkar" di form ini
      // sudah usang (banyak penjualan mungkin terjadi sesudahnya), jadi jangan jadikan dasar hitung.
      // Cukup terapkan SELISIH antara volume efektif lama vs baru ke stok tangki SAAT INI.
      const oldAdded = getDoAddedLiters(targetOrder);
      const stockWithoutThisDO = Math.max(0, tank.currentStockLiters - oldAdded);
      const availableSpace = Math.max(0, maxCapacity - stockWithoutThisDO);
      effectiveStockAdded = Math.min(availableSpace, Math.max(0, receivingData.actualLitersReceived));
      safeResultingStock = Math.min(maxCapacity, Math.max(0, tank.currentStockLiters + (effectiveStockAdded - oldAdded)));
    } else {
      // Penerimaan BARU: hitung dari sounding sebelum bongkar yang baru saja diukur fisik
      const stockBefore = receivingData.soundingBeforeLiters !== undefined
        ? receivingData.soundingBeforeLiters
        : tank.currentStockLiters;
      const availableSpace = Math.max(0, maxCapacity - stockBefore);
      effectiveStockAdded = Math.min(availableSpace, receivingData.actualLitersReceived);
      safeResultingStock = Math.min(maxCapacity, Math.max(0, stockBefore + effectiveStockAdded));
    }

    const updatedOrders = purchases.map((order) => {
      if (order.id === orderId) {
        return {
          ...order,
          ...receivingData,
          effectiveStockAdded,
          status: 'SELESAI' as const,
          completedAt: order.completedAt || `${getTodayDateString()} ${getCurrentTimeString()}`,
        };
      }
      return order;
    });
    setPurchases(updatedOrders);

    // Update fuel in tank stock (terlindungi agar volume tidak pernah jebol / stuck melebihi kapasitas)
    setTank((prev) => ({
      ...prev,
      currentStockLiters: safeResultingStock,
      // Tanda sounding fisik hanya diperbarui saat BONGKAR PERTAMA KALI (pengukuran nyata).
      // Mengoreksi data DO yang sudah selesai bukan sounding fisik baru.
      lastSoundingDate: isEditOfCompleted ? prev.lastSoundingDate : receivingData.actualDeliveryDate,
      lastSoundingLiters: isEditOfCompleted ? prev.lastSoundingLiters : safeResultingStock,
    }));

    // Otomatis sinkronisasi selisih volume DO (Loss / Gain) ke pembukuan beban operasional
    syncFuelVarianceToExpenses(fuelVarianceDeps, 
      orderId,
      'PENERIMAAN_DO',
      receivingData.actualDeliveryDate,
      getCurrentTimeString(),
      receivingData.varianceLiters,
      `Mobil Tangki Pertamina (${targetOrder.truckPlateNumber || targetOrder.supplyDepot || 'TBBM'})`,
      `Verifikasi bongkar DO ${targetOrder.poNumber}. Supir: ${targetOrder.driverName || '-'}. ${receivingData.notes || ''}`.trim(),
      targetOrder.buyPricePerLiter
    );
  };

  // Volume yang benar-benar ditambahkan ke tangki saat DO dibongkar
  const getDoAddedLiters = (order: PurchaseOrder): number => {
    if (order.effectiveStockAdded !== undefined) return order.effectiveStockAdded;
    if (order.soundingBeforeLiters !== undefined && order.soundingAfterLiters !== undefined) {
      return Math.max(0, order.soundingAfterLiters - order.soundingBeforeLiters);
    }
    return order.actualLitersReceived ?? order.volumeLiters ?? 0;
  };

  // Batalkan penerimaan DO & kembalikan stok fisik tangki pendam secara presisi
  const handleRevertReceiving = (orderId: string) => {
    const targetOrder = purchases.find((p) => p.id === orderId);
    if (!targetOrder || targetOrder.status !== 'SELESAI') return;

    // 1. Pulihkan stok tangki ke kondisi sebelum bongkar
    setTank((prev) => {
      // Kurangi HANYA volume yang dulu ditambahkan oleh DO ini. Jangan kembali ke angka sounding
      // sebelum bongkar, karena itu ikut menghapus semua penjualan yang terjadi setelah DO diterima.
      const revertedStock = Math.max(0, prev.currentStockLiters - getDoAddedLiters(targetOrder));
      return {
        ...prev,
        currentStockLiters: revertedStock,
      };
    });

    // 2. Kembalikan status DO ke DIPESAN dan bersihkan data penerimaan
    const updatedOrders = purchases.map((order) => {
      if (order.id === orderId) {
        return {
          ...order,
          status: 'DIPESAN' as const,
          actualDeliveryDate: undefined,
          soundingBeforeCm: undefined,
          soundingBeforeLiters: undefined,
          soundingAfterCm: undefined,
          soundingAfterLiters: undefined,
          actualLitersReceived: undefined,
          effectiveStockAdded: undefined,
          varianceLiters: undefined,
          density: undefined,
          temperature: undefined,
          completedAt: undefined,
        };
      }
      return order;
    });
    setPurchases(updatedOrders);

    // 3. Bersihkan biaya selisih BBM di pembukuan
    setExpenses((prev) => prev.filter((e) => e.sourceReferenceId !== orderId));
  };

  // Hapus catatan DO & otomatis rollback stok tangki jika sudah selesai dibongkar
  const handleDeletePurchaseOrder = (orderId: string) => {
    const targetOrder = purchases.find((p) => p.id === orderId);
    if (!targetOrder) return;

    // Jika DO sudah dibongkar ke tangki (SELESAI), pulihkan stok tangki agar tidak nyangkut/stuck!
    if (targetOrder.status === 'SELESAI') {
      setTank((prev) => {
        const revertedStock = Math.max(0, prev.currentStockLiters - getDoAddedLiters(targetOrder));
        return {
          ...prev,
          currentStockLiters: revertedStock,
        };
      });

      // Bersihkan pembukuan biaya selisih
      setExpenses((prev) => prev.filter((e) => e.sourceReferenceId !== orderId));
    }

    setPurchases((prev) => prev.filter((p) => p.id !== orderId));
  };

  const handleDirectAdjustTank = (newStockLiters: number) => {
    setTank((prev) => {
      const clamped = Math.min(prev.totalCapacityLiters, Math.max(0, newStockLiters));
      return {
        ...prev,
        currentStockLiters: clamped,
        lastSoundingLiters: clamped,
      };
    });
  };

  // Logika Sounding diekstrak ke hook terpisah - lihat catatan lengkap di
  // src/hooks/useSoundingLogic.ts (domain ketiga dari rekomendasi #7 untuk App.tsx).
  const {
    handleEditSounding,
    handleSaveSounding,
    handleDeleteSounding,
    handleDeleteMonthSoundings,
  } = useSoundingLogic({
    soundings,
    setSoundings,
    tank,
    setTank,
    sales,
    setSales,
    setExpenses,
    products,
    priceHistory,
    editingSounding,
    setEditingSounding,
    setIsSoundingModalOpen,
    setConfirmConfig,
  });

  const handleQuickOrder = (kl: OrderVolumePecahan = 2) => {
    setEditingOrder(null);
    setSelectedOrderKL(kl);
    setIsOrderModalOpen(true);
  };

  const handleSaveProfile = (newProfile: PertashopProfile, newTank: TankConfig) => {
    setProfile(newProfile);
    setTank(newTank);
  };

  const handleResetAllData = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Reset & Format Total Aplikasi ke Kondisi Baru',
      message:
        'PERHATIAN: Tindakan ini akan mengosongkan dan memformat total seluruh data transaksi (penjualan bulanan historis, penjualan harian, pemesanan DO BBM Pertamina, pengeluaran operasional, absensi, slip gaji, dan sounding tangki). Semua riwayat arsip dan penyimpanan lokal akan dibersihkan tuntas ke kondisi awal pabrik.\n\nApakah Anda yakin ingin memformat total aplikasi?',
      confirmLabel: 'Ya, Format & Reset Total',
      cancelLabel: 'Batal',
      isDestructive: true,
      onConfirm: () => {
        // 1. Bersihkan seluruh penyimpanan lokal browser & storage safeguards
        StorageService.resetToDefault();

        // 2. Kosongkan seluruh state memori React secara tuntas
        setSales([]);
        setPurchases([]);
        setExpenses([]);
        setSoundings([]);
        setAttendance([]);
        setPayrolls([]);
        const cleanTank: TankConfig = {
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
        setTank(cleanTank);
        StorageService.setTankConfig(cleanTank);

        // 3. Berikan notifikasi sukses bahwa aplikasi telah bersih terformat
        // PENTING (ditemukan lewat evaluasi fungsional langsung, bukan dugaan): halaman HARUS
        // dimuat ulang setelah reset, tidak boleh digantungkan ke tombol "Selesai" di bawah.
        // StorageService.resetToDefault() menulis ulang employees/profile/products/
        // priceHistory ke localStorage memakai nilai bawaan (INITIAL_EMPLOYEES dkk), tapi
        // state React untuk employees/profile/products/priceHistory di memori TIDAK ikut
        // disentuh (hanya sales/purchases/expenses/soundings/attendance/payrolls/tank yang
        // di-setState ulang di atas) - tanpa reload, layar terus menampilkan data LAMA (mis.
        // daftar karyawan custom pengguna) walau localStorage sudah berisi data bawaan, dan
        // risiko lebih jauh: efek simpan-otomatis di tempat lain bisa menimpa kembali seed
        // bawaan itu dengan data lama yang masih nyangkut di memori. onClose dialog ini
        // (dipicu tombol X, klik di luar, atau Escape) TERPISAH dari onConfirm dan TIDAK bisa
        // diandalkan untuk memicu reload - karena itu reload dijadwalkan di sini secara
        // tidak bersyarat, bukan digantungkan ke interaksi pengguna dengan dialog sukses.
        setTimeout(() => {
          setConfirmConfig({
            isOpen: true,
            title: 'Format Berhasil Dilakukan',
            message:
              'Aplikasi telah berhasil diformat bersih ke kondisi baru. Seluruh data penjualan bulanan, harian, DO Pertamina, dan pembukuan lainnya telah terhapus total tanpa sisa. Halaman akan dimuat ulang otomatis...',
            confirmLabel: 'Muat Ulang Sekarang',
            cancelLabel: '',
            isDestructive: false,
            onConfirm: () => window.location.reload(),
          });
        }, 100);
        // Reload tidak bersyarat sebagai jaring pengaman, terlepas dari bagaimana dialog
        // sukses di atas ditutup (tombol konfirmasi, X, klik di luar, atau Escape).
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      },
    });
  };

  const handleDeleteMonthData = (targetMonthStr: string) => {
    const monthName = formatMonthYear(targetMonthStr);

    setConfirmConfig({
      isOpen: true,
      title: `Format / Hapus Seluruh Data Bulan ${monthName}`,
      message: `Apakah Anda yakin ingin menghapus seluruh data penjualan (harian/bulanan), pemesanan DO, pengeluaran, absensi, dan slip gaji khusus untuk periode ${monthName}? Data bulan lainnya tetap aman.`,
      confirmLabel: `Ya, Hapus Data ${monthName}`,
      cancelLabel: 'Batal',
      isDestructive: true,
      onConfirm: () => {
        const remainingSales = sales.filter((s) => !s.transactionDate.startsWith(targetMonthStr));
        const remainingPurchases = purchases.filter(
          (p) => !(p.orderDate.startsWith(targetMonthStr) || (p.actualDeliveryDate && p.actualDeliveryDate.startsWith(targetMonthStr)))
        );
        const remainingExpenses = expenses.filter((e) => !e.date.startsWith(targetMonthStr));
        const remainingAttendance = attendance.filter((a) => !a.date.startsWith(targetMonthStr));
        const remainingPayrolls = payrolls.filter((p) => p.month !== targetMonthStr);

        setSales(remainingSales);
        StorageService.setSales(remainingSales);

        setPurchases(remainingPurchases);
        StorageService.setPurchases(remainingPurchases);

        setExpenses(remainingExpenses);
        StorageService.setExpenses(remainingExpenses);

        setAttendance(remainingAttendance);
        StorageService.setAttendance(remainingAttendance);

        setPayrolls(remainingPayrolls);
        StorageService.setPayrolls(remainingPayrolls);

        setTimeout(() => {
          setConfirmConfig({
            isOpen: true,
            title: 'Data Bulan Berhasil Dihapus',
            message: `Seluruh transaksi dan catatan untuk bulan ${monthName} telah berhasil diformat dan dibersihkan dari sistem.`,
            confirmLabel: 'Selesai',
            cancelLabel: '',
            isDestructive: false,
            onConfirm: () => {},
          });
        }, 100);
      },
    });
  };

  const handleRestoreSuccess = (restoredData: PertashopBackupData) => {
    setProfile(restoredData.profile);
    setProducts(restoredData.products);
    setTank(restoredData.tank);
    setPriceHistory(restoredData.priceHistory);
    setSales(restoredData.sales);
    setPurchases(restoredData.purchases);
    setSoundings(restoredData.soundings);
    setExpenses(restoredData.expenses);
    setEmployees(restoredData.employees);
    setAttendance(restoredData.attendance);
    setPayrolls(restoredData.payrolls);
  };

  // Expense Handlers
  // Logika Beban & Pengeluaran diekstrak ke hook terpisah - lihat catatan lengkap di
  // src/hooks/useExpenseLogic.ts (domain kedua dari rekomendasi #7 untuk App.tsx).
  const {
    handleOpenAddExpense,
    handleEditExpense,
    handleSaveExpense,
    handleDeleteExpense,
    handleDeleteExpensesByMonth,
  } = useExpenseLogic({
    expenses,
    setExpenses,
    setSoundings,
    setPurchases,
    editingExpense,
    setEditingExpense,
    setSelectedExpenseCategory,
    setIsExpenseModalOpen,
  });

  const handleOpenPrintSummaryModal = (mode: 'MONTHLY' | 'YEARLY', month: string, year: number) => {
    setSummaryPrintMode(mode);
    setSummaryPrintMonth(month);
    setSummaryPrintYear(year);
    setIsPrintSummaryModalOpen(true);
  };

  // Employee, Attendance & Payroll Handlers
  // Logika Karyawan/Absensi/Gaji diekstrak ke hook terpisah - lihat catatan lengkap di
  // src/hooks/useAttendancePayrollLogic.ts (langkah pertama rekomendasi #7 untuk App.tsx).
  const {
    handleSaveEmployee,
    handleDeleteEmployee,
    handleSaveAttendance,
    handleDeleteAttendance,
    handleSavePayroll,
    handleDeletePayroll,
    handlePaySalary,
    handleUnpaySalary,
  } = useAttendancePayrollLogic({ employees, setEmployees, attendance, setAttendance, payrolls, setPayrolls, expenses, setExpenses });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        profile={profile}
        tank={tank}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onOpenPrintReportModal={() => setIsPrintReportModalOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          profile={profile}
          products={products}
          tank={tank}
          activeTab={activeTab}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenPriceModal={() => setIsPriceModalOpen(true)}
          onOpenSalesModal={handleOpenAddSale}
          onOpenOrderModal={() => handleQuickOrder(2)}
          onOpenPrintReportModal={() => setIsPrintReportModalOpen(true)}
          onOpenExpenseModal={() => handleOpenAddExpense()}
        />

        {/* Main Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {storageAlert && (
            <div
              role="alert"
              className={`p-3.5 rounded-xl border text-xs sm:text-sm font-semibold flex items-start justify-between gap-3 ${
                storageAlert.level === 'error'
                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                  : 'bg-amber-50 border-amber-300 text-amber-800'
              }`}
            >
              <span>{storageAlert.message}</span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => StorageService.downloadBackupJSON(profile)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold"
                >
                  Unduh Backup
                </button>
                <button
                  type="button"
                  onClick={() => setStorageAlert(null)}
                  className="px-2 py-1.5 rounded-lg border border-current text-[11px] font-bold"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}
          {/* Automatic Stock Low Notification */}
          <OrderAlertBanner
            tank={tank}
            onQuickOrder={handleQuickOrder}
            avgDailySalesLiters={avgDailySalesLiters}
          />

          {/* Top Section: Stok Tangki Pertamax Terkini + KPI Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 flex flex-col">
              <StockTankGauge
                tank={tank}
                productName={primaryProduct.name}
                onOpenSoundingModal={() => {
                  setEditingSounding(null);
                  setIsSoundingModalOpen(true);
                }}
                onOpenOrderModal={(kl) => handleQuickOrder(kl || 2)}
              />
            </div>

            <div className="lg:col-span-6 flex flex-col">
              <StatsCards
                todaySales={todaySales}
                allSales={sales}
                tank={tank}
                currentUnitPrice={primaryProduct.currentPrice}
                currentMarginPerLiter={primaryProduct.marginPerLiter}
              />
            </div>
          </div>

          {/* Active Tab View */}
          {activeTab === 'sales' && (
            <SalesTable
              sales={sales}
              onDeleteSale={handleDeleteSale}
              onEditSale={handleEditSale}
              onOpenNewSaleModal={handleOpenAddSale}
              onOpenPrintReportModal={() => setIsPrintReportModalOpen(true)}
              onOpenImportModal={() => setIsImportSalesModalOpen(true)}
              onOpenBackupModal={() => setIsBackupModalOpen(true)}
              onOpenHistoricalBatchModal={() => setIsHistoricalBatchModalOpen(true)}
            />
          )}

          {activeTab === 'purchases' && (
            <PurchaseHistoryTable
              orders={purchases}
              tank={tank}
              onOpenNewOrderModal={() => handleQuickOrder(2)}
              onOpenReceiveModal={handleOpenReceiveModal}
              onEditOrder={handleEditOrder}
              onDeleteOrder={handleDeletePurchaseOrder}
              onRevertReceiving={handleRevertReceiving}
              onDirectAdjustTank={handleDirectAdjustTank}
              onOpenImportModal={() => setIsImportSalesModalOpen(true)}
            />
          )}

          {activeTab === 'soundings' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest block">
                    Pemeriksaan Fisik Tangki Pendam
                  </span>
                  <h3 className="text-base font-bold text-slate-800 tracking-tight mt-0.5">
                    Log Sounding Stick Celup & Uji Pasta Air
                  </h3>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {soundingMonths.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={soundingMonths.includes(soundingDeleteMonth) ? soundingDeleteMonth : soundingMonths[0]}
                        onChange={(e) => setSoundingDeleteMonth(e.target.value)}
                        className="px-2 py-2 border border-rose-200 rounded-lg text-xs font-semibold text-rose-700 bg-white"
                        title="Pilih bulan sounding yang akan dihapus"
                      >
                        {soundingMonths.map((m) => (
                          <option key={m} value={m}>
                            {formatMonthYearId(m)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteMonthSoundings(
                            soundingMonths.includes(soundingDeleteMonth) ? soundingDeleteMonth : soundingMonths[0]
                          )
                        }
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                        title="Hapus semua hasil sounding pada bulan terpilih"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Hapus Sounding Bulan Ini</span>
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSounding(null);
                      setIsSoundingModalOpen(true);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm shadow-blue-200 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Input Sounding Baru</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-5">Tanggal & Waktu</th>
                        <th className="py-3 px-4">Operator</th>
                        <th className="py-3 px-4 text-right">Tinggi Stick (cm)</th>
                        <th className="py-3 px-4 text-right">Hasil Sounding (Liter)</th>
                        <th className="py-3 px-4 text-right">Stok Buku Sistem</th>
                        <th className="py-3 px-4 text-right">Selisih (Loss/Gain)</th>
                        <th className="py-3 px-4 text-center">Uji Pasta Air</th>
                        <th className="py-3 px-4">Catatan</th>
                        <th className="py-3 px-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {soundings.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-500">
                            <Gauge className="w-9 h-9 mx-auto mb-2 text-slate-300 stroke-1" />
                            <div className="font-semibold text-slate-700 text-sm">Tidak Ada Catatan Sounding</div>
                            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                              Semua hasil sounding pada bulan Agustus telah berhasil dihapus. Klik tombol "+ Input Sounding Baru" untuk mencatat pemeriksaan fisik stok tangki pendam.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        soundings.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/70">
                            <td className="py-3 px-5 font-mono font-bold text-slate-800">
                              {s.date} {s.time}
                            </td>
                            <td className="py-3 px-4">{s.operatorName}</td>
                            <td className="py-3 px-4 text-right font-mono">{s.stickDipCm} cm</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-blue-600">
                              {s.calculatedLiters} L
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-600">
                              {s.systemStockLiters} L
                            </td>
                            <td
                              className={`py-3 px-4 text-right font-mono font-bold ${
                                s.varianceLiters === 0
                                  ? 'text-emerald-600'
                                  : s.varianceLiters > 0
                                  ? 'text-blue-600'
                                  : 'text-rose-600'
                              }`}
                            >
                              {s.varianceLiters > 0 ? `+${s.varianceLiters}` : s.varianceLiters} L
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {s.waterBottomCm === 0 ? '0 cm (Nihil)' : `${s.waterBottomCm} cm`}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-[11px]">{s.notes || '-'}</td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleEditSounding(s)}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit Catatan Sounding"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmConfig({
                                      isOpen: true,
                                      title: 'Hapus Catatan Sounding',
                                      message: `Apakah Anda yakin ingin menghapus catatan sounding tanggal ${s.date} pukul ${s.time} (Stick: ${s.stickDipCm} cm / ${s.calculatedLiters} L) oleh ${s.operatorName}?`,
                                      confirmLabel: 'Ya, Hapus',
                                      cancelLabel: 'Batal',
                                      isDestructive: true,
                                      onConfirm: () => handleDeleteSounding(s.id),
                                    });
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus Catatan"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <AttendancePayrollView
              employees={employees}
              attendance={attendance}
              payrolls={payrolls}
              profile={profile}
              sales={sales}
              onSaveEmployee={handleSaveEmployee}
              onDeleteEmployee={handleDeleteEmployee}
              onSaveAttendance={handleSaveAttendance}
              onDeleteAttendance={handleDeleteAttendance}
              onSavePayroll={handleSavePayroll}
              onDeletePayroll={handleDeletePayroll}
              onPaySalary={handlePaySalary}
              onUnpaySalary={handleUnpaySalary}
              onBatchSyncAttendance={(records, targetMonth) => {
                setAttendance(records);
                // Hitung ulang bulan yang sedang dipilih di layar; jika tidak diberikan,
                // hitung ulang semua bulan yang absensinya berubah.
                const months = targetMonth
                  ? [targetMonth]
                  : Array.from(
                      new Set(
                        records
                          .filter((r) => {
                            const old = attendance.find((a) => a.id === r.id);
                            return !old || JSON.stringify(old) !== JSON.stringify(r);
                          })
                          .map((r) => r.date.substring(0, 7))
                      )
                    );
                setPayrolls((prev) =>
                  months.reduce((acc, m) => recalculateMonthlyPayrolls(records, employees, acc, m), prev)
                );
              }}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesView
              expenses={expenses}
              onOpenAddExpense={handleOpenAddExpense}
              onEditExpense={handleEditExpense}
              onDeleteExpense={handleDeleteExpense}
              onDeleteExpensesByMonth={handleDeleteExpensesByMonth}
            />
          )}

          {activeTab === 'summary' && (
            <SummaryReportView
              sales={sales}
              purchases={purchases}
              expenses={expenses}
              products={products}
              profile={profile}
              onOpenPrintModal={handleOpenPrintSummaryModal}
              onOpenHistoricalBatchModal={() => setIsHistoricalBatchModalOpen(true)}
              onDeleteMonthData={handleDeleteMonthData}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView sales={sales} products={products} tank={tank} expenses={expenses} />
          )}
        </main>
      </div>

      {/* Modals */}
      <ImportSalesModal
        isOpen={isImportSalesModalOpen}
        onClose={() => setIsImportSalesModalOpen(false)}
        products={products}
        currentPrice={primaryProduct.currentPrice}
        currentBuyPrice={primaryProduct.buyPrice}
        tank={tank}
        onDirectAdjustTank={handleDirectAdjustTank}
        onImportSales={handleImportSales}
        onOpenHistoricalBatchModal={() => {
          setIsImportSalesModalOpen(false);
          setIsHistoricalBatchModalOpen(true);
        }}
      />

      <HistoricalMonthlyBatchModal
        isOpen={isHistoricalBatchModalOpen}
        onClose={() => setIsHistoricalBatchModalOpen(false)}
        products={products}
        employees={employees}
        existingSales={sales}
        tank={tank}
        onDirectAdjustTank={handleDirectAdjustTank}
        onSaveMonthlyBatch={handleSaveMonthlyBatch}
        onSaveMultiMonthBatches={handleSaveMultiMonthBatches}
      />

      <SalesEntryModal
        isOpen={isSalesModalOpen}
        onClose={() => {
          setIsSalesModalOpen(false);
          setEditingSale(null);
        }}
        products={products}
        priceHistory={priceHistory}
        sales={sales}
        employees={employees}
        lastInputtedDate={lastSalesInputDate}
        currentPrice={primaryProduct.currentPrice}
        currentBuyPrice={primaryProduct.buyPrice}
        currentStockLiters={tank.currentStockLiters}
        tankCapacity={tank.totalCapacityLiters}
        lastMeterReading={lastMeterReading}
        editingSale={editingSale}
        onSaveSale={handleSaveSale}
      />

      <PriceManagementModal
        isOpen={isPriceModalOpen}
        onClose={() => setIsPriceModalOpen(false)}
        products={products}
        priceHistory={priceHistory}
        sales={sales}
        purchases={purchases}
        onUpdateProductPrice={handleUpdateProductPrice}
      />

      <PurchaseOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => {
          setIsOrderModalOpen(false);
          setEditingOrder(null);
        }}
        products={products}
        priceHistory={priceHistory}
        sales={sales}
        purchases={purchases}
        lastInputtedOrderDate={lastPurchaseOrderDate}
        tank={tank}
        defaultKL={selectedOrderKL}
        tbbmDepot={profile.tbbmDepot}
        editingOrder={editingOrder}
        onSaveOrder={handleSavePurchaseOrder}
      />

      <ReceiveFuelModal
        isOpen={isReceiveModalOpen}
        onClose={() => {
          setIsReceiveModalOpen(false);
          setActiveReceivingOrder(null);
        }}
        order={activeReceivingOrder}
        tank={tank}
        onCompleteReceiving={handleCompleteReceiving}
        onRevertReceiving={handleRevertReceiving}
        onDeleteOrder={handleDeletePurchaseOrder}
      />

      <SoundingLogModal
        isOpen={isSoundingModalOpen}
        onClose={() => {
          setIsSoundingModalOpen(false);
          setEditingSounding(null);
        }}
        tank={tank}
        soundings={soundings}
        editingSounding={editingSounding}
        buyPrice={primaryProduct.buyPrice}
        onSaveSounding={handleSaveSounding}
        onDeleteSounding={handleDeleteSounding}
        onDeleteMonthSoundings={handleDeleteMonthSoundings}
      />

      <ExpenseEntryModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        initialCategory={selectedExpenseCategory}
        editingExpense={editingExpense}
        onSaveExpense={handleSaveExpense}
      />

      <PrintDailyReportModal
        isOpen={isPrintReportModalOpen}
        onClose={() => setIsPrintReportModalOpen(false)}
        profile={profile}
        products={products}
        sales={sales}
        purchases={purchases}
        tank={tank}
        expenses={expenses}
      />

      <PrintSummaryReportModal
        isOpen={isPrintSummaryModalOpen}
        onClose={() => setIsPrintSummaryModalOpen(false)}
        profile={profile}
        sales={sales}
        purchases={purchases}
        expenses={expenses}
        products={products}
        initialMode={summaryPrintMode}
        initialMonth={summaryPrintMonth}
        initialYear={summaryPrintYear}
      />

      <PertashopProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={profile}
        tank={tank}
        onSaveProfile={handleSaveProfile}
        onResetAllData={handleResetAllData}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
      />

      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        profile={profile}
        stats={{
          totalSales: sales.length,
          totalPurchases: purchases.length,
          totalSoundings: soundings.length,
          totalExpenses: expenses.length,
          totalEmployees: employees.length,
          totalAttendance: attendance.length,
          totalPayrolls: payrolls.length,
        }}
        onRestoreSuccess={handleRestoreSuccess}
      />

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmLabel={confirmConfig.confirmLabel}
        cancelLabel={confirmConfig.cancelLabel}
        isDestructive={confirmConfig.isDestructive}
        onConfirm={confirmConfig.onConfirm}
        onClose={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

