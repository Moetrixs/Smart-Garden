import React from 'react';
import { Radio, ArrowRight, Cpu, CheckCircle2, ShieldCheck, Zap, Activity, Moon, BatteryCharging, Smartphone, Wifi, Power } from 'lucide-react';
import type { TelemetryData } from '../types/telemetry';

interface NetworkTopologyProps {
  telemetry: TelemetryData;
  onSimulatePacket: () => void;
  onPressButton: () => void;
}

export const NetworkTopology: React.FC<NetworkTopologyProps> = ({
  telemetry,
  onSimulatePacket,
  onPressButton,
}) => {
  const { gateway, soilNode } = telemetry;
  const isSoilOnline = soilNode.status === 'online';
  const isGwOnline = gateway.status === 'online';

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
              <span>MANAJEMEN DAYA ULTRA HEMAT & OFFLINE AP</span>
              <span>·</span>
              <span>PIN 10 POWER SWITCH + HOTSPOT HP 192.168.4.1</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Arsitektur ESP32-C3 (Pin 10 Power Gating) & ESP-WROOM-32D (Hotspot HP)
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Sensor pada <strong className="text-emerald-300">ESP32-C3 Super Mini</strong> dinyalakan melalui <strong className="text-cyan-300">GPIO 10</strong> beberapa detik setelah bangun booting, kemudian dimatikan kembali sebelum tidur (<strong className="text-indigo-300">Deep Sleep 15 Menit</strong>). 
              Dashboard web ini <strong className="text-emerald-300">100% BISA disimpan di memori Flash ESP-WROOM-32D</strong> dan diakses langsung dari HP via Hotspot WiFi internal (<strong className="text-slate-200">192.168.4.1</strong>) tanpa memerlukan router atau internet!
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onSimulatePacket}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800 hover:bg-emerald-900/70 transition-colors"
            >
              <Moon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Bangunkan C3 & Uji Kirim (15m)</span>
            </button>
            <button
              onClick={onPressButton}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg bg-amber-950/60 text-amber-300 border border-amber-800 hover:bg-amber-900/70 transition-colors"
            >
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>Tekan Tombol Fisik</span>
            </button>
          </div>
        </div>

        {/* Visual Architecture Flow Diagram */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-11 gap-4 items-center">
          {/* Node 2: ESP32-C3 Super Mini */}
          <div className="lg:col-span-4 rounded-lg border border-slate-800 bg-slate-950/80 p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-md bg-emerald-950/50 border border-emerald-800/60 text-emerald-400">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">ESP32-C3 Super Mini</h3>
                  <div className="text-xs font-mono text-emerald-400 font-medium">Node Lapangan (Deep Sleep 15m)</div>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded border bg-indigo-950/60 text-indigo-300 border-indigo-800/80">
                ● TIDUR 15 MENIT
              </span>
            </div>

            <div className="mt-3.5 pt-3 border-t border-slate-800/80 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Power Switch Sensor:</span>
                <span className="text-cyan-300 font-semibold font-mono">GPIO 10 (0µA saat tidur)</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Jeda Stabilisasi:</span>
                <span className="text-slate-200 font-mono">2 Detik setelah bangun boot</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Status Baterai:</span>
                <span className="font-mono text-emerald-300">
                  {soilNode.battery.voltage}V ({soilNode.battery.percentage}%) via Divider
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Sensor:</span>
                <span className="text-slate-200 font-medium">Lembab (GPIO 0) + DS18B20 (GPIO 3)</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 font-mono text-xs">
              <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                <div className="text-slate-500 text-[10px]">KELEMBABAN TANAH</div>
                <div className="text-sm font-semibold text-emerald-400 tabular-nums">
                  {soilNode.sensors.soilMoisture.toFixed(1)}%
                </div>
              </div>
              <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                <div className="text-slate-500 text-[10px]">SUHU TANAH</div>
                <div className="text-sm font-semibold text-cyan-400 tabular-nums">
                  {soilNode.sensors.soilTemp.toFixed(1)}°C
                </div>
              </div>
            </div>
          </div>

          {/* Connection Link 1: ESP-NOW */}
          <div className="lg:col-span-3 flex flex-col items-center justify-center p-3 text-center">
            <div className="w-full flex items-center justify-center gap-2 text-xs font-mono text-cyan-300 font-medium bg-slate-900/90 py-2 px-3 rounded-lg border border-slate-800">
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>ESP-NOW (Kirim Tiap 15 Menit)</span>
            </div>
            <div className="my-2 flex items-center justify-center text-slate-500 w-full">
              <div className="h-0.5 flex-1 bg-gradient-to-r from-emerald-500/50 via-cyan-500/50 to-cyan-500" />
              <ArrowRight className="w-4 h-4 text-cyan-400 shrink-0" />
            </div>
            <div className="text-[11px] font-mono text-slate-400 space-y-0.5">
              <div>Sensor menyala sebentar lalu tidur</div>
              <div className="text-cyan-400 font-semibold">RSSI: {soilNode.rssi} dBm · Latensi ~1ms</div>
            </div>
          </div>

          {/* Node 1: ESP-WROOM-32D */}
          <div className="lg:col-span-4 rounded-lg border border-slate-800 bg-slate-950/80 p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-md bg-cyan-950/50 border border-cyan-800/60 text-cyan-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">ESP-WROOM-32D</h3>
                  <div className="text-xs font-mono text-cyan-400 font-medium">Gateway Hub & Web Server Hotspot</div>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded border bg-cyan-950/60 text-cyan-300 border-cyan-800/80">
                ● 24/7 OFFLINE AP
              </span>
            </div>

            <div className="mt-3.5 pt-3 border-t border-slate-800/80 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Akses HP (Tanpa Internet):</span>
                <span className="text-emerald-300 font-bold font-mono">http://192.168.4.1</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>SSID Hotspot HP:</span>
                <span className="font-mono text-slate-200">ESP32-Smart-Garden</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Display Fisik Onboard:</span>
                <span className="text-slate-200 font-medium">LCD 16x2 I2C (SDA:21, SCL:22)</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Relay Aktuator:</span>
                <span className="font-mono text-cyan-300">GPIO 2 (Kontrol Pompa dari HP)</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 font-mono text-xs">
              <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                <div className="text-slate-500 text-[10px]">SUHU UDARA</div>
                <div className="text-sm font-semibold text-amber-400 tabular-nums">
                  {gateway.sensors.airTemp.toFixed(1)}°C
                </div>
              </div>
              <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                <div className="text-slate-500 text-[10px]">TOMBOL FISIK</div>
                <div className={`text-sm font-semibold tabular-nums ${
                  gateway.sensors.buttonState === 1 ? 'text-rose-400 animate-pulse' : 'text-slate-300'
                }`}>
                  {gateway.sensors.buttonState === 1 ? 'DITEKAN' : 'STANDBY'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Spotlight: Akses Langsung HP Tanpa Internet */}
        <div className="mt-6 p-4 rounded-xl border border-emerald-800/70 bg-emerald-950/20 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-2">
            <Smartphone className="w-4 h-4" />
            <span>Apakah Dashboard ini bisa diakses dari HP langsung tanpa internet? JAWABAN: 100% BISA!</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            ESP-WROOM-32D memiliki memori Flash 4MB yang menyimpan file HTML, CSS, dan JavaScript secara onboard. 
            ESP32 memancarkan sinyal hotspot WiFi mandiri (SSID: <strong>ESP32-Smart-Garden</strong>, Password: <strong>password123</strong>).
            Pengguna cukup menghubungkan HP ke hotspot tersebut dan membuka browser ke <strong className="text-cyan-300 font-mono">http://192.168.4.1</strong>. 
            Semua data sensor, grafik, dan saklar pompa dapat dikontrol langsung di lokasi (kebun/lapangan) tanpa kuota internet maupun router!
            (Tersedia di tab <strong>Kode Firmware ESP32 &gt; 1. ESP-WROOM-32D (Akses HP Langsung)</strong>).
          </p>
        </div>
      </div>

      {/* Hardware Pinout & Wiring Specifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ESP-WROOM-32D Pinout */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Pinout Node 1: ESP-WROOM-32D (Gateway + Hotspot AP)</span>
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            Melayani web server lokal ke HP di 192.168.4.1 & LCD 16x2 fisik.
          </p>
          <div className="space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between p-2 rounded bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">LCD 16x2 I2C Fisik (SDA)</span>
              <span className="text-cyan-300 font-semibold">GPIO 21 (I2C SDA)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">LCD 16x2 I2C Fisik (SCL)</span>
              <span className="text-cyan-300 font-semibold">GPIO 22 (I2C SCL)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Sensor Suhu & Lembab (DHT22)</span>
              <span className="text-cyan-300 font-semibold">GPIO 4</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Sensor Cahaya (LDR Analog)</span>
              <span className="text-cyan-300 font-semibold">GPIO 34 (ADC1_CH6)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Tombol Push Button</span>
              <span className="text-cyan-300 font-semibold">GPIO 15 (Active LOW)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Relay Pompa Air</span>
              <span className="text-cyan-300 font-semibold">GPIO 2</span>
            </div>
          </div>
        </div>

        {/* ESP32-C3 Super Mini Pinout */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Pinout Node 2: ESP32-C3 Super Mini (Pin 10 Switch)</span>
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            Power Gating di GPIO 10 memutus arus sensor menjadi 0µA saat tidur.
          </p>
          <div className="space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between p-2 rounded bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Power Switch VCC Sensor</span>
              <span className="text-cyan-300 font-bold">GPIO 10 (VCC Control)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Voltage Divider Baterai (R1/R2)</span>
              <span className="text-emerald-300 font-semibold">GPIO 1 (ADC1_CH1)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Sensor Kelembaban Kapasitif</span>
              <span className="text-emerald-300 font-semibold">GPIO 0 (ADC1_CH0)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Sensor Suhu DS18B20</span>
              <span className="text-emerald-300 font-semibold">GPIO 3 (OneWire Bus)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Siklus Deep Sleep RTC</span>
              <span className="text-indigo-300 font-semibold">15 Menit (~5 µA)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Jeda Stabilisasi Sensor</span>
              <span className="text-emerald-300 font-semibold">2 Detik saat Bangun</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
