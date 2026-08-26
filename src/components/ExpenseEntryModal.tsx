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
} from 'lucide-react';
import { ExpenseRecord, ExpenseCategoryType, EXPENSE_RATES } from '../types';
import { getTodayDateString, getCurrentTimeString, formatRupiah } from '../utils/formatters';

interface ExpenseEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveExpense: (expense: Omit<ExpenseRecord, 'id' | 'createdAt'>) => void;
  initialCategory?: ExpenseCategoryType;
  editingExpense?: ExpenseRecord | null;
}

export const ExpenseEntryModal: React.FC<ExpenseEntryModalProps> = ({
  isOpen,
  onClose,
  onSaveExpense,
  initialCategory = 'GAJI_OPERATOR',
  editingExpense = null,
}) => {
  const [category, setCategory] = useState<ExpenseCategoryType>(initialCategory);
  const [date, setDate] = useState<string>(getTodayDateString());
  const [time, setTime] = useState<string>(getCurrentTimeString());
  const [title, setTitle] = useState<string>('');
  const [amount, setAmount] = useState<number>(EXPENSE_RATES.GAJI_OPERATOR_PER_HARI);
  const [quantity, setQuantity] = useState<number>(1);
  const [unitRate, setUnitRate] = useState<number>(EXPENSE_RATES.GAJI_OPERATOR_PER_HARI);
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
      quantity,
      unitRate,
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
                Gaji operator (Rp 40k), lembur (Rp 30k), listrik, PDAM, & maintenance
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSelectCategory('GAJI_OPERATOR')}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  category === 'GAJI_OPERATOR'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-xs'
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
                    ? 'border-amber-600 bg-amber-50 text-amber-900 shadow-xs'
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
                onClick={() => handleSelectCategory('TOKEN_LISTRIK')}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  category === 'TOKEN_LISTRIK'
                    ? 'border-yellow-500 bg-yellow-50 text-yellow-900 shadow-xs'
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
                    ? 'border-cyan-600 bg-cyan-50 text-cyan-900 shadow-xs'
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
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="font-bold">Maintenance Alat</span>
                </div>
                <span className="text-[10px] text-indigo-700 font-mono mt-1">Dispenser / Servis</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectCategory('LAINNYA')}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  category === 'LAINNYA'
                    ? 'border-slate-600 bg-slate-100 text-slate-900 shadow-xs'
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
              placeholder="e.g. Gaji Harian Ahmad Fauzi / Token Listrik PLN"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          {/* Quantity & Unit Rate Calculation OR Direct Amount */}
          {(category === 'GAJI_OPERATOR' || category === 'LEMBURAN') ? (
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
                {[20000, 50000, 100000, 150000, 200000, 500000].map((quickNom) => (
                  <button
                    key={quickNom}
                    type="button"
                    onClick={() => {
                      setAmount(quickNom);
                      setUnitRate(quickNom);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-mono font-semibold text-[11px] transition-colors ${
                      amount === quickNom
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    +{formatRupiah(quickNom)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Maintenance specifics */}
          {category === 'MAINTENANCE_ALAT' && (
            <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 space-y-2">
              <label className="block text-indigo-950 font-semibold">
                Komponen / Bagian yang Diservis:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Dispenser & Nozzle Pompa',
                  'Kalibrasi Tera Bejana 5L',
                  'Genset Cadangan Listrik',
                  'Filter & Selang Hose',
                  'Tangki Pendam & Manhole',
                  'Alat Pemadam Api (APAR)',
                ].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setMaintenanceItem(item);
                      setTitle(`Maintenance & Servis ${item}`);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                      maintenanceItem === item
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border border-indigo-200 text-indigo-800'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recipient/Vendor & Payment Source */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                {category === 'GAJI_OPERATOR' || category === 'LEMBURAN'
                  ? 'Nama Operator Penerima'
                  : 'Vendor / No. Referensi / ID Pelanggan'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Daslam / Angga / No. ID PLN"
                  value={personOrVendor}
                  onChange={(e) => setPersonOrVendor(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              {(category === 'GAJI_OPERATOR' || category === 'LEMBURAN') && (
                <div className="flex gap-1.5 mt-1.5">
                  {['Daslam', 'Angga'].map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => {
                        setPersonOrVendor(op);
                        if (category === 'GAJI_OPERATOR') setTitle(`Gaji Harian Operator (${op})`);
                        if (category === 'LEMBURAN') setTitle(`Uang Lemburan Shift (${op})`);
                      }}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-700"
                    >
                      {op}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-slate-500" />
                Sumber Dana Pembayaran
              </label>
              <select
                value={paymentSource}
                onChange={(e) => setPaymentSource(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                <option value="KAS_HARIAN">Kas Harian Pertashop (Dipotong dari Uang Kasir)</option>
                <option value="REKENING_BANK">Rekening Bank / Kas Pengelola</option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                {paymentSource === 'KAS_HARIAN'
                  ? '⚠️ Mempengaruhi rekonsiliasi setoran uang fisik harian kasir.'
                  : 'Dibayarkan via transfer bank/owner, tidak memotong uang fisik kasir.'}
              </p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Catatan / Detail Tambahan (Opsional)
            </label>
            <textarea
              rows={2}
              placeholder="Catatan kwitansi, nomor meter token, kondisi alat sebelum diservis, dll."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden resize-none"
            />
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-slate-500 text-xs">
              Total yang dicatat:{' '}
              <strong className="text-slate-900 font-mono font-bold text-sm">
                {formatRupiah(amount)}
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Simpan Pengeluaran
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
