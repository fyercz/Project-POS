/**
 * Helper pemformat angka, mata uang Rupiah, liter, dan tanggal
 */

export function formatRupiah(value: number, decimalDigits: number = 0): string {
  // If decimalDigits is not explicitly requested, but value has fractions, allow up to 3 decimal places
  const hasDecimals = value % 1 !== 0;
  const maxDecimals = decimalDigits > 0 ? decimalDigits : hasDecimals ? 3 : 0;
  const minDecimals = decimalDigits > 0 ? decimalDigits : 0;

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  }).format(value);
}

export function formatPricePerLiter(value: number): string {
  // Format price per liter supporting up to 3 decimal digits, e.g. Rp 15.046,375 / Liter
  const hasDecimals = value % 1 !== 0;
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: hasDecimals ? (value.toString().split('.')[1]?.length || 2) : 0,
    maximumFractionDigits: 3,
  }).format(value);
}

export function formatNumber(value: number, decimalDigits: number = 0): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: decimalDigits,
    maximumFractionDigits: decimalDigits,
  }).format(value);
}

export function formatLiter(value: number, showUnit: boolean = true): string {
  const formatted = formatNumber(value, 0);
  return showUnit ? `${formatted} L` : formatted;
}

export function formatKiloLiter(liters: number): string {
  const kl = liters / 1000;
  return `${formatNumber(kl, 1)} KL (${formatLiter(liters)})`;
}

export function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);
    }
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(date);
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export const MONTH_NAMES_INDO = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

export function getMonthNameIndo(monthIndex: number): string {
  return MONTH_NAMES_INDO[monthIndex] || '';
}

export function formatMonthYear(yearMonth: string): string {
  if (!yearMonth) return '-';
  const parts = yearMonth.split('-');
  if (parts.length >= 2) {
    const year = parseInt(parts[0], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    if (!isNaN(monthIdx) && monthIdx >= 0 && monthIdx < 12) {
      return `${MONTH_NAMES_INDO[monthIdx]} ${year}`;
    }
  }
  return yearMonth;
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export type ShiftCategory = 'shift1' | 'shift2' | 'fullday' | 'other';

export const STANDARD_SHIFTS = {
  SHIFT_1: {
    name: 'Shift 1 (05.30 - 13.30)',
    checkIn: '05:30',
    checkOut: '13:30',
    closingTime: '13:30',
    displayHours: '05:30 - 13:30',
    description: 'Shift 1 Pagi (05:30 s/d 13:30)',
  },
  SHIFT_2: {
    name: 'Shift 2 (13.30 - 19.30)',
    checkIn: '13:30',
    checkOut: '19:30',
    closingTime: '19:30',
    displayHours: '13:30 - 19:30',
    description: 'Shift 2 Siang / Sore (13:30 s/d 19:30)',
  },
  FULL_SHIFT: {
    name: 'Full Shift (05.30 - 19.30)',
    checkIn: '05:30',
    checkOut: '19:30',
    closingTime: '19:30',
    displayHours: '05:30 - 19:30',
    description: 'Full Day Operasional Penuh (05:30 s/d 19:30)',
  },
  OFF: {
    name: 'Non-Shift / Off',
    checkIn: '-',
    checkOut: '-',
    closingTime: '00:00',
    displayHours: 'Libur / Off',
    description: 'Libur / Tidak Bertugas',
  },
} as const;

export interface ShiftHoursInfo {
  shiftName: string;
  checkIn: string;
  checkOut: string;
  closingTime: string;
  displayHours: string;
  isShift1: boolean;
  isShift2: boolean;
  isFull: boolean;
  isOff: boolean;
}

export function getShiftHoursInfo(shiftStr: string): ShiftHoursInfo {
  const s = (shiftStr || '').toLowerCase();
  if (
    s.includes('shift 2') ||
    s.includes('shift2') ||
    s.includes('13.30 - 19.30') ||
    s.includes('13.30-19.30') ||
    (s.includes('13.30') && !s.includes('05.30')) ||
    s.includes('sore') ||
    s.includes('siang')
  ) {
    return {
      shiftName: STANDARD_SHIFTS.SHIFT_2.name,
      checkIn: '13:30',
      checkOut: '19:30',
      closingTime: '19:30',
      displayHours: '13:30 - 19:30',
      isShift1: false,
      isShift2: true,
      isFull: false,
      isOff: false,
    };
  }
  if (
    s.includes('full') ||
    s.includes('lembur') ||
    (s.includes('05.30') && s.includes('19.30')) ||
    s.includes('multiple shift')
  ) {
    return {
      shiftName: STANDARD_SHIFTS.FULL_SHIFT.name,
      checkIn: '05:30',
      checkOut: '19:30',
      closingTime: '19:30',
      displayHours: '05:30 - 19:30',
      isShift1: false,
      isShift2: false,
      isFull: true,
      isOff: false,
    };
  }
  if (s.includes('off') || s.includes('libur') || s.includes('non-shift')) {
    return {
      shiftName: STANDARD_SHIFTS.OFF.name,
      checkIn: '-',
      checkOut: '-',
      closingTime: '00:00',
      displayHours: 'Libur / Off',
      isShift1: false,
      isShift2: false,
      isFull: false,
      isOff: true,
    };
  }
  // Default is Shift 1
  return {
    shiftName: STANDARD_SHIFTS.SHIFT_1.name,
    checkIn: '05:30',
    checkOut: '13:30',
    closingTime: '13:30',
    displayHours: '05:30 - 13:30',
    isShift1: true,
    isShift2: false,
    isFull: false,
    isOff: false,
  };
}

export function isHoursShiftMismatched(
  shiftStr: string,
  checkIn?: string,
  checkOut?: string
): boolean {
  const info = getShiftHoursInfo(shiftStr);
  if (info.isOff) return false;
  if (!checkIn || !checkOut || checkIn === '-' || checkOut === '-') return true;

  // Check if checkIn or checkOut deviates from standard shift hours
  return checkIn !== info.checkIn || checkOut !== info.checkOut;
}

export function getShiftCategory(shiftStr: string): ShiftCategory {
  const s = (shiftStr || '').toLowerCase();
  if (s.includes('shift 1') || s.includes('shift1')) return 'shift1';
  if (s.includes('shift 2') || s.includes('shift2')) return 'shift2';
  if (s.includes('full') || s.includes('fullday')) return 'fullday';
  return 'other';
}

/**
 * Adds or subtracts days to a YYYY-MM-DD date string safely without timezone offset issues
 */
export function addDays(dateStr: string, days: number): string {
  if (!dateStr) return dateStr;
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      d.setDate(d.getDate() + days);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dt = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dt}`;
    }
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  } catch {
    return dateStr;
  }
}
