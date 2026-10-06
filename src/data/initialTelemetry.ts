import type { ActivityLog, TelemetryData } from '../types/telemetry';
import { computeBatteryDetails } from '../utils/battery';

/** Formats the current time like a DS3231 RTC display ("HH:MM:SS", locale id-ID). */
export function formatRtcTime(date: Date = new Date()): string {
  return date.toLocaleTimeString('id-ID', { hour12: false });
}

/**
 * Initial (simulated) telemetry snapshot used as the starting state for the
 * server; the browser receives it via the SSE `initial_state` message instead
 * of duplicating this data.
 */
export function createInitialTelemetry(): TelemetryData {
  const now = Date.now();
  const battery = computeBatteryDetails(3.96);

  return {
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
        lastButtonPressedAt: new Date(now - 120000).toISOString(),
      },
      hasPhysicalLcd: true,
      rtc: {
        enabled: true,
        model: 'DS3231',
        currentTime: formatRtcTime(),
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
        cloudUrl: '',
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
      battery,
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
  };
}

/** Builds the seeded history of simulated telemetry snapshots (one point per minute). */
export function createSeedHistory(base: TelemetryData, points = 30): TelemetryData[] {
  const now = Date.now();
  const history: TelemetryData[] = [];
  for (let i = points; i >= 0; i--) {
    const vBat = +(3.97 - (points - i) * 0.001).toFixed(2);
    history.push({
      ...base,
      timestamp: new Date(now - i * 60000).toISOString(),
      gateway: {
        ...base.gateway,
        sensors: {
          ...base.gateway.sensors,
          airTemp: +(27.5 + Math.sin(i / 5) * 2.2).toFixed(1),
          airHumidity: +(64 + Math.cos(i / 6) * 4).toFixed(1),
          lightLux: Math.max(50, Math.round(700 + Math.sin(i / 4) * 150)),
        },
      },
      soilNode: {
        ...base.soilNode,
        batteryVoltage: vBat,
        battery: computeBatteryDetails(vBat),
        sensors: {
          ...base.soilNode.sensors,
          soilMoisture: +(42.5 - Math.floor((points - i) / 15) * 0.4).toFixed(1),
          soilTemp: +(24.5 + Math.sin(i / 8) * 0.5).toFixed(1),
        },
      },
    });
  }
  return history;
}

/** Seed activity log entries shown on first load. */
export function createSeedLogs(): ActivityLog[] {
  const now = Date.now();
  return [
    {
      id: 'log-1',
      timestamp: new Date(now - 400000).toISOString(),
      type: 'info',
      node: 'Gateway (WiFi)',
      message:
        'ESP-WROOM-32D Dual Mode Aktif: Hotspot HP (192.168.4.1) & WiFi Internet. RTC DS3231 I2C (0x68) tersinkronisasi.',
    },
    {
      id: 'log-2',
      timestamp: new Date(now - 200000).toISOString(),
      type: 'espnow',
      node: 'Soil Node (ESP-NOW)',
      message:
        'ESP32-C3 bangun -> Pin 10 Power On VCC -> baca sensor -> kirim ESP-NOW -> Pin 10 Off (0µA) -> Deep Sleep 15 Menit.',
    },
    {
      id: 'log-3',
      timestamp: new Date(now - 90000).toISOString(),
      type: 'info',
      node: 'System',
      message:
        'Penyiraman Cerdas: Relay 2 (Solenoid Valve) terbuka -> jeda interlock 5 detik -> Relay 1 (Pompa) menyala.',
    },
  ];
}
