import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  DollarSign,
  TrendingUp,
  TrendingDown,
  History,
  Check,
  FileText,
  Sparkles,
  Calendar,
  Lock,
  Unlock,
  Link2,
  ArrowRight,
  Percent,
  RefreshCw,
  Calculator,
  ShieldCheck,
  Info,
  Layers,
} from 'lucide-react';
import { Product, PriceHistory, SaleRecord, PurchaseOrder } from '../types';
import { formatRupiah, formatShortDate, getTodayDateString } from '../utils/formatters';
import {
  formatMonthYearId,
  getEffectivePriceForDate,
  PriceLinkMode,
  PERTASHOP_STANDARD_MARGINS,
  calculateInterconnectedPrices,
  applyPriceDelta,
} from '../utils/pricing';

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
  const [linkMode, setLinkMode] = useState<PriceLinkMode>('LOCK_MARGIN');

  const [effectiveDate, setEffectiveDate] = useState<string>(getTodayDateString());
  const [effectiveTime, setEffectiveTime] = useState<string>('00:00');
  const [referenceDoc, setReferenceDoc] = useState<string>('');
  const [notes, setNotes] = useState<string>('Penyesuaian tarif Pertamax berkala');
  const [autoUpdateMonthSales, setAutoUpdateMonthSales] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'form' | 'history' | 'simulation'>('form');

  // Baseline effective price for current selected product & date
  const baselinePrice = useMemo(() => {
    return getEffectivePriceForDate(selectedProductId, effectiveDate, products, priceHistory, sales);
  }, [selectedProductId, effectiveDate, products, priceHistory, sales]);

  // Load existing price for target date / month when effectiveDate or selectedProductId changes
  useEffect(() => {
    if (selectedProduct && isOpen) {
      const existingEff = getEffectivePriceForDate(selectedProductId, effectiveDate, products, priceHistory, sales);
      setNewSellingPrice(existingEff.sellingPrice);
      setNewBuyPrice(existingEff.buyPrice);
    }
  }, [effectiveDate, selectedProductId, isOpen]);

  if (!isOpen || !selectedProduct) return null;

  const targetMonth = effectiveDate.substring(0, 7); // YYYY-MM
  const targetMonthLabel = formatMonthYearId(targetMonth);

  // Derived margin & percentage
  const currentMargin = Math.round((newSellingPrice - newBuyPrice) * 1000) / 1000;
  const marginPercent = newSellingPrice > 0 ? (currentMargin / newSellingPrice) * 100 : 0;

  // Differences against baseline
  const diffSelling = newSellingPrice - baselinePrice.sellingPrice;
  const diffBuy = newBuyPrice - baselinePrice.buyPrice;
  const diffMargin = currentMargin - baselinePrice.marginPerLiter;

  // Filter sales and purchases in the targeted month
  const matchingSales = sales.filter(
    (s) => s.productId === selectedProductId && s.transactionDate.startsWith(targetMonth)
  );
  const matchingPurchases = purchases.filter(
    (p) => p.productId === selectedProductId && p.orderDate.startsWith(targetMonth)
  );

  // Financial continuity simulation
  const totalMatchingLiterSold = matchingSales.reduce((acc, s) => acc + s.literSold, 0);
  const totalMatchingRevenue = matchingSales.reduce((acc, s) => acc + s.totalRevenue, 0);
  const totalMatchingProfit = matchingSales.reduce((acc, s) => acc + s.totalProfit, 0);
  const projectedRevenue = totalMatchingLiterSold * newSellingPrice;
  const projectedGrossProfit = totalMatchingLiterSold * currentMargin;
  const projectedRevenueDelta = projectedRevenue - totalMatchingRevenue;
  const projectedGrossProfitDelta = projectedGrossProfit - totalMatchingProfit;

  const totalMatchingDoLiters = matchingPurchases.reduce((acc, p) => acc + p.volumeLiters, 0);
  const totalMatchingDoAmount = matchingPurchases.reduce((acc, p) => acc + p.totalAmount, 0);
  const projectedDoAmount = totalMatchingDoLiters * newBuyPrice;
  const projectedDoAmountDelta = projectedDoAmount - totalMatchingDoAmount;

  // --- Handlers for Interconnected Price Variables ---
  const handleSellingPriceChange = (val: number) => {
    const updated = calculateInterconnectedPrices('sellingPrice', val, {
      sellingPrice: newSellingPrice,
      buyPrice: newBuyPrice,
      margin: currentMargin,
      linkMode,
    });
    setNewSellingPrice(updated.sellingPrice);
    setNewBuyPrice(updated.buyPrice);
  };

  const handleBuyPriceChange = (val: number) => {
    const updated = calculateInterconnectedPrices('buyPrice', val, {
      sellingPrice: newSellingPrice,
      buyPrice: newBuyPrice,
      margin: currentMargin,
      linkMode,
    });
    setNewSellingPrice(updated.sellingPrice);
    setNewBuyPrice(updated.buyPrice);
  };

  const handleMarginChange = (val: number) => {
    const updated = calculateInterconnectedPrices('margin', val, {
      sellingPrice: newSellingPrice,
      buyPrice: newBuyPrice,
      margin: currentMargin,
      linkMode,
    });
    setNewSellingPrice(updated.sellingPrice);
    setNewBuyPrice(updated.buyPrice);
  };

  const handleApplyPresetMargin = (presetVal: number) => {
    const updated = calculateInterconnectedPrices('margin', presetVal, {
      sellingPrice: newSellingPrice,
      buyPrice: newBuyPrice,
      margin: currentMargin,
      linkMode,
    });
    setNewSellingPrice(updated.sellingPrice);
    setNewBuyPrice(updated.buyPrice);
  };

  const handleApplyDelta = (delta: number) => {
    const updated = applyPriceDelta(delta, {
      sellingPrice: newSellingPrice,
      buyPrice: newBuyPrice,
      margin: currentMargin,
      linkMode,
    });
    setNewSellingPrice(updated.sellingPrice);
    setNewBuyPrice(updated.buyPrice);
  };

  const handleResetToBaseline = () => {
    setNewSellingPrice(baselinePrice.sellingPrice);
    setNewBuyPrice(baselinePrice.buyPrice);
  };

  const handleProductSelect = (pId: string) => {
    setSelectedProductId(pId);
    const eff = getEffectivePriceForDate(pId, effectiveDate, products, priceHistory, sales);
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
        className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-cyan-300 rounded-xl border border-blue-400/30">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Dashboard Penyesuaian Harga BBM
                <span className="text-[10px] bg-blue-500/30 text-cyan-300 px-2 py-0.5 rounded-full border border-blue-400/30 font-semibold">
                  Variabel Berkesinambungan
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Keterkaitan dinamis 3 variabel: <strong>Harga Jual</strong>, <strong>Harga Tebus Pertamina</strong>, dan <strong>Margin Dealer</strong>
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'form'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Form Variabel Terhubung</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('simulation')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'simulation'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Simulasi Dampak Omzet & Laba</span>
            {matchingSales.length > 0 && (
              <span className="bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                {matchingSales.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Riwayat Perubahan ({filteredHistory.length})</span>
          </button>
        </div>

        {/* Product selector tabs */}
        <div className="p-4 sm:p-5 pb-2 bg-white shrink-0 border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Produk BBM:
              </span>
              <div className="flex gap-2">
                {products.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProductSelect(p.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer ${
                      selectedProductId === p.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{p.name}</span>
                    <span className="font-mono opacity-90 font-normal">
                      ({formatRupiah(p.currentPrice)}/L)
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetToBaseline}
              className="text-xs text-slate-500 hover:text-blue-600 font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors"
              title="Reset ke harga acuan dasar bulan/tanggal yang dipilih"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset ke Tarif Acuan</span>
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        {activeTab === 'form' && (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 pt-3 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
            {/* CONTINUITY EQUATION RIBBON */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 rounded-2xl shadow-sm border border-blue-800/50">
              <div className="flex items-center justify-between text-xs font-semibold text-blue-200 mb-2">
                <span className="flex items-center gap-1.5">
                  <Link2 className="w-4 h-4 text-cyan-300" />
                  <span>Keterkaitan Berkesinambungan 3 Variabel Utama:</span>
                </span>
                <span className="text-[11px] font-mono bg-blue-500/30 px-2 py-0.5 rounded-md border border-blue-400/30 text-cyan-200">
                  Harga Jual = Harga Tebus + Margin
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
                {/* Variable 1 */}
                <div className={`p-3 rounded-xl border transition-all ${
                  linkMode === 'LOCK_SELLING_PRICE'
                    ? 'bg-blue-800/70 border-cyan-400 shadow-xs'
                    : 'bg-white/10 border-white/10'
                }`}>
                  <div className="flex items-center justify-between text-[11px] text-blue-200">
                    <span>Harga Jual</span>
                    {linkMode === 'LOCK_SELLING_PRICE' && (
                      <span className="flex items-center gap-0.5 text-cyan-300 text-[10px] font-bold">
                        <Lock className="w-3 h-3" /> Terkunci
                      </span>
                    )}
                  </div>
                  <div className="text-base sm:text-lg font-black font-mono text-white mt-0.5">
                    {formatRupiah(newSellingPrice)}
                  </div>
                  <div className="text-[10px] text-blue-300 flex items-center gap-1 mt-0.5">
                    {diffSelling > 0 ? (
                      <span className="text-emerald-300 font-bold">+{formatRupiah(diffSelling)}</span>
                    ) : diffSelling < 0 ? (
                      <span className="text-rose-300 font-bold">{formatRupiah(diffSelling)}</span>
                    ) : (
                      <span className="text-blue-300/80">Sesuai tarif acuan</span>
                    )}
                  </div>
                </div>

                {/* Variable 2 */}
                <div className={`p-3 rounded-xl border transition-all ${
                  linkMode === 'LOCK_BUY_PRICE'
                    ? 'bg-blue-800/70 border-cyan-400 shadow-xs'
                    : 'bg-white/10 border-white/10'
                }`}>
                  <div className="flex items-center justify-between text-[11px] text-blue-200">
                    <span>Harga Tebus Pertamina</span>
                    {linkMode === 'LOCK_BUY_PRICE' && (
                      <span className="flex items-center gap-0.5 text-cyan-300 text-[10px] font-bold">
                        <Lock className="w-3 h-3" /> Terkunci
                      </span>
                    )}
                  </div>
                  <div className="text-base sm:text-lg font-black font-mono text-white mt-0.5">
                    {formatRupiah(newBuyPrice)}
                  </div>
                  <div className="text-[10px] text-blue-300 flex items-center gap-1 mt-0.5">
                    {diffBuy > 0 ? (
                      <span className="text-amber-300 font-bold">+{formatRupiah(diffBuy)}</span>
                    ) : diffBuy < 0 ? (
                      <span className="text-emerald-300 font-bold">{formatRupiah(diffBuy)}</span>
                    ) : (
                      <span className="text-blue-300/80">Sesuai tarif acuan</span>
                    )}
                  </div>
                </div>

                {/* Variable 3 */}
                <div className={`p-3 rounded-xl border transition-all ${
                  linkMode === 'LOCK_MARGIN'
                    ? 'bg-emerald-950/80 border-emerald-400 shadow-xs'
                    : 'bg-white/10 border-white/10'
                }`}>
                  <div className="flex items-center justify-between text-[11px] text-emerald-200">
                    <span>Margin Dealer</span>
                    {linkMode === 'LOCK_MARGIN' && (
                      <span className="flex items-center gap-0.5 text-emerald-300 text-[10px] font-bold">
                        <ShieldCheck className="w-3.5 h-3.5" /> Terkunci
                      </span>
                    )}
                  </div>
                  <div className="text-base sm:text-lg font-black font-mono text-emerald-300 mt-0.5">
                    {formatRupiah(currentMargin)} <span className="text-xs font-normal text-emerald-400">/L</span>
                  </div>
                  <div className="text-[10px] text-emerald-200 flex items-center justify-between mt-0.5">
                    <span>Porsi: <strong>{marginPercent.toFixed(1)}%</strong></span>
                    {diffMargin !== 0 && (
                      <span className={diffMargin > 0 ? 'text-emerald-300 font-bold' : 'text-amber-300 font-bold'}>
                        {diffMargin > 0 ? `+${formatRupiah(diffMargin)}` : formatRupiah(diffMargin)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* LINK MODE SELECTOR */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Link2 className="w-4 h-4 text-blue-600" />
                  <span>Mode Hubungan & Penguncian Variabel</span>
                </label>
                <span className="text-[11px] text-slate-500">
                  Tentukan variabel mana yang dijaga konstan
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setLinkMode('LOCK_MARGIN')}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    linkMode === 'LOCK_MARGIN'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs ring-1 ring-emerald-400'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-xs">
                    <span>Kunci Margin</span>
                    <ShieldCheck className={`w-4 h-4 ${linkMode === 'LOCK_MARGIN' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                    Margin ({formatRupiah(currentMargin)}/L) tetap. Jual & Tebus naik/turun bersamaan.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setLinkMode('LOCK_BUY_PRICE')}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    linkMode === 'LOCK_BUY_PRICE'
                      ? 'bg-blue-50 border-blue-500 text-blue-950 shadow-xs ring-1 ring-blue-400'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-xs">
                    <span>Kunci Tebus DO</span>
                    <Lock className={`w-4 h-4 ${linkMode === 'LOCK_BUY_PRICE' ? 'text-blue-600' : 'text-slate-400'}`} />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                    Harga beli DO tetap. Ubah harga jual otomatis menggeser margin.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setLinkMode('LOCK_SELLING_PRICE')}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    linkMode === 'LOCK_SELLING_PRICE'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-950 shadow-xs ring-1 ring-indigo-400'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-xs">
                    <span>Kunci Harga Jual</span>
                    <Lock className={`w-4 h-4 ${linkMode === 'LOCK_SELLING_PRICE' ? 'text-indigo-600' : 'text-slate-400'}`} />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                    Harga jual tetap. Kenaikan harga tebus menyerap/mengurangi margin.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setLinkMode('FREE')}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    linkMode === 'FREE'
                      ? 'bg-slate-100 border-slate-500 text-slate-900 shadow-xs ring-1 ring-slate-400'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-xs">
                    <span>Input Bebas</span>
                    <Unlock className={`w-4 h-4 ${linkMode === 'FREE' ? 'text-slate-700' : 'text-slate-400'}`} />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                    Tanpa penguncian. Masukkan jual & tebus bebas, margin dihitung otomatis.
                  </p>
                </button>
              </div>
            </div>

            {/* Waktu Efektif & Target Bulan */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>Bulan & Tanggal Mulai Berlaku</span>
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

            {/* THREE INTERACTIVE VARIABLE INPUTS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Variabel 1: Harga Jual */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  1. Harga Jual Konsumen
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    required
                    min={1000}
                    step={50}
                    value={newSellingPrice}
                    onChange={(e) => handleSellingPriceChange(parseFloat(e.target.value) || 0)}
                    className="w-full pl-9 pr-2 py-2 bg-white border-2 border-blue-200 focus:border-blue-600 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-100 outline-hidden"
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5 text-[11px]">
                  <span className="text-slate-500">Acuan: {formatRupiah(baselinePrice.sellingPrice)}</span>
                  {diffSelling !== 0 ? (
                    <span className={diffSelling > 0 ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                      {diffSelling > 0 ? `+${formatRupiah(diffSelling)}` : formatRupiah(diffSelling)}
                    </span>
                  ) : (
                    <span className="text-slate-400">Sama</span>
                  )}
                </div>
              </div>

              {/* Variabel 2: Harga Tebus */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  2. Harga Tebus Pertamina
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    required
                    min={1000}
                    step="0.001"
                    value={newBuyPrice}
                    onChange={(e) => handleBuyPriceChange(parseFloat(e.target.value) || 0)}
                    className="w-full pl-9 pr-2 py-2 bg-white border border-slate-300 focus:border-blue-600 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-100 outline-hidden"
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5 text-[11px]">
                  <span className="text-slate-500">Acuan: {formatRupiah(baselinePrice.buyPrice)}</span>
                  {diffBuy !== 0 ? (
                    <span className={diffBuy > 0 ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                      {diffBuy > 0 ? `+${formatRupiah(diffBuy)}` : formatRupiah(diffBuy)}
                    </span>
                  ) : (
                    <span className="text-slate-400">Sama</span>
                  )}
                </div>
              </div>

              {/* Variabel 3: Margin Dealer */}
              <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
                <label className="block text-xs font-bold text-emerald-900 mb-1">
                  3. Margin Dealer Pertashop
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-emerald-600">Rp</span>
                  <input
                    type="number"
                    required
                    min={100}
                    step={10}
                    value={currentMargin}
                    onChange={(e) => handleMarginChange(parseFloat(e.target.value) || 0)}
                    className="w-full pl-9 pr-2 py-2 bg-white border-2 border-emerald-300 focus:border-emerald-600 rounded-xl text-sm font-mono font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-100 outline-hidden"
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5 text-[11px]">
                  <span className="text-emerald-700 font-medium">
                    Porsi: <strong>{marginPercent.toFixed(1)}%</strong>
                  </span>
                  {diffMargin !== 0 ? (
                    <span className={diffMargin > 0 ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                      {diffMargin > 0 ? `+${formatRupiah(diffMargin)}` : formatRupiah(diffMargin)}
                    </span>
                  ) : (
                    <span className="text-emerald-600/70">Tetap</span>
                  )}
                </div>
              </div>
            </div>

            {/* PRESETS & DELTA SHORTCUTS */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Preset Margin Standar Pertashop:</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PERTASHOP_STANDARD_MARGINS.map((pm) => (
                    <button
                      key={pm.value}
                      type="button"
                      onClick={() => handleApplyPresetMargin(pm.value)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        Math.round(currentMargin) === pm.value
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                      title={pm.desc}
                    >
                      {pm.label} ({formatRupiah(pm.value)})
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-600 font-medium">
                  Penyesuaian Delta Serentak ({linkMode === 'LOCK_MARGIN' ? 'Menjaga Margin Tetap' : 'Sesuai Mode'}):
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  {[-500, -250, 250, 500, 1000].map((delta) => (
                    <button
                      key={delta}
                      type="button"
                      onClick={() => handleApplyDelta(delta)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                        delta > 0
                          ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </button>
                  ))}
                </div>
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
                    <span>Sinkronisasi Otomatis Seluruh Transaksi Bulan {targetMonthLabel}</span>
                    {matchingSales.length > 0 && (
                      <span className="text-[10px] bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full font-bold">
                        {matchingSales.length} Transaksi Ditemukan
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                    {matchingSales.length > 0 ? (
                      <>
                        Ditemukan <strong>{matchingSales.length} transaksi penjualan ({totalMatchingLiterSold.toLocaleString('id-ID')} L)</strong> dan{' '}
                        <strong>{matchingPurchases.length} penerimaan DO BBM ({totalMatchingDoLiters.toLocaleString('id-ID')} L)</strong> di bulan{' '}
                        <strong>{targetMonthLabel}</strong>. Seluruh data transaksi, omzet, dan laba kotor akan otomatis disinkronkan secara berkesinambungan.
                      </>
                    ) : (
                      <>
                        Belum ada transaksi penjualan di bulan <strong>{targetMonthLabel}</strong>. Tarif baru ini akan otomatis menjadi acuan untuk setiap transaksi dan DO BBM di bulan tersebut.
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
                    Otomatis sesuaikan seluruh transaksi di bulan {targetMonthLabel} dengan harga baru
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
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
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
        )}

        {/* TAB: SIMULASI DAMPAK BERKESINAMBUNGAN */}
        {activeTab === 'simulation' && (
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-blue-600" />
                  <span>Proyeksi Kesinambungan Finansial ({targetMonthLabel})</span>
                </h4>
                <span className="text-[11px] text-slate-500 font-mono">
                  {totalMatchingLiterSold.toLocaleString('id-ID')} Liter Terjual
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-medium block">Proyeksi Omzet Penjualan</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-base font-bold font-mono text-slate-900">
                      {formatRupiah(projectedRevenue)}
                    </span>
                    <span className={`text-[11px] font-bold ${projectedRevenueDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ({projectedRevenueDelta >= 0 ? `+${formatRupiah(projectedRevenueDelta)}` : formatRupiah(projectedRevenueDelta)})
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Sebelumnya: {formatRupiah(totalMatchingRevenue)}
                  </span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-medium block">Proyeksi Laba Kotor Penyalur</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-base font-bold font-mono text-emerald-700">
                      {formatRupiah(projectedGrossProfit)}
                    </span>
                    <span className={`text-[11px] font-bold ${projectedGrossProfitDelta >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      ({projectedGrossProfitDelta >= 0 ? `+${formatRupiah(projectedGrossProfitDelta)}` : formatRupiah(projectedGrossProfitDelta)})
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Sebelumnya: {formatRupiah(totalMatchingProfit)}
                  </span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-medium block">Total Penebusan DO BBM</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-base font-bold font-mono text-slate-900">
                      {formatRupiah(projectedDoAmount)}
                    </span>
                    <span className={`text-[11px] font-bold ${projectedDoAmountDelta >= 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      ({projectedDoAmountDelta >= 0 ? `+${formatRupiah(projectedDoAmountDelta)}` : formatRupiah(projectedDoAmountDelta)})
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    {matchingPurchases.length} PO / DO BBM ({totalMatchingDoLiters.toLocaleString('id-ID')} L)
                  </span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-medium block">Efisiensi Margin Dealer</span>
                  <div className="text-base font-bold font-mono text-blue-700 mt-1">
                    {marginPercent.toFixed(2)}% dari Omzet
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Rp {formatRupiah(currentMargin)} per Liter bersih
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600" />
                <span>Prinsip Kesinambungan Finansial:</span>
              </div>
              <p className="text-blue-800 leading-relaxed">
                Saat tarif BBM diperbarui, sistem menjaga konsistensi antara omzet harian, laba kotor shift, rekonsiliasi kas operator, serta nilai pembelian DO dari Pertamina tanpa ada selisih yang tertinggal.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Kembali ke Form Penyesuaian
              </button>
            </div>
          </div>
        )}

        {/* TAB: RIWAYAT PERUBAHAN */}
        {activeTab === 'history' && (
          <div className="p-6 pt-3 space-y-3 overflow-y-auto flex-1">
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
