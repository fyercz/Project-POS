import React, { useState, useEffect } from 'react';
import { X, DollarSign, TrendingUp, TrendingDown, History, Check, FileText, Sparkles, Calendar } from 'lucide-react';
import { Product, PriceHistory, SaleRecord, PurchaseOrder } from '../types';
import { formatRupiah, formatShortDate, getTodayDateString } from '../utils/formatters';
import { formatMonthYearId, getEffectivePriceForDate } from '../utils/pricing';

interface PriceManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  priceHistory: PriceHistory[];
  sales?: SaleRecord[];
  purchases?: PurchaseOrder[];
  onUpdateProductPrice: (newPriceData: {
    productId: string;
    newPrice: number;
    newBuyPrice: number;
    effectiveDate: string;
    referenceDoc?: string;
    notes?: string;
    autoUpdateMonthSales?: boolean;
  }) => void;
}

export const PriceManagementModal: React.FC<PriceManagementModalProps> = ({
  isOpen,
  onClose,
  products,
  priceHistory,
  sales = [],
  purchases = [],
  onUpdateProductPrice,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || 'prod-pertamax-92');
  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const [newSellingPrice, setNewSellingPrice] = useState<number>(selectedProduct?.currentPrice || 12950);
  const [newBuyPrice, setNewBuyPrice] = useState<number>(selectedProduct?.buyPrice || 12100);
  const [effectiveDate, setEffectiveDate] = useState<string>(getTodayDateString());
  const [effectiveTime, setEffectiveTime] = useState<string>('00:00');
  const [referenceDoc, setReferenceDoc] = useState<string>('');
  const [notes, setNotes] = useState<string>('Penyesuaian tarif Pertamax berkala');
  const [autoUpdateMonthSales, setAutoUpdateMonthSales] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');

  // Load existing price for target date / month when effectiveDate or selectedProductId changes
  useEffect(() => {
    if (selectedProduct && isOpen) {
      const existingEff = getEffectivePriceForDate(selectedProductId, effectiveDate, products, priceHistory);
      setNewSellingPrice(existingEff.sellingPrice);
      setNewBuyPrice(existingEff.buyPrice);
    }
  }, [effectiveDate, selectedProductId, isOpen]);

  if (!isOpen || !selectedProduct) return null;

  const targetMonth = effectiveDate.substring(0, 7); // YYYY-MM
  const targetMonthLabel = formatMonthYearId(targetMonth);

  // Filter sales and purchases in the targeted month
  const matchingSales = sales.filter(
    (s) => s.productId === selectedProductId && s.transactionDate.startsWith(targetMonth)
  );
  const matchingPurchases = purchases.filter(
    (p) => p.productId === selectedProductId && p.orderDate.startsWith(targetMonth)
  );

  const currentMargin = selectedProduct.currentPrice - selectedProduct.buyPrice;
  const newMargin = newSellingPrice - newBuyPrice;
  const priceDiff = newSellingPrice - selectedProduct.currentPrice;

  const handleProductSelect = (pId: string) => {
    setSelectedProductId(pId);
    const eff = getEffectivePriceForDate(pId, effectiveDate, products, priceHistory);
    setNewSellingPrice(eff.sellingPrice);
    setNewBuyPrice(eff.buyPrice);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSellingPrice <= 0 || newBuyPrice <= 0) return;

    onUpdateProductPrice({
      productId: selectedProduct.id,
      newPrice: newSellingPrice,
      newBuyPrice: newBuyPrice,
      effectiveDate: `${effectiveDate} ${effectiveTime}`,
      referenceDoc: referenceDoc.trim(),
      notes: notes.trim() || `Penyesuaian tarif ${targetMonthLabel}`,
      autoUpdateMonthSales,
    });

    onClose();
  };

  const filteredHistory = priceHistory.filter((h) => h.productId === selectedProductId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        id="price-management-modal-container"
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-cyan-300 rounded-xl border border-blue-400/30">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Dashboard Penyesuaian Harga BBM
                <span className="text-[10px] bg-blue-500/30 text-cyan-300 px-2 py-0.5 rounded-full border border-blue-400/30">
                  Admin Panel
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Ubah tarif Pertamax, harga tebus Pertamina, & sinkronisasi otomatis transaksi bulanan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'form'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Form Penyesuaian Harga</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Riwayat Perubahan ({filteredHistory.length})</span>
          </button>
        </div>

        {/* Product selector tabs */}
        <div className="p-6 pb-2">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Pilih Produk BBM:
          </label>
          <div className="flex gap-2">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleProductSelect(p.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer ${
                  selectedProductId === p.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{p.name}</span>
                <span className="font-mono opacity-80 font-normal">
                  ({formatRupiah(p.currentPrice)}/L)
                </span>
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'form' ? (
          <form onSubmit={handleSubmit} className="p-6 pt-3 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Current Price Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-[11px] font-medium text-slate-500 block">Harga Jual Saat Ini</span>
                <span className="text-base font-bold font-mono text-slate-900 block mt-0.5">
                  {formatRupiah(selectedProduct.currentPrice)}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-500 block">Harga Tebus Pertamina</span>
                <span className="text-base font-bold font-mono text-slate-700 block mt-0.5">
                  {formatRupiah(selectedProduct.buyPrice)}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-500 block">Margin Dealer Aktif</span>
                <span className="text-base font-bold font-mono text-emerald-700 block mt-0.5">
                  {formatRupiah(currentMargin)} / L
                </span>
              </div>
            </div>

            {/* Waktu Efektif & Target Bulan */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>Bulan & Tanggal Berlaku Efektif</span>
                </label>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  Target: {targetMonthLabel}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] font-medium text-slate-500 block mb-1">Tanggal Mulai Berlaku</span>
                  <input
                    type="date"
                    required
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-blue-600 rounded-xl text-xs font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-500 block mb-1">Jam Efektif</span>
                  <input
                    type="time"
                    required
                    value={effectiveTime}
                    onChange={(e) => setEffectiveTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-blue-600 rounded-xl text-xs font-semibold text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Form Inputs for New Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Harga Jual Satuan Baru (Rp / Liter)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    required
                    min={1000}
                    step={50}
                    value={newSellingPrice}
                    onChange={(e) => setNewSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full pl-11 pr-3 py-2.5 bg-white border-2 border-blue-200 focus:border-blue-600 rounded-xl text-base font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-100 outline-hidden"
                  />
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs">
                  {priceDiff > 0 ? (
                    <span className="text-rose-600 font-semibold flex items-center gap-0.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Naik +{formatRupiah(priceDiff)}/L
                    </span>
                  ) : priceDiff < 0 ? (
                    <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                      <TrendingDown className="w-3.5 h-3.5" />
                      Turun {formatRupiah(priceDiff)}/L
                    </span>
                  ) : (
                    <span className="text-slate-400">Tidak ada perubahan dari harga master</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Harga Tebus Pertamina Baru (Rp / Liter)
                  <span className="text-[10px] text-blue-600 font-normal ml-1">
                    (s/d 3 desimal)
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    required
                    min={1000}
                    step="0.001"
                    value={newBuyPrice}
                    onChange={(e) => setNewBuyPrice(parseFloat(e.target.value) || 0)}
                    className="w-full pl-11 pr-3 py-2.5 bg-white border border-slate-300 focus:border-blue-600 rounded-xl text-base font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-100 outline-hidden"
                    placeholder="Contoh: 15046.375"
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Harga invoice DO/penebusan dari Pertamina
                </span>
              </div>
            </div>

            {/* Calculated New Margin Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-900 block">
                  Kalkulasi Margin Dealer Baru:
                </span>
                <span className="text-xs text-emerald-700">
                  {formatRupiah(newSellingPrice)} - {formatRupiah(newBuyPrice)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-lg font-black font-mono text-emerald-800">
                  {formatRupiah(newMargin)}
                </span>
                <span className="text-xs font-semibold text-emerald-700 block">per Liter</span>
              </div>
            </div>

            {/* AUTOMATIC MONTH SYNCHRONIZATION BANNER */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 bg-blue-600 text-white rounded-lg mt-0.5 shrink-0 shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-blue-900 flex items-center gap-2">
                    <span>Sinkronisasi Otomatis Bulan {targetMonthLabel}</span>
                    {matchingSales.length > 0 && (
                      <span className="text-[10px] bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full font-bold">
                        {matchingSales.length} Transaksi Ditemukan
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                    {matchingSales.length > 0 ? (
                      <>
                        Ditemukan <strong>{matchingSales.length} transaksi penjualan</strong> dan{' '}
                        <strong>{matchingPurchases.length} penerimaan DO BBM</strong> di bulan{' '}
                        <strong>{targetMonthLabel}</strong>. Seluruh transaksi tersebut akan otomatis disesuaikan
                        ke tarif baru ({formatRupiah(newSellingPrice)}/L), dan seluruh omzet, keuntungan kotor,
                        serta rekapitulasi laba rugi akan dikalkulasi ulang secara otomatis.
                      </>
                    ) : (
                      <>
                        Belum ada transaksi di bulan <strong>{targetMonthLabel}</strong>. Tarif baru ini akan
                        otomatis menjadi harga default untuk setiap transaksi penjualan dan DO BBM yang diinput
                        pada bulan <strong>{targetMonthLabel}</strong>.
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-blue-200/70">
                <label className="flex items-center gap-2.5 text-xs font-bold text-blue-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoUpdateMonthSales}
                    onChange={(e) => setAutoUpdateMonthSales(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>
                    Otomatis sesuaikan seluruh transaksi di bulan {targetMonthLabel} dengan harga yang diganti
                  </span>
                </label>
              </div>
            </div>

            {/* Referensi SK & Catatan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Surat Edaran / SK Pertamina
                </label>
                <input
                  type="text"
                  placeholder="e.g. SK No. 129/PND/VIII/2026"
                  value={referenceDoc}
                  onChange={(e) => setReferenceDoc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Penyesuaian
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </div>
            </div>

            {/* Footer buttons */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                id="save-price-adjustment-btn"
                type="submit"
                className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Penyesuaian Harga</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 pt-3 max-h-[70vh] overflow-y-auto space-y-3">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Belum ada riwayat penyesuaian harga tercatat untuk produk ini.
              </div>
            ) : (
              filteredHistory.map((item) => {
                const monthName = formatMonthYearId(item.effectiveDate.substring(0, 7));
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {monthName} ({formatShortDate(item.effectiveDate)})
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600">{item.effectiveDate}</span>
                      </div>
                      {item.referenceDoc && (
                        <div className="text-blue-700 font-medium mt-0.5 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          <span>{item.referenceDoc}</span>
                        </div>
                      )}
                      {item.notes && <p className="text-slate-500 mt-1">{item.notes}</p>}
                    </div>

                    <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4">
                      <div className="flex items-baseline gap-1 justify-end font-mono">
                        <span className="text-slate-400 line-through">
                          {formatRupiah(item.oldPrice)}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">
                          → {formatRupiah(item.newPrice)}
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                        Tebus: {formatRupiah(item.newBuyPrice)} | Margin: {formatRupiah(item.marginPerLiter)}/L
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

