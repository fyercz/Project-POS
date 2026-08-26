import React from 'react';
import { Fuel, Truck, DollarSign, Menu, Plus, Printer } from 'lucide-react';
import { Product, TankConfig, PertashopProfile } from '../types';
import { formatRupiah, getTodayDateString } from '../utils/formatters';

interface HeaderProps {
  profile: PertashopProfile;
  products: Product[];
  tank: TankConfig;
  activeTab: 'sales' | 'purchases' | 'soundings' | 'expenses' | 'summary' | 'analytics';
  onOpenMobileSidebar: () => void;
  onOpenPriceModal: () => void;
  onOpenSalesModal: () => void;
  onOpenOrderModal: () => void;
  onOpenPrintReportModal: () => void;
  onOpenExpenseModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  products,
  tank,
  activeTab,
  onOpenMobileSidebar,
  onOpenPriceModal,
  onOpenSalesModal,
  onOpenOrderModal,
  onOpenPrintReportModal,
  onOpenExpenseModal,
}) => {
  const pertamax = products.find((p) => p.id === 'prod-pertamax-92') || products[0];

  // Dynamic Page Title
  const pageTitle =
    activeTab === 'sales'
      ? 'Ringkasan Penjualan Harian'
      : activeTab === 'purchases'
      ? 'Pemesanan DO Pertamina (1, 2, 3 KL)'
      : activeTab === 'soundings'
      ? 'Log Sounding Stick Celup Tangki'
      : activeTab === 'expenses'
      ? 'Beban & Pengeluaran Operasional'
      : activeTab === 'summary'
      ? 'Rekap Eksekutif Bulanan & Tahunan'
      : 'Analisis Margin & Performa Dealer';


  const todayDateFormatted = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Side: Mobile Menu Button & Page Title & Date Badge */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Open Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">
                {pageTitle}
              </h1>
              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[11px] font-medium border border-slate-200">
                {todayDateFormatted}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
              {profile.pertashopName} • {profile.location}
            </p>
          </div>
        </div>

        {/* Right Side: Active Pertamax Price & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Active Price Box */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Harga Pertamax Hari Ini
              </span>
              <span className="text-base font-bold text-blue-600 font-mono">
                {formatRupiah(pertamax?.currentPrice || 12950)}{' '}
                <span className="text-[11px] font-normal text-slate-400">/ Liter</span>
              </span>
            </div>

            <button
              id="header-change-price-btn"
              type="button"
              onClick={onOpenPriceModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm shadow-blue-200 flex items-center gap-1"
              title="Ubah Harga Jual Harian / Penyesuaian Pertamax"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Ubah Harga</span>
            </button>
          </div>

          {/* Quick Action Buttons */}
          <button
            id="header-record-sale-btn"
            type="button"
            onClick={onOpenSalesModal}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Input Penjualan</span>
            <span className="sm:hidden">Jual</span>
          </button>

          <button
            id="header-order-pertamina-btn"
            type="button"
            onClick={onOpenOrderModal}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm shadow-red-500/20"
          >
            <Truck className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Pesan DO (1-3 KL)</span>
            <span className="md:hidden">Pesan DO</span>
          </button>
        </div>
      </div>
    </header>
  );
};
