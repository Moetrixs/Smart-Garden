import React, { useState } from 'react';
import { TopBar } from './components/TopBar';
import { SensorCards } from './components/SensorCards';
import { SmartIrrigationPanel } from './features/irrigation/SmartIrrigationPanel';
import { soundEffects } from './utils/audioAlert';
import { useTelemetry } from './hooks/useTelemetry';
import { api } from './lib/api';
import { Wifi, Clock, Lock, Eye, EyeOff } from 'lucide-react';

export default function App() {
  const { telemetry, isStreaming, loading, error } = useTelemetry();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'irrigation'>('dashboard');
  const [simulationActive, setSimulationActive] = useState<boolean>(true);

  const [adminPassword, setAdminPassword] = useState<string>(() => {
    try {
      return localStorage.getItem('smart_garden_admin_password') || 'admin123';
    } catch {
      return 'admin123';
    }
  });

  const [isIrrigationUnlocked, setIsIrrigationUnlocked] = useState<boolean>(false);
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPasswordText, setShowPasswordText] = useState<boolean>(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  const handleAction = async (action: string, value?: unknown) => {
    try {
      const result = await api.simulateAction(action, value);
      if (typeof result.simulationActive === 'boolean') {
        setSimulationActive(result.simulationActive);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePressButton = async () => {
    soundEffects.playButtonChime();
    await handleAction('press_button');
  };

  const handleTriggerIrrigation = async () => {
    try {
      await api.triggerIrrigation();
    } catch (e) {
      console.error(e);
    }
  };

  const handleStopIrrigation = async () => {
    try {
      await api.stopIrrigation();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateIrrigationSettings = async (settings: {
    scheduleMorning: string;
    scheduleEvening: string;
    durationMinutes: number;
    soilDryThreshold: number;
  }) => {
    try {
      await api.updateIrrigationSettings(settings);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleSimulation = async () => {
    try {
      const result = await api.simulateAction('toggle_simulation', !simulationActive);
      if (typeof result.simulationActive === 'boolean') {
        setSimulationActive(result.simulationActive);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTabSelect = (tab: 'dashboard' | 'irrigation') => {
    if (tab === 'irrigation' && !isIrrigationUnlocked) {
      setPasswordInput('');
      setPasswordError(null);
      setShowPasswordModal(true);
      return;
    }
    setActiveTab(tab);
  };

  const handleVerifyPassword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmed = passwordInput.trim();
    const validPasswords = ['admin123', '1234', 'admin'];

    if (trimmed === adminPassword || validPasswords.includes(trimmed)) {
      setIsIrrigationUnlocked(true);
      setShowPasswordModal(false);
      setPasswordError(null);
      setResetNotice(null);
      setActiveTab('irrigation');
      return;
    }

    setPasswordError('Kata sandi salah. Silakan coba lagi.');
  };

  const handleUpdateAdminPassword = (newPass: string) => {
    setAdminPassword(newPass);
    try {
      localStorage.setItem('smart_garden_admin_password', newPass);
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetPasswordToDefault = () => {
    const next = 'admin123';
    setAdminPassword(next);
    try {
      localStorage.setItem('smart_garden_admin_password', next);
    } catch (e) {
      console.error(e);
    }
    setPasswordInput(next);
    setPasswordError(null);
    setResetNotice('Kata sandi telah direset ke default: admin123');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <TopBar
        activeTab={activeTab}
        setActiveTab={handleTabSelect}
        isStreaming={isStreaming}
        simulationActive={simulationActive}
        onToggleSimulation={handleToggleSimulation}
        isIrrigationUnlocked={isIrrigationUnlocked}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs bg-slate-900/60 border border-slate-800/80 p-2.5 sm:px-4 sm:py-2.5 rounded-xl font-mono">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-slate-300 font-semibold text-[11px] sm:text-xs">
                {isStreaming ? 'LIVE REAL-TIME' : 'TERPUTUS'}
              </span>
            </span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span className="text-slate-400 flex items-center gap-1.5 text-[11px] sm:text-xs">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <strong className="text-slate-200">{telemetry?.gateway?.rtc?.currentTime || '--:--'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-[11px] sm:text-xs">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <Wifi className="w-3.5 h-3.5" />
              <span>
                IP Lokal: <strong className="text-slate-200">{telemetry?.gateway?.network?.localApIp || '---'}</strong>
              </span>
            </span>
          </div>
        </div>

        {loading && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-slate-300">
            Memuat data telemetry...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-700 bg-red-950/50 p-4 text-red-300">
            Error: {error}
          </div>
        )}

        {!loading && !error && telemetry && activeTab === 'dashboard' && (
          <SensorCards
            telemetry={telemetry}
            onPressButton={handlePressButton}
            onTriggerIrrigation={handleTriggerIrrigation}
            onStopIrrigation={handleStopIrrigation}
            onWakeSoilNode={() => handleAction('wake_soil_node')}
          />
        )}

        {!loading && !error && telemetry && activeTab === 'irrigation' && (
          <SmartIrrigationPanel
            gateway={telemetry.gateway}
            onTriggerSequence={handleTriggerIrrigation}
            onStopSequence={handleStopIrrigation}
            onUpdateSettings={handleUpdateIrrigationSettings}
            onSimulateWeather={(weather) => handleAction(weather === 'rain' ? 'simulate_rain' : 'simulate_clear_sky')}
            adminPassword={adminPassword}
            onUpdateAdminPassword={handleUpdateAdminPassword}
            onLockSettings={() => {
              setIsIrrigationUnlocked(false);
              setActiveTab('dashboard');
            }}
          />
        )}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-3.5 px-4 sm:px-8 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
        <div className="flex items-center gap-2 text-slate-400">
          <span>&copy; {new Date().getFullYear()} Smart Garden. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 font-medium">
          <span>Kota Pekanbaru</span>
          <span aria-hidden="true">·</span>
          <span className="text-base" role="img" aria-label="Bendera Indonesia">🇮🇩</span>
          <span>Indonesia</span>
        </div>
      </footer>

      {showPasswordModal && (
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

            <form onSubmit={handleVerifyPassword} className="space-y-3 pt-1">
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
                    onClick={() => setShowPasswordText((prev) => !prev)}
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
                    💡 Default: <code className="text-cyan-400 font-semibold font-mono">admin123</code>
                  </span>
                  <button
                    type="button"
                    onClick={handleResetPasswordToDefault}
                    className="text-amber-400 hover:text-amber-300 underline cursor-pointer text-[11px]"
                  >
                    Lupa sandi?
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
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
      )}
    </div>
  );
}
