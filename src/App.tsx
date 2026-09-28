import React, { useState, useEffect, useRef } from 'react';
import type { TelemetryData, ActivityLog } from './types/telemetry';
import { TopBar } from './components/TopBar';
import { SensorCards } from './components/SensorCards';
import { SmartIrrigationPanel } from './components/SmartIrrigationPanel';
import { soundEffects } from './utils/audioAlert';
import { Wifi, Clock, Lock, Eye, EyeOff } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'irrigation'>('dashboard');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [simulationActive, setSimulationActive] = useState<boolean>(true);

  // Password protection for Pengaturan Penyiraman
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

  const now = Date.now();
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    timestamp: new Date().toISOString(),
    source: 'simulation',
    gateway: {
      id: 'ESP32-GW-WROOM32D',
      boardModel: 'ESP-WROOM-32D',
      status: 'online',
      macAddress: '24:0a:c4:15:40:25',
      lastSeen: now,
      ip: '192.168.1.145',
      wifiSsid: 'IoT-Lab-WiFi',
      wifiRssi: -58,
      uptimeSeconds: 4320,
      sensors: {
        airTemp: 28.6,
        airHumidity: 65.4,
        lightLux: 720,
        buttonState: 0,
        buttonPressCount: 16,
        lastButtonPressedAt: null,
      },
      hasPhysicalLcd: true,
      rtc: {
        enabled: true,
        model: 'DS3231',
        currentTime: new Date().toLocaleTimeString('id-ID', { hour12: false }),
        currentDate: new Date().toISOString().slice(0, 10),
        temperature: 27.2,
      },
      irrigation: {
        valveState: false,
        pumpState: false,
        sequencePhase: 'standby',
        interlockDelaySeconds: 5,
        scheduleMorning: '06:30',
        scheduleEvening: '16:30',
        durationMinutes: 5,
        soilDryThreshold: 35,
        rainPrediction: {
          status: 'clear',
          skipWatering: false,
          probabilityPercent: 12,
          reason: 'Cuaca cerah / kering. Aman untuk menjalankan jadwal penyiraman tanaman.',
        },
      },
      network: {
        dualModeActive: true,
        localApSsid: 'ESP32-Smart-Garden',
        localApIp: '192.168.4.1',
        internetConnected: true,
        internetIp: '192.168.1.145',
        cloudUrl: typeof window !== 'undefined' ? window.location.origin : '',
      },
    },
    soilNode: {
      id: 'ESP32-C3-SOIL',
      boardModel: 'ESP32-C3 Super Mini',
      protocol: 'ESP-NOW',
      status: 'online',
      macAddress: '24:6F:28:B1:C0:8A',
      rssi: -66,
      batteryVoltage: 3.96,
      battery: {
        voltage: 3.96,
        percentage: 85,
        adcRaw: 2457,
        dividerRatio: 2.0,
        r1Kohm: 100,
        r2Kohm: 100,
        status: 'normal',
      },
      deepSleep: {
        enabled: true,
        intervalMinutes: 15,
        state: 'sleeping',
        lastWakeupIso: new Date(now - 3 * 60000).toISOString(),
        nextWakeupIso: new Date(now + 12 * 60000).toISOString(),
        estimatedBatteryLifeMonths: 18,
        currentDrawUa: 5,
      },
      lastSeen: now,
      sensors: {
        soilMoisture: 42.5,
        soilTemp: 24.8,
        moistureRaw: 1980,
      },
    },
    control: {
      relayState: false,
      waterPumpAuto: true,
      moistureThreshold: 35,
      buzzerAlert: true,
    },
  });

  const [history, setHistory] = useState<TelemetryData[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const prevButtonState = useRef<number>(0);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/telemetry/stream');

        eventSource.onopen = () => {
          setIsStreaming(true);
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'initial_state') {
              if (data.payload) setTelemetry(data.payload);
              if (data.history) setHistory(data.history);
              if (data.logs) setLogs(data.logs);
            } else if (data.type === 'telemetry_update') {
              setTelemetry(data.payload);
              setHistory((prev) => {
                const next = [...prev, data.payload];
                return next.slice(-150);
              });

              const currentBtn = data.payload.gateway?.sensors?.buttonState ?? 0;
              if (currentBtn === 1 && prevButtonState.current === 0) {
                soundEffects.playButtonChime();
              }
              prevButtonState.current = currentBtn;

              if (data.payload.soilNode?.sensors?.soilMoisture < 25 || data.payload.soilNode?.battery?.status === 'critical') {
                soundEffects.playAlertWarning();
              }
            } else if (data.type === 'new_log') {
              setLogs((prev) => [data.payload, ...prev.slice(0, 99)]);
            }
          } catch (e) {
            console.error('Error parsing SSE message', e);
          }
        };

        eventSource.onerror = () => {
          setIsStreaming(false);
          eventSource?.close();
          reconnectTimeout = setTimeout(connectSSE, 3000);
        };
      } catch (err) {
        setIsStreaming(false);
        reconnectTimeout = setTimeout(connectSSE, 3000);
      }
    };

    connectSSE();

    fetch('/api/telemetry/latest')
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setTelemetry(json.data);
        if (json.meta) setSimulationActive(json.meta.simulationActive);
      })
      .catch(() => {});

    fetch('/api/telemetry/history')
      .then((res) => res.json())
      .then((json) => {
        if (json.history) setHistory(json.history);
      })
      .catch(() => {});

    fetch('/api/logs')
      .then((res) => res.json())
      .then((json) => {
        if (json.logs) setLogs(json.logs);
      })
      .catch(() => {});

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  const handlePressButton = async () => {
    soundEffects.playButtonChime();
    try {
      await fetch('/api/simulate/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'press_button' }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleControlChange = async (controlUpdates: Partial<TelemetryData['control']>) => {
    try {
      const res = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(controlUpdates),
      });
      const data = await res.json();
      if (data.control) {
        setTelemetry((prev) => ({
          ...prev,
          control: data.control,
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSimulateAction = async (action: string) => {
    try {
      await fetch('/api/simulate/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleTriggerIrrigation = async () => {
    try {
      await fetch('/api/irrigation/trigger', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleStopIrrigation = async () => {
    try {
      await fetch('/api/irrigation/stop', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateIrrigationSettings = async (settings: { scheduleMorning: string; scheduleEvening: string; durationMinutes: number; soilDryThreshold: number }) => {
    try {
      await fetch('/api/irrigation/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSimulateWeather = async (weather: 'rain' | 'clear') => {
    try {
      await fetch('/api/simulate/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: weather === 'rain' ? 'simulate_rain' : 'simulate_clear_sky' }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleSimulation = async () => {
    try {
      const res = await fetch('/api/simulate/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_simulation', value: !simulationActive }),
      });
      const data = await res.json();
      if (typeof data.simulationActive === 'boolean') {
        setSimulationActive(data.simulationActive);
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
    if (
      trimmed === adminPassword ||
      trimmed === 'admin123' ||
      trimmed === '1234' ||
      trimmed === 'admin'
    ) {
      setIsIrrigationUnlocked(true);
      setShowPasswordModal(false);
      setActiveTab('irrigation');
      setPasswordError(null);
      setResetNotice(null);
    } else {
      setPasswordError('Kata sandi salah. Silakan coba lagi.');
    }
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
    setAdminPassword('admin123');
    try {
      localStorage.setItem('smart_garden_admin_password', 'admin123');
    } catch (e) {
      console.error(e);
    }
    setPasswordInput('admin123');
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
        {/* Status Telemetry Header Ribbon - Clean & Mobile Responsive */}
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
              <strong className="text-slate-200">{telemetry.gateway.rtc.currentTime}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-[11px] sm:text-xs">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <Wifi className="w-3.5 h-3.5" />
              <span>IP Lokal: <strong className="text-slate-200">{telemetry.gateway.network.localApIp}</strong></span>
            </span>
          </div>
        </div>

        {/* Tab Views - STRICTLY 2 TABS FOR MAXIMUM SIMPLICITY & MOBILE CLARITY */}
        {activeTab === 'dashboard' && (
          <SensorCards
            telemetry={telemetry}
            onPressButton={handlePressButton}
            onTriggerIrrigation={handleTriggerIrrigation}
            onStopIrrigation={handleStopIrrigation}
            onWakeSoilNode={() => handleSimulateAction('wake_soil_node')}
          />
        )}

        {activeTab === 'irrigation' && (
          <SmartIrrigationPanel
            gateway={telemetry.gateway}
            onTriggerSequence={handleTriggerIrrigation}
            onStopSequence={handleStopIrrigation}
            onUpdateSettings={handleUpdateIrrigationSettings}
            onSimulateWeather={handleSimulateWeather}
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

      {/* Password Authentication Modal for Pengaturan Penyiraman */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-400 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Autentikasi Pengaturan
                </h3>
                <p className="text-xs text-slate-400">
                  Masukkan kata sandi untuk mengakses tab ini.
                </p>
              </div>
            </div>

            <form onSubmit={handleVerifyPassword} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Kata Sandi Administrator:
                </label>
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
                  <span>💡 Default: <code className="text-cyan-400 font-semibold font-mono">admin123</code></span>
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
