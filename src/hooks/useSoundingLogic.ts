import type { Dispatch, SetStateAction, ReactNode } from 'react';
import { SoundingRecord, TankConfig, ExpenseRecord, SaleRecord, Product, PriceHistory } from '../types';
import { formatMonthYearId } from '../utils/pricing';
import { syncFuelVarianceToExpenses } from '../utils/fuelVarianceSync';

/**
 * Diekstrak dari App.tsx sebagai bagian dari rekomendasi #7 di docs/REKOMENDASI_ARSITEKTUR.md -
 * domain KETIGA yang dipindah. INI DOMAIN PALING TERJALIN dari tiga yang sudah diekstrak
 * sejauh ini - butuh setTank (stok tangki), setExpenses (lewat utilitas bersama
 * syncFuelVarianceToExpenses - lihat src/utils/fuelVarianceSync.ts, yang DIEKSTRAK LEBIH
 * DULU sebagai langkah terpisah karena dipakai 3 domain berbeda, bukan cuma Sounding), setSales
 * (melepas tautan soundingRecordId saat sounding sebulan dihapus massal), DAN setConfirmConfig
 * (dialog konfirmasi UI - handleDeleteMonthSoundings menampilkan konfirmasi sebelum eksekusi).
 *
 * Tipe ConfirmConfig didefinisikan ulang di sini (bukan diimpor) karena di App.tsx masih berupa
 * tipe anonim inline - lihat juga ConfirmModal.tsx untuk komponen yang memakainya.
 */

export interface ConfirmConfigState {
  isOpen: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
}

export interface UseSoundingLogicParams {
  soundings: SoundingRecord[];
  setSoundings: Dispatch<SetStateAction<SoundingRecord[]>>;
  tank: TankConfig;
  setTank: Dispatch<SetStateAction<TankConfig>>;
  sales: SaleRecord[];
  setSales: Dispatch<SetStateAction<SaleRecord[]>>;
  setExpenses: Dispatch<SetStateAction<ExpenseRecord[]>>;
  products: Product[];
  priceHistory: PriceHistory[];
  editingSounding: SoundingRecord | null;
  setEditingSounding: Dispatch<SetStateAction<SoundingRecord | null>>;
  setIsSoundingModalOpen: Dispatch<SetStateAction<boolean>>;
  setConfirmConfig: Dispatch<SetStateAction<ConfirmConfigState>>;
}

