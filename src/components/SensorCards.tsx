import React, { useState, useEffect } from 'react';
import { 
  Thermometer, 
  Sun, 
  BatteryCharging, 
  Sprout, 
  Moon
} from 'lucide-react';
import type { TelemetryData } from '../types/telemetry';
import { getSoilMoistureStatus, getAirTempStatus } from '../utils/formatters';

interface SensorCardsProps {
  telemetry: TelemetryData;
  onPressButton: () => void;
  onTriggerIrrigation: () => void;
  onStopIrrigation: () => void;
  onWakeSoilNode: () => void;
}

export const SensorCards: React.FC<SensorCardsProps> = ({
  telemetry,
  onPressButton,
  onTriggerIrrigation,
  onStopIrrigation,
  onWakeSoilNode,
}) => {
  const { gateway, soilNode } = telemetry;
  const soilStatus = getSoilMoistureStatus(soilNode.sensors.soilMoisture);
  const airStatus = getAirTempStatus(gateway.sensors.airTemp);

  // Countdown to next 15m wakeup
  const [countdown, setCountdown] = useState<string>('--:--');

  useEffect(() => {
    const update = () => {
      try {
        const nextTime = new Date(soilNode.deepSleep.nextWakeupIso).getTime();
        const diffMs = nextTime - Date.now();
        if (diffMs <= 0) {
          setCountdown('Bangun...');
          return;
        }
        const mins = Math.floor(diffMs / 60000);
        const secs = Math.floor((diffMs % 60000) / 1000);
        setCountdown(`${mins}m ${secs < 10 ? '0' : ''}${secs}d`);
      } catch {
        setCountdown('15m 00d');
      }
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [soilNode.deepSleep.nextWakeupIso]);

  const isValveOpen = gateway.irrigation.valveState;
  const isPumpOn = gateway.irrigation.pumpState;
  const phase = gateway.irrigation.sequencePhase;
  const isC3Awake = soilNode.deepSleep.state === 'awake_transmitting';

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Empat Kartu Sensor Utama (Simple & Clean Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Card 1: Suhu & Kelembaban Udara (Gateway) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-amber-400" />
              <span>Lingkungan Udara</span>
            </span>
            <span className="text-[11px] font-mono text-cyan-400">Sensor Udara</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80">
              <div className="text-[10px] text-slate-500 font-mono">SUHU UDARA</div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-amber-400 tabular-nums">
                  {gateway.sensors.airTemp.toFixed(1)}
                </span>
                <span className="text-xs text-slate-500 font-mono">°C</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400 font-sans">{airStatus.label}</div>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80">
              <div className="text-[10px] text-slate-500 font-mono">KELEMBABAN UDARA</div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-cyan-400 tabular-nums">
                  {gateway.sensors.airHumidity.toFixed(0)}
                </span>
                <span className="text-xs text-slate-500 font-mono">% RH</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400 font-sans">
                {gateway.sensors.airHumidity > 70 ? 'Cukup Lembab' : 'Normal'}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Kelembaban & Suhu Tanah (Node C3 via ESP-NOW) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Sprout className="w-4 h-4 text-emerald-400" />
              <span>Kondisi Tanah</span>
            </span>
            <span className="text-[11px] font-mono text-emerald-400">Sensor Tanah</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80">
              <div className="text-[10px] text-slate-500 font-mono">KELEMBABAN TANAH</div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className={`text-2xl sm:text-3xl font-bold font-mono tabular-nums ${
                  soilNode.sensors.soilMoisture < 30 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
                }`}>
                  {soilNode.sensors.soilMoisture.toFixed(1)}
                </span>
                <span className="text-xs text-slate-500 font-mono">%</span>
              </div>
              <div className="mt-1 text-[11px] font-semibold text-emerald-400 font-sans">
                {soilStatus.label}
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80">
              <div className="text-[10px] text-slate-500 font-mono">SUHU TANAH (DS18B20)</div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-cyan-400 tabular-nums">
                  {soilNode.sensors.soilTemp.toFixed(1)}
                </span>
                <span className="text-xs text-slate-500 font-mono">°C</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400 font-sans">Zona Perakaran</div>
            </div>
          </div>
        </div>

        {/* Card 3: Cahaya & Tombol Fisik */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-yellow-400" />
              <span>Cahaya & Tombol Push</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80">
              <div className="text-[10px] text-slate-500 font-mono">INTENSITAS CAHAYA</div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-yellow-400 tabular-nums">
                  {gateway.sensors.lightLux}
                </span>
                <span className="text-xs text-slate-500 font-mono">Lux</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400 font-sans">
                {gateway.sensors.lightLux < 200 ? 'Redup' : 'Terang'}
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80 flex flex-col justify-between">
              <div>
                <div className="text-[10px] text-slate-500 font-mono">TOMBOL FISIK</div>
                <div className={`mt-1 text-lg font-bold font-mono ${
                  gateway.sensors.buttonState === 1 ? 'text-amber-400' : 'text-slate-300'
                }`}>
                  {gateway.sensors.buttonState === 1 ? 'DITEKAN' : 'STANDBY'}
                </div>
              </div>
              <button
                onClick={onPressButton}
                className="mt-2 py-1 px-2 text-[11px] font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                Uji Tekan
              </button>
            </div>
          </div>
        </div>

        {/* Card 4: Daya & Baterai Node (dengan Countdown Deep Sleep sejajar di header) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <BatteryCharging className="w-4 h-4 text-emerald-400" />
              <span>Daya & Baterai Node</span>
            </span>
            <span className="flex items-center gap-1 text-[11px] font-mono text-indigo-300 bg-indigo-950/70 px-2 py-0.5 rounded border border-indigo-800/60">
              <Moon className={`w-3.5 h-3.5 ${isC3Awake ? 'text-cyan-400 animate-pulse' : 'text-indigo-400'}`} />
              <span>Tidur: {countdown}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80">
              <div className="text-[10px] text-slate-500 font-mono">STATUS BATERAI</div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 tabular-nums">
                  {soilNode.battery.percentage}
                </span>
                <span className="text-xs text-slate-500 font-mono">%</span>
              </div>
              <div className="mt-1 text-[11px] font-mono text-slate-400">{soilNode.battery.voltage} Volt</div>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80 flex flex-col justify-between">
              <div>
                <div className="text-[10px] text-slate-500 font-mono">POWER SWITCH SENSOR</div>
                <div className="mt-1 text-xs font-semibold text-cyan-300">
                  Hemat Daya Otomatis (0µA)
                </div>
              </div>
              <button
                onClick={onWakeSoilNode}
                className="mt-2 py-1 px-2 text-[11px] font-semibold rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 hover:bg-emerald-900/80 transition-colors"
              >
                Bangunkan Node
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Panel Watering Ringkas dengan Status Irigasi */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-white">Watering:</span>
              <span className={`text-[11px] px-2 py-0.5 rounded font-mono font-bold tracking-wide ${
                isPumpOn 
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 animate-pulse' 
                  : isValveOpen 
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-700' 
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                STATUS: {isPumpOn ? 'MENYIRAM' : isValveOpen ? 'VALVE BUKA' : 'STANDBY'}
              </span>
              <span className="text-slate-600 hidden sm:inline">·</span>
              <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                isValveOpen ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}>
                Relay 2 (Valve): {isValveOpen ? 'OPEN' : 'CLOSED'}
              </span>
              <span className="text-slate-500 font-mono">➔ Jeda 5s ➔</span>
              <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                isPumpOn ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}>
                Relay 1 (Pompa): {isPumpOn ? 'ON' : 'OFF'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              {phase === 'standby' && 'Sistem siap (Standby otomatis jadwal pagi 06:30 & sore 16:30).'}
              {phase === 'valve_pre_opening' && 'Valve dibuka! Menunggu jeda 5 detik untuk menyalakan pompa...'}
              {phase === 'watering_active' && 'Penyiraman sedang berlangsung (Air mengalir).'}
              {phase === 'stopping' && 'Mematikan pompa terlebih dahulu, lalu menutup valve...'}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {phase === 'standby' ? (
              <button
                onClick={onTriggerIrrigation}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors whitespace-nowrap cursor-pointer"
              >
                Mulai Siram Sekarang
              </button>
            ) : (
              <button
                onClick={onStopIrrigation}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-colors whitespace-nowrap cursor-pointer"
              >
                Hentikan Siram
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
