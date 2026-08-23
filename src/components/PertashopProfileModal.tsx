import React, { useState } from 'react';
import { X, Building2, Check, Fuel, Settings2 } from 'lucide-react';
import { PertashopProfile, TankConfig } from '../types';

interface PertashopProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PertashopProfile;
  tank: TankConfig;
  onSaveProfile: (profile: PertashopProfile, tank: TankConfig) => void;
}

export const PertashopProfileModal: React.FC<PertashopProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  tank,
  onSaveProfile,
}) => {
  const [formData, setFormData] = useState<PertashopProfile>(profile);
  const [tankData, setTankData] = useState<TankConfig>(tank);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(formData, tankData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        id="profile-modal-container"
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-cyan-300 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Profil Pertashop & Pengaturan Tangki</h2>
              <p className="text-xs text-slate-400">Identitas SPBU Modular Pertamina & Kapasitas</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kode Pertashop</label>
              <input
                type="text"
                required
                value={formData.pertashopCode}
                onChange={(e) => setFormData({ ...formData, pertashopCode: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Usaha / PT</label>
              <input
                type="text"
                required
                value={formData.pertashopName}
                onChange={(e) => setFormData({ ...formData, pertashopName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Alamat Lokasi</label>
            <input
              type="text"
              required
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Pemilik / Mitra</label>
              <input
                type="text"
                required
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Fuel Terminal (TBBM)</label>
              <input
                type="text"
                required
                value={formData.tbbmDepot}
                onChange={(e) => setFormData({ ...formData, tbbmDepot: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
              />
            </div>
          </div>

          {/* Tangki settings */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <span className="font-bold text-slate-800 uppercase tracking-wider block flex items-center gap-1.5">
              <Fuel className="w-4 h-4 text-blue-600" />
              Spesifikasi Tangki Modular
            </span>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 mb-1">Kapasitas (Liter)</label>
                <input
                  type="number"
                  min={1000}
                  step={500}
                  required
                  value={tankData.totalCapacityLiters}
                  onChange={(e) =>
                    setTankData({ ...tankData, totalCapacityLiters: parseFloat(e.target.value) || 3000 })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Batas Siaga (L)</label>
                <input
                  type="number"
                  min={100}
                  step={100}
                  required
                  value={tankData.warningThresholdLiters}
                  onChange={(e) =>
                    setTankData({
                      ...tankData,
                      warningThresholdLiters: parseFloat(e.target.value) || 1200,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Batas Kritis (L)</label>
                <input
                  type="number"
                  min={100}
                  step={100}
                  required
                  value={tankData.criticalThresholdLiters}
                  onChange={(e) =>
                    setTankData({
                      ...tankData,
                      criticalThresholdLiters: parseFloat(e.target.value) || 600,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Profil</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
