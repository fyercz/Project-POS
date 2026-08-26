import React, { useState, useEffect } from 'react';
import { X, Fuel, Calculator, Check, AlertCircle, Sparkles, User, Clock, Calendar, Wallet } from 'lucide-react';
import { Product, SaleRecord } from '../types';
import { formatRupiah, formatNumber, getTodayDateString, getCurrentTimeString } from '../utils/formatters';

interface SalesEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  currentPrice: number;
  currentBuyPrice: number;
  currentStockLiters: number;
  lastMeterReading?: number;
  onSaveSale: (sale: Omit<SaleRecord, 'id' | 'createdAt'>) => void;
}

export const SalesEntryModal: React.FC<SalesEntryModalProps> = ({
  isOpen,
  onClose,
  products,
  currentPrice,
  currentBuyPrice,
  currentStockLiters,
  lastMeterReading = 145530,
  onSaveSale,
}) => {
  const [transactionDate, setTransactionDate] = useState<string>(getTodayDateString());
  const [time, setTime] = useState<string>(getCurrentTimeString());
  const [shift, setShift] = useState<'Shift 1 (05.30 - 13.30)' | 'Shift 2 (13.30 - 19.30)' | 'Full Day'>('Shift 1 (05.30 - 13.30)');
  const [operatorName, setOperatorName] = useState<string>('Daslam');
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || 'prod-pertamax-92');
  
  // Metering mode: Totalisator Stand Meter vs Direct Liters
  const [inputMode, setInputMode] = useState<'meter' | 'direct'>('meter');
  const [meterAwal, setMeterAwal] = useState<number>(lastMeterReading);
  const [meterAkhir, setMeterAkhir] = useState<number>(lastMeterReading + 250);
  const [directLiters, setDirectLiters] = useState<number>(250);
  
  // Custom unit price if needed, initialized to current product price
  const [unitPrice, setUnitPrice] = useState<number>(currentPrice);
  
  // Payments
  const [paymentQris, setPaymentQris] = useState<number>(0);
  const [paymentEdc, setPaymentEdc] = useState<number>(0);
  const [actualCashInHand, setActualCashInHand] = useState<number>(0);
  
  const [teraTestLiters, setTeraTestLiters] = useState<number>(5);
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  // Update unitPrice when selected product or currentPrice changes
  useEffect(() => {
    if (selectedProduct) {
      setUnitPrice(selectedProduct.currentPrice);
    }
  }, [selectedProductId, selectedProduct, currentPrice]);

  // Computed liters sold
  const calculatedLiters = inputMode === 'meter' 
    ? Math.max(0, (meterAkhir || 0) - (meterAwal || 0))
    : Math.max(0, directLiters || 0);

  // Computed Total Revenue
  const totalRevenue = calculatedLiters * unitPrice;
  const buyPriceSnapshot = selectedProduct?.buyPrice || currentBuyPrice;
  const totalProfit = calculatedLiters * (unitPrice - buyPriceSnapshot);

  // Computed Cash expected
  const expectedCash = Math.max(0, totalRevenue - paymentQris - paymentEdc);
  const cashDifference = (actualCashInHand || 0) - expectedCash;

  // Set default actual cash when total revenue / non-cash changes
  useEffect(() => {
    setActualCashInHand(expectedCash);
  }, [expectedCash]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (calculatedLiters <= 0) {
      setErrorMessage('Jumlah liter penjualan harus lebih dari 0.');
      return;
    }

    if (calculatedLiters > currentStockLiters) {
      setErrorMessage(
        `Penjualan (${calculatedLiters} L) melebihi sisa stok di tangki (${currentStockLiters} L). Silakan cek kembali data totalisator.`
      );
      return;
    }

    if (!operatorName.trim()) {
      setErrorMessage('Nama operator / petugas nozzle wajib diisi.');
      return;
    }

    onSaveSale({
      transactionDate,
      time,
      shift,
      operatorName: operatorName.trim(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      meterAwal: inputMode === 'meter' ? meterAwal : undefined,
      meterAkhir: inputMode === 'meter' ? meterAkhir : undefined,
      literSold: calculatedLiters,
      unitPrice,
      buyPriceSnapshot,
      totalRevenue,
      totalProfit,
      paymentCash: expectedCash,
      paymentQris,
      paymentEdc,
      actualCashInHand: actualCashInHand || expectedCash,
      cashDifference: (actualCashInHand || expectedCash) - expectedCash,
      teraTestLiters,
      notes: notes.trim(),
    });

    onClose();
  };

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
              <h2 className="text-lg font-bold">Input Laporan Penjualan Harian</h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Pencatatan Penjualan Nozzle & Rekonsiliasi Kas Pertashop
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
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Tanggal, Shift, Operator */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Tanggal Penjualan
              </label>
              <input
                type="date"
                required
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Shift Operasional
              </label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                <option value="Shift 1 (05.30 - 13.30)">Shift 1 (05.30 - 13.30)</option>
                <option value="Shift 2 (13.30 - 19.30)">Shift 2 (13.30 - 19.30)</option>
                <option value="Full Day">Full Day (Akumulasi 1 Hari)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  Nama Operator
                </span>
                <span className="flex items-center gap-1">
                  {['Daslam', 'Angga'].map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setOperatorName(op)}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition-colors ${
                        operatorName === op
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                      }`}
                    >
                      {op}
                    </button>
                  ))}
                </span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Daslam / Angga"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
          </div>

          {/* Pilihan Produk BBM & Harga Satuan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <div>
              <label className="block text-xs font-semibold text-blue-900 mb-1">
                Nama Produk BBM
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
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
                <span className="text-[10px] text-blue-600 font-normal">Otomatis Aktif</span>
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
            </div>
          </div>

          {/* Mode Input: Stand Meter Totalisator vs Direct Liters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-blue-600" />
                Perhitungan Jumlah Liter
              </span>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setInputMode('meter')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    inputMode === 'meter'
                      ? 'bg-white text-blue-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Stand Meter Totalisator
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('direct')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    inputMode === 'direct'
                      ? 'bg-white text-blue-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Input Liter Langsung
                </button>
              </div>
            </div>

            {inputMode === 'meter' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Stand Meter Awal (Liter)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={meterAwal}
                    onChange={(e) => setMeterAwal(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Angka totalisator dispenser saat shift buka
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Stand Meter Akhir (Liter)
                  </label>
                  <input
                    type="number"
                    min={meterAwal}
                    step="any"
                    value={meterAkhir}
                    onChange={(e) => setMeterAkhir(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Angka totalisator dispenser saat shift tutup
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Jumlah Liter Terjual
                </label>
                <div className="relative max-w-xs">
                  <input
                    type="number"
                    min={1}
                    step="any"
                    value={directLiters}
                    onChange={(e) => setDirectLiters(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-base font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                    Liter
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Hasil Perhitungan Otomatis: Jumlah Liter & Total Pendapatan */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Jumlah Liter Terjual
                </span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-cyan-300">
                    {formatNumber(calculatedLiters, 2)}
                  </span>
                  <span className="text-sm font-bold text-slate-300">Liter</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Sisa tangki sesudah transaksi:{' '}
                  <strong className="text-white">
                    {formatNumber(Math.max(0, currentStockLiters - calculatedLiters))} L
                  </strong>
                </span>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Total Pendapatan Otomatis
                </span>
                <div className="mt-1">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                    {formatRupiah(totalRevenue)}
                  </span>
                </div>
                <span className="text-[11px] text-emerald-200 mt-1 block">
                  Estimasi Margin Dealer: <strong>{formatRupiah(totalProfit)}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Rincian Pembayaran (Non-Tunai & Tunai) */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-emerald-600" />
              Metode Pembayaran & Rekonsiliasi Kas
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  QRIS / MyPertamina (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={paymentQris}
                  onChange={(e) => setPaymentQris(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  EDC / Debit Bank (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={paymentEdc}
                  onChange={(e) => setPaymentEdc(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Setoran Fisik Tunai (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={actualCashInHand}
                  onChange={(e) => setActualCashInHand(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>

            {/* Indikator Selisih Kas */}
            <div className="flex items-center justify-between text-xs p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-600">
                Porsi Tunai Seharusnya: <strong className="font-mono text-slate-900">{formatRupiah(expectedCash)}</strong>
              </span>
              <span
                className={`font-bold font-mono px-2 py-0.5 rounded-md ${
                  cashDifference === 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : cashDifference > 0
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {cashDifference === 0
                  ? 'Kas Sesuai (Rp 0)'
                  : cashDifference > 0
                  ? `Lebih Kas: +${formatRupiah(cashDifference)}`
                  : `Kurang Kas: ${formatRupiah(cashDifference)}`}
              </span>
            </div>
          </div>

          {/* Catatan / Tera Nozzle */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Uji Tera Bejana Ukur (L)
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
                placeholder="misal: Uji takar pagi 5L akurat, nozzle 1 lancar"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              id="submit-sale-record-btn"
              type="submit"
              className="px-5 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Laporan Penjualan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
