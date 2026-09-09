import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Truck, AlertCircle, Check, Fuel, Building2, Calendar, FileCheck, Layers, History, CheckCircle2 } from 'lucide-react';
import { Product, PurchaseOrder, TankConfig, OrderVolumePecahan, PriceHistory, SaleRecord } from '../types';
import { formatRupiah, formatNumber, formatLiter, formatShortDate, getTodayDateString, addDays } from '../utils/formatters';
import { getEffectivePriceForDate, formatMonthYearId, getLatestPurchaseBuyPrice, getNextPurchaseOrderDate } from '../utils/pricing';
import { ConfirmModal } from './ConfirmModal';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  priceHistory?: PriceHistory[];
  sales?: SaleRecord[];
  purchases?: PurchaseOrder[];
  lastInputtedOrderDate?: string | null;
  tank: TankConfig;
  defaultKL?: OrderVolumePecahan;
  tbbmDepot: string;
  editingOrder?: PurchaseOrder | null;
  onSaveOrder: (poData: Omit<PurchaseOrder, 'id' | 'createdAt'>) => void;
}

export const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  products,
  priceHistory = [],
  sales = [],
  purchases = [],
  lastInputtedOrderDate,
  tank,
  defaultKL = 2,
  tbbmDepot,
  editingOrder,
  onSaveOrder,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || 'prod-pertamax-92');
  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const [volumeKL, setVolumeKL] = useState<OrderVolumePecahan>(defaultKL);
  const [orderDate, setOrderDate] = useState<string>(getTodayDateString());
  const [orderDateSourceDesc, setOrderDateSourceDesc] = useState<string>('');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState<string>(addDays(getTodayDateString(), 1));
  
  // Custom Buy Price per Liter (defaults to history terakhir pembelian)
  const [buyPricePerLiter, setBuyPricePerLiter] = useState<number>(selectedProduct?.buyPrice || 12100);
  
  // Pertamina DO / SO reference details
  const [soPertaminaNumber, setSoPertaminaNumber] = useState<string>('');
  const [doPertaminaNumber, setDoPertaminaNumber] = useState<string>('');
  const [supplyDepot, setSupplyDepot] = useState<string>(tbbmDepot || 'TBBM Rewulu / Boyolali');
  const [truckPlateNumber, setTruckPlateNumber] = useState<string>('AD 8492 FB');
  const [driverName, setDriverName] = useState<string>('Pak Joko Santoso');
  const [notes, setNotes] = useState<string>('Pemesanan kuota harian Pertashop.');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showOverflowConfirm, setShowOverflowConfirm] = useState<boolean>(false);

  // History terakhir pembelian untuk produk yang dipilih
  const latestPurchaseInfo = getLatestPurchaseBuyPrice(
    selectedProductId,
    purchases,
    selectedProduct?.buyPrice || 12100
  );

  useEffect(() => {
    if (editingOrder) {
      setSelectedProductId(editingOrder.productId);
      setVolumeKL(editingOrder.volumeKL);
      setOrderDate(editingOrder.orderDate);
      setOrderDateSourceDesc(`Edit DO (${editingOrder.poNumber})`);
      setEstimatedDeliveryDate(editingOrder.estimatedDeliveryDate);
      setBuyPricePerLiter(editingOrder.buyPricePerLiter);
      setSoPertaminaNumber(editingOrder.soPertaminaNumber || '');
      setDoPertaminaNumber(editingOrder.doPertaminaNumber || '');
      setSupplyDepot(editingOrder.supplyDepot || tbbmDepot || 'TBBM Rewulu / Boyolali');
      setTruckPlateNumber(editingOrder.truckPlateNumber || '');
      setDriverName(editingOrder.driverName || '');
      setNotes(editingOrder.notes || '');
    } else if (isOpen) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const firstProdId = products[0]?.id || 'prod-pertamax-92';
      const firstProd = products.find((p) => p.id === firstProdId) || products[0];
      setSelectedProductId(firstProdId);
      setVolumeKL(defaultKL || 2);

      // Tanggal: Menyesuaikan tanggal terakhir yang telah diinput setelahnya, bukan tanggal saat ini
      const nextDateConfig = getNextPurchaseOrderDate(purchases, sales, lastInputtedOrderDate);
      setOrderDate(nextDateConfig.targetOrderDate);
      setOrderDateSourceDesc(nextDateConfig.sourceDesc);
      setEstimatedDeliveryDate(addDays(nextDateConfig.targetOrderDate, 1));

      // Harga Beli: Mengikuti history terakhir pembelian
      const historyPrice = getLatestPurchaseBuyPrice(firstProdId, purchases, firstProd?.buyPrice || 12100);
      setBuyPricePerLiter(historyPrice.buyPrice);

      setSoPertaminaNumber(`SO-PTM-${randomSuffix}`);
      setDoPertaminaNumber(`DO-PTM-${randomSuffix + 100}`);
      setSupplyDepot(tbbmDepot || 'TBBM Rewulu / Boyolali');
      setTruckPlateNumber('AD 8492 FB');
      setDriverName('Pak Joko Santoso');
      setNotes('Pemesanan kuota harian Pertashop.');
    }
  }, [editingOrder, isOpen, defaultKL, tbbmDepot]);

  const handleOrderDateChange = (newDate: string) => {
    setOrderDate(newDate);
    setEstimatedDeliveryDate(addDays(newDate, 1));

    // Jika belum ada riwayat pembelian terdahulu, gunakan effectivePriceForDate
    if (!latestPurchaseInfo.hasHistory && selectedProduct) {
      const eff = getEffectivePriceForDate(selectedProductId, newDate, products, priceHistory, sales);
      setBuyPricePerLiter(eff.buyPrice);
    }
  };

  const handleProductChange = (newProdId: string) => {
    setSelectedProductId(newProdId);
    const prod = products.find((p) => p.id === newProdId);
    // Harga Beli: Selalu prioritaskan history terakhir pembelian
    const historyPrice = getLatestPurchaseBuyPrice(newProdId, purchases, prod?.buyPrice || 12100);
    setBuyPricePerLiter(historyPrice.buyPrice);
  };


  if (!isOpen) return null;

  const effectivePriceForDate = getEffectivePriceForDate(selectedProductId, orderDate, products, priceHistory, sales);
  const volumeLiters = volumeKL * 1000;
  const totalAmount = volumeLiters * buyPricePerLiter;
  const ullageLiters = tank.totalCapacityLiters - tank.currentStockLiters;
  const willOverflow = !editingOrder && volumeLiters > ullageLiters;

  const executeSaveOrder = () => {
    const generatedPoNumber = editingOrder
      ? editingOrder.poNumber
      : `PO-PTS-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;

    onSaveOrder({
      poNumber: generatedPoNumber,
      soPertaminaNumber: soPertaminaNumber.trim(),
      doPertaminaNumber: doPertaminaNumber.trim(),
      orderDate,
      estimatedDeliveryDate,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      volumeKL,
      volumeLiters,
      buyPricePerLiter,
      totalAmount,
      supplyDepot: supplyDepot.trim(),
      truckPlateNumber: truckPlateNumber.trim(),
      driverName: driverName.trim(),
      status: editingOrder ? editingOrder.status : 'DIPESAN',
      actualDeliveryDate: editingOrder?.actualDeliveryDate,
      soundingBeforeCm: editingOrder?.soundingBeforeCm,
      soundingBeforeLiters: editingOrder?.soundingBeforeLiters,
      soundingAfterCm: editingOrder?.soundingAfterCm,
      soundingAfterLiters: editingOrder?.soundingAfterLiters,
      actualLitersReceived: editingOrder?.actualLitersReceived,
      varianceLiters: editingOrder?.varianceLiters,
      density: editingOrder?.density,
      temperature: editingOrder?.temperature,
      completedAt: editingOrder?.completedAt,
      notes: notes.trim(),
    });

    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (willOverflow) {
      setShowOverflowConfirm(true);
      return;
    }

    executeSaveOrder();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        id="purchase-order-modal-container"
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 via-red-700 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                {editingOrder ? 'Edit Pemesanan DO Pertamina' : 'Pemesanan DO Pertamax ke Pertamina'}
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">
                  {editingOrder ? editingOrder.poNumber : 'Penebusan BBM'}
                </span>
              </h2>
              <p className="text-xs text-red-100 mt-0.5">
                {editingOrder
                  ? 'Perbarui data nomor DO, plat armada, volume, harga tebus, atau catatan.'
                  : 'Pemesanan resmi Delivery Order ke Fuel Terminal / TBBM Pertamina'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-red-200 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Sisa Stok & Ullage Status */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Fuel className="w-4 h-4 text-blue-600" />
              <span className="text-slate-600">
                Stok Tangki Saat Ini: <strong className="text-slate-900 font-mono">{formatLiter(tank.currentStockLiters)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-600">
                Ruang Kosong (<span className="italic">Ullage</span>):{' '}
                <strong className="text-blue-700 font-mono font-bold">{formatLiter(ullageLiters)}</strong>
              </span>
            </div>
          </div>

          {/* Pecahan Volume Pemesanan: 1 KL, 2 KL, 3 KL */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-red-600" />
              Pilih Pecahan Volume Pemesanan (KiloLiter)
            </label>
            <p className="text-xs text-slate-500">
              Pertamina melayani mobil tangki bersekat dengan kapasitas kompartemen 1 KL, 2 KL, dan 3 KL untuk Pertashop.
            </p>

            <div className="grid grid-cols-3 gap-3 pt-1">
              {([1, 2, 3] as OrderVolumePecahan[]).map((kl) => {
                const klLiters = kl * 1000;
                const isSelected = volumeKL === kl;
                const exceedsUllage = klLiters > ullageLiters;

                return (
                  <button
                    key={kl}
                    type="button"
                    onClick={() => setVolumeKL(kl)}
                    className={`relative p-4 rounded-xl border-2 transition-all text-left flex flex-col justify-between ${
                      isSelected
                        ? 'border-red-600 bg-red-50/70 text-slate-900 shadow-sm ring-2 ring-red-200'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg sm:text-xl font-black font-mono">
                          {kl} KL
                        </span>
                        {isSelected && (
                          <span className="p-1 rounded-full bg-red-600 text-white">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-slate-500 block mt-0.5">
                        {formatNumber(klLiters)} Liter
                      </span>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200/60 text-[11px]">
                      {exceedsUllage ? (
                        <span className="text-amber-700 font-medium">⚠️ Melebihi ullage saat ini</span>
                      ) : (
                        <span className="text-emerald-700 font-medium">✓ Muat di tangki</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tanggal Pemesanan & Estimasi Pengiriman */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Tanggal Pemesanan (PO/DO)
                </label>
                {/* Quick Date Steppers */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOrderDateChange(addDays(orderDate, -1))}
                    title="Mundur 1 hari"
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                  >
                    -1 Hari
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOrderDateChange(addDays(orderDate, 1))}
                    title="Maju 1 hari"
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                  >
                    +1 Hari
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOrderDateChange(getTodayDateString())}
                    title="Set tanggal hari ini"
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                  >
                    Hari Ini
                  </button>
                </div>
              </div>
              <input
                type="date"
                required
                value={orderDate}
                onChange={(e) => handleOrderDateChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none"
              />
              {orderDateSourceDesc && (
                <p className="mt-1 text-[11px] text-blue-700 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block shrink-0"></span>
                  <span>{orderDateSourceDesc}</span>
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Estimasi Tanggal Pengiriman
              </label>
              <input
                type="date"
                required
                value={estimatedDeliveryDate}
                onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Default pengiriman H+1 dari tanggal pemesanan DO.
              </p>
            </div>
          </div>

          {/* Product & Buy Price per Liter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Produk BBM
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Harga Tebus Pertamina (Rp / Liter)</span>
                {latestPurchaseInfo.hasHistory ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                    <History className="w-3 h-3 text-emerald-700" />
                    History Terakhir
                  </span>
                ) : (
                  <span className="text-[10px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded">
                    {effectivePriceForDate.sourceDesc || `Tarif ${formatMonthYearId(orderDate.substring(0, 7))}`}
                  </span>
                )}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                <input
                  type="number"
                  required
                  min={1000}
                  step="0.001"
                  value={buyPricePerLiter}
                  onChange={(e) => setBuyPricePerLiter(parseFloat(e.target.value) || 0)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  placeholder="Contoh: 15046.375"
                />
              </div>

              {/* Status History Pembelian */}
              {latestPurchaseInfo.hasHistory ? (
                <div className="mt-1.5 text-[11px] bg-emerald-50 text-emerald-800 p-2 rounded-lg border border-emerald-200 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      Mengikuti history PO terakhir (<strong>{latestPurchaseInfo.lastPoNumber}</strong> tgl {formatShortDate(latestPurchaseInfo.lastPoDate || '')}):{' '}
                      <strong className="font-mono text-emerald-950">Rp {formatRupiah(latestPurchaseInfo.buyPrice)}/L</strong>
                    </span>
                  </div>
                  {buyPricePerLiter !== latestPurchaseInfo.buyPrice && (
                    <div className="pt-0.5 flex items-center justify-between">
                      <span className="text-amber-700 font-medium">Harga diubah manual</span>
                      <button
                        type="button"
                        onClick={() => setBuyPricePerLiter(latestPurchaseInfo.buyPrice)}
                        className="text-emerald-700 hover:text-emerald-950 font-bold underline cursor-pointer"
                      >
                        Gunakan Rp {formatRupiah(latestPurchaseInfo.buyPrice)} (PO Terakhir)
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-1 text-[11px] text-slate-500">
                  {buyPricePerLiter !== effectivePriceForDate.buyPrice ? (
                    <div className="flex items-center justify-between">
                      <span className="text-amber-700 font-medium">Harga diubah manual</span>
                      <button
                        type="button"
                        onClick={() => setBuyPricePerLiter(effectivePriceForDate.buyPrice)}
                        className="text-red-600 hover:text-red-800 font-bold underline cursor-pointer"
                      >
                        Gunakan Rp {effectivePriceForDate.buyPrice.toLocaleString('id-ID')}
                      </button>
                    </div>
                  ) : (
                    <span>Tarif dasar produk: Rp {effectivePriceForDate.buyPrice.toLocaleString('id-ID')}/L</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Calculation Banner */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-slate-400 block">
                Total Biaya Penebusan DO ({volumeKL} KL / {formatNumber(volumeLiters)} L):
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {formatNumber(volumeLiters)} L × {formatRupiah(buyPricePerLiter)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black font-mono text-cyan-300 block">
                {formatRupiah(totalAmount)}
              </span>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              id="submit-purchase-order-btn"
              type="submit"
              className="px-5 py-2.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>
                {editingOrder ? 'Simpan Perubahan DO' : `Terbitkan Pemesanan DO (${volumeKL} KL)`}
              </span>
            </button>
          </div>
        </form>
      </div>

      <ConfirmModal
        isOpen={showOverflowConfirm}
        title="Konfirmasi Kapasitas Tangki"
        message={`Perhatian: Volume pesanan (${formatLiter(volumeLiters)}) saat ini melebihi ruang kosong tangki pendam (${formatLiter(ullageLiters)}). Apakah Anda yakin ingin tetap menerbitkan PO ini dengan asumsi BBM tangki akan berkurang saat truk tangki tiba?`}
        confirmLabel="Ya, Terbitkan PO"
        cancelLabel="Kembali / Ubah"
        isDestructive={false}
        onConfirm={() => {
          setShowOverflowConfirm(false);
          executeSaveOrder();
        }}
        onClose={() => setShowOverflowConfirm(false)}
      />
    </div>
  );
};
