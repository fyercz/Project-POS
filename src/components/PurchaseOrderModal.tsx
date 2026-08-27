import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Truck, AlertCircle, Check, Fuel, Building2, Calendar, FileCheck, Layers } from 'lucide-react';
import { Product, PurchaseOrder, TankConfig, OrderVolumePecahan } from '../types';
import { formatRupiah, formatNumber, formatLiter, getTodayDateString } from '../utils/formatters';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
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
  
  // Default estimated delivery = tomorrow
  const getTomorrowDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState<string>(getTomorrowDate());
  
  // Custom Buy Price per Liter (defaults to current product buyPrice)
  const [buyPricePerLiter, setBuyPricePerLiter] = useState<number>(selectedProduct?.buyPrice || 12100);
  
  // Pertamina DO / SO reference details
  const [soPertaminaNumber, setSoPertaminaNumber] = useState<string>('');
  const [doPertaminaNumber, setDoPertaminaNumber] = useState<string>('');
  const [supplyDepot, setSupplyDepot] = useState<string>(tbbmDepot || 'TBBM Rewulu / Boyolali');
  const [truckPlateNumber, setTruckPlateNumber] = useState<string>('AD 8492 FB');
  const [driverName, setDriverName] = useState<string>('Pak Joko Santoso');
  const [notes, setNotes] = useState<string>('Pemesanan kuota harian Pertashop.');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (editingOrder) {
      setSelectedProductId(editingOrder.productId);
      setVolumeKL(editingOrder.volumeKL);
      setOrderDate(editingOrder.orderDate);
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
      setSelectedProductId(products[0]?.id || 'prod-pertamax-92');
      setVolumeKL(defaultKL || 2);
      setOrderDate(getTodayDateString());
      setEstimatedDeliveryDate(getTomorrowDate());
      setBuyPricePerLiter(products[0]?.buyPrice || 12100);
      setSoPertaminaNumber(`SO-PTM-${randomSuffix}`);
      setDoPertaminaNumber(`DO-PTM-${randomSuffix + 100}`);
      setSupplyDepot(tbbmDepot || 'TBBM Rewulu / Boyolali');
      setTruckPlateNumber('AD 8492 FB');
      setDriverName('Pak Joko Santoso');
      setNotes('Pemesanan kuota harian Pertashop.');
    }
  }, [editingOrder, isOpen, defaultKL, tbbmDepot]);

  useEffect(() => {
    if (!editingOrder && selectedProduct) {
      setBuyPricePerLiter(selectedProduct.buyPrice);
    }
  }, [selectedProductId, selectedProduct, editingOrder]);

  if (!isOpen) return null;

  const volumeLiters = volumeKL * 1000;
  const totalAmount = volumeLiters * buyPricePerLiter;
  const ullageLiters = tank.totalCapacityLiters - tank.currentStockLiters;
  const willOverflow = !editingOrder && volumeLiters > ullageLiters;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (willOverflow) {
      const confirmOverflow = window.confirm(
        `Perhatian: Volume pesanan (${formatLiter(volumeLiters)}) melebihi ruang kosong tangki (${formatLiter(ullageLiters)}). Apakah Anda yakin pesanan ini tiba saat tangki sudah berkurang?`
      );
      if (!confirmOverflow) return;
    }

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

          {/* Product & Buy Price per Liter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Produk BBM
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Harga Tebus Pertamina (Rp / Liter)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                <input
                  type="number"
                  required
                  min={1000}
                  step={50}
                  value={buyPricePerLiter}
                  onChange={(e) => setBuyPricePerLiter(parseFloat(e.target.value) || 0)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                />
              </div>
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
    </div>
  );
};
