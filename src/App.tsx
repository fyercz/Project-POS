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
import { AttendancePayrollView } from './components/AttendancePayrollView';
import { ConfirmModal } from './components/ConfirmModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { StorageService } from './utils/storage';
import { syncSalesToAttendance, recalculateMonthlyPayrolls } from './utils/attendanceSync';
import { recalculateSaleWithPrice, recalculatePurchaseWithPrice, formatMonthYearId, getEffectivePriceForDate } from './utils/pricing';
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
import { getTodayDateString, getCurrentTimeString, getShiftCategory, getShiftHoursInfo, STANDARD_SHIFTS, formatRupiah, formatNumber, formatShortDate } from './utils/formatters';
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

  // Summary Report Modal State
  const [isPrintSummaryModalOpen, setIsPrintSummaryModalOpen] = useState<boolean>(false);
  const [summaryPrintMode, setSummaryPrintMode] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [summaryPrintMonth, setSummaryPrintMonth] = useState<string>('2026-08');
  const [summaryPrintYear, setSummaryPrintYear] = useState<number>(2026);

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
    // Safety check: if state is empty, ensure we don't accidentally overwrite non-empty storage
    if (sales.length === 0) {
      const stored = StorageService.getSales();
      if (stored && stored.length > 0) {
        setSales(stored);
        return;
      }
    }
    StorageService.setSales(sales);
  }, [sales]);

  useEffect(() => {
    if (purchases.length === 0) {
      const stored = StorageService.getPurchases();
      if (stored && stored.length > 0) {
        setPurchases(stored);
        return;
      }
    }
    StorageService.setPurchases(purchases);
  }, [purchases]);

  useEffect(() => {
    if (soundings.length === 0) {
      const stored = StorageService.getSoundings();
      if (stored && stored.length > 0) {
        setSoundings(stored);
        return;
      }
    }
    StorageService.setSoundings(soundings);
  }, [soundings]);

  useEffect(() => {
    if (expenses.length === 0) {
      const stored = StorageService.getExpenses();
      if (stored && stored.length > 0) {
        setExpenses(stored);
        return;
      }
    }
    StorageService.setExpenses(expenses);
  }, [expenses]);

  useEffect(() => {
    if (employees.length === 0) {
      const stored = StorageService.getEmployees();
      if (stored && stored.length > 0) {
        setEmployees(stored);
        return;
      }
    }
    StorageService.setEmployees(employees);
  }, [employees]);

  useEffect(() => {
    StorageService.setAttendance(attendance);
  }, [attendance]);

  useEffect(() => {
    StorageService.setPayrolls(payrolls);
  }, [payrolls]);

  // Otomatis sinkronkan riwayat sounding & DO yang memiliki selisih ke pembukuan jika belum tercatat
  useEffect(() => {
    let hasChanges = false;
    const reconciled = [...expenses];

    soundings.forEach((snd) => {
      if (Math.abs(snd.varianceLiters) > 0.001) {
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
      if (po.status === 'SELESAI' && po.varianceLiters && Math.abs(po.varianceLiters) > 0.001) {
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

  // Primary product (Pertamax 92)
  const primaryProduct = products.find((p) => p.id === 'prod-pertamax-92') || products[0];


  // Daily Calculations
  const todayStr = getTodayDateString();
  const todaySales = sales.filter((s) => s.transactionDate === todayStr);

  const totalVolumeAll = sales.reduce((acc, s) => acc + s.literSold, 0);
  const uniqueDatesCount = Array.from(new Set(sales.map((s) => s.transactionDate))).length || 1;
  const avgDailySalesLiters = totalVolumeAll / uniqueDatesCount;

  // Last meter reading
  const lastSaleWithMeter = [...sales].reverse().find((s) => s.meterAkhir !== undefined);
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

  const handleSaveSale = (saleData: Omit<SaleRecord, 'id' | 'createdAt'>) => {
    // Safety check: Prevent duplicate shift or conflict on the same date
    const targetCat = getShiftCategory(saleData.shift);
    const hasConflict = sales.some((s) => {
      if (editingSale && s.id === editingSale.id) return false;
      if (s.transactionDate !== saleData.transactionDate) return false;
      const sCat = getShiftCategory(s.shift);
      if (sCat === targetCat) return true;
      if (sCat === 'fullday' || targetCat === 'fullday') return true;
      return false;
    });

    if (hasConflict) {
      console.warn(`[Rules] Shift '${saleData.shift}' sudah terisi pada ${saleData.transactionDate}. Simpan dibatalkan.`);
      return;
    }

    // Safety check: Prevent duplicate operator on the same date
    const targetOperator = saleData.operatorName.trim().toLowerCase();
    const hasOperatorConflict = sales.some((s) => {
      if (editingSale && s.id === editingSale.id) return false;
      if (s.transactionDate !== saleData.transactionDate) return false;
      return s.operatorName.trim().toLowerCase() === targetOperator;
    });

    if (hasOperatorConflict) {
      console.warn(`[Rules] Operator '${saleData.operatorName}' sudah bertugas pada ${saleData.transactionDate}. Simpan dibatalkan.`);
      return;
    }

    if (editingSale) {
      const diffLiters = saleData.literSold - editingSale.literSold;
      const updatedSales = sales.map((s) =>
        s.id === editingSale.id
          ? { ...saleData, id: editingSale.id, createdAt: editingSale.createdAt }
          : s
      );
      setSales(updatedSales);

      // Adjust stock with difference or sounding
      setTank((prev) => {
        const nextStock = saleData.hasSounding && saleData.syncToSoundingLog && saleData.soundingCalculatedLiters !== undefined
          ? saleData.soundingCalculatedLiters
          : Math.max(0, Math.min(prev.totalCapacityLiters, prev.currentStockLiters - diffLiters));

        return {
          ...prev,
          currentStockLiters: nextStock,
          lastSoundingDate: saleData.hasSounding ? saleData.transactionDate : prev.lastSoundingDate,
          lastSoundingLiters: saleData.hasSounding && saleData.soundingCalculatedLiters !== undefined ? saleData.soundingCalculatedLiters : prev.lastSoundingLiters,
        };
      });
      setEditingSale(null);
    } else {
      const newSale: SaleRecord = {
        ...saleData,
        id: `sale-${Date.now()}`,
        createdAt: `${getTodayDateString()} ${getCurrentTimeString()}`,
      };

      const updatedSales = [newSale, ...sales];
      setSales(updatedSales);
      setLastSalesInputDate(saleData.transactionDate);
      StorageService.setLastSalesDate(saleData.transactionDate);

      // Auto deduct stock from tank or sync to physical sounding
      const theoreticalStock = Math.max(0, tank.currentStockLiters - saleData.literSold);
      const finalStock = (saleData.hasSounding && saleData.syncToSoundingLog && saleData.soundingCalculatedLiters !== undefined)
        ? saleData.soundingCalculatedLiters
        : theoreticalStock;

      setTank((prev) => ({
        ...prev,
        currentStockLiters: finalStock,
        lastSoundingDate: saleData.hasSounding ? saleData.transactionDate : prev.lastSoundingDate,
        lastSoundingLiters: saleData.hasSounding && saleData.soundingCalculatedLiters !== undefined ? saleData.soundingCalculatedLiters : prev.lastSoundingLiters,
      }));

      // If sounding was recorded, add to sounding history and auto sync to bookkeeping
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

        // Otomatis catat selisih loss atau gain BBM ke dalam pembukuan keuangan
        syncFuelVarianceToExpenses(
          sndId,
          'CLOSING_SHIFT',
          saleData.transactionDate,
          saleData.time,
          sVariance,
          `Sounding Shift (${saleData.operatorName})`,
          `Sounding closing ${saleData.shift} (Fisik ${saleData.soundingCalculatedLiters} L vs Sistem ${saleData.soundingTheoreticalLiters ?? theoreticalStock} L)`
        );
      }
    }

    // SINKRONISASI OTOMATIS KE ABSENSI KARYAWAN (Baik saat Catat Baru maupun Edit)
    if (saleData.syncToAttendance !== false) {
      const opNameClean = saleData.operatorName.trim();
      const matchedEmp = employees.find(
        (e) => e.name.toLowerCase() === opNameClean.toLowerCase() ||
               opNameClean.toLowerCase().includes(e.name.toLowerCase()) ||
               e.name.toLowerCase().includes(opNameClean.toLowerCase())
      );

      if (matchedEmp) {
        const existingAtt = attendance.find(
          (a) => a.employeeId === matchedEmp.id && a.date === saleData.transactionDate
        );

        const shiftInfo = getShiftHoursInfo(saleData.shift);
        const isExplicitLembur =
          saleData.shift.toLowerCase().includes('lembur') ||
          (saleData.notes || '').toLowerCase().includes('lembur') ||
          shiftInfo.isFull;

        if (existingAtt) {
          const isExistingShift1 = existingAtt.shift.includes('Shift 1') || existingAtt.checkInTime === '05:30';
          const isExistingShift2 = existingAtt.shift.includes('Shift 2') || existingAtt.checkInTime === '13:30';
          const isMultiShift =
            (isExistingShift1 && shiftInfo.isShift2) ||
            (isExistingShift2 && shiftInfo.isShift1) ||
            isExplicitLembur ||
            (existingAtt.shift !== shiftInfo.shiftName && !existingAtt.shift.includes('Full'));

          const updatedAtt: AttendanceRecord = {
            ...existingAtt,
            status: isMultiShift ? 'LEMBUR' : existingAtt.status,
            overtimeShifts: isMultiShift ? Math.max(1, (existingAtt.overtimeShifts || 0) + 1) : existingAtt.overtimeShifts,
            shift: isMultiShift ? STANDARD_SHIFTS.FULL_SHIFT.name : shiftInfo.shiftName,
            checkInTime: isMultiShift ? '05:30' : shiftInfo.checkIn,
            checkOutTime: isMultiShift ? '19:30' : shiftInfo.checkOut,
            notes: `${existingAtt.notes || ''} | Catatan Penjualan: ${saleData.literSold} L (${saleData.shift})`.trim(),
          };
          setAttendance((prev) => prev.map((a) => (a.id === existingAtt.id ? updatedAtt : a)));
        } else {
          // Create new attendance record with perfectly synchronized hours
          const newAtt: AttendanceRecord = {
            id: `att-sale-${Date.now()}`,
            employeeId: matchedEmp.id,
            employeeName: matchedEmp.name,
            date: saleData.transactionDate,
            shift: isExplicitLembur ? STANDARD_SHIFTS.FULL_SHIFT.name : shiftInfo.shiftName,
            status: isExplicitLembur ? 'LEMBUR' : 'HADIR',
            checkInTime: isExplicitLembur ? '05:30' : shiftInfo.checkIn,
            checkOutTime: isExplicitLembur ? '19:30' : shiftInfo.checkOut,
            overtimeShifts: isExplicitLembur ? 1 : 0,
            notes: `Otomatis sinkron dari penjualan shift (${saleData.literSold} L). ${saleData.notes || ''}`.trim(),
            createdAt: `${saleData.transactionDate} ${saleData.time || shiftInfo.closingTime}`,
          };
          setAttendance((prev) => [newAtt, ...prev]);
        }
      }
    }

    // Auto-sync price history if this month doesn't have an explicit entry yet
    if (saleData.unitPrice > 0) {
      const saleMonth = saleData.transactionDate.substring(0, 7);
      const existingHist = priceHistory.find(
        (h) => h.productId === saleData.productId && h.effectiveDate.startsWith(saleMonth)
      );
      if (!existingHist) {
        const prod = products.find((p) => p.id === saleData.productId) || primaryProduct;
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
  };

  const handleImportSales = (
    importedSales: SaleRecord[],
    mode: 'append' | 'replace',
    syncStock: boolean
  ) => {
    let updatedSales: SaleRecord[];
    if (mode === 'replace') {
      updatedSales = importedSales;
    } else {
      // Append imported sales
      updatedSales = [...importedSales, ...sales];
    }
    setSales(updatedSales);

    if (syncStock) {
      const totalImportLiters = importedSales.reduce((acc, s) => acc + s.literSold, 0);
      setTank((prev) => ({
        ...prev,
        currentStockLiters: Math.max(0, prev.currentStockLiters - totalImportLiters),
      }));
    }
  };

  const handleDeleteSale = (saleId: string) => {
    const saleToDelete = sales.find((s) => s.id === saleId);
    if (!saleToDelete) return;

    // Restore stock
    setTank((prev) => ({
      ...prev,
      currentStockLiters: Math.min(prev.totalCapacityLiters, prev.currentStockLiters + saleToDelete.literSold),
    }));

    setSales(sales.filter((s) => s.id !== saleId));
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

    // 1. Update Product Master
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
  const syncFuelVarianceToExpenses = (
    sourceId: string,
    sourceType: 'SOUNDING_TANGKI' | 'PENERIMAAN_DO' | 'CLOSING_SHIFT',
    date: string,
    time: string,
    varianceLiters: number,
    operatorOrVendor: string,
    notes?: string,
    explicitBuyPrice?: number
  ) => {
    // Jika selisih 0 L (presisi), bersihkan entri pembukuan terkait jika sebelumnya ada
    if (Math.abs(varianceLiters) < 0.001) {
      setExpenses((prev) => prev.filter((e) => e.sourceReferenceId !== sourceId));
      return;
    }

    const absVariance = Math.abs(varianceLiters);
    const eff = getEffectivePriceForDate('prod-pertamax-92', date, products, priceHistory, sales);
    const buyPrice = explicitBuyPrice || eff.buyPrice || primaryProduct.buyPrice || 12100;
    const totalAmount = Math.round(absVariance * buyPrice);
    const isLoss = varianceLiters < 0;

    const category: ExpenseCategoryType = isLoss ? 'LOSSES_MINYAK' : 'GAIN_MINYAK';
    const title =
      sourceType === 'PENERIMAAN_DO'
        ? isLoss
          ? `Beban Susut Bongkar DO Pertamina (${formatNumber(absVariance, 1)} L)`
          : `Surplus Penerimaan DO Pertamina (+${formatNumber(absVariance, 1)} L)`
        : isLoss
        ? `Beban Losses Minyak Tangki (${formatNumber(absVariance, 1)} L)`
        : `Surplus / Gain Stok BBM Tangki (+${formatNumber(absVariance, 1)} L)`;

    setExpenses((prev) => {
      const existingIndex = prev.findIndex((e) => e.sourceReferenceId === sourceId);
      const expenseItem: ExpenseRecord = {
        id: existingIndex >= 0 ? prev[existingIndex].id : `exp-fuel-${sourceId}`,
        date,
        time,
        category,
        title,
        amount: totalAmount,
        quantity: absVariance,
        unitRate: buyPrice,
        fuelLossLiters: absVariance,
        fuelLossBuyPriceSnapshot: buyPrice,
        personOrVendor: operatorOrVendor,
        paymentSource: 'KAS_HARIAN',
        notes: notes || `Otomatis dari selisih BBM (${varianceLiters > 0 ? `+${varianceLiters}` : varianceLiters} L)`,
        createdAt: `${date} ${time}`,
        sourceReferenceId: sourceId,
        sourceType,
        varianceType: isLoss ? 'LOSS' : 'GAIN',
      };

      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex] = expenseItem;
        return copy;
      } else {
        return [expenseItem, ...prev];
      }
    });
  };

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
        syncFuelVarianceToExpenses(
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

    // Hitung volume riil yang masuk ke tangki dengan proteksi batas kapasitas maksimal
    const stockBefore = receivingData.soundingBeforeLiters !== undefined
      ? receivingData.soundingBeforeLiters
      : tank.currentStockLiters;
    const maxCapacity = tank.totalCapacityLiters;
    const availableSpace = Math.max(0, maxCapacity - stockBefore);
    const effectiveStockAdded = Math.min(availableSpace, receivingData.actualLitersReceived);
    const safeResultingStock = Math.min(maxCapacity, Math.max(0, stockBefore + effectiveStockAdded));

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
      lastSoundingDate: receivingData.actualDeliveryDate,
      lastSoundingLiters: safeResultingStock,
    }));

    // Otomatis sinkronisasi selisih volume DO (Loss / Gain) ke pembukuan beban operasional
    syncFuelVarianceToExpenses(
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

  // Batalkan penerimaan DO & kembalikan stok fisik tangki pendam secara presisi
  const handleRevertReceiving = (orderId: string) => {
    const targetOrder = purchases.find((p) => p.id === orderId);
    if (!targetOrder || targetOrder.status !== 'SELESAI') return;

    // 1. Pulihkan stok tangki ke kondisi sebelum bongkar
    setTank((prev) => {
      let revertedStock: number;
      if (targetOrder.soundingBeforeLiters !== undefined && targetOrder.soundingBeforeLiters >= 0) {
        revertedStock = Math.min(prev.totalCapacityLiters, Math.max(0, targetOrder.soundingBeforeLiters));
      } else {
        const added = targetOrder.effectiveStockAdded ?? targetOrder.actualLitersReceived ?? targetOrder.volumeLiters ?? 0;
        revertedStock = Math.max(0, prev.currentStockLiters - added);
      }
      return {
        ...prev,
        currentStockLiters: revertedStock,
        lastSoundingLiters: revertedStock,
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
        let revertedStock: number;
        if (targetOrder.soundingBeforeLiters !== undefined && targetOrder.soundingBeforeLiters >= 0) {
          revertedStock = Math.min(prev.totalCapacityLiters, Math.max(0, targetOrder.soundingBeforeLiters));
        } else {
          const added = targetOrder.effectiveStockAdded ?? targetOrder.actualLitersReceived ?? targetOrder.volumeLiters ?? 0;
          revertedStock = Math.max(0, prev.currentStockLiters - added);
        }
        return {
          ...prev,
          currentStockLiters: revertedStock,
          lastSoundingLiters: revertedStock,
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

  const handleEditSounding = (sounding: SoundingRecord) => {
    setEditingSounding(sounding);
    setIsSoundingModalOpen(true);
  };

  const handleSaveSounding = (recordData: Omit<SoundingRecord, 'id'>, newStockLiters: number, editingId?: string) => {
    const idToUpdate = editingId || editingSounding?.id;
    const finalRecordId = idToUpdate || `snd-${Date.now()}`;

    if (idToUpdate) {
      const updated = soundings.map((s) =>
        s.id === idToUpdate ? { ...recordData, id: idToUpdate } : s
      );
      setSoundings(updated);
      setTank((prev) => ({
        ...prev,
        currentStockLiters: newStockLiters,
        lastSoundingDate: recordData.date,
        lastSoundingLiters: recordData.calculatedLiters,
      }));
      setEditingSounding(null);
    } else {
      const newRecord: SoundingRecord = {
        ...recordData,
        id: finalRecordId,
      };
      setSoundings([newRecord, ...soundings]);

      setTank((prev) => ({
        ...prev,
        currentStockLiters: newStockLiters,
        lastSoundingDate: recordData.date,
        lastSoundingLiters: recordData.calculatedLiters,
      }));
    }

    // Otomatis catat selisih loss atau gain sounding ke dalam pembukuan keuangan
    syncFuelVarianceToExpenses(
      finalRecordId,
      'SOUNDING_TANGKI',
      recordData.date,
      recordData.time,
      recordData.varianceLiters,
      `Tera Stick Ukur Tangki (Op. ${recordData.operatorName})`,
      `Tera fisik ${recordData.calculatedLiters} L vs stok sistem ${recordData.systemStockLiters} L. ${recordData.notes || ''}`.trim()
    );
  };

  const handleDeleteSounding = (soundingId: string) => {
    setSoundings(soundings.filter((s) => s.id !== soundingId));
    // Hapus juga catatan pembukuan otomatis yang terkait dengan sounding ini
    setExpenses((prev) => prev.filter((e) => e.sourceReferenceId !== soundingId));
  };

  const handleDeleteAugustSoundings = () => {
    const augustSoundings = soundings.filter((s) => s.date.startsWith('2026-08') || s.date.includes('-08-'));
    if (augustSoundings.length === 0) {
      setConfirmConfig({
        isOpen: true,
        title: 'Tidak Ada Data Sounding Agustus',
        message: 'Tidak ditemukan catatan hasil sounding pada bulan Agustus 2026. Semua rekaman sounding sudah bersih.',
        confirmLabel: 'Tutup',
        cancelLabel: 'Kembali',
        isDestructive: false,
        onConfirm: () => {},
      });
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: 'Hapus Semua Sounding Bulan Agustus',
      message: `Apakah Anda yakin ingin menghapus seluruh (${augustSoundings.length}) catatan hasil sounding pada bulan Agustus 2026? Data sounding fisik tangki bulan Agustus akan dihapus permanen.`,
      confirmLabel: `Hapus Semua (${augustSoundings.length}) Sounding`,
      cancelLabel: 'Batal',
      isDestructive: true,
      onConfirm: () => {
        const remaining = soundings.filter((s) => !s.date.startsWith('2026-08') && !s.date.includes('-08-'));
        setSoundings(remaining);
        StorageService.setSoundings(remaining);
        // Hapus juga beban pembukuan selisih sounding bulan Agustus
        setExpenses((prev) => prev.filter((e) => !(e.sourceType === 'SOUNDING_TANGKI' && (e.date.startsWith('2026-08') || e.date.includes('-08-')))));
        if (tank.lastSoundingDate && (tank.lastSoundingDate.startsWith('2026-08') || tank.lastSoundingDate.includes('-08-'))) {
          const updatedTank = {
            ...tank,
            lastSoundingDate: '2026-07-31',
          };
          setTank(updatedTank);
          StorageService.setTankConfig(updatedTank);
        }
      },
    });
  };

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
      title: 'Reset Aplikasi ke Kondisi Baru',
      message:
        'Apakah Anda yakin ingin mengosongkan seluruh data penjualan, pemesanan/DO BBM, pengeluaran operasional, absensi karyawan, dan sounding tangki? Aplikasi akan dikembalikan ke kondisi awal bersih seperti aplikasi baru.',
      confirmLabel: 'Ya, Reset Semua Data',
      cancelLabel: 'Batal',
      isDestructive: true,
      onConfirm: () => {
        StorageService.resetToDefault();
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
  const handleOpenAddExpense = (cat?: ExpenseCategoryType) => {
    setEditingExpense(null);
    setSelectedExpenseCategory(cat || 'GAJI_OPERATOR');
    setIsExpenseModalOpen(true);
  };

  const handleEditExpense = (expense: ExpenseRecord) => {
    setEditingExpense(expense);
    setSelectedExpenseCategory(expense.category);
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = (expenseData: Omit<ExpenseRecord, 'id' | 'createdAt'>) => {
    if (editingExpense) {
      const updated = expenses.map((e) =>
        e.id === editingExpense.id
          ? { ...expenseData, id: editingExpense.id, createdAt: editingExpense.createdAt }
          : e
      );
      setExpenses(updated);
    } else {
      const newExpense: ExpenseRecord = {
        ...expenseData,
        id: `exp-${Date.now()}`,
        createdAt: `${getTodayDateString()} ${getCurrentTimeString()}`,
      };
      setExpenses([newExpense, ...expenses]);
    }
  };

  const handleDeleteExpense = (expenseId: string) => {
    setExpenses(expenses.filter((e) => e.id !== expenseId));
  };

  const handleDeleteExpensesByMonth = (monthKey: string) => {
    const remaining = expenses.filter((e) => !e.date.startsWith(monthKey));
    setExpenses(remaining);
  };

  const handleOpenPrintSummaryModal = (mode: 'MONTHLY' | 'YEARLY', month: string, year: number) => {
    setSummaryPrintMode(mode);
    setSummaryPrintMonth(month);
    setSummaryPrintYear(year);
    setIsPrintSummaryModalOpen(true);
  };

  // Employee, Attendance & Payroll Handlers
  const handleSaveEmployee = (emp: Employee) => {
    const exists = employees.some((e) => e.id === emp.id);
    if (exists) {
      setEmployees(employees.map((e) => (e.id === emp.id ? emp : e)));
    } else {
      setEmployees([...employees, emp]);
    }
  };

  const handleDeleteEmployee = (empId: string) => {
    setEmployees(employees.filter((e) => e.id !== empId));
  };

  const handleSaveAttendance = (record: AttendanceRecord) => {
    const exists = attendance.some((a) => a.id === record.id);
    const updatedAttendanceList = exists
      ? attendance.map((a) => (a.id === record.id ? record : a))
      : [record, ...attendance];
    setAttendance(updatedAttendanceList);

    const targetMonth = record.date.substring(0, 7);
    const updatedPayrolls = recalculateMonthlyPayrolls(updatedAttendanceList, employees, payrolls, targetMonth);
    setPayrolls(updatedPayrolls);
  };

  const handleDeleteAttendance = (recordId: string) => {
    const targetRec = attendance.find((a) => a.id === recordId);
    const updatedAttendanceList = attendance.filter((a) => a.id !== recordId);
    setAttendance(updatedAttendanceList);

    if (targetRec) {
      const targetMonth = targetRec.date.substring(0, 7);
      const updatedPayrolls = recalculateMonthlyPayrolls(updatedAttendanceList, employees, payrolls, targetMonth);
      setPayrolls(updatedPayrolls);
    }
  };

  const handleSavePayroll = (payroll: PayrollRecord) => {
    const exists = payrolls.some((p) => p.id === payroll.id);
    if (exists) {
      setPayrolls(payrolls.map((p) => (p.id === payroll.id ? payroll : p)));
    } else {
      setPayrolls([payroll, ...payrolls]);
    }
  };

  const handleDeletePayroll = (payrollId: string) => {
    setPayrolls(payrolls.filter((p) => p.id !== payrollId));
  };

  const handlePaySalary = (
    payroll: PayrollRecord,
    paymentSource: 'KAS_HARIAN' | 'REKENING_BANK',
    paymentDate?: string,
    notes?: string
  ) => {
    // 1. Update Payroll Record Status
    const today = paymentDate || getTodayDateString();
    const updatedPayroll: PayrollRecord = {
      ...payroll,
      paymentStatus: 'DIBAYAR',
      paymentDate: today,
      paymentSource,
      notes: notes || payroll.notes,
    };
    handleSavePayroll(updatedPayroll);

    // 2. Automatically create an expense transaction in Expense Tracker (if not already existing)
    const existingSalaryExpense = expenses.find((e) => e.id.includes(`exp-salary-${payroll.id}`));
    if (!existingSalaryExpense) {
      const newExpense: ExpenseRecord = {
        id: `exp-salary-${payroll.id}-${Date.now()}`,
        date: today,
        time: getCurrentTimeString(),
        category: 'GAJI_OPERATOR',
        title: `Pembayaran Gaji Bulanan: ${payroll.employeeName} (${payroll.payrollNumber})`,
        amount: payroll.netSalary,
        quantity: payroll.totalHadir,
        unitRate: payroll.dailyRate,
        personOrVendor: payroll.employeeName,
        paymentSource,
        notes: `Gaji periode ${payroll.month} (${payroll.totalHadir} hari kerja, ${payroll.totalLemburShifts} shift lembur). Bersih: Rp ${payroll.netSalary.toLocaleString('id-ID')}`,
        createdAt: `${today} ${getCurrentTimeString()}`,
      };
      setExpenses((prev) => [newExpense, ...prev]);
    }
  };

  const handleUnpaySalary = (payrollId: string) => {
    const target = payrolls.find((p) => p.id === payrollId);
    if (!target) return;
    const updated: PayrollRecord = {
      ...target,
      paymentStatus: 'DRAFT',
      paymentDate: undefined,
    };
    handleSavePayroll(updated);

    // Remove corresponding salary expense from expenses list
    setExpenses((prev) => prev.filter((e) => !e.id.includes(`exp-salary-${payrollId}`)));
  };

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
            />
          )}

          {activeTab === 'soundings' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest block">
                    Pemeriksaan Fisik Tangki Pendam
                  </span>
                  <h3 className="text-base font-bold text-slate-800 tracking-tight mt-0.5">
                    Log Sounding Stick Celup & Uji Pasta Air
                  </h3>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {soundings.some((s) => s.date.includes('-08-')) && (
                    <button
                      type="button"
                      onClick={handleDeleteAugustSoundings}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                      title="Hapus Semua Hasil Sounding Bulan Agustus"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Hapus Sounding Agustus</span>
                    </button>
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
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
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
                          <td colSpan={9} className="py-12 text-center text-slate-400">
                            <Gauge className="w-9 h-9 mx-auto mb-2 text-slate-300 stroke-1" />
                            <div className="font-semibold text-slate-700 text-sm">Tidak Ada Catatan Sounding</div>
                            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
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
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
              onBatchSyncAttendance={(records) => {
                setAttendance(records);
                const updatedPayrolls = recalculateMonthlyPayrolls(records, employees, payrolls, '2026-08');
                setPayrolls(updatedPayrolls);
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
        onImportSales={handleImportSales}
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
        onDeleteAugustSoundings={handleDeleteAugustSoundings}
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

