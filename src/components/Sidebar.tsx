import React from 'react';
import { Fuel, Truck, Gauge, TrendingUp, Settings, FileText, X, Receipt, CalendarDays, Users, Database } from 'lucide-react';
import { PertashopProfile, TankConfig } from '../types';
import { useModalA11y } from '../hooks/useModalA11y';

interface SidebarProps {
  profile: PertashopProfile;
  tank: TankConfig;
  activeTab: 'sales' | 'purchases' | 'soundings' | 'expenses' | 'attendance' | 'summary' | 'analytics';
  setActiveTab: (tab: 'sales' | 'purchases' | 'soundings' | 'expenses' | 'attendance' | 'summary' | 'analytics') => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenProfileModal: () => void;
  onOpenPrintReportModal: () => void;
  onOpenBackupModal?: () => void;
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
  onOpenBackupModal,
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
      // Kontras WCAG AA (diaudit): red-500 dgn teks putih cuma 3.76:1 -> red-600 (4.83:1).
      // amber-500 dgn teks putih cuma 2.15:1 -> tetap pakai amber-500 (branding "siaga"
      // tetap cerah) tapi teksnya digelapkan jadi slate-900 (8.31:1), diatur lewat badgeTextColor.
      badgeColor: isCritical ? 'bg-red-600' : 'bg-amber-500',
      badgeTextColor: isCritical ? 'text-white' : 'text-slate-900',
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
      badgeColor: 'bg-indigo-600', // indigo-500 cuma 4.47:1 dgn teks putih, sedikit di bawah ambang WCAG AA
      badgeTextColor: 'text-white',
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



  // Audit aksesibilitas: drawer navigasi mobile ini menutupi konten di belakangnya tapi tidak
  // bisa ditutup dengan Escape dan fokus keyboard bisa "bocor" ke konten tersembunyi di
  // belakangnya. Hook ini hanya aktif saat isOpenMobile true (drawer mode) - di desktop,
  // sidebar selalu statis/terlihat (lg:static), jadi tidak relevan menjebak fokus di sana.
  const { containerRef: sidebarRef } = useModalA11y(isOpenMobile, onCloseMobile);

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
        ref={sidebarRef}
        id="pertashop-sidebar"
        aria-label="Menu Navigasi Pertashop"
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
                  {/* Bukan <h1>: ini logo/merek di sidebar yang muncul di SETIAP halaman, bukan
                      judul halaman. Memakai h1 di sini membuat setiap halaman punya DUA H1
                      (ini + judul layar aktif), melanggar praktik "satu H1 per halaman". */}
                  <p className="text-base font-extrabold text-white tracking-tight">
                    PERTASHOP
                  </p>
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
                      {/* text-blue-100 diganti text-blue-50: 4.24:1 di atas bg-blue-600 gagal WCAG AA (butuh 4.5:1) */}
                      <div className={`text-[10px] leading-tight mt-0.5 ${isActive ? 'text-blue-50' : 'text-slate-400'}`}>
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[9px] font-black font-mono px-2 py-0.5 rounded-full ${item.badgeColor} ${item.badgeTextColor || 'text-white'}`}
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

            {onOpenBackupModal && (
              <button
                id="nav-backup-restore-btn"
                type="button"
                onClick={() => {
                  onOpenBackupModal();
                  onCloseMobile();
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 border border-emerald-900/50 transition-all mt-1"
                title="Backup & Restore Data JSON"
              >
                <div className="flex items-center gap-3 text-left">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="text-sm block font-bold text-emerald-300">Backup & Restore</span>
                    <span className="text-[10px] text-emerald-500/90 block">Amankan Data / Export JSON</span>
                  </div>
                </div>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                  JSON
                </span>
              </button>
            )}
          </nav>
        </div>

        {/* Settings Button at Bottom */}
        <div className="p-3 sm:p-4 border-t border-slate-800/80">
          <button
            id="sidebar-bottom-settings-btn"
            type="button"
            onClick={() => {
              onOpenProfileModal();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-950/60 hover:bg-slate-800/80 rounded-xl border border-slate-800 text-slate-300 hover:text-white transition-all text-xs font-semibold cursor-pointer group"
            title="Pengaturan Profil & Tangki"
          >
            <div className="flex items-center gap-2.5">
              <Settings className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-colors" />
              <span className="text-sm font-semibold">Pengaturan</span>
            </div>
            <span className="text-[10px] text-slate-400 group-hover:text-slate-300">Profil & Tangki</span>
          </button>
        </div>
      </aside>
    </>
  );
};
