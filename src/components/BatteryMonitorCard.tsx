import React from 'react';
import { BatteryCharging, Battery, BatteryWarning, Zap, RefreshCw, Layers } from 'lucide-react';
import type { BatteryMonitoringState } from '../types/telemetry';

interface BatteryMonitorCardProps {
  battery: BatteryMonitoringState;
  onSimulateDrain: () => void;
  onSimulateRecharge: () => void;
}

export const BatteryMonitorCard: React.FC<BatteryMonitorCardProps> = ({
  battery,
  onSimulateDrain,
  onSimulateRecharge,
}) => {
  const isCritical = battery.status === 'critical';
  const isLow = battery.status === 'low';
  const isFull = battery.status === 'full';

  // Compute voltage at ADC pin (before divider multiplication)
  const adcVoltage = (battery.voltage / battery.dividerRatio).toFixed(2);

  return (
    <div className={`rounded-xl border p-4 transition-all duration-300 relative overflow-hidden ${
      isCritical 
        ? 'border-rose-500/80 bg-rose-950/20 ring-2 ring-rose-500/20' 
        : isLow 
        ? 'border-amber-500/80 bg-amber-950/20' 
        : 'border-slate-800/90 bg-slate-900/60'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-300">Status Baterai (Voltage Divider)</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
            ESP32-C3 ADC1_CH1
          </span>
        </div>
        {isCritical ? (
          <BatteryWarning className="w-4 h-4 text-rose-400 animate-pulse" />
        ) : (
          <Battery className={`w-4 h-4 ${isFull ? 'text-emerald-400' : 'text-cyan-400'}`} />
        )}
      </div>

      {/* Main Metric: Percentage & Voltage */}
      <div className="mt-3 flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-bold font-mono tabular-nums ${
            isCritical ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {battery.percentage}%
          </span>
          <span className="text-sm font-mono text-slate-400">
            ({battery.voltage.toFixed(2)} V)
          </span>
        </div>

        <span className={`text-xs font-semibold px-2 py-0.5 rounded border font-mono ${
          isCritical 
            ? 'bg-rose-950 text-rose-300 border-rose-800' 
            : isLow 
            ? 'bg-amber-950 text-amber-300 border-amber-800' 
            : 'bg-emerald-950 text-emerald-300 border-emerald-800'
        }`}>
          {isCritical ? 'KRITIS' : isLow ? 'LEMAH' : isFull ? 'PENUH' : 'NORMAL'}
        </span>
      </div>

      {/* Battery Progress Bar */}
      <div className="mt-3 w-full bg-slate-800 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-2 rounded-full transition-all duration-500 ${
            isCritical ? 'bg-rose-500' : isLow ? 'bg-amber-400' : 'bg-emerald-400'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, battery.percentage))}%` }}
        />
      </div>

      {/* Voltage Divider Technical Readouts */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5 text-[11px] font-mono">
        <div className="flex items-center justify-between text-slate-400">
          <span>Rangkaian Divider:</span>
          <span className="text-slate-200">
            R1={battery.r1Kohm}kΩ, R2={battery.r2Kohm}kΩ (2.0x)
          </span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Tegangan Pin GPIO 1:</span>
          <span className="text-cyan-300 font-semibold">{adcVoltage} V (Aman ≤ 3.3V)</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>ADC Raw (12-bit):</span>
          <span className="text-slate-300">{battery.adcRaw} / 4095</span>
        </div>
      </div>

      {/* Quick Simulation actions */}
      <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
        <button
          onClick={onSimulateDrain}
          className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-amber-300 hover:bg-slate-700 transition-colors"
        >
          Simulasi Drop (3.38V)
        </button>
        <button
          onClick={onSimulateRecharge}
          className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800 hover:bg-emerald-900/80 transition-colors"
        >
          Isi Ulang (4.18V)
        </button>
      </div>
    </div>
  );
};
