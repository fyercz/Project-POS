import React from 'react';

/**
 * Tombol bersama untuk seluruh aplikasi.
 *
 * KENAPA KOMPONEN INI DIBUAT: audit aksesibilitas menemukan pola warna yang sama
 * (mis. bg-emerald-600 + text-white, kontras 3.77:1, gagal WCAG AA) ditulis ulang di 8+ tempat
 * terpisah dengan className inline. Perbaikannya waktu itu harus dilakukan satu-satu di setiap
 * file. Dengan komponen bersama ini, perbaikan warna/kontras/focus-ring cukup dilakukan SEKALI
 * di sini dan otomatis berlaku ke semua pemakai baru.
 *
 * Variant warna di bawah SUDAH diverifikasi lolos WCAG AA (kontras >=4.5:1 teks normal) lewat
 * audit sebelumnya - jangan ganti shade tanpa menghitung ulang kontrasnya.
 *
 * Tidak dipasang mundur (retrofit) ke seluruh tombol lama secara otomatis - terlalu berisiko
 * menimbulkan regresi visual di aplikasi yang sudah berjalan di produksi. Dipakai untuk modal/
 * fitur BARU, dan boleh menggantikan tombol lama secara bertahap saat area itu disentuh lagi.
 */

export type ButtonVariant = 'primary' | 'success' | 'danger' | 'warning' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white border border-transparent', // 5.17:1
  success: 'bg-emerald-700 hover:bg-emerald-800 text-white border border-transparent', // 5.48:1
  danger: 'bg-rose-600 hover:bg-rose-700 text-white border border-transparent', // 4.70:1
  warning: 'bg-amber-500 hover:bg-amber-600 text-slate-900 border border-transparent', // teks gelap di atas amber-500 (8.31:1), BUKAN teks putih (amber-500/600 gagal AA dgn putih)
  secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 border border-transparent',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs min-h-[32px]',
  md: 'px-3.5 py-2 text-xs min-h-[36px]',
  lg: 'px-5 py-2.5 text-sm min-h-[44px]', // 44px: memenuhi target sentuh WCAG 2.5.5 untuk aksi utama
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Ikon dari lucide-react, ditaruh sebelum label. */
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', icon, className = '', children, disabled, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type={rest.type ?? 'button'}
        disabled={disabled}
        className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
        {...rest}
      >
        {icon}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