export function useSoundingLogic({
  soundings,
  setSoundings,
  tank,
  setTank,
  sales,
  setSales,
  setExpenses,
  products,
  priceHistory,
  editingSounding,
  setEditingSounding,
  setIsSoundingModalOpen,
  setConfirmConfig,
}: UseSoundingLogicParams) {
  const fuelVarianceDeps = { products, priceHistory, sales, setExpenses };

  const handleEditSounding = (sounding: SoundingRecord) => {
    setEditingSounding(sounding);
    setIsSoundingModalOpen(true);
  };

  const handleSaveSounding = (recordData: Omit<SoundingRecord, 'id'>, newStockLiters: number, editingId?: string) => {
    const idToUpdate = editingId || editingSounding?.id;
    const finalRecordId = idToUpdate || `snd-${Date.now()}`;
    const soundKey = (r: Pick<SoundingRecord, 'date' | 'time'>) => `${r.date}T${r.time || '00:00'}`;

    // Hanya terapkan ke stok tangki SAAT INI bila record ini adalah sounding PALING BARU
    // (berdasarkan tanggal & jam). Mengedit sounding lama (mis. koreksi typo bulan lalu) tidak
    // boleh menimpa stok hari ini yang sudah berubah akibat penjualan/DO sesudahnya.
    const othersForComparison = soundings.filter((s) => s.id !== idToUpdate);
    const isLatest = !othersForComparison.some((s) => soundKey(s) > soundKey(recordData));

    if (idToUpdate) {
      // Pertahankan status "dikecualikan dari beban otomatis" bila sebelumnya sudah ditetapkan,
      // supaya mengedit angka sounding tidak diam-diam memunculkan lagi beban yang sengaja dihapus.
      const prevExcluded = soundings.find((s) => s.id === idToUpdate)?.varianceExpenseExcluded;
      const updated = soundings.map((s) =>
        s.id === idToUpdate ? { ...recordData, id: idToUpdate, varianceExpenseExcluded: prevExcluded } : s
      );
      setSoundings(updated);
      if (isLatest) {
        setTank((prev) => ({
          ...prev,
          currentStockLiters: newStockLiters,
          lastSoundingDate: recordData.date,
          lastSoundingLiters: recordData.calculatedLiters,
        }));
      }
      setEditingSounding(null);
    } else {
      const newRecord: SoundingRecord = {
        ...recordData,
        id: finalRecordId,
      };
      setSoundings([newRecord, ...soundings]);

      if (isLatest) {
        setTank((prev) => ({
          ...prev,
          currentStockLiters: newStockLiters,
          lastSoundingDate: recordData.date,
          lastSoundingLiters: recordData.calculatedLiters,
        }));
      }
    }

    // Otomatis catat selisih loss atau gain sounding ke dalam pembukuan keuangan
    syncFuelVarianceToExpenses(
      fuelVarianceDeps,
      finalRecordId,
      'SOUNDING_TANGKI',
      recordData.date,
      recordData.time,
      recordData.varianceLiters,
      `Tera Stick Ukur Tangki (Op. ${recordData.operatorName})`,
      `Tera fisik ${recordData.calculatedLiters} L vs stok sistem ${recordData.systemStockLiters} L. ${recordData.notes || ''}`.trim()
    );
  };

  const handleDeleteSounding = (soundingId: string) => {
    setSoundings(soundings.filter((s) => s.id !== soundingId));
    // Hapus juga catatan pembukuan otomatis yang terkait dengan sounding ini
    setExpenses((prev) => prev.filter((e) => e.sourceReferenceId !== soundingId));
  };

  // Hapus semua sounding pada SATU bulan tertentu (format YYYY-MM). Dulu terkunci ke "Agustus"
  // dan memakai includes('-08-') sehingga Agustus di semua tahun ikut terhapus.
  const handleDeleteMonthSoundings = (targetMonth: string) => {
    if (!/^\d{4}-\d{2}$/.test(targetMonth)) return;
    const inMonth = (d?: string) => !!d && d.startsWith(`${targetMonth}-`);
    const monthSoundings = soundings.filter((s) => inMonth(s.date));
    const label = formatMonthYearId(targetMonth);
    if (monthSoundings.length === 0) {
      setConfirmConfig({
        isOpen: true,
        title: `Tidak Ada Data Sounding ${label}`,
        message: `Tidak ditemukan catatan hasil sounding pada ${label}.`,
        confirmLabel: 'Tutup',
        cancelLabel: 'Kembali',
        isDestructive: false,
        onConfirm: () => {},
      });
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: `Hapus Semua Sounding ${label}`,
      message: `Apakah Anda yakin ingin menghapus seluruh (${monthSoundings.length}) catatan hasil sounding pada ${label}? Data ini akan dihapus permanen beserta beban selisih BBM-nya.`,
      confirmLabel: `Hapus Semua (${monthSoundings.length}) Sounding`,
      cancelLabel: 'Batal',
      isDestructive: true,
      onConfirm: () => {
        const removedIds = new Set(monthSoundings.map((s) => s.id));
        setSoundings((prev) => prev.filter((s) => !removedIds.has(s.id)));
        setExpenses((prev) => prev.filter((e) => !(e.sourceReferenceId && removedIds.has(e.sourceReferenceId))));
        // Lepaskan tautan sounding dari penjualan terkait
        setSales((prev) =>
          prev.map((s) => (s.soundingRecordId && removedIds.has(s.soundingRecordId) ? { ...s, soundingRecordId: undefined } : s))
        );
        if (inMonth(tank.lastSoundingDate)) {
          const remainingDates = soundings
            .filter((s) => !removedIds.has(s.id))
            .map((s) => s.date)
            .sort();
          setTank((prev) => ({ ...prev, lastSoundingDate: remainingDates[remainingDates.length - 1] || '' }));
        }
      },
    });
  };

  return {
    handleEditSounding,
    handleSaveSounding,
    handleDeleteSounding,
    handleDeleteMonthSoundings,
  };
}
