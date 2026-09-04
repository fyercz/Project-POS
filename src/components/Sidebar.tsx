import React from 'react';
import { Fuel, Truck, Gauge, TrendingUp, Settings, FileText, X, Receipt, CalendarDays, Users } from 'lucide-react';
import { PertashopProfile, TankConfig } from '../types';

interface SidebarProps {
  profile: PertashopProfile;
  tank: TankConfig;
  activeTab: 'sales' | 'purchases' | 'soundings' | 'expenses' | 'attendance' | 'summary' | 'analytics';
  setActiveTab: (tab: 'sales' | 'purchases' | 'soundings' | 'expenses' | 'attendance' | 'summary' | 'analytics') => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenProfileModal: () => void;
  onOpenPrintReportModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  profile,
  tank,
  activeTab,
  setActiveTab,
  isOpenMobile,
  onCloseMobile,
  onOpenProfileModal,
  onOpenPrintReportModal,
}) => {
  const isCritical = tank.currentStockLiters <= tank.criticalThresholdLiters;
  const isWarning = tank.currentStockLiters <= tank.warningThresholdLiters;

  const navItems = [
    {
      id: 'sales' as const,
      label: 'Ringkasan Penjualan',
      subtitle: 'Laporan Shift & Transaksi',
      icon: Fuel,
    },
    {
      id: 'purchases' as const,
      label: 'Pemesanan DO Pertamina',
      subtitle: 'Pecahan 1, 2, 3 KL',
      icon: Truck,
      badge: isCritical ? 'KRITIS' : isWarning ? 'SIAGA' : undefined,
      badgeColor: isCritical ? 'bg-red-500' : 'bg-amber-500',
    },
    {
      id: 'soundings' as const,
      label: 'Sounding Tangki',
      subtitle: 'Stick Celup & Uji Air',
      icon: Gauge,
    },
    {
      id: 'attendance' as const,
      label: 'Absensi & Gaji Karyawan',
      subtitle: 'Presensi, Shift & Slip Gaji',
      icon: Users,
      badge: 'NEW',
      badgeColor: 'bg-indigo-500',
    },
    {
      id: 'expenses' as const,
      label: 'Beban & Pengeluaran',
      subtitle: 'Gaji, Lembur, Listrik, PDAM',
      icon: Receipt,
    },
    {
      id: 'summary' as const,
      label: 'Rekap Bulanan & Tahunan',
      subtitle: 'Summary Eksekutif & P&L',
      icon: CalendarDays,
    },
    {
      id: 'analytics' as const,
      label: 'Analisis & Margin',
      subtitle: 'Tren & Kalkulator Laba',
      icon: TrendingUp,
    },
  ];



  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="pertashop-sidebar"
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800/90 shadow-2xl lg:shadow-none transform transition-transform duration-200 ease-in-out font-sans ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center font-bold text-white text-xl italic shadow-md shadow-red-900/40">
                P
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base font-extrabold text-white tracking-tight">
                    PERTASHOP
                  </h1>
                  <span className="text-red-500 font-semibold text-xs tracking-wider">
                    v2.0
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] font-mono text-cyan-300 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">
                    {profile.pertashopCode}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate max-w-[110px]">
                    {profile.pertashopName}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="p-4 space-y-1.5">
            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Menu Operasional
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30 font-bold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-white' : 'text-slate-400'
                      }`}
                    />
                    <div className="text-left">
                      <div className="text-sm font-semibold leading-tight">{item.label}</div>
                      <div className={`text-[10px] leading-tight mt-0.5 ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[9px] font-black font-mono text-white px-2 py-0.5 rounded-full ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="pt-4 px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Laporan & Sistem
            </div>

            <button
              id="nav-print-report-btn"
              type="button"
              onClick={() => {
                onOpenPrintReportModal();
                onCloseMobile();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-all"
            >
              <FileText className="w-4 h-4 text-slate-400" />
              <div className="text-left">
                <span className="text-sm block">Rekap & Berita Acara</span>
                <span className="text-[10px] text-slate-400 block">Cetak Laporan Harian</span>
              </div>
            </button>

            <button
              id="nav-profile-config-btn"
              type="button"
              onClick={() => {
                onOpenProfileModal();
                onCloseMobile();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-all"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <div className="text-left">
                <span className="text-sm block">Profil & Tangki</span>
                <span className="text-[10px] text-slate-400 block">Kalibrasi Kapasitas</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Operator Badge at Bottom */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white ring-2 ring-slate-800">
                AF
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white leading-tight">
                  Ahmad Fauzi
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-400 font-medium">
                    Shift 1 (05.30-13.30) • Online
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenProfileModal}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Pengaturan"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
