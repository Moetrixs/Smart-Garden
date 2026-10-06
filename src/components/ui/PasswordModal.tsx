import React from 'react';
import { Lock, Eye, EyeOff, ShieldAlert, ShieldCheck, RotateCcw } from 'lucide-react';

export interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (password: string) => void;
  title?: string;
  description?: string;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({
  isOpen,
  onClose,
  onVerify,
  title = 'Autentikasi Pengaturan',
  description = 'Masukkan kata sandi untuk mengakses tab ini.',
}) => {
  const [passwordInput, setPasswordInput] = React.useState('');
  const [showPasswordText, setShowPasswordText] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setError('Kata sandi tidak boleh kosong');
      return;
    }
    onVerify(passwordInput);
    setPasswordInput('');
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-400 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
            <p className="text-xs text-slate-400">{description}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Kata Sandi Administrator:</label>
            <div className="relative">
              <input
                type={showPasswordText ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setError(null);
                }}
                placeholder="Masukkan sandi..."
                autoFocus
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPasswordText((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                title={showPasswordText ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <p className="text-xs text-rose-400 mt-1.5 font-medium flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> {error}
              </p>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
              <span>
                💡 Default: <code className="text-cyan-400 font-semibold font-mono">admin123</code>
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors cursor-pointer"
            >
              Buka Pengaturan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
