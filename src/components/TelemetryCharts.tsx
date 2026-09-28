import React, { useState, useMemo } from 'react';
import type { TelemetryData } from '../types/telemetry';
import { formatTime } from '../utils/formatters';

interface TelemetryChartsProps {
  history: TelemetryData[];
}

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({ history }) => {
  const [range, setRange] = useState<'10m' | '30m' | 'all'>('30m');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const filteredData = useMemo(() => {
    if (!history.length) return [];
    if (range === '10m') return history.slice(-20);
    if (range === '30m') return history.slice(-40);
    return history.slice(-100);
  }, [history, range]);

  // Statistics
  const stats = useMemo(() => {
    if (!filteredData.length) return null;
    let minAirT = Infinity, maxAirT = -Infinity, sumAirT = 0;
    let minSoilT = Infinity, maxSoilT = -Infinity, sumSoilT = 0;
    let minSoilM = Infinity, maxSoilM = -Infinity, sumSoilM = 0;
    let minAirH = Infinity, maxAirH = -Infinity, sumAirH = 0;

    for (const d of filteredData) {
      const at = d.gateway.sensors.airTemp;
      const st = d.soilNode.sensors.soilTemp;
      const sm = d.soilNode.sensors.soilMoisture;
      const ah = d.gateway.sensors.airHumidity;

      if (at < minAirT) minAirT = at;
      if (at > maxAirT) maxAirT = at;
      sumAirT += at;

      if (st < minSoilT) minSoilT = st;
      if (st > maxSoilT) maxSoilT = st;
      sumSoilT += st;

      if (sm < minSoilM) minSoilM = sm;
      if (sm > maxSoilM) maxSoilM = sm;
      sumSoilM += sm;

      if (ah < minAirH) minAirH = ah;
      if (ah > maxAirH) maxAirH = ah;
      sumAirH += ah;
    }

    const len = filteredData.length;
    return {
      airTemp: { min: minAirT, max: maxAirT, avg: +(sumAirT / len).toFixed(1) },
      soilTemp: { min: minSoilT, max: maxSoilT, avg: +(sumSoilT / len).toFixed(1) },
      soilMoist: { min: minSoilM, max: maxSoilM, avg: +(sumSoilM / len).toFixed(1) },
      airHum: { min: minAirH, max: maxAirH, avg: +(sumAirH / len).toFixed(1) },
    };
  }, [filteredData]);

  // Chart dimensions
  const width = 800;
  const height = 220;
  const padding = { top: 20, right: 30, bottom: 30, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Render SVG Line Path generator
  const createPath = (data: TelemetryData[], getValue: (d: TelemetryData) => number, minVal: number, maxVal: number) => {
    if (data.length < 2) return '';
    const span = maxVal - minVal || 1;
    return data.map((d, i) => {
      const x = padding.left + (i / (data.length - 1)) * chartW;
      const val = getValue(d);
      const y = padding.top + chartH - ((val - minVal) / span) * chartH;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  };

  const hoveredData = hoverIndex !== null && filteredData[hoverIndex] ? filteredData[hoverIndex] : null;

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">
            Grafik Historis & Korelasi Multi-Sensor
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Perbandingan real-time antara sensor lingkungan mikro (Gateway) dan sensor perakaran tanah (ESP-NOW)
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            onClick={() => setRange('10m')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              range === '10m' ? 'bg-slate-800 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            10 Menit Terakhir
          </button>
          <button
            onClick={() => setRange('30m')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              range === '30m' ? 'bg-slate-800 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            30 Menit
          </button>
          <button
            onClick={() => setRange('all')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              range === 'all' ? 'bg-slate-800 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Semua ({filteredData.length} pts)
          </button>
        </div>
      </div>

      {/* Hover HUD / Tooltip readout if active */}
      {hoveredData && (
        <div className="p-3 bg-slate-900/90 border border-cyan-500/40 rounded-lg flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
          <div className="text-slate-400">
            Waktu: <strong className="text-white">{formatTime(hoveredData.timestamp)}</strong>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-amber-400">Suhu Udara: {hoveredData.gateway.sensors.airTemp.toFixed(1)}°C</span>
            <span className="text-cyan-400">Suhu Tanah: {hoveredData.soilNode.sensors.soilTemp.toFixed(1)}°C</span>
            <span className="text-emerald-400">Kelembaban Tanah: {hoveredData.soilNode.sensors.soilMoisture.toFixed(1)}%</span>
            <span className="text-blue-400">Kelembaban Udara: {hoveredData.gateway.sensors.airHumidity.toFixed(1)}%</span>
          </div>
        </div>
      )}

      {/* CHART 1: Suhu Udara vs Suhu Tanah */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-3 text-xs">
            <span className="font-semibold text-white">Suhu Udara vs. Suhu Tanah</span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-3 h-0.5 bg-amber-400 rounded" />
              <span>Suhu Udara (DHT22)</span>
            </span>
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-3 h-0.5 bg-cyan-400 rounded" />
              <span>Suhu Tanah (DS18B20 ESP-NOW)</span>
            </span>
          </div>
          {stats && (
            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
              <span>Avg Udara: <strong className="text-amber-300">{stats.airTemp.avg}°C</strong></span>
              <span>Avg Tanah: <strong className="text-cyan-300">{stats.soilTemp.avg}°C</strong></span>
            </div>
          )}
        </div>

        {/* SVG Curve */}
        <div className="relative w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-56 select-none"
            onMouseLeave={() => setHoverIndex(null)}
          >
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((p) => {
              const y = padding.top + chartH * p;
              const val = (35 - p * 15).toFixed(0);
              return (
                <g key={p}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="rgba(51, 65, 85, 0.3)"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="text-[10px] fill-slate-500 font-mono"
                  >
                    {val}°C
                  </text>
                </g>
              );
            })}

            {/* Time labels */}
            {filteredData.length > 0 && [0, Math.floor(filteredData.length / 2), filteredData.length - 1].map((idx) => {
              if (!filteredData[idx]) return null;
              const x = padding.left + (idx / (filteredData.length - 1)) * chartW;
              return (
                <text
                  key={idx}
                  x={x}
                  y={height - 8}
                  textAnchor="middle"
                  className="text-[10px] fill-slate-500 font-mono"
                >
                  {formatTime(filteredData[idx].timestamp)}
                </text>
              );
            })}

            {/* Paths */}
            {filteredData.length > 1 && (
              <>
                {/* Air Temp line (amber) */}
                <path
                  d={createPath(filteredData, (d) => d.gateway.sensors.airTemp, 20, 35)}
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {/* Soil Temp line (cyan) */}
                <path
                  d={createPath(filteredData, (d) => d.soilNode.sensors.soilTemp, 20, 35)}
                  fill="none"
                  stroke="#06B6D4"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                  strokeLinecap="round"
                />
              </>
            )}

            {/* Interactive hover column rects */}
            {filteredData.map((_, i) => {
              const x = padding.left + (i / (filteredData.length - 1)) * chartW;
              const colW = chartW / filteredData.length;
              return (
                <rect
                  key={i}
                  x={x - colW / 2}
                  y={padding.top}
                  width={colW}
                  height={chartH}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoverIndex(i)}
                />
              );
            })}

            {/* Hover Indicator line */}
            {hoverIndex !== null && (
              <line
                x1={padding.left + (hoverIndex / (filteredData.length - 1)) * chartW}
                y1={padding.top}
                x2={padding.left + (hoverIndex / (filteredData.length - 1)) * chartW}
                y2={padding.top + chartH}
                stroke="#38BDF8"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
            )}
          </svg>
        </div>
      </div>

      {/* CHART 2: Kelembaban Udara vs Kelembaban Tanah */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-3 text-xs">
            <span className="font-semibold text-white">Kelembaban Tanah vs. Kelembaban Udara</span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-3 h-0.5 bg-emerald-400 rounded" />
              <span>Kelembaban Tanah (% VWC ESP-NOW)</span>
            </span>
            <span className="flex items-center gap-1.5 text-blue-400">
              <span className="w-3 h-0.5 bg-blue-400 rounded" />
              <span>Kelembaban Udara (% RH Gateway)</span>
            </span>
          </div>
          {stats && (
            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
              <span>Avg Tanah: <strong className="text-emerald-300">{stats.soilMoist.avg}%</strong></span>
              <span>Avg Udara: <strong className="text-blue-300">{stats.airHum.avg}%</strong></span>
            </div>
          )}
        </div>

        {/* SVG Curve */}
        <div className="relative w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-56 select-none"
            onMouseLeave={() => setHoverIndex(null)}
          >
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((p) => {
              const y = padding.top + chartH * p;
              const val = (100 - p * 100).toFixed(0);
              return (
                <g key={p}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="rgba(51, 65, 85, 0.3)"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="text-[10px] fill-slate-500 font-mono"
                  >
                    {val}%
                  </text>
                </g>
              );
            })}

            {/* Threshold line 30% */}
            <line
              x1={padding.left}
              y1={padding.top + chartH - 0.3 * chartH}
              x2={width - padding.right}
              y2={padding.top + chartH - 0.3 * chartH}
              stroke="rgba(244, 63, 94, 0.5)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <text
              x={width - padding.right}
              y={padding.top + chartH - 0.3 * chartH - 4}
              textAnchor="end"
              className="text-[9px] fill-rose-400 font-mono"
            >
              Ambang Kering (30%)
            </text>

            {/* Time labels */}
            {filteredData.length > 0 && [0, Math.floor(filteredData.length / 2), filteredData.length - 1].map((idx) => {
              if (!filteredData[idx]) return null;
              const x = padding.left + (idx / (filteredData.length - 1)) * chartW;
              return (
                <text
                  key={idx}
                  x={x}
                  y={height - 8}
                  textAnchor="middle"
                  className="text-[10px] fill-slate-500 font-mono"
                >
                  {formatTime(filteredData[idx].timestamp)}
                </text>
              );
            })}

            {/* Paths */}
            {filteredData.length > 1 && (
              <>
                {/* Soil Moist line (emerald) */}
                <path
                  d={createPath(filteredData, (d) => d.soilNode.sensors.soilMoisture, 0, 100)}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                {/* Air Hum line (blue) */}
                <path
                  d={createPath(filteredData, (d) => d.gateway.sensors.airHumidity, 0, 100)}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="1.8"
                  strokeDasharray="3 3"
                  strokeLinecap="round"
                />
              </>
            )}

            {/* Interactive hover column rects */}
            {filteredData.map((_, i) => {
              const x = padding.left + (i / (filteredData.length - 1)) * chartW;
              const colW = chartW / filteredData.length;
              return (
                <rect
                  key={i}
                  x={x - colW / 2}
                  y={padding.top}
                  width={colW}
                  height={chartH}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoverIndex(i)}
                />
              );
            })}

            {/* Hover Indicator line */}
            {hoverIndex !== null && (
              <line
                x1={padding.left + (hoverIndex / (filteredData.length - 1)) * chartW}
                y1={padding.top}
                x2={padding.left + (hoverIndex / (filteredData.length - 1)) * chartW}
                y2={padding.top + chartH}
                stroke="#10B981"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
};
