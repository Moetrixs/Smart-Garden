import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { DEFAULT_ADMIN_PASSWORD } from '../constants/admin';

interface PasswordModalProps {
  /** Called with the candidate password when the form is submitted. */
  onSubmitPassword: (password: string) => boolean;
  /** Called when the user asks to reset the password to the default. */
  onResetToDefault: () => void;
  onClose: () => void;
}

/** Authentication dialog guarding access to the irrigation settings tab. */
export const PasswordModal: React.FC<PasswordModalProps> = ({
  onSubmitPassword,
  onResetToDefault,
  onClose,
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const [showPasswordText, setShowPasswordText] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmitPassword(passwordInput)) {
      // Parent unlocks the tab and closes this modal on success.
      return;
    }
    setPasswordError('Kata sandi salah. Silakan coba lagi.');
  };

  const handleReset = () => {
    onResetToDefault();
    setPasswordInput(DEFAULT_ADMIN_PASSWORD);
    setPasswordError(null);
    setResetNotice(`Kata sandi telah direset ke default: ${DEFAULT_ADMIN_PASSWORD}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-400 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Autentikasi Pengaturan</h3>
            <p className="text-xs text-slate-400">Masukkan kata sandi untuk mengakses tab ini.</p>
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
                  setPasswordError(null);
                }}
                placeholder="Masukkan sandi..."
                autoFocus
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPasswordText(!showPasswordText)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                title={showPasswordText ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordError && (
              <p className="text-xs text-rose-400 mt-1.5 font-medium flex items-center gap-1">
                <span>⚠️</span> {passwordError}
              </p>
            )}
            {resetNotice && (
              <p className="text-xs text-emerald-400 mt-1.5 font-medium flex items-center gap-1">
                <span>✓</span> {resetNotice}
              </p>
            )}
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
              <span>
                💡 Default:{' '}
                <code className="text-cyan-400 font-semibold font-mono">{DEFAULT_ADMIN_PASSWORD}</code>
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="text-amber-400 hover:text-amber-300 underline cursor-pointer text-[11px]"
              >
                Lupa sandi?
              </button>
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
