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
