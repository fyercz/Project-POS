import React from 'react';

/**
 * Badge/label kecil bersama. Lihat catatan kontras di Button.tsx - prinsip yang sama berlaku
 * di sini: setiap warna sudah diverifikasi lolos WCAG AA, jangan diubah tanpa menghitung ulang.
 */

export type BadgeVariant = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  info: 'bg-indigo-600 text-white', // 6.29:1 (indigo-500 gagal AA, 4.47:1)
  success: 'bg-emerald-700 text-white', // 5.48:1
  warning: 'bg-amber-500 text-slate-900', // teks gelap, BUKAN putih - lihat catatan di Button.tsx
  danger: 'bg-red-600 text-white', // 4.83:1 (red-500 gagal AA, 3.76:1)
  neutral: 'bg-slate-100 text-slate-600', // 6.92:1
};

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', children, className = '' }) => {
  return (
    <span
      className={`inline-flex items-center text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
