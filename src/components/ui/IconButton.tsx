import React from 'react';

/**
 * Tombol ikon-saja (mis. tombol tutup X di header modal). WAJIB diberi `label` - audit
 * aksesibilitas menemukan 11 modal dengan tombol tutup ikon tanpa aria-label sama sekali
 * (axe rule 'button-name'). Props `label` di sini bersifat wajib (bukan opsional) justru
 * supaya kesalahan yang sama tidak bisa terulang - TypeScript akan menolak compile kalau lupa.
 */
export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  label: string;
  icon: React.ReactNode;
  /**
   * Class warna teks+hover (mis. "text-slate-400 hover:text-white" atau "text-blue-200
   * hover:text-white" untuk header bertema biru). TIDAK digabung dengan default lewat
   * `className` biasa - class Tailwind yang sama-sama utility tidak menjamin yang belakangan
   * menang berdasar urutan di HTML, jadi warna harus benar-benar MENGGANTI, bukan menambah.
   */
  colorClassName?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  label,
  icon,
  colorClassName = 'text-slate-400 hover:text-white',
  className = '',
  ...rest
}) => {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`${colorClassName} p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer ${className}`}
      {...rest}
    >
      {icon}
    </button>
  );
};
