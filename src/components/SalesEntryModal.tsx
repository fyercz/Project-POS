import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Fuel,
  Calculator,
  Check,
  AlertCircle,
  Sparkles,
  User,
  Clock,
  Calendar,
  Wallet,
  Gauge,
  Droplet,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Receipt,
  RotateCcw,
  Layers,
} from 'lucide-react';
import { Product, SaleRecord, PriceHistory, Employee } from '../types';
import {
  formatRupiah,
  formatNumber,
  formatLiter,
  getTodayDateString,
  getCurrentTimeString,
  getShiftCategory,
  getShiftHoursInfo,
  STANDARD_SHIFTS,
  addDays,
} from '../utils/formatters';
import { getEffectivePriceForDate, formatMonthYearId, getNextSalesInputDateAndShift } from '../utils/pricing';

interface SalesEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  priceHistory?: PriceHistory[];
  sales?: SaleRecord[];
  employees?: Employee[];
  lastInputtedDate?: string | null;
  currentPrice: number;
  currentBuyPrice: number;
  currentStockLiters: number;
  tankCapacity?: number;
  lastMeterReading?: number;
  editingSale?: SaleRecord | null;
  onSaveSale: (sale: Omit<SaleRecord, 'id' | 'createdAt'>) => void;
}

export const SalesEntryModal: React.FC<SalesEntryModalProps> = ({
  isOpen,
  onClose,
  products,
  priceHistory = [],
  sales = [],
  employees = [],
  lastInputtedDate,
  currentPrice,
  currentBuyPrice,
  currentStockLiters,
  tankCapacity = 5000,
  lastMeterReading = 0,
  editingSale,
  onSaveSale,
}) => {
  const LITERS_PER_CM = 21;

  const [transactionDate, setTransactionDate] = useState<string>(getTodayDateString());
  const [dateSourceDesc, setDateSourceDesc] = useState<string>('');
  const [time, setTime] = useState<string>(getCurrentTimeString());
  const [shift, setShift] = useState<'Shift 1 (05.30 - 13.30)' | 'Shift 2 (13.30 - 19.30)' | 'Full Day'>('Shift 1 (05.30 - 13.30)');
  const [operatorName, setOperatorName] = useState<string>('Daslam');
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || 'prod-pertamax-92');

  // Input Mode: 'payment' (Utama - Isi Pembayaran Dahulu), 'meter' (Stand Meter Dispenser), 'direct' (Manual Liter)
  const [inputMode, setInputMode] = useState<'payment' | 'meter' | 'direct'>('payment');

  // Payments (Metode Pembayaran)
  const [paymentCash, setPaymentCash] = useState<number>(2590000);
  const [paymentQris, setPaymentQris] = useState<number>(0);
  const [paymentEdc, setPaymentEdc] = useState<number>(0);
  const [actualCashInHand, setActualCashInHand] = useState<number>(2590000);
  const [showCashReconciliation, setShowCashReconciliation] = useState<boolean>(false);

  // Metering & Direct
  const [meterAwal, setMeterAwal] = useState<number>(lastMeterReading);
  const [meterAkhir, setMeterAkhir] = useState<number>(lastMeterReading + 200);
  const [directLiters, setDirectLiters] = useState<number>(200);

  // Unit Price
  const [unitPrice, setUnitPrice] = useState<number>(currentPrice);

  // Uji Tera & Catatan
  const [teraTestLiters, setTeraTestLiters] = useState<number>(5);
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Sounding Tangki Modular
  const [hasSounding, setHasSounding] = useState<boolean>(true);
  const [soundingStickCm, setSoundingStickCm] = useState<number>(140);
  const [soundingCalculatedLiters, setSoundingCalculatedLiters] = useState<number>(2940);
  const [soundingWaterCm, setSoundingWaterCm] = useState<number>(0);
  const [syncToSoundingLog, setSyncToSoundingLog] = useState<boolean>(true);
  const [syncToAttendance, setSyncToAttendance] = useState<boolean>(true);

  // Operator List
  const operatorList = useMemo(() => {
    const defaultOps = ['Daslam', 'Angga'];
    if (employees && employees.length > 0) {
      const activeOps = employees.filter((e) => e.isActive !== false).map((e) => e.name);
      return Array.from(new Set([...activeOps, ...defaultOps]));
    }
    return defaultOps;
  }, [employees]);

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  // Effective price for date
  const effectivePriceForDate = getEffectivePriceForDate(
    selectedProductId,
    transactionDate,
    products,
    priceHistory,
    sales
  );
  const buyPriceSnapshot = editingSale?.buyPriceSnapshot || effectivePriceForDate.buyPrice;

  // Existing sales on selected date (excluding record being edited)
  const existingSalesOnDate = useMemo(() => {
    return sales.filter((s) => {
      if (editingSale && s.id === editingSale.id) return false;
      return s.transactionDate === transactionDate;
    });
  }, [sales, editingSale, transactionDate]);

  // Shift availability rules on the same date
  const existingShift1 = existingSalesOnDate.find((s) => getShiftCategory(s.shift) === 'shift1');
  const existingShift2 = existingSalesOnDate.find((s) => getShiftCategory(s.shift) === 'shift2');
  const existingFullDay = existingSalesOnDate.find((s) => getShiftCategory(s.shift) === 'fullday');

  const isShift1Disabled = !!existingShift1 || !!existingFullDay;
  const isShift2Disabled = !!existingShift2 || !!existingFullDay;
  const isFullDayDisabled = !!existingFullDay || !!existingShift1 || !!existingShift2;
  const allShiftsTaken = isShift1Disabled && isShift2Disabled && isFullDayDisabled;

  const currentCategory = getShiftCategory(shift);
  const isCurrentShiftTaken =
    (currentCategory === 'shift1' && isShift1Disabled) ||
    (currentCategory === 'shift2' && isShift2Disabled) ||
    (currentCategory === 'fullday' && isFullDayDisabled);

  // Operator availability rules on the same date:
  // "begitu pula dengan operator: apabila telah terisi maka pada hari yang sama tidak bisa ada pilihan yang sama"
  const existingOperatorsOnDate = useMemo(() => {
    return existingSalesOnDate.map((s) => ({
      name: s.operatorName,
      shift: s.shift,
      literSold: s.literSold,
    }));
  }, [existingSalesOnDate]);

  const takenOperatorNamesLower = useMemo(() => {
    return existingOperatorsOnDate.map((o) => o.name.trim().toLowerCase());
  }, [existingOperatorsOnDate]);

  const isOperatorTaken = (name: string) => {
    if (!name) return false;
    return takenOperatorNamesLower.includes(name.trim().toLowerCase());
  };

  const currentOperatorRecord = existingOperatorsOnDate.find(
    (o) => o.name.trim().toLowerCase() === operatorName.trim().toLowerCase()
  );
  const isCurrentOperatorTaken = !!currentOperatorRecord;

  const allOperatorsTaken =
    operatorList.length > 0 && operatorList.every((op) => isOperatorTaken(op));

  // Initialize or populate form
  useEffect(() => {
    if (editingSale) {
      setTransactionDate(editingSale.transactionDate);
      setTime(editingSale.time || getCurrentTimeString());
      setShift((editingSale.shift as any) || 'Shift 1 (05.30 - 13.30)');
      setOperatorName(editingSale.operatorName || 'Daslam');
      setSelectedProductId(editingSale.productId);
      setUnitPrice(editingSale.unitPrice);

      setPaymentCash(editingSale.paymentCash || 0);
      setPaymentQris(editingSale.paymentQris || 0);
      setPaymentEdc(editingSale.paymentEdc || 0);
      setActualCashInHand(editingSale.actualCashInHand ?? editingSale.paymentCash ?? 0);
      setShowCashReconciliation((editingSale.actualCashInHand ?? editingSale.paymentCash) !== editingSale.paymentCash);

      if (editingSale.meterAwal !== undefined && editingSale.meterAkhir !== undefined) {
        setMeterAwal(editingSale.meterAwal);
        setMeterAkhir(editingSale.meterAkhir);
        setInputMode('payment');
      } else {
        setDirectLiters(Math.round(editingSale.literSold));
        setInputMode('payment');
      }

      setTeraTestLiters(editingSale.teraTestLiters || 5);

      if (editingSale.hasSounding || editingSale.soundingStickCm) {
        setHasSounding(true);
        setSoundingStickCm(editingSale.soundingStickCm || 0);
        setSoundingCalculatedLiters(editingSale.soundingCalculatedLiters || 0);
        setSoundingWaterCm(editingSale.soundingWaterCm || 0);
        setSyncToSoundingLog(editingSale.syncToSoundingLog ?? false);
      } else {
        setHasSounding(false);
      }

      setSyncToAttendance(editingSale.syncToAttendance ?? true);
      setNotes(editingSale.notes || '');
    } else if (isOpen) {
      // Sesuai aturan: sesuaikan dengan tanggal terakhir yang telah diinput setelahnya, bukan tanggal saat ini
      const nextConfig = getNextSalesInputDateAndShift(sales, lastInputtedDate, operatorList);
      const targetDate = nextConfig.targetDate;

      setTransactionDate(targetDate);
      setDateSourceDesc(nextConfig.sourceDesc);
      const initialShiftHours = getShiftHoursInfo(nextConfig.targetShift);
      setTime(nextConfig.targetTime || initialShiftHours.closingTime);
      setShift(nextConfig.targetShift);
      setOperatorName(nextConfig.suggestedOperator);

      const firstProdId = products[0]?.id || 'prod-pertamax-92';
      setSelectedProductId(firstProdId);
      const eff = getEffectivePriceForDate(firstProdId, targetDate, products, priceHistory, sales);
      setUnitPrice(eff.sellingPrice);

      // Default payment (default to 200 liter rounded sales)
      const defaultLtr = 200;
      const initialCash = defaultLtr * eff.sellingPrice;
      setInputMode('payment');
      setPaymentCash(initialCash);
      setPaymentQris(0);
      setPaymentEdc(0);
      setActualCashInHand(initialCash);
      setShowCashReconciliation(false);

      setMeterAwal(lastMeterReading);
      setMeterAkhir(lastMeterReading + defaultLtr);
      setDirectLiters(defaultLtr);

      setTeraTestLiters(5);

      // Sounding
      const expectedRem = Math.max(0, currentStockLiters - defaultLtr);
      const defaultCm = Math.round((expectedRem / LITERS_PER_CM) * 10) / 10;
      setHasSounding(true);
      setSoundingStickCm(defaultCm);
      setSoundingCalculatedLiters(Math.round(defaultCm * LITERS_PER_CM));
      setSoundingWaterCm(0);
      setSyncToSoundingLog(true);
      setSyncToAttendance(true);
      setNotes('');
    }
  }, [editingSale, isOpen, lastInputtedDate]);

  // Synchronize unit price when transactionDate or selectedProductId changes
  useEffect(() => {
    if (selectedProduct && transactionDate && isOpen) {
      if (!editingSale || editingSale.transactionDate !== transactionDate) {
        const eff = getEffectivePriceForDate(selectedProductId, transactionDate, products, priceHistory, sales);
        setUnitPrice(eff.sellingPrice);
      }
    }
  }, [selectedProductId, selectedProduct, transactionDate, editingSale, priceHistory, products, sales, isOpen]);

  // Date change handler with shift and operator auto-switch
  const handleDateChange = (newDate: string) => {
    setTransactionDate(newDate);
    if (newDate && selectedProduct) {
      const eff = getEffectivePriceForDate(selectedProductId, newDate, products, priceHistory, sales);
      setUnitPrice(eff.sellingPrice);
    }

    const salesOnNewDate = sales.filter((s) => {
      if (editingSale && s.id === editingSale.id) return false;
      return s.transactionDate === newDate;
    });

    // Auto shift
    const s1Taken = salesOnNewDate.some((s) => getShiftCategory(s.shift) === 'shift1');
    const s2Taken = salesOnNewDate.some((s) => getShiftCategory(s.shift) === 'shift2');
    const fdTaken = salesOnNewDate.some((s) => getShiftCategory(s.shift) === 'fullday');

    const currCat = getShiftCategory(shift);
    const currBlocked =
      (currCat === 'shift1' && (s1Taken || fdTaken)) ||
      (currCat === 'shift2' && (s2Taken || fdTaken)) ||
      (currCat === 'fullday' && (fdTaken || s1Taken || s2Taken));

    if (currBlocked) {
      if (!s1Taken && !fdTaken) {
        setShift('Shift 1 (05.30 - 13.30)');
      } else if (!s2Taken && !fdTaken) {
        setShift('Shift 2 (13.30 - 19.30)');
      } else if (!fdTaken && !s1Taken && !s2Taken) {
        setShift('Full Day');
      }
    }

    // Auto operator
    const takenOps = salesOnNewDate.map((s) => s.operatorName.trim().toLowerCase());
    if (takenOps.includes(operatorName.trim().toLowerCase())) {
      const availableOp = operatorList.find((op) => !takenOps.includes(op.toLowerCase()));
      if (availableOp) {
        setOperatorName(availableOp);
      }
    }
  };

  // Product change handler
  const handleProductChange = (newProdId: string) => {
    setSelectedProductId(newProdId);
    if (transactionDate) {
      const eff = getEffectivePriceForDate(newProdId, transactionDate, products, priceHistory, sales);
      setUnitPrice(eff.sellingPrice);
    }
  };

  // Total pembayaran masuk
  const totalPayment = Math.max(0, (paymentCash || 0) + (paymentQris || 0) + (paymentEdc || 0));

  // Perhitungan Volume Liter Terjual
  // KRUSIAL: Sesuai instruksi user "sehingga volume liter terjual secara otomatis terlihat, buat volume liter hanya angka bulat"
  let rawLiters = 0;
  if (inputMode === 'payment') {
    rawLiters = unitPrice > 0 ? totalPayment / unitPrice : 0;
  } else if (inputMode === 'meter') {
    rawLiters = Math.max(0, (meterAkhir || 0) - (meterAwal || 0));
  } else {
    rawLiters = Math.max(0, directLiters || 0);
  }

  // Wajib angka bulat (integer)
  const calculatedLiters = Math.max(0, Math.round(rawLiters));

  // Nilai Omset & Profit BBM
  const totalRevenue = calculatedLiters * unitPrice;
  const totalProfit = calculatedLiters * (unitPrice - buyPriceSnapshot);

  // Selisih nilai pembayaran dengan nilai omset liter bulat (jika ada pembulatan kas)
  const paymentDifference = totalPayment - totalRevenue;

  // Theoretical remaining stock after this shift
  const theoreticalRemainingStock = Math.max(0, currentStockLiters - calculatedLiters);

  // Sounding variance
  const soundingVariance = soundingCalculatedLiters - theoreticalRemainingStock;

  // Sounding handlers
  const handleSoundingStickChange = (cm: number) => {
    setSoundingStickCm(cm);
    const liters = Math.min(tankCapacity, Math.round(cm * LITERS_PER_CM));
    setSoundingCalculatedLiters(liters);
  };

  const handleSoundingLitersChange = (liters: number) => {
    const ltr = Math.min(tankCapacity, liters);
    setSoundingCalculatedLiters(ltr);
    setSoundingStickCm(Math.round((ltr / LITERS_PER_CM) * 10) / 10);
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validasi Aturan Shift
    if (isCurrentShiftTaken) {
      let reason = `Shift '${shift}' sudah terisi pada tanggal ${transactionDate}. Tidak dapat memilih shift yang sama pada hari yang sama.`;
      if (currentCategory === 'shift1' && existingShift1) {
        reason = `Shift 1 sudah terisi pada tanggal ${transactionDate} oleh ${existingShift1.operatorName} (${existingShift1.literSold} L). Tidak dapat memilih Shift 1 lagi di hari yang sama.`;
      } else if (currentCategory === 'shift2' && existingShift2) {
        reason = `Shift 2 sudah terisi pada tanggal ${transactionDate} oleh ${existingShift2.operatorName} (${existingShift2.literSold} L). Tidak dapat memilih Shift 2 lagi di hari yang sama.`;
      } else if (currentCategory === 'fullday' && existingFullDay) {
        reason = `Full Day sudah terisi pada tanggal ${transactionDate} oleh ${existingFullDay.operatorName} (${existingFullDay.literSold} L). Tidak dapat memilih Full Day lagi di hari yang sama.`;
      } else if (existingFullDay) {
        reason = `Penjualan Full Day sudah tercatat pada hari ini (${existingFullDay.operatorName}). Shift baru tidak dapat ditambahkan pada tanggal yang sama.`;
      } else if (currentCategory === 'fullday') {
        reason = `Shift parsial (Shift 1 / Shift 2) sudah terisi pada tanggal ${transactionDate}. Tidak dapat memilih Full Day pada hari yang sama.`;
      }
      setErrorMessage(reason);
      return;
    }

    // Validasi Aturan Operator: "begitu pula dengan operator"
    if (isCurrentOperatorTaken) {
      setErrorMessage(
        `Operator '${operatorName}' sudah bertugas pada tanggal ${transactionDate} (${currentOperatorRecord?.shift} - ${currentOperatorRecord?.literSold} L). Sesuai aturan operasional, tidak dapat memilih operator yang sama pada hari yang sama.`
      );
      return;
    }

    if (calculatedLiters <= 0) {
      setErrorMessage('Jumlah liter penjualan harus lebih dari 0. Silakan isi pembayaran terlebih dahulu.');
      return;
    }

    if (calculatedLiters > currentStockLiters) {
      setErrorMessage(
        `Penjualan (${calculatedLiters} L) melebihi sisa stok di tangki (${currentStockLiters} L). Silakan catat penerimaan DO BBM di menu Pemesanan atau atur stok tangki di Profil & Tangki.`
      );
      return;
    }

    if (!operatorName.trim()) {
      setErrorMessage('Nama operator / petugas nozzle wajib diisi.');
      return;
    }

    // Cash in drawer reconcilation
    const physicalCash = showCashReconciliation ? actualCashInHand : paymentCash;

    onSaveSale({
      transactionDate,
      time,
      shift,
      operatorName: operatorName.trim(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      meterAwal: inputMode === 'meter' || meterAwal !== undefined ? meterAwal : undefined,
      meterAkhir: inputMode === 'meter' || meterAwal !== undefined ? meterAwal + calculatedLiters : undefined,
      literSold: calculatedLiters, // Angka bulat
      unitPrice,
      buyPriceSnapshot,
      totalRevenue,
      totalProfit,
      paymentCash: paymentCash || 0,
      paymentQris: paymentQris || 0,
      paymentEdc: paymentEdc || 0,
      actualCashInHand: physicalCash,
      cashDifference: physicalCash - paymentCash,
      teraTestLiters,
      // Sounding Data
      hasSounding,
      soundingStickCm: hasSounding ? soundingStickCm : undefined,
      soundingCalculatedLiters: hasSounding ? soundingCalculatedLiters : undefined,
      soundingTheoreticalLiters: hasSounding ? theoreticalRemainingStock : undefined,
      soundingVarianceLiters: hasSounding ? soundingVariance : undefined,
      soundingWaterCm: hasSounding ? soundingWaterCm : undefined,
      syncToSoundingLog: hasSounding ? syncToSoundingLog : false,
      syncToAttendance,
      notes: notes.trim(),
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        id="sales-entry-modal-container"
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Fuel className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {editingSale ? 'Edit Laporan Penjualan Shift' : 'Input Laporan Penjualan & Sounding Shift'}
              </h2>
              <p className="text-xs text-blue-100 mt-0.5">
                {editingSale
                  ? `Mengubah data transaksi ID #${editingSale.id}`
                  : 'Pencatatan Penjualan Kasir, Sounding Tangki & Rekonsiliasi Kas'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-blue-200 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Peringatan Apabila Semua Shift Telah Terisi */}
          {allShiftsTaken && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-950 rounded-xl text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-amber-950">
                  Seluruh shift operasional pada tanggal {transactionDate} telah terisi lengkap:
                </p>
                <ul className="list-disc list-inside text-[11px] text-amber-900 space-y-0.5 font-medium">
                  {existingShift1 && (
                    <li>
                      <strong>Shift 1:</strong> Petugas {existingShift1.operatorName} ({existingShift1.literSold} L)
                    </li>
                  )}
                  {existingShift2 && (
                    <li>
                      <strong>Shift 2:</strong> Petugas {existingShift2.operatorName} ({existingShift2.literSold} L)
                    </li>
                  )}
                  {existingFullDay && (
                    <li>
                      <strong>Full Day:</strong> Petugas {existingFullDay.operatorName} ({existingFullDay.literSold} L)
                    </li>
                  )}
                </ul>
                <p className="text-[11px] text-amber-900 pt-0.5">
                  Sesuai aturan operasional, tidak bisa memilih atau menginput shift yang sama pada hari yang sama.
                </p>
              </div>
            </div>
          )}

          {/* Peringatan Apabila Semua Operator Telah Bertugas */}
          {allOperatorsTaken && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-950 rounded-xl text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-amber-950">
                  Semua operator terdaftar telah tercatat bertugas pada tanggal {transactionDate}:
                </p>
                <ul className="list-disc list-inside text-[11px] text-amber-900 space-y-0.5 font-medium">
                  {existingOperatorsOnDate.map((o, idx) => (
                    <li key={idx}>
                      Petugas <strong>{o.name}</strong> ({o.shift}) - {o.literSold} L
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-amber-900 pt-0.5">
                  Sesuai aturan, operator yang sama tidak dapat bertugas dua kali pada tanggal yang sama.
                </p>
              </div>
            </div>
          )}

          {/* ================= BAGIAN 1: DATA OPERASIONAL ================= */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Tanggal */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Tanggal Penjualan
                </label>
                {/* Quick Date Steppers */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleDateChange(addDays(transactionDate, -1))}
                    title="Mundur 1 hari"
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                  >
                    -1 Hari
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDateChange(addDays(transactionDate, 1))}
                    title="Maju 1 hari"
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                  >
                    +1 Hari
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDateChange(getTodayDateString())}
                    title="Set hari ini"
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                  >
                    Hari Ini
                  </button>
                </div>
              </div>
              <input
                type="date"
                required
                value={transactionDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
              <div className="mt-1 space-y-0.5">
                {dateSourceDesc && (
                  <p className="text-[10px] text-blue-700 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block shrink-0"></span>
                    <span>{dateSourceDesc}</span>
                  </p>
                )}
                {effectivePriceForDate && (
                  <p className="text-[11px] text-slate-600 font-semibold flex items-center gap-1">
                    <span>Tarif Jual: <strong>Rp {formatRupiah(effectivePriceForDate.sellingPrice)}</strong></span>
                  </p>
                )}
              </div>
            </div>

            {/* Shift */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Shift Operasional
                </span>
                {isCurrentShiftTaken && (
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                    Sudah Terisi
                  </span>
                )}
              </label>
              <select
                value={shift}
                onChange={(e) => {
                  const newShift = e.target.value as any;
                  setShift(newShift);
                  const info = getShiftHoursInfo(newShift);
                  setTime(info.closingTime);
                }}
                className={`w-full px-3 py-2 border rounded-xl text-sm font-medium focus:ring-2 outline-hidden transition-colors ${
                  isCurrentShiftTaken
                    ? 'bg-rose-50 border-rose-300 text-rose-900 focus:ring-rose-400'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:ring-blue-500'
                }`}
              >
                <option value="Shift 1 (05.30 - 13.30)" disabled={isShift1Disabled}>
                  Shift 1 (05.30 - 13.30) {existingShift1 ? `❌ [TERISI: ${existingShift1.operatorName}]` : existingFullDay ? '❌ [TERISI: Full Day]' : '✓ (Tersedia)'}
                </option>
                <option value="Shift 2 (13.30 - 19.30)" disabled={isShift2Disabled}>
                  Shift 2 (13.30 - 19.30) {existingShift2 ? `❌ [TERISI: ${existingShift2.operatorName}]` : existingFullDay ? '❌ [TERISI: Full Day]' : '✓ (Tersedia)'}
                </option>
                <option value="Full Day" disabled={isFullDayDisabled}>
                  Full Day (Akumulasi 1 Hari) {existingFullDay ? `❌ [TERISI: ${existingFullDay.operatorName}]` : (existingShift1 || existingShift2) ? '❌ [TERISI: Ada Shift Parsial]' : '✓ (Tersedia)'}
                </option>
              </select>

              {/* Status Helper Shift & Synchronized Working Hours */}
              <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-[10px]">
                {isCurrentShiftTaken ? (
                  <span className="text-rose-600 font-semibold flex items-center gap-1">
                    <Ban className="w-3 h-3 text-rose-600 shrink-0" />
                    Shift ini sudah terisi di hari ini.
                  </span>
                ) : (
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    Shift tersedia.
                  </span>
                )}
                <span className="text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
                  Jam Kerja: <strong className="text-slate-700 font-mono">{getShiftHoursInfo(shift).displayHours}</strong>
                </span>
              </div>
            </div>

            {/* Operator - Rule: Begitu pula dengan operator */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  Nama Operator
                </span>
                {isCurrentOperatorTaken && (
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                    Sudah Tugas
                  </span>
                )}
              </label>

              {/* Quick Operator Selection Buttons */}
              <div className="flex flex-wrap items-center gap-1 mb-1.5">
                {operatorList.map((op) => {
                  const taken = isOperatorTaken(op);
                  const isSelected = operatorName.trim().toLowerCase() === op.toLowerCase();
                  const opInfo = existingOperatorsOnDate.find((o) => o.name.trim().toLowerCase() === op.toLowerCase());

                  return (
                    <button
                      key={op}
                      type="button"
                      disabled={taken}
                      onClick={() => setOperatorName(op)}
                      title={taken ? `${op} sudah bertugas di ${opInfo?.shift} (${opInfo?.literSold} L)` : `Pilih ${op}`}
                      className={`text-[10px] px-2 py-0.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                        taken
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed line-through'
                          : isSelected
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <span>{op}</span>
                      {taken ? (
                        <span className="text-[9px] text-rose-500 font-normal no-underline">
                          ({opInfo ? (opInfo.shift.includes('1') ? 'S1' : opInfo.shift.includes('2') ? 'S2' : 'FD') : 'Tugas'})
                        </span>
                      ) : isSelected ? (
                        <Check className="w-3 h-3 text-white" />
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <input
                type="text"
                required
                placeholder="Nama operator..."
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className={`w-full px-3 py-1.5 border rounded-xl text-sm font-medium focus:ring-2 outline-hidden transition-colors ${
                  isCurrentOperatorTaken
                    ? 'bg-rose-50 border-rose-300 text-rose-900 focus:ring-rose-400'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:ring-blue-500'
                }`}
              />

              {/* Status Helper Operator */}
              <div className="mt-1 flex items-center gap-1 text-[10px]">
                {isCurrentOperatorTaken ? (
                  <span className="text-rose-600 font-semibold flex items-center gap-1">
                    <Ban className="w-3 h-3 text-rose-600 shrink-0" />
                    Operator '{operatorName}' sudah bertugas di tanggal ini ({currentOperatorRecord?.shift}).
                  </span>
                ) : (
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    Operator siap bertugas.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Produk BBM & Harga Satuan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-blue-50/50 p-3.5 rounded-xl border border-blue-100">
            <div>
              <label className="block text-xs font-semibold text-blue-900 mb-1">
                Produk BBM
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (RON {p.ron})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-blue-900 mb-1 flex items-center justify-between">
                <span>Harga Satuan (Rp / Liter)</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                  {effectivePriceForDate.sourceDesc || `Tarif ${formatMonthYearId(transactionDate.substring(0, 7))}`}
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm font-bold text-slate-400">Rp</span>
                <input
                  type="number"
                  required
                  min={1000}
                  step={50}
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  className="w-full pl-10 pr-3 py-2 bg-white border border-blue-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
              {unitPrice !== effectivePriceForDate.sellingPrice && (
                <div className="mt-1 flex items-center justify-between text-[11px]">
                  <span className="text-amber-700 font-medium">Harga diubah manual</span>
                  <button
                    type="button"
                    onClick={() => setUnitPrice(effectivePriceForDate.sellingPrice)}
                    className="text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                  >
                    Gunakan Rp {formatRupiah(effectivePriceForDate.sellingPrice)}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ================= BAGIAN 2: METODE PEMBAYARAN (DIISI DAHULU) ================= */}
          {/* Sesuai instruksi user: "pada penjualan, atur agar metode pembayaran ada diatas dan dapat diisi dahulu, sehingga volume liter terjual secara otomatis terlihat, buat volume liter hanya angka bulat" */}
          <div className="p-4 bg-emerald-50/70 border-2 border-emerald-300 rounded-2xl space-y-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-xs">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Metode Pembayaran Shift</span>
                    <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded">
                      Diisi Dahulu
                    </span>
                  </h3>
                  <p className="text-[11px] text-emerald-800 font-medium">
                    Masukkan nominal penerimaan uang tunai & non-tunai. Volume liter terjual otomatis dihitung dalam <strong>angka bulat</strong>.
                  </p>
                </div>
              </div>

              {/* Mode Input Selector */}
              <div className="flex items-center gap-1 bg-white/90 border border-emerald-300 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setInputMode('payment')}
                  className={`px-2.5 py-1 rounded-lg transition-all text-xs flex items-center gap-1 ${
                    inputMode === 'payment'
                      ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Dari Pembayaran</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('meter')}
                  className={`px-2.5 py-1 rounded-lg transition-all text-xs flex items-center gap-1 ${
                    inputMode === 'meter'
                      ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Stand Meter</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('direct')}
                  className={`px-2.5 py-1 rounded-lg transition-all text-xs flex items-center gap-1 ${
                    inputMode === 'direct'
                      ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Manual Liter</span>
                </button>
              </div>
            </div>

            {/* Inputs Tunai, QRIS, EDC */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Uang Tunai */}
              <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Uang Tunai (Cash)</span>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded">
                    Setoran Fisik
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={paymentCash}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setPaymentCash(val);
                      if (!showCashReconciliation) {
                        setActualCashInHand(val);
                      }
                    }}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
                {/* Quick Add Chips */}
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  {[100000, 500000, 1000000].map((addVal) => (
                    <button
                      key={addVal}
                      type="button"
                      onClick={() => {
                        const next = (paymentCash || 0) + addVal;
                        setPaymentCash(next);
                        if (!showCashReconciliation) setActualCashInHand(next);
                      }}
                      className="text-[10px] px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded border border-emerald-200 transition-colors"
                    >
                      +{formatNumber(addVal / 1000)}rb
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentCash(0);
                      if (!showCashReconciliation) setActualCashInHand(0);
                    }}
                    className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded border border-slate-200 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* QRIS / MyPertamina */}
              <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>QRIS / MyPertamina</span>
                  <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.2 rounded">
                    Non-Tunai
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={paymentQris}
                    onChange={(e) => setPaymentQris(parseFloat(e.target.value) || 0)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  {[50000, 100000, 250000].map((addVal) => (
                    <button
                      key={addVal}
                      type="button"
                      onClick={() => setPaymentQris((prev) => (prev || 0) + addVal)}
                      className="text-[10px] px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold rounded border border-blue-200 transition-colors"
                    >
                      +{formatNumber(addVal / 1000)}rb
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPaymentQris(0)}
                    className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded border border-slate-200 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* EDC / Debit Bank */}
              <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>EDC / Kartu Bank</span>
                  <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-1.5 py-0.2 rounded">
                    Mesin Kartu
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={paymentEdc}
                    onChange={(e) => setPaymentEdc(parseFloat(e.target.value) || 0)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-hidden"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  {[50000, 100000, 250000].map((addVal) => (
                    <button
                      key={addVal}
                      type="button"
                      onClick={() => setPaymentEdc((prev) => (prev || 0) + addVal)}
                      className="text-[10px] px-1.5 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold rounded border border-purple-200 transition-colors"
                    >
                      +{formatNumber(addVal / 1000)}rb
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPaymentEdc(0)}
                    className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded border border-slate-200 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Ringkasan Total Pembayaran & Opsi Rekonsiliasi Fisik */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-white/95 rounded-xl border border-emerald-200 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Total Setoran Diterima:</span>
                <span className="font-mono font-black text-sm text-emerald-700">
                  Rp {formatRupiah(totalPayment)}
                </span>
                <span className="text-[10px] text-slate-500 hidden sm:inline">
                  (Tunai: {formatRupiah(paymentCash)} + QRIS: {formatRupiah(paymentQris)} + EDC: {formatRupiah(paymentEdc)})
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowCashReconciliation(!showCashReconciliation)}
                className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
              >
                {showCashReconciliation ? 'Tutup Rekonsiliasi Kasir' : 'Fisik Uang Kasir Berbeda?'}
              </button>
            </div>

            {/* Kotak Rekonsiliasi Kasir Tambahan jika ada selisih uang fisik kasir */}
            {showCashReconciliation && (
              <div className="p-3 bg-white rounded-xl border border-emerald-300 space-y-2 animate-in fade-in duration-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Uang Fisik Kasir Riil (Rp)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={actualCashInHand}
                      onChange={(e) => setActualCashInHand(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-700 mb-1">
                      Status Selisih Kas
                    </span>
                    <div className="p-1.5 rounded-lg border text-xs font-mono font-bold">
                      {actualCashInHand === paymentCash ? (
                        <span className="text-emerald-700">Kas Sesuai (Rp 0)</span>
                      ) : actualCashInHand > paymentCash ? (
                        <span className="text-blue-700">Lebih Kas: +Rp {formatRupiah(actualCashInHand - paymentCash)}</span>
                      ) : (
                        <span className="text-rose-700">Kurang Kas: -Rp {formatRupiah(paymentCash - actualCashInHand)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ================= BAGIAN 3: VOLUME LITER TERJUAL (OTOMATIS & ANGKA BULAT) ================= */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 sm:p-5 shadow-md">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Hasil Perhitungan Volume Liter Bulat */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Volume Liter Terjual (Otomatis)
                  </span>
                  <span className="text-[10px] bg-cyan-950 text-cyan-300 font-bold px-2 py-0.5 rounded-full border border-cyan-700">
                    Hanya Angka Bulat
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="text-3xl sm:text-4xl font-black font-mono text-cyan-300 tracking-tight">
                    {calculatedLiters}
                  </span>
                  <span className="text-base font-bold text-slate-300">Liter</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1.5 flex items-center gap-1 font-medium">
                  <span>Rumus:</span>
                  <span className="font-mono text-cyan-200">
                    Rp {formatRupiah(totalPayment)} ÷ Rp {formatRupiah(unitPrice)}/L = <strong>{calculatedLiters} L (Bulat)</strong>
                  </span>
                </p>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Sisa stok tangki teoritis:{' '}
                  <strong className="text-white">
                    {formatNumber(theoreticalRemainingStock)} L
                  </strong>
                </span>
              </div>

              {/* Total Nilai Omset BBM Terjual */}
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Total Nilai Omset BBM
                </span>
                <div className="mt-1.5">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                    Rp {formatRupiah(totalRevenue)}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-col gap-0.5 text-[11px]">
                  <span className="text-emerald-200">
                    Estimasi Margin Dealer: <strong>Rp {formatRupiah(totalProfit)}</strong>
                  </span>
                  {inputMode === 'payment' && paymentDifference !== 0 && (
                    <span className="text-amber-300 font-mono">
                      Pembulatan Kas: {paymentDifference > 0 ? `+Rp ${formatRupiah(paymentDifference)}` : `-Rp ${formatRupiah(Math.abs(paymentDifference))}`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Alternatif Input Stand Meter / Manual Liter jika mode diaktifkan */}
            {inputMode === 'meter' && (
              <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Stand Meter Awal (Liter)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={meterAwal}
                    onChange={(e) => setMeterAwal(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm font-mono font-bold text-white focus:ring-2 focus:ring-cyan-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Stand Meter Akhir (Liter)
                  </label>
                  <input
                    type="number"
                    min={meterAwal}
                    step="1"
                    value={meterAkhir}
                    onChange={(e) => setMeterAkhir(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm font-mono font-bold text-white focus:ring-2 focus:ring-cyan-500 outline-hidden"
                  />
                </div>
              </div>
            )}

            {inputMode === 'direct' && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Jumlah Liter Langsung (Angka Bulat)
                </label>
                <input
                  type="number"
                  min={1}
                  step="1"
                  value={directLiters}
                  onChange={(e) => setDirectLiters(Math.round(parseFloat(e.target.value) || 0))}
                  className="w-48 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm font-mono font-bold text-white focus:ring-2 focus:ring-cyan-500 outline-hidden"
                />
              </div>
            )}
          </div>

          {/* ================= BAGIAN 4: SOUNDING TANGKI MODULAR SAAT SHIFT ================= */}
          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
                  <Gauge className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Sounding Tangki Modular (Stik Ukur Shift)
                  </h3>
                  <p className="text-[11px] text-emerald-800">
                    Kalibrasi tera tangki: <strong>1 cm = 21 Liter</strong>
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-emerald-300 shadow-2xs">
                <input
                  type="checkbox"
                  checked={hasSounding}
                  onChange={(e) => setHasSounding(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-slate-800">
                  Catat Sounding
                </span>
              </label>
            </div>

            {hasSounding && (
              <div className="space-y-3.5 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Tinggi Celup Minyak (cm)</span>
                      <span className="text-[10px] text-slate-500 font-normal">Stik Celup</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={tankCapacity / LITERS_PER_CM}
                        step={0.1}
                        value={soundingStickCm}
                        onChange={(e) => handleSoundingStickChange(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                        cm
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Volume Hasil Tera (Liter)</span>
                      <span className="text-[10px] text-emerald-600 font-semibold">Terkonversi</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={tankCapacity}
                        value={soundingCalculatedLiters}
                        onChange={(e) => handleSoundingLitersChange(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                        Liter
                      </span>
                    </div>
                  </div>
                </div>

                {/* Selisih Fisik vs Buku */}
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                    soundingVariance === 0
                      ? 'bg-white border-slate-200 text-slate-700'
                      : soundingVariance > 0
                      ? 'bg-blue-50/80 border-blue-200 text-blue-900'
                      : 'bg-amber-50/80 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {soundingVariance > 0 ? (
                      <TrendingUp className="w-4 h-4 text-blue-600 shrink-0" />
                    ) : soundingVariance < 0 ? (
                      <TrendingDown className="w-4 h-4 text-amber-600 shrink-0" />
                    ) : (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <div>
                      <span className="font-bold">
                        Selisih Fisik vs Buku Sistem:{' '}
                        {soundingVariance > 0
                          ? `+${formatLiter(soundingVariance)} (Gain / Lebih)`
                          : soundingVariance < 0
                          ? `${formatLiter(soundingVariance)} (Loss / Susut)`
                          : 'Akurat 0 L (Presisi)'}
                      </span>
                      <p className="text-[11px] opacity-80">
                        Fisik stik: {formatNumber(soundingCalculatedLiters)} L | Buku teoritis: {formatNumber(theoreticalRemainingStock)} L
                      </p>
                    </div>
                  </div>
                  {soundingVariance !== 0 && (
                    <div className="text-right shrink-0">
                      <span className="font-mono font-black text-xs block text-slate-900">
                        {soundingVariance > 0 ? '+' : '-'}Rp {formatRupiah(Math.round(Math.abs(soundingVariance) * buyPriceSnapshot))}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/90 px-1.5 py-0.5 rounded inline-block mt-0.5">
                        ⚡ Otomatis Masuk Pembukuan
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={syncToSoundingLog}
                      onChange={(e) => setSyncToSoundingLog(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500"
                    />
                    <span>Sinkronkan ke Riwayat Sounding & Update Stok Tangki</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* ================= BAGIAN 5: UJI TERA & CATATAN ================= */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Uji Tera Bejana (L)
              </label>
              <input
                type="number"
                min={0}
                value={teraTestLiters}
                onChange={(e) => setTeraTestLiters(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Catatan Operasional / Nozzle
              </label>
              <input
                type="text"
                placeholder="misal: Pembayaran kasir tunai sesuai, uji tera 5L pas"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
          </div>

          {/* Sinkronisasi Absensi */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <span className="font-bold text-indigo-950">Sinkronkan ke Absensi Karyawan</span>
                <p className="text-[11px] text-indigo-700">
                  Otomatis mencatat kehadiran operator <strong>{operatorName || 'Operator'}</strong> pada shift ini.
                </p>
              </div>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer bg-white px-3 py-1 rounded-lg border border-indigo-300 shadow-2xs shrink-0">
              <input
                type="checkbox"
                checked={syncToAttendance}
                onChange={(e) => setSyncToAttendance(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded-md focus:ring-indigo-500"
              />
              <span className="text-xs font-bold text-indigo-900">Aktif</span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-auto">
              {isCurrentShiftTaken ? (
                <span className="text-xs text-rose-600 font-semibold flex items-center gap-1.5">
                  <Ban className="w-4 h-4 shrink-0" />
                  <span>Shift ini sudah terisi pada hari yang sama. Ganti shift untuk menyimpan.</span>
                </span>
              ) : isCurrentOperatorTaken ? (
                <span className="text-xs text-rose-600 font-semibold flex items-center gap-1.5">
                  <Ban className="w-4 h-4 shrink-0" />
                  <span>Operator '{operatorName}' sudah bertugas di tanggal ini. Pilih operator lain.</span>
                </span>
              ) : (
                <span className="text-xs text-slate-500">
                  Volume: <strong className="text-slate-800">{calculatedLiters} L (Bulat)</strong> | Total: <strong className="text-emerald-700">Rp {formatRupiah(totalRevenue)}</strong>
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                id="submit-sale-record-btn"
                type="submit"
                disabled={allShiftsTaken || isCurrentShiftTaken || isCurrentOperatorTaken || calculatedLiters <= 0}
                className={`px-5 py-2.5 text-sm font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 ${
                  allShiftsTaken || isCurrentShiftTaken || isCurrentOperatorTaken || calculatedLiters <= 0
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>{editingSale ? 'Simpan Perubahan Penjualan' : 'Simpan Laporan & Sounding Shift'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
