import React, { useState } from 'react';
import {
  X,
  Building2,
  Check,
  Fuel,
  Trash2,
  Database,
  GitBranch,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Download,
} from 'lucide-react';
import { PertashopProfile, TankConfig } from '../types';

interface PertashopProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PertashopProfile;
  tank: TankConfig;
  onSaveProfile: (profile: PertashopProfile, tank: TankConfig) => void;
  onResetAllData?: () => void;
  onOpenBackupModal?: () => void;
}

export const PertashopProfileModal: React.FC<PertashopProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  tank,
  onSaveProfile,
  onResetAllData,
  onOpenBackupModal,
}) => {
  const [formData, setFormData] = useState<PertashopProfile>(profile);
  const [tankData, setTankData] = useState<TankConfig>(tank);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [githubInfo, setGithubInfo] = useState<{
    status: 'IDLE' | 'SUCCESS' | 'ERROR';
    commitHash?: string;
    commitMessage?: string;
    commitDate?: string;
    commitAuthor?: string;
    errorMsg?: string;
  }>({ status: 'IDLE' });

  if (!isOpen) return null;

  const handleCheckGitHubUpdate = async () => {
    setIsCheckingUpdate(true);
    setGithubInfo({ status: 'IDLE' });
    try {
      const res = await fetch('https://api.github.com/repos/fyercz/Project-POS/commits/main');
      if (!res.ok) {
        throw new Error(`Gagal menghubungi GitHub API (Status: ${res.status})`);
      }
      const data = await res.json();
      const hash = data.sha ? data.sha.substring(0, 7) : 'Unknown';
      const msg = data.commit?.message || 'Update terbaru';
      const date = data.commit?.committer?.date || data.commit?.author?.date || '';
      const author = data.commit?.author?.name || 'Developer';

      setGithubInfo({
        status: 'SUCCESS',
        commitHash: hash,
        commitMessage: msg,
        commitDate: date ? new Date(date).toLocaleString('id-ID') : '-',
        commitAuthor: author,
      });
    } catch (err: any) {
      console.error('Error checking GitHub update:', err);
      setGithubInfo({
        status: 'ERROR',
        errorMsg: err.message || 'Tidak dapat terhubung ke GitHub.',
      });
    } finally {
      setIsCheckingUpdate(false);
    }
  };

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

        <form noValidate onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-600 mb-1">Kapasitas (L)</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  required
                  value={tankData.totalCapacityLiters}
                  onChange={(e) =>
                    setTankData({ ...tankData, totalCapacityLiters: parseFloat(e.target.value) || 5000 })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Stok Saat Ini (L)</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  required
                  value={tankData.currentStockLiters}
                  onChange={(e) =>
                    setTankData({ ...tankData, currentStockLiters: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Batas Siaga (L)</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  required
                  value={tankData.warningThresholdLiters}
                  onChange={(e) =>
                    setTankData({
                      ...tankData,
                      warningThresholdLiters: parseFloat(e.target.value) || 1500,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Batas Kritis (L)</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  required
                  value={tankData.criticalThresholdLiters}
                  onChange={(e) =>
                    setTankData({
                      ...tankData,
                      criticalThresholdLiters: parseFloat(e.target.value) || 800,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Backup & Restore Database Section */}
          <div className="pt-3 border-t border-slate-200">
            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 text-white rounded-lg shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 block text-xs">Pencadangan Database (.JSON)</span>
                  <span className="text-[10px] text-slate-500 block">Amankan data sebelum Export Code atau pulihkan file backup</span>
                </div>
              </div>
              {onOpenBackupModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenBackupModal();
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Buka Backup & Restore</span>
                </button>
              )}
            </div>
          </div>

          {/* GitHub Auto-Update & Version Section */}
          <div className="pt-3 border-t border-slate-200">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-slate-900 text-cyan-400 rounded-xl shrink-0">
                    <GitBranch className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">Pembaruan Sistem (GitHub Resmi)</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                        v2.5.0
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      Repo: <code className="text-indigo-600 font-mono">github.com/fyercz/Project-POS</code>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCheckGitHubUpdate}
                  disabled={isCheckingUpdate}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                  title="Cek commit dan status pembaruan langsung dari GitHub"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                  <span>{isCheckingUpdate ? 'Memeriksa...' : 'Cek GitHub'}</span>
                </button>
              </div>

              {githubInfo.status === 'SUCCESS' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>Terhubung ke GitHub: Commit #{githubInfo.commitHash}</span>
                  </div>
                  <p className="text-[11px] text-emerald-900 bg-white/70 p-2 rounded-lg border border-emerald-200 font-mono">
                    "{githubInfo.commitMessage}"
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-emerald-700">
                    <span>Penulis: <strong>{githubInfo.commitAuthor}</strong></span>
                    <span>Waktu: <strong>{githubInfo.commitDate}</strong></span>
                  </div>
                </div>
              )}

              {githubInfo.status === 'ERROR' && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-center gap-2 text-[11px]">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{githubInfo.errorMsg}</span>
                </div>
              )}

              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <span className="font-semibold text-slate-800 block">📌 Cara Memperbarui Aplikasi di Komputer Kasir:</span>
                <p>1. Buka folder aplikasi di komputer, klik ganda file <strong><code className="text-indigo-600 font-bold">update.bat</code></strong> (atau pilih nomor <strong>[5]</strong> di <strong>Pertashop.bat</strong>, atau jalankan <strong>update.ps1</strong>).</p>
                <p>2. Script runner mandiri akan otomatis menyinkronkan kode terbaru dari GitHub, memverifikasi pustaka, dan membersihkan cache build lama tanpa menutup jendela CMD sebelum selesai.</p>
                <p>3. Jika tampilan belum berubah setelah update, tekan <strong>Ctrl + F5</strong> di browser untuk refresh cache.</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            {onResetAllData ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onResetAllData();
                }}
                className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl font-semibold flex items-center gap-1.5 transition-colors text-xs cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>Reset Aplikasi ke Kondisi Baru</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
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
          </div>
        </form>
      </div>
    </div>
  );
};
