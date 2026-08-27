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
import { StorageService } from './utils/storage';
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
} from './types';
import { getTodayDateString, getCurrentTimeString } from './utils/formatters';
import { Gauge, Plus, Pencil, Trash2 } from 'lucide-react';

export default function App() {
  // State from Storage
  const [profile, setProfile] = useState<PertashopProfile>(StorageService.getProfile());
  const [products, setProducts] = useState<Product[]>(StorageService.getProducts());
  const [tank, setTank] = useState<TankConfig>(StorageService.getTankConfig());
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>(StorageService.getPriceHistory());
  const [sales, setSales] = useState<SaleRecord[]>(StorageService.getSales());
  const [purchases, setPurchases] = useState<PurchaseOrder[]>(StorageService.getPurchases());
  const [soundings, setSoundings] = useState<SoundingRecord[]>(StorageService.getSoundings());
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(StorageService.getExpenses());

  // Navigation Tab & Mobile Drawer State
  const [activeTab, setActiveTab] = useState<'sales' | 'purchases' | 'soundings' | 'expenses' | 'summary' | 'analytics'>('sales');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Modals & Editing States
  const [isSalesModalOpen, setIsSalesModalOpen] = useState<boolean>(false);
  const [isImportSalesModalOpen, setIsImportSalesModalOpen] = useState<boolean>(false);
  const [editingSale, setEditingSale] = useState<SaleRecord | null>(null);

  const [isPriceModalOpen, setIsPriceModalOpen] = useState<boolean>(false);

  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [selectedOrderKL, setSelectedOrderKL] = useState<OrderVolumePecahan>(2);

  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState<boolean>(false);
  const [activeReceivingOrder, setActiveReceivingOrder] = useState<PurchaseOrder | null>(null);

  const [isSoundingModalOpen, setIsSoundingModalOpen] = useState<boolean>(false);
  const [editingSounding, setEditingSounding] = useState<SoundingRecord | null>(null);

  const [isPrintReportModalOpen, setIsPrintReportModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Summary Report Modal State
  const [isPrintSummaryModalOpen, setIsPrintSummaryModalOpen] = useState<boolean>(false);
  const [summaryPrintMode, setSummaryPrintMode] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [summaryPrintMonth, setSummaryPrintMonth] = useState<string>('2026-08');
  const [summaryPrintYear, setSummaryPrintYear] = useState<number>(2026);

  // Expense Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<ExpenseCategoryType>('GAJI_OPERATOR');
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);


  // Sync to localStorage
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
  const lastMeterReading = lastSaleWithMeter ? lastSaleWithMeter.meterAkhir! : 145530;

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
    if (editingSale) {
      const diffLiters = saleData.literSold - editingSale.literSold;
      const updatedSales = sales.map((s) =>
        s.id === editingSale.id
          ? { ...saleData, id: editingSale.id, createdAt: editingSale.createdAt }
          : s
      );
      setSales(updatedSales);

      // Adjust stock with difference
      setTank((prev) => ({
        ...prev,
        currentStockLiters: Math.max(0, Math.min(prev.totalCapacityLiters, prev.currentStockLiters - diffLiters)),
      }));
      setEditingSale(null);
    } else {
      const newSale: SaleRecord = {
        ...saleData,
        id: `sale-${Date.now()}`,
        createdAt: `${getTodayDateString()} ${getCurrentTimeString()}`,
      };

      const updatedSales = [newSale, ...sales];
      setSales(updatedSales);

      // Auto deduct stock from tank
      const updatedStock = Math.max(0, tank.currentStockLiters - saleData.literSold);
      setTank((prev) => ({
        ...prev,
        currentStockLiters: updatedStock,
      }));
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
  }) => {
    const targetProduct = products.find((p) => p.id === priceData.productId);
    if (!targetProduct) return;

    const oldPrice = targetProduct.currentPrice;
    const oldBuyPrice = targetProduct.buyPrice;
    const newMargin = priceData.newPrice - priceData.newBuyPrice;

    // 1. Update Product
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

    // 2. Add to Price History
    const newHistoryEntry: PriceHistory = {
      id: `price-hist-${Date.now()}`,
      productId: priceData.productId,
      effectiveDate: priceData.effectiveDate,
      oldPrice,
      newPrice: priceData.newPrice,
      oldBuyPrice,
      newBuyPrice: priceData.newBuyPrice,
      marginPerLiter: newMargin,
      referenceDoc: priceData.referenceDoc,
      notes: priceData.notes,
      updatedBy: 'Admin Pertashop',
      updatedAt: `${getTodayDateString()} ${getCurrentTimeString()}`,
    };
    setPriceHistory([newHistoryEntry, ...priceHistory]);
  };

  const handleEditOrder = (order: PurchaseOrder) => {
    setEditingOrder(order);
    setSelectedOrderKL(order.volumeKL);
    setIsOrderModalOpen(true);
  };

  const handleSavePurchaseOrder = (poData: Omit<PurchaseOrder, 'id' | 'createdAt'>) => {
    if (editingOrder) {
      const updated = purchases.map((p) =>
        p.id === editingOrder.id
          ? { ...poData, id: editingOrder.id, createdAt: editingOrder.createdAt, status: editingOrder.status }
          : p
      );
      setPurchases(updated);
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
    const updatedOrders = purchases.map((order) => {
      if (order.id === orderId) {
        return {
          ...order,
          ...receivingData,
          status: 'SELESAI' as const,
          completedAt: `${getTodayDateString()} ${getCurrentTimeString()}`,
        };
      }
      return order;
    });
    setPurchases(updatedOrders);

    // Add fuel to tank stock
    setTank((prev) => ({
      ...prev,
      currentStockLiters: Math.min(
        prev.totalCapacityLiters,
        prev.currentStockLiters + receivingData.actualLitersReceived
      ),
      lastSoundingDate: receivingData.actualDeliveryDate,
      lastSoundingLiters: receivingData.soundingAfterLiters,
    }));
  };

  const handleEditSounding = (sounding: SoundingRecord) => {
    setEditingSounding(sounding);
    setIsSoundingModalOpen(true);
  };

  const handleSaveSounding = (recordData: Omit<SoundingRecord, 'id'>, newStockLiters: number, editingId?: string) => {
    const idToUpdate = editingId || editingSounding?.id;
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
        id: `snd-${Date.now()}`,
      };
      setSoundings([newRecord, ...soundings]);

      setTank((prev) => ({
        ...prev,
        currentStockLiters: newStockLiters,
        lastSoundingDate: recordData.date,
        lastSoundingLiters: recordData.calculatedLiters,
      }));
    }
  };

  const handleDeleteSounding = (soundingId: string) => {
    setSoundings(soundings.filter((s) => s.id !== soundingId));
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

  const handleOpenPrintSummaryModal = (mode: 'MONTHLY' | 'YEARLY', month: string, year: number) => {
    setSummaryPrintMode(mode);
    setSummaryPrintMonth(month);
    setSummaryPrintYear(year);
    setIsPrintSummaryModalOpen(true);
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
            />
          )}

          {activeTab === 'purchases' && (
            <PurchaseHistoryTable
              orders={purchases}
              onOpenNewOrderModal={() => handleQuickOrder(2)}
              onOpenReceiveModal={handleOpenReceiveModal}
              onEditOrder={handleEditOrder}
              onDeleteOrder={(id) => setPurchases(purchases.filter((p) => p.id !== id))}
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
                <button
                  type="button"
                  onClick={() => {
                    setEditingSounding(null);
                    setIsSoundingModalOpen(true);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm shadow-blue-200 flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Input Sounding Baru</span>
                </button>
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
                      {soundings.map((s) => (
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
                                  if (window.confirm(`Hapus catatan sounding tanggal ${s.date}?`)) {
                                    handleDeleteSounding(s.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Hapus Catatan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'expenses' && (
            <ExpensesView
              expenses={expenses}
              onOpenAddExpense={handleOpenAddExpense}
              onEditExpense={handleEditExpense}
              onDeleteExpense={handleDeleteExpense}
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
        currentPrice={primaryProduct.currentPrice}
        currentBuyPrice={primaryProduct.buyPrice}
        currentStockLiters={tank.currentStockLiters}
        lastMeterReading={lastMeterReading}
        editingSale={editingSale}
        onSaveSale={handleSaveSale}
      />

      <PriceManagementModal
        isOpen={isPriceModalOpen}
        onClose={() => setIsPriceModalOpen(false)}
        products={products}
        priceHistory={priceHistory}
        onUpdateProductPrice={handleUpdateProductPrice}
      />

      <PurchaseOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => {
          setIsOrderModalOpen(false);
          setEditingOrder(null);
        }}
        products={products}
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
        onSaveSounding={handleSaveSounding}
        onDeleteSounding={handleDeleteSounding}
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
      />
    </div>
  );
}

