import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  DollarSign,
  UserCheck,
  Clock,
  Zap,
  Droplets,
  Wrench,
  Receipt,
  Calendar,
  Wallet,
  Building2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Fuel,
  TrendingDown,
  Scale,
} from 'lucide-react';
import { ExpenseRecord, ExpenseCategoryType, EXPENSE_RATES } from '../types';
import { getTodayDateString, getCurrentTimeString, formatRupiah, formatNumber } from '../utils/formatters';

interface ExpenseEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveExpense: (expense: Omit<ExpenseRecord, 'id' | 'createdAt'>) => void;
  initialCategory?: ExpenseCategoryType;
  editingExpense?: ExpenseRecord | null;
  defaultBuyPrice?: number;
}

export const ExpenseEntryModal: React.FC<ExpenseEntryModalProps> = ({
  isOpen,
  onClose,
  onSaveExpense,
  initialCategory = 'GAJI_OPERATOR',
  editingExpense = null,
  defaultBuyPrice = 15046,
}) => {
  const [category, setCategory] = useState<ExpenseCategoryType>(initialCategory);
  const [date, setDate] = useState<string>(getTodayDateString());
  const [time, setTime] = useState<string>(getCurrentTimeString());
  const [title, setTitle] = useState<string>('');
  const [amount, setAmount] = useState<number>(EXPENSE_RATES.GAJI_OPERATOR_PER_HARI);
  const [quantity, setQuantity] = useState<number>(1);
  const [unitRate, setUnitRate] = useState<number>(EXPENSE_RATES.GAJI_OPERATOR_PER_HARI);
  const [fuelLossLiters, setFuelLossLiters] = useState<number>(5);
  const [fuelLossBuyPrice, setFuelLossBuyPrice] = useState<number>(defaultBuyPrice);
  const [personOrVendor, setPersonOrVendor] = useState<string>('Daslam');
  const [shift, setShift] = useState<string>('Shift 1 (05.30 - 13.30)');
  const [paymentSource, setPaymentSource] = useState<'KAS_HARIAN' | 'REKENING_BANK'>('KAS_HARIAN');
  const [notes, setNotes] = useState<string>('');
  const [maintenanceItem, setMaintenanceItem] = useState<string>('Dispenser & Nozzle');

  // Handle Preset Switching
  const handleSelectCategory = (cat: ExpenseCategoryType) => {
    setCategory(cat);
    if (cat === 'GAJI_OPERATOR') {
      const rate = EXPENSE_RATES.GAJI_OPERATOR_PER_HARI; // 40.000
      setUnitRate(rate);
      setQuantity(1);
      setAmount(rate);
      setTitle(`Gaji Harian Operator (${personOrVendor || 'Daslam'})`);
      setPaymentSource('KAS_HARIAN');
    } else if (cat === 'LEMBURAN') {
      const rate = EXPENSE_RATES.LEMBURAN_PER_SHIFT; // 30.000
      setUnitRate(rate);
      setQuantity(1);
      setAmount(rate);
      setTitle(`Uang Lemburan Shift (${personOrVendor || 'Daslam'})`);
      setPaymentSource('KAS_HARIAN');
    } else if (cat === 'TOKEN_LISTRIK') {
      setUnitRate(100000);
      setQuantity(1);
      setAmount(100000);
      setTitle('Beli Token Listrik PLN Pertashop');
      setPersonOrVendor('PLN Prabayar');
      setPaymentSource('KAS_HARIAN');
    } else if (cat === 'PDAM') {
      setUnitRate(50000);
      setQuantity(1);
      setAmount(50000);
      setTitle('Pembayaran Tagihan Air PDAM');
      setPersonOrVendor('PDAM Tirta');
      setPaymentSource('KAS_HARIAN');
    } else if (cat === 'MAINTENANCE_ALAT') {
      setUnitRate(75000);
      setQuantity(1);
      setAmount(75000);
      setTitle(`Maintenance & Servis ${maintenanceItem}`);
      setPersonOrVendor('Teknisi / Bengkel Alat');
      setPaymentSource('KAS_HARIAN');
    } else if (cat === 'LOSSES_MINYAK') {
      const lts = fuelLossLiters || 5;
      const bp = fuelLossBuyPrice || defaultBuyPrice;
      const calculatedAmount = Math.round(lts * bp);
      setQuantity(lts);
      setUnitRate(bp);
      setAmount(calculatedAmount);
      setTitle(`Beban Losses Minyak Pertamax (${formatNumber(lts, 1)} L)`);
      setPersonOrVendor('Susut Penguapan & Tera Dispenser');
      setPaymentSource('KAS_HARIAN');
    } else {
      setUnitRate(25000);
      setQuantity(1);
      setAmount(25000);
      setTitle('Pengeluaran Operasional Lainnya');
      setPersonOrVendor('-');
      setPaymentSource('KAS_HARIAN');
    }
  };

  useEffect(() => {
    if (editingExpense) {
      setCategory(editingExpense.category);
      setDate(editingExpense.date);
      setTime(editingExpense.time);
      setTitle(editingExpense.title);
      setAmount(editingExpense.amount);
      setQuantity(editingExpense.quantity || 1);
      setUnitRate(editingExpense.unitRate || editingExpense.amount);
      setFuelLossLiters(editingExpense.fuelLossLiters || editingExpense.quantity || 5);
      setFuelLossBuyPrice(editingExpense.fuelLossBuyPriceSnapshot || editingExpense.unitRate || defaultBuyPrice);
      setPersonOrVendor(editingExpense.personOrVendor || '');
      setShift(editingExpense.shift || 'Shift 1 (05.30 - 13.30)');
      setPaymentSource(editingExpense.paymentSource);
      setNotes(editingExpense.notes || '');
    } else if (isOpen) {
      handleSelectCategory((initialCategory || 'GAJI_OPERATOR') as ExpenseCategoryType);
      setDate(getTodayDateString());
      setTime(getCurrentTimeString());
      setNotes('');
    }
  }, [isOpen, initialCategory, editingExpense]);

  // Recalculate amount when qty or unitRate changes for Gaji / Lemburan
  const handleQuantityChange = (qty: number) => {
    const validQty = Math.max(1, qty);
    setQuantity(validQty);
    if (category === 'GAJI_OPERATOR' || category === 'LEMBURAN') {
      setAmount(validQty * unitRate);
    }
  };

  const handleUnitRateChange = (rate: number) => {
    const validRate = Math.max(0, rate);
    setUnitRate(validRate);
    if (category === 'GAJI_OPERATOR' || category === 'LEMBURAN') {
      setAmount(quantity * validRate);
    }
  };

  // Recalculate for Losses Minyak
  const handleFuelLossLitersChange = (lts: number) => {
    const validLts = Math.max(0.1, lts);
    setFuelLossLiters(validLts);
    setQuantity(validLts);
    const calculated = Math.round(validLts * fuelLossBuyPrice);
    setAmount(calculated);
    setTitle(`Beban Losses Minyak Pertamax (${formatNumber(validLts, 1)} L)`);
  };

  const handleFuelLossBuyPriceChange = (bp: number) => {
    const validBp = Math.max(0, bp);
    setFuelLossBuyPrice(validBp);
    setUnitRate(validBp);
    const calculated = Math.round(fuelLossLiters * validBp);
    setAmount(calculated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert('Nominal pengeluaran harus lebih besar dari Rp 0');
      return;
    }

    onSaveExpense({
      date,
      time,
      category,
      title: title.trim() || `Pengeluaran ${category}`,
      amount,
      quantity: category === 'LOSSES_MINYAK' ? fuelLossLiters : quantity,
      unitRate: category === 'LOSSES_MINYAK' ? fuelLossBuyPrice : unitRate,
      fuelLossLiters: category === 'LOSSES_MINYAK' ? fuelLossLiters : undefined,
      fuelLossBuyPriceSnapshot: category === 'LOSSES_MINYAK' ? fuelLossBuyPrice : undefined,
      personOrVendor: personOrVendor.trim(),
      shift,
      paymentSource,
      notes: notes.trim(),
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {editingExpense ? 'Edit Pengeluaran Operasional' : 'Catat Pengeluaran Operasional'}
              </h2>
              <p className="text-xs text-slate-300">
                Gaji operator, lembur, losses minyak, listrik, PDAM, & maintenance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Quick Category Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Pilih Kategori Beban Operasional:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleSelectCategory('GAJI_OPERATOR')}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  category === 'GAJI_OPERATOR'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-xs ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-bold">Gaji Operator</span>
                </div>
                <span className="text-[10px] text-blue-700 font-mono mt-1">
                  Rp 40.000 / hari
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectCategory('LEMBURAN')}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  category === 'LEMBURAN'
                    ? 'border-amber-600 bg-amber-50 text-amber-900 shadow-xs ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-bold">Uang Lemburan</span>
                </div>
                <span className="text-[10px] text-amber-700 font-mono mt-1">
                  Rp 30.000 / shift
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectCategory('LOSSES_MINYAK')}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  category === 'LOSSES_MINYAK'
                    ? 'border-rose-600 bg-rose-50 text-rose-900 shadow-xs ring-2 ring-rose-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-bold">Losses Minyak</span>
                </div>
                <span className="text-[10px] text-rose-700 font-mono mt-1">Susut / Penguapan</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectCategory('TOKEN_LISTRIK')}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  category === 'TOKEN_LISTRIK'
                    ? 'border-yellow-500 bg-yellow-50 text-yellow-900 shadow-xs ring-2 ring-yellow-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-yellow-600 shrink-0" />
                  <span className="font-bold">Token Listrik</span>
                </div>
                <span className="text-[10px] text-yellow-700 font-mono mt-1">PLN Prabayar</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectCategory('PDAM')}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  category === 'PDAM'
                    ? 'border-cyan-600 bg-cyan-50 text-cyan-900 shadow-xs ring-2 ring-cyan-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-cyan-600 shrink-0" />
                  <span className="font-bold">Tagihan PDAM</span>
                </div>
                <span className="text-[10px] text-cyan-700 font-mono mt-1">Air Bersih</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectCategory('MAINTENANCE_ALAT')}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  category === 'MAINTENANCE_ALAT'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-xs ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="font-bold">Maintenance</span>
                </div>
                <span className="text-[10px] text-indigo-700 font-mono mt-1">Dispenser / Servis</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectCategory('LAINNYA')}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between col-span-2 sm:col-span-1 ${
                  category === 'LAINNYA'
                    ? 'border-slate-600 bg-slate-100 text-slate-900 shadow-xs ring-2 ring-slate-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-slate-600 shrink-0" />
                  <span className="font-bold">Lain-lain / ATK</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono mt-1">Kas Kecil</span>
              </button>
            </div>
          </div>

          {/* Specific Banner Helper */}
          {category === 'GAJI_OPERATOR' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-700" />
                <span className="text-blue-900 font-medium">
                  Standar Gaji: <strong>Rp 40.000 per hari / operator</strong>
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-blue-200 text-blue-900 font-bold font-mono text-[11px]">
                {quantity} Hari = {formatRupiah(quantity * unitRate)}
              </span>
            </div>
          )}

          {category === 'LEMBURAN' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-700" />
                <span className="text-amber-900 font-medium">
                  Standar Lembur: <strong>Rp 30.000 per shift lembur</strong>
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 font-bold font-mono text-[11px]">
                {quantity} Shift = {formatRupiah(quantity * unitRate)}
              </span>
            </div>
          )}

          {category === 'LOSSES_MINYAK' && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-900 font-bold">
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                  <span>Formula Akuntansi Beban Losses Minyak:</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-rose-200 text-rose-900 font-extrabold font-mono text-xs">
                  {formatRupiah(amount)}
                </span>
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed font-mono">
                Beban Losses (Rp) = Volume Susut ({formatNumber(fuelLossLiters, 1)} L) × Harga Tebus/Beli ({formatRupiah(fuelLossBuyPrice)}/L)
              </p>
              <div className="text-[10px] text-rose-600">
                * Beban losses minyak akan langsung memotong margin laba kotor & diperhitungkan ke dalam akuntansi laba rugi.
              </div>
            </div>
          )}

          {/* Date, Time, Shift */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Tanggal
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Jam / Waktu</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Shift / Periode</label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                <option value="Shift 1 (05.30 - 13.30)">Shift 1 (05.30 - 13.30)</option>
                <option value="Shift 2 (13.30 - 19.30)">Shift 2 (13.30 - 19.30)</option>
                <option value="Full Day">Full Day</option>
                <option value="Non-Shift">Non-Shift / Kantor</option>
              </select>
            </div>
          </div>

          {/* Title / Description */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Keterangan / Nama Pengeluaran
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Gaji Harian Ahmad Fauzi / Susut Penguapan Tangki"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          {/* Quantity & Unit Rate Calculation OR Losses Calculator OR Direct Amount */}
          {category === 'LOSSES_MINYAK' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-rose-50/70 p-3.5 rounded-xl border border-rose-200">
              <div>
                <label className="block text-rose-900 font-semibold mb-1 flex items-center gap-1">
                  <Fuel className="w-3.5 h-3.5 text-rose-600" />
                  Volume Susut (Liter)
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  required
                  value={fuelLossLiters}
                  onChange={(e) => handleFuelLossLitersChange(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-rose-200 rounded-lg font-mono font-bold text-rose-950 focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-rose-900 font-semibold mb-1 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-rose-600" />
                  Harga Tebus / Beli (Rp/L)
                </label>
                <input
                  type="number"
                  min="1000"
                  step="1"
                  required
                  value={fuelLossBuyPrice}
                  onChange={(e) => handleFuelLossBuyPriceChange(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-rose-200 rounded-lg font-mono font-bold text-rose-950 focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-rose-900 font-semibold mb-1">
                  Total Beban Losses (Rp)
                </label>
                <div className="px-3 py-1.5 bg-rose-200/80 border border-rose-300 rounded-lg font-mono font-extrabold text-rose-950 text-sm flex items-center h-[34px]">
                  {formatRupiah(amount)}
                </div>
              </div>
            </div>
          ) : (category === 'GAJI_OPERATOR' || category === 'LEMBURAN') ? (
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {category === 'GAJI_OPERATOR' ? 'Jumlah Hari' : 'Jumlah Shift'}
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={quantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Tarif Satuan (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  value={unitRate}
                  onChange={(e) => handleUnitRateChange(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Total Biaya (Rp)
                </label>
                <div className="px-3 py-1.5 bg-slate-200/80 border border-slate-300 rounded-lg font-mono font-extrabold text-blue-900 text-sm">
                  {formatRupiah(amount)}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Nominal Pengeluaran (Rp)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 font-mono font-bold text-slate-400">
                  Rp
                </span>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  required
                  value={amount}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setAmount(val);
                    setUnitRate(val);
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              {/* Quick Nominal Pill Buttons */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[50000, 100000, 200000, 500000, 1000000].map((nom) => (
                  <button
                    key={nom}
                    type="button"
                    onClick={() => {
                      setAmount(nom);
                      setUnitRate(nom);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-mono font-semibold transition-colors"
                  >
                    +{formatRupiah(nom)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Penerima / Vendor & Sumber Pembayaran */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Penerima / Vendor / Keterangan Sumber
              </label>
              <input
                type="text"
                placeholder="e.g. Daslam / PLN / PDAM / Selisih Sounding"
                value={personOrVendor}
                onChange={(e) => setPersonOrVendor(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Sumber Dana Pembayaran
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentSource('KAS_HARIAN')}
                  className={`px-3 py-2 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all ${
                    paymentSource === 'KAS_HARIAN'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                      : 'border-slate-200 text-slate-600 bg-white'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Kas Harian</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentSource('REKENING_BANK')}
                  className={`px-3 py-2 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all ${
                    paymentSource === 'REKENING_BANK'
                      ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-xs'
                      : 'border-slate-200 text-slate-600 bg-white'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Rekening Bank</span>
                </button>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Catatan Tambahan (Opsional)</label>
            <textarea
              rows={2}
              placeholder="Catatan detail pengeluaran..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>

            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingExpense ? 'Simpan Perubahan' : 'Catat Pengeluaran'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
