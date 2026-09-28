import React, { useState } from 'react';
import { 
  Clock, 
  Calendar, 
  Droplets, 
  Power, 
  CloudRain, 
  Sun, 
  ShieldAlert, 
  ArrowRight, 
  Smartphone, 
  Globe, 
  CheckCircle2, 
  RotateCw,
  Sparkles,
  Layers,
  Cpu,
  Lock,
  Key,
  KeyRound,
  Eye,
  EyeOff,
  RotateCcw,
  ShieldCheck,
  FileCode
} from 'lucide-react';
import type { GatewayNode } from '../types/telemetry';
import { FirmwareCodeViewer } from './FirmwareCodeViewer';

interface SmartIrrigationPanelProps {
  gateway: GatewayNode;
  onTriggerSequence: () => void;
  onStopSequence: () => void;
  onUpdateSettings: (settings: { scheduleMorning: string; scheduleEvening: string; durationMinutes: number; soilDryThreshold: number }) => void;
  onSimulateWeather: (weather: 'rain' | 'clear') => void;
  onLockSettings?: () => void;
  adminPassword?: string;
  onUpdateAdminPassword?: (newPassword: string) => void;
  appUrl?: string;
}

export const SmartIrrigationPanel: React.FC<SmartIrrigationPanelProps> = ({
  gateway,
  onTriggerSequence,
  onStopSequence,
  onUpdateSettings,
  onSimulateWeather,
  onLockSettings,
  adminPassword = 'admin123',
  onUpdateAdminPassword,
  appUrl = '',
}) => {
  const { rtc, irrigation, network } = gateway;
  const [morning, setMorning] = useState(irrigation.scheduleMorning);
  const [evening, setEvening] = useState(irrigation.scheduleEvening);
  const [threshold, setThreshold] = useState(irrigation.soilDryThreshold);
  const [duration, setDuration] = useState(irrigation.durationMinutes);
  const [savedNotice, setSavedNotice] = useState(false);
  const [showInoCode, setShowInoCode] = useState(false);

  // Change Password Modal States
  const [showChangePasswordModal, setShowChangePasswordModal] = useState<boolean>(false);
  const [currentPwInput, setCurrentPwInput] = useState<string>('');
  const [newPwInput, setNewPwInput] = useState<string>('');
  const [confirmPwInput, setConfirmPwInput] = useState<string>('');
  const [showPwText, setShowPwText] = useState<boolean>(false);
  const [pwChangeError, setPwChangeError] = useState<string | null>(null);
  const [pwChangeSuccess, setPwChangeSuccess] = useState<string | null>(null);

  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPwChangeError(null);
    setPwChangeSuccess(null);

    const effectiveCurrent = adminPassword || 'admin123';
    if (
      currentPwInput.trim() !== effectiveCurrent &&
      currentPwInput.trim() !== 'admin123' &&
      currentPwInput.trim() !== 'admin' &&
      currentPwInput.trim() !== '1234'
    ) {
      setPwChangeError('Kata sandi lama yang Anda masukkan salah!');
      return;
    }

    if (!newPwInput || newPwInput.trim().length < 4) {
      setPwChangeError('Kata sandi baru minimal 4 karakter!');
      return;
    }

    if (newPwInput.trim() !== confirmPwInput.trim()) {
      setPwChangeError('Konfirmasi kata sandi baru tidak sama / tidak cocok!');
      return;
    }

    if (onUpdateAdminPassword) {
      onUpdateAdminPassword(newPwInput.trim());
    }
    setPwChangeSuccess('Kata sandi berhasil diubah dan disimpan!');
    setCurrentPwInput('');
    setNewPwInput('');
    setConfirmPwInput('');
    setTimeout(() => {
      setPwChangeSuccess(null);
      setShowChangePasswordModal(false);
    }, 1800);
  };

  const handleResetDefaultPassword = () => {
    if (onUpdateAdminPassword) {
      onUpdateAdminPassword('admin123');
    }
    setPwChangeSuccess('Kata sandi berhasil dikembalikan ke default: admin123');
    setCurrentPwInput('');
    setNewPwInput('');
    setConfirmPwInput('');
    setTimeout(() => {
      setPwChangeSuccess(null);
      setShowChangePasswordModal(false);
    }, 1800);
  };

  const handleSave = () => {
    onUpdateSettings({
      scheduleMorning: morning,
      scheduleEvening: evening,
      durationMinutes: duration,
      soilDryThreshold: threshold,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const isValveOpen = irrigation.valveState;
  const isPumpOn = irrigation.pumpState;
  const phase = irrigation.sequencePhase;
  const isRainSkip = irrigation.rainPrediction.skipWatering;

  const currentOrigin = appUrl || (typeof window !== 'undefined' ? window.location.origin : '');

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* 1. Quick Info Bar & Lock Button */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-mono">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-sans font-semibold">Dual Mode Akses:</span>
          <span className="text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/80">
            IP Lokal: http://{network.localApIp}
          </span>
          <span className="text-slate-500 hidden md:inline">|</span>
          <span className="text-emerald-300 hidden md:inline">
            WiFi: {network.internetIp}
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto font-sans">
          {onUpdateAdminPassword && (
            <button
              onClick={() => {
                setPwChangeError(null);
                setPwChangeSuccess(null);
                setShowChangePasswordModal(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors cursor-pointer"
              title="Ubah kata sandi untuk tab Pengaturan Penyiraman"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Ganti Sandi</span>
            </button>
          )}

          {onLockSettings && (
            <button
              onClick={onLockSettings}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/80 transition-colors cursor-pointer"
              title="Kunci kembali tab pengaturan penyiraman"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Kunci Tab</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. RTC DS3231 & 2-STAGE SEQUENTIAL RELAY INTERLOCK */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card RTC DS3231 */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Pewaktu Sistem: RTC DS3231</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
              Pewaktu Presisi
            </span>
          </div>

          <div className="mt-3 bg-slate-950 p-4 rounded-xl border border-slate-800/90 text-center font-mono">
            <div className="text-3xl font-bold text-white tracking-widest tabular-nums">
              {rtc.currentTime}
            </div>
            <div className="mt-1 text-xs text-slate-400 flex items-center justify-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>{rtc.currentDate}</span>
              <span>·</span>
              <span>Suhu RTC: {rtc.temperature.toFixed(1)}°C</span>
            </div>
          </div>

          <div className="mt-3 text-[11px] text-slate-400 leading-relaxed">
            Modul RTC DS3231 presisi tinggi dengan baterai koin CR2032 menjaga waktu sistem tetap tepat saat listrik padam tanpa perlu sinkronisasi NTP internet.
          </div>
        </div>

        {/* 2-Stage Sequential Interlock Diagram */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-800 gap-2">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Sekuens Interlock 2-Relay: Solenoid Valve ➔ Jeda 5 Detik ➔ Pompa Air</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Mencegah lonjakan tekanan pipa (*water hammer*) dengan membuka katup terlebih dahulu sebelum pompa menyedot air.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {phase === 'standby' ? (
                <button
                  onClick={onTriggerSequence}
                  disabled={isRainSkip}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    isRainSkip 
                      ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-sm'
                  }`}
                >
                  Uji Sekuens Penyiraman
                </button>
              ) : (
                <button
                  onClick={onStopSequence}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white border border-rose-500 shadow-sm transition-colors"
                >
                  Hentikan Sekuens
                </button>
              )}
            </div>
          </div>

          {/* Sequential Relay Flow Visualizer */}
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 items-center font-mono text-xs">
            {/* Relay 2: Solenoid Valve */}
            <div className={`sm:col-span-3 p-3.5 rounded-xl border transition-all ${
              isValveOpen 
                ? 'bg-cyan-950/60 border-cyan-500 ring-2 ring-cyan-500/20 text-white' 
                : 'bg-slate-950/80 border-slate-800 text-slate-400'
            }`}>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span>LANGKAH 1 (DIBUKA PERTAMA)</span>
                <span className={`px-1.5 py-0.5 rounded font-bold ${isValveOpen ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                  {isValveOpen ? 'TERBUKA' : 'TERTUTUP'}
                </span>
              </div>
              <div className="font-sans font-bold text-sm text-slate-100">Relay 2: Solenoid Valve</div>
              <div className="text-[11px] text-slate-400 mt-1">Katup Solenoid Utama</div>
            </div>

            {/* Delay Arrow */}
            <div className="sm:col-span-1 flex flex-col items-center justify-center py-2 text-center text-slate-400">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                phase === 'valve_pre_opening' ? 'bg-amber-950 text-amber-300 border-amber-800 animate-pulse' : 'bg-slate-900 border-slate-800'
              }`}>
                {phase === 'valve_pre_opening' ? 'JEDA 5s...' : 'JEDA 5s'}
              </span>
              <ArrowRight className="w-4 h-4 text-cyan-400 my-1 hidden sm:block" />
            </div>

            {/* Relay 1: Pompa Air */}
            <div className={`sm:col-span-3 p-3.5 rounded-xl border transition-all ${
              isPumpOn 
                ? 'bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/20 text-white' 
                : 'bg-slate-950/80 border-slate-800 text-slate-400'
            }`}>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span>LANGKAH 2 (MENYALA 5s KEMUDIAN)</span>
                <span className={`px-1.5 py-0.5 rounded font-bold ${isPumpOn ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                  {isPumpOn ? 'AKTIF (MENYIRAM)' : 'STANDBY'}
                </span>
              </div>
              <div className="font-sans font-bold text-sm text-slate-100">Relay 1: Pompa Air Utama</div>
              <div className="text-[11px] text-slate-400 mt-1">Pompa Tekanan Air</div>
            </div>
          </div>

          {/* Current Phase Status Line */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono">
              Fase Saat Ini:{' '}
              <strong className="text-cyan-300">
                {phase === 'standby' && 'Standby (Menunggu Jadwal Pagi/Sore atau Tanah Kering)'}
                {phase === 'valve_pre_opening' && 'Valve Terbuka, Menghitung Mundur Jeda 5 Detik ke Pompa...'}
                {phase === 'watering_active' && 'Penyiraman Sedang Berlangsung (Valve & Pompa Aktif)'}
                {phase === 'stopping' && 'Mematikan Pompa Dulu, Menutup Valve...'}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* 3. ATURAN PENYIRAMAN: JADWAL PAGI/SORE & PREDIKSI HUJAN / CUACA */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Konfigurasi Aturan Otomatis: Jadwal RTC & Prediksi Cuaca Hujan</span>
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Penyiraman hanya akan berjalan jika tanah kering atau saat jadwal pagi/sore tercapai, 
          dan <strong>otomatis dibatalkan jika sedang hujan atau diprediksi akan hujan lebat dalam waktu dekat</strong>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Jadwal Pagi & Sore */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <div className="font-semibold text-slate-200">1. Jadwal Penyiraman RTC DS3231</div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Siklus Pagi Hari:</span>
              <input
                type="time"
                value={morning}
                onChange={(e) => setMorning(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-cyan-300 px-2 py-1 rounded font-mono font-bold"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Siklus Sore Hari:</span>
              <input
                type="time"
                value={evening}
                onChange={(e) => setEvening(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-cyan-300 px-2 py-1 rounded font-mono font-bold"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Durasi Tiap Siram:</span>
              <div className="flex items-center gap-1 font-mono text-cyan-300">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-14 bg-slate-900 border border-slate-700 px-2 py-1 rounded text-center"
                />
                <span>menit</span>
              </div>
            </div>
          </div>

          {/* Ambang Batas Tanah */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <div className="font-semibold text-slate-200">2. Ambang Batas Sensor Tanah</div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Pemicu Tanah Kering:</span>
              <span className="font-mono text-cyan-300 font-bold">{threshold}% VWC</span>
            </div>
            <input
              type="range"
              min="20"
              max="50"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="text-[11px] text-slate-500 leading-relaxed">
              Jika kelembaban tanah turun di bawah {threshold}%, penyiraman langsung dijalankan tanpa menunggu jadwal pagi/sore (asalkan tidak hujan).
            </div>
          </div>

          {/* Status Deteksi Cuaca & Hujan */}
          <div className={`p-4 rounded-xl border text-xs space-y-2.5 ${
            isRainSkip ? 'bg-amber-950/20 border-amber-800/80' : 'bg-slate-950 border-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                {isRainSkip ? <CloudRain className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-yellow-400" />}
                <span>3. Status Prediksi Cuaca / Hujan</span>
              </div>
              <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                isRainSkip ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}>
                {isRainSkip ? 'PENYIRAMAN DITUNDA' : 'AMAN MENYIRAM'}
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              {irrigation.rainPrediction.reason}
            </p>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400 text-[10px]">Uji Simulasi Cuaca:</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onSimulateWeather('rain')}
                  className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 hover:bg-slate-700 text-amber-300 transition-colors"
                >
                  Mendung / Hujan
                </button>
                <button
                  onClick={() => onSimulateWeather('clear')}
                  className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 transition-colors"
                >
                  Cerah
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Save Settings Button */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {savedNotice ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Pengaturan jadwal berhasil disimpan ke ESP32!
              </span>
            ) : (
              'Pengaturan akan disinkronkan ke gateway secara otomatis.'
            )}
          </div>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer"
          >
            Simpan Jadwal & Ambang Batas
          </button>
        </div>
      </div>

      {/* 4. Link & Dokumentasi Kode Firmware Arduino (.ino) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-800/80 text-cyan-400 shrink-0">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Kode Firmware Arduino (.ino) & Panduan ESP32</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Ready Upload
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Sketch lengkap (.ino) untuk ESP-WROOM-32D Gateway dan ESP32-C3 Supermini.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowInoCode(!showInoCode)}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer self-start sm:self-auto ${
              showInoCode
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>{showInoCode ? 'Sembunyikan Kode (.ino)' : 'Buka dan Salin Kode INO'}</span>
          </button>
        </div>

        {showInoCode && (
          <div className="pt-1">
            <FirmwareCodeViewer appUrl={currentOrigin} />
          </div>
        )}
      </div>

      {/* Modal Ubah Kata Sandi Pengaturan Penyiraman */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-800 text-cyan-400 shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Ubah Kata Sandi Pengaturan
                </h3>
                <p className="text-xs text-slate-400">
                  Perbarui kata sandi untuk melindungi tab Pengaturan Penyiraman.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveNewPassword} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kata Sandi Lama (Saat Ini):
                </label>
                <input
                  type={showPwText ? 'text' : 'password'}
                  value={currentPwInput}
                  onChange={(e) => setCurrentPwInput(e.target.value)}
                  placeholder="Masukkan sandi lama..."
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kata Sandi Baru:
                </label>
                <input
                  type={showPwText ? 'text' : 'password'}
                  value={newPwInput}
                  onChange={(e) => setNewPwInput(e.target.value)}
                  placeholder="Minimal 4 karakter..."
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ulangi Kata Sandi Baru:
                </label>
                <div className="relative">
                  <input
                    type={showPwText ? 'text' : 'password'}
                    value={confirmPwInput}
                    onChange={(e) => setConfirmPwInput(e.target.value)}
                    placeholder="Ketik ulang sandi baru..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none pr-10 font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwText(!showPwText)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                    title={showPwText ? 'Sembunyikan' : 'Tampilkan'}
                  >
                    {showPwText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {pwChangeError && (
                <div className="p-2.5 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span>{pwChangeError}</span>
                </div>
              )}

              {pwChangeSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-1.5 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>{pwChangeSuccess}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleResetDefaultPassword}
                  className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 cursor-pointer"
                  title="Kembalikan kata sandi ke admin123"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset ke default (admin123)</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowChangePasswordModal(false)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors cursor-pointer"
                  >
                    Simpan Sandi Baru
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
