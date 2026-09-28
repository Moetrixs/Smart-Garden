import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

export interface BatteryMonitoringState {
  voltage: number;
  percentage: number;
  adcRaw: number;
  dividerRatio: number;
  r1Kohm: number;
  r2Kohm: number;
  status: 'full' | 'normal' | 'low' | 'critical';
}

export interface DeepSleepInfo {
  enabled: boolean;
  intervalMinutes: number; // 15 menit
  state: 'sleeping' | 'awake_transmitting';
  lastWakeupIso: string;
  nextWakeupIso: string;
  estimatedBatteryLifeMonths: number;
  currentDrawUa: number; // ~5 uA saat tidur
}

export interface RtcState {
  enabled: boolean;
  model: 'DS3231';
  currentTime: string;
  currentDate: string;
  temperature: number;
}

export interface SmartIrrigationState {
  valveState: boolean; // Relay Channel 2 (Solenoid Valve)
  pumpState: boolean;  // Relay Channel 1 (Pompa Air)
  sequencePhase: 'standby' | 'valve_pre_opening' | 'watering_active' | 'stopping';
  interlockDelaySeconds: number; // 5 detik
  scheduleMorning: string; // "06:30"
  scheduleEvening: string; // "16:30"
  durationMinutes: number; // 5 menit
  soilDryThreshold: number; // 35%
  rainPrediction: {
    status: 'clear' | 'overcast_rain_likely' | 'raining';
    skipWatering: boolean;
    probabilityPercent: number;
    reason: string;
  };
}

export interface NetworkDualMode {
  dualModeActive: boolean;
  localApSsid: string;
  localApIp: string;
  internetConnected: boolean;
  internetIp: string;
  cloudUrl: string;
}

export interface TelemetryData {
  timestamp: string;
  source: 'hardware' | 'simulation';
  gateway: {
    id: string;
    boardModel: 'ESP-WROOM-32D';
    status: 'online' | 'offline';
    macAddress?: string;
    lastSeen: number;
    ip: string;
    wifiSsid: string;
    wifiRssi: number;
    uptimeSeconds: number;
    sensors: {
      airTemp: number; // °C
      airHumidity: number; // %
      lightLux: number; // Lux
      buttonState: 0 | 1; // 1 = pressed, 0 = released
      buttonPressCount: number;
      lastButtonPressedAt: string | null;
    };
    hasPhysicalLcd: boolean;
    rtc: RtcState;
    irrigation: SmartIrrigationState;
    network: NetworkDualMode;
  };
  soilNode: {
    id: string;
    boardModel: 'ESP32-C3 Super Mini';
    protocol: 'ESP-NOW';
    status: 'online' | 'offline';
    macAddress: string;
    rssi: number; // dBm between soil node & gateway
    batteryVoltage: number; // V
    battery: BatteryMonitoringState;
    deepSleep: DeepSleepInfo;
    lastSeen: number;
    sensors: {
      soilMoisture: number; // % (0 - 100)
      soilTemp: number; // °C
      moistureRaw: number; // ADC 0-4095
    };
  };
  control: {
    relayState: boolean;
    waterPumpAuto: boolean;
    moistureThreshold: number;
    buzzerAlert: boolean;
  };
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  type: 'info' | 'warning' | 'alert' | 'button' | 'espnow';
  node: 'Gateway (WiFi)' | 'Soil Node (ESP-NOW)' | 'System';
  message: string;
}

function computeBatteryDetails(voltage: number): BatteryMonitoringState {
  const v = Math.min(4.25, Math.max(2.8, voltage));
  let pct = 0;
  if (v >= 4.15) pct = 100;
  else if (v >= 3.85) pct = Math.round(65 + ((v - 3.85) / 0.3) * 35);
  else if (v >= 3.70) pct = Math.round(30 + ((v - 3.70) / 0.15) * 35);
  else if (v >= 3.40) pct = Math.round(5 + ((v - 3.40) / 0.30) * 25);
  else pct = Math.max(0, Math.round(((v - 2.8) / 0.6) * 5));

  let status: 'full' | 'normal' | 'low' | 'critical' = 'normal';
  if (pct >= 90) status = 'full';
  else if (pct <= 15) status = 'critical';
  else if (pct <= 30) status = 'low';

  const r1 = 100;
  const r2 = 100;
  const ratio = (r1 + r2) / r2; // 2.0
  const vDivider = v / ratio;
  const adcRaw = Math.min(4095, Math.round((vDivider / 3.3) * 4095));

  return {
    voltage: +v.toFixed(2),
    percentage: pct,
    adcRaw,
    dividerRatio: ratio,
    r1Kohm: r1,
    r2Kohm: r2,
    status,
  };
}

function evaluateRainPrediction(humidity: number, lux: number): SmartIrrigationState['rainPrediction'] {
  if (humidity >= 92) {
    return {
      status: 'raining',
      skipWatering: true,
      probabilityPercent: 95,
      reason: 'Sensor mendeteksi hujan sedang berlangsung (Kelembaban udara sangat jenuh >= 92%).',
    };
  }
  if (humidity >= 84 && lux < 350) {
    return {
      status: 'overcast_rain_likely',
      skipWatering: true,
      probabilityPercent: 80,
      reason: 'Mendung gelap & kelembaban tinggi. Prediksi hujan dalam waktu dekat, penyiraman ditunda otomatis.',
    };
  }
  return {
    status: 'clear',
    skipWatering: false,
    probabilityPercent: 12,
    reason: 'Cuaca cerah / kering. Aman untuk menjalankan jadwal penyiraman tanaman.',
  };
}

function getRtcFormattedTime(): { time: string; date: string } {
  const d = new Date();
  const time = d.toLocaleTimeString('id-ID', { hour12: false });
  const date = d.toISOString().slice(0, 10);
  return { time, date };
}

// In-memory state
let simulationActive = true;
let totalPackets = 184;
let espNowPackets = 176;

const initialBattery = computeBatteryDetails(3.96);
const nowTime = Date.now();
const initialRtc = getRtcFormattedTime();

let currentTelemetry: TelemetryData = {
  timestamp: new Date().toISOString(),
  source: 'simulation',
  gateway: {
    id: 'ESP32-GW-WROOM32D',
    boardModel: 'ESP-WROOM-32D',
    status: 'online',
    macAddress: '24:0a:c4:15:40:25',
    lastSeen: nowTime,
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
      lastButtonPressedAt: new Date(nowTime - 120000).toISOString(),
    },
    hasPhysicalLcd: true,
    rtc: {
      enabled: true,
      model: 'DS3231',
      currentTime: initialRtc.time,
      currentDate: initialRtc.date,
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
      cloudUrl: 'https://ais-dev-nlurcb53a45zlsaicv3xer-141804297563.asia-southeast1.run.app',
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
    battery: initialBattery,
    deepSleep: {
      enabled: true,
      intervalMinutes: 15,
      state: 'sleeping',
      lastWakeupIso: new Date(nowTime - 3 * 60000).toISOString(),
      nextWakeupIso: new Date(nowTime + 12 * 60000).toISOString(),
      estimatedBatteryLifeMonths: 18,
      currentDrawUa: 5,
    },
    lastSeen: nowTime,
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

const telemetryHistory: TelemetryData[] = [];
for (let i = 30; i >= 0; i--) {
  const t = new Date(nowTime - i * 60000).toISOString();
  const vBat = +(3.97 - (30 - i) * 0.001).toFixed(2);
  const batDet = computeBatteryDetails(vBat);
  telemetryHistory.push({
    ...currentTelemetry,
    timestamp: t,
    gateway: {
      ...currentTelemetry.gateway,
      sensors: {
        ...currentTelemetry.gateway.sensors,
        airTemp: +(27.5 + Math.sin(i / 5) * 2.2).toFixed(1),
        airHumidity: +(64 + Math.cos(i / 6) * 4).toFixed(1),
        lightLux: Math.max(50, Math.round(700 + Math.sin(i / 4) * 150)),
      },
    },
    soilNode: {
      ...currentTelemetry.soilNode,
      batteryVoltage: vBat,
      battery: batDet,
      sensors: {
        ...currentTelemetry.soilNode.sensors,
        soilMoisture: +(42.5 - Math.floor((30 - i) / 15) * 0.4).toFixed(1),
        soilTemp: +(24.5 + Math.sin(i / 8) * 0.5).toFixed(1),
      },
    },
  });
}

const activityLogs: ActivityLog[] = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 400000).toISOString(),
    type: 'info',
    node: 'Gateway (WiFi)',
    message: 'ESP-WROOM-32D Dual Mode Aktif: Hotspot HP (192.168.4.1) & WiFi Internet. RTC DS3231 I2C (0x68) tersinkronisasi.',
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 200000).toISOString(),
    type: 'espnow',
    node: 'Soil Node (ESP-NOW)',
    message: 'ESP32-C3 bangun -> Pin 10 Power On VCC -> baca sensor -> kirim ESP-NOW -> Pin 10 Off (0µA) -> Deep Sleep 15 Menit.',
  },
  {
    id: 'log-3',
    timestamp: new Date(Date.now() - 90000).toISOString(),
    type: 'info',
    node: 'System',
    message: 'Penyiraman Cerdas: Relay 2 (Solenoid Valve) terbuka -> jeda interlock 5 detik -> Relay 1 (Pompa) menyala.',
  },
];

// SSE Clients
const sseClients = new Set<Response>();

function broadcastSSE(data: { type: string; payload: unknown }) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

function addLog(type: ActivityLog['type'], node: ActivityLog['node'], message: string) {
  const log: ActivityLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    type,
    node,
    message,
  };
  activityLogs.unshift(log);
  if (activityLogs.length > 100) activityLogs.pop();
  broadcastSSE({ type: 'new_log', payload: log });
}

// Sequential Relay Execution Helper
let interlockTimer: NodeJS.Timeout | null = null;
let wateringDurationTimer: NodeJS.Timeout | null = null;

function triggerSequentialWatering(reason: string) {
  if (currentTelemetry.gateway.irrigation.sequencePhase !== 'standby') return;

  // Check rain prediction
  if (currentTelemetry.gateway.irrigation.rainPrediction.skipWatering) {
    addLog('warning', 'System', `Penyiraman dibatalkan: ${currentTelemetry.gateway.irrigation.rainPrediction.reason}`);
    return;
  }

  // Phase 1: Open Solenoid Valve First (Relay Channel 2)
  currentTelemetry.gateway.irrigation.sequencePhase = 'valve_pre_opening';
  currentTelemetry.gateway.irrigation.valveState = true;
  currentTelemetry.gateway.irrigation.pumpState = false;

  addLog('info', 'System', `[Langkah 1/2] Relay Channel 2 (Solenoid Valve) DIBUKA lebih dulu (${reason}). Menunggu jeda 5 detik...`);
  broadcastSSE({ type: 'telemetry_update', payload: currentTelemetry });

  // Phase 2: Start Water Pump (Relay Channel 1) after 5 seconds delay
  if (interlockTimer) clearTimeout(interlockTimer);
  interlockTimer = setTimeout(() => {
    currentTelemetry.gateway.irrigation.sequencePhase = 'watering_active';
    currentTelemetry.gateway.irrigation.pumpState = true;
    currentTelemetry.control.relayState = true;

    addLog('info', 'System', `[Langkah 2/2] Jeda 5 detik tercapai -> Relay Channel 1 (Pompa Air) MENYALA. Air mengalir.`);
    broadcastSSE({ type: 'telemetry_update', payload: currentTelemetry });

    // Duration timer (e.g. 30 seconds in simulation or until target reached)
    if (wateringDurationTimer) clearTimeout(wateringDurationTimer);
    wateringDurationTimer = setTimeout(() => {
      stopSequentialWatering('Durasi waktu penyiraman selesai');
    }, 25000);
  }, 5000);
}

function stopSequentialWatering(reason: string) {
  if (interlockTimer) clearTimeout(interlockTimer);
  if (wateringDurationTimer) clearTimeout(wateringDurationTimer);

  currentTelemetry.gateway.irrigation.sequencePhase = 'stopping';
  // Turn off pump first to relieve pressure
  currentTelemetry.gateway.irrigation.pumpState = false;
  currentTelemetry.control.relayState = false;

  addLog('info', 'System', `Mematikan: Pompa dimatikan lebih dulu. (${reason})`);
  broadcastSSE({ type: 'telemetry_update', payload: currentTelemetry });

  setTimeout(() => {
    // Then close valve 1.5 seconds later
    currentTelemetry.gateway.irrigation.valveState = false;
    currentTelemetry.gateway.irrigation.sequencePhase = 'standby';
    addLog('info', 'System', `Solenoid Valve ditutup kembali. Sistem standby.`);
    broadcastSSE({ type: 'telemetry_update', payload: currentTelemetry });
  }, 1500);
}

// REST API Endpoints

// 1. Ingestion endpoint for Real ESP-WROOM-32D Gateway
app.post('/api/telemetry', (req: Request, res: Response) => {
  try {
    const body = req.body;
    simulationActive = false;
    totalPackets++;

    const nowIso = new Date().toISOString();
    const gatewaySensors = body.sensors || body.gateway?.sensors || {};
    const soilSensors = body.soilNode?.sensors || body.soil || {};

    const prevButton = currentTelemetry.gateway.sensors.buttonState;
    const newButton = gatewaySensors.buttonState ?? (body.button ? 1 : 0);

    const rawVoltage = body.soilNode?.batteryVoltage ?? body.soilNode?.battery ?? body.batteryVoltage ?? currentTelemetry.soilNode.batteryVoltage;
    const computedBattery = computeBatteryDetails(rawVoltage);

    const mergedGwSensors = {
      airTemp: gatewaySensors.airTemp ?? body.airTemp ?? currentTelemetry.gateway.sensors.airTemp,
      airHumidity: gatewaySensors.airHumidity ?? body.airHumidity ?? currentTelemetry.gateway.sensors.airHumidity,
      lightLux: gatewaySensors.lightLux ?? body.lightLux ?? currentTelemetry.gateway.sensors.lightLux,
      buttonState: newButton as 0 | 1,
      buttonPressCount:
        newButton === 1 && prevButton === 0
          ? currentTelemetry.gateway.sensors.buttonPressCount + 1
          : (body.buttonPressCount ?? currentTelemetry.gateway.sensors.buttonPressCount),
      lastButtonPressedAt:
        newButton === 1 && prevButton === 0
          ? nowIso
          : currentTelemetry.gateway.sensors.lastButtonPressedAt,
    };

    const hasNewSoilPacket = Boolean(body.soilNode || body.soil);
    const rainEval = evaluateRainPrediction(mergedGwSensors.airHumidity, mergedGwSensors.lightLux);

    currentTelemetry = {
      timestamp: nowIso,
      source: 'hardware',
      gateway: {
        id: body.gatewayId || body.gateway?.id || currentTelemetry.gateway.id,
        boardModel: 'ESP-WROOM-32D',
        status: 'online',
        lastSeen: Date.now(),
        ip: req.ip || body.ip || currentTelemetry.gateway.ip,
        wifiSsid: body.wifiSsid || currentTelemetry.gateway.wifiSsid,
        wifiRssi: body.wifiRssi ?? currentTelemetry.gateway.wifiRssi,
        uptimeSeconds: body.uptimeSeconds ?? currentTelemetry.gateway.uptimeSeconds + 2,
        sensors: mergedGwSensors,
        hasPhysicalLcd: true,
        rtc: {
          ...currentTelemetry.gateway.rtc,
          currentTime: body.rtcTime || getRtcFormattedTime().time,
          currentDate: body.rtcDate || getRtcFormattedTime().date,
          temperature: body.rtcTemp || currentTelemetry.gateway.rtc.temperature,
        },
        irrigation: {
          ...currentTelemetry.gateway.irrigation,
          rainPrediction: rainEval,
        },
        network: {
          ...currentTelemetry.gateway.network,
          internetConnected: true,
          internetIp: req.ip || body.ip || currentTelemetry.gateway.ip,
        },
      },
      soilNode: {
        id: body.soilNode?.id || currentTelemetry.soilNode.id,
        boardModel: 'ESP32-C3 Super Mini',
        protocol: 'ESP-NOW',
        status: hasNewSoilPacket ? 'online' : currentTelemetry.soilNode.status,
        macAddress: body.soilNode?.mac || body.soilNode?.macAddress || currentTelemetry.soilNode.macAddress,
        rssi: body.soilNode?.rssi ?? currentTelemetry.soilNode.rssi,
        batteryVoltage: computedBattery.voltage,
        battery: computedBattery,
        deepSleep: {
          ...currentTelemetry.soilNode.deepSleep,
          lastWakeupIso: hasNewSoilPacket ? nowIso : currentTelemetry.soilNode.deepSleep.lastWakeupIso,
          nextWakeupIso: hasNewSoilPacket ? new Date(Date.now() + 15 * 60000).toISOString() : currentTelemetry.soilNode.deepSleep.nextWakeupIso,
          state: hasNewSoilPacket ? 'awake_transmitting' : 'sleeping',
        },
        lastSeen: hasNewSoilPacket ? Date.now() : currentTelemetry.soilNode.lastSeen,
        sensors: {
          soilMoisture: soilSensors.soilMoisture ?? body.soilMoisture ?? currentTelemetry.soilNode.sensors.soilMoisture,
          soilTemp: soilSensors.soilTemp ?? body.soilTemp ?? currentTelemetry.soilNode.sensors.soilTemp,
          moistureRaw: soilSensors.moistureRaw ?? body.moistureRaw ?? currentTelemetry.soilNode.sensors.moistureRaw,
        },
      },
      control: {
        ...currentTelemetry.control,
        ...(body.control || {}),
      },
    };

    if (hasNewSoilPacket) {
      espNowPackets++;
      addLog('espnow', 'Soil Node (ESP-NOW)', `ESP32-C3 bangun dari Deep Sleep (15m): Lembab=${currentTelemetry.soilNode.sensors.soilMoisture}%, Suhu=${currentTelemetry.soilNode.sensors.soilTemp}C, Bat=${computedBattery.voltage}V (${computedBattery.percentage}%).`);
      setTimeout(() => {
        currentTelemetry.soilNode.deepSleep.state = 'sleeping';
        broadcastSSE({ type: 'telemetry_update', payload: currentTelemetry });
      }, 2000);
    }

    if (newButton === 1 && prevButton === 0) {
      addLog('button', 'Gateway (WiFi)', `Tombol Push Button fisik ditekan (Event #${currentTelemetry.gateway.sensors.buttonPressCount})`);
    }

    // Auto watering condition check (Soil Dry threshold + Rain prediction check)
    if (
      currentTelemetry.control.waterPumpAuto &&
      currentTelemetry.soilNode.sensors.soilMoisture < currentTelemetry.gateway.irrigation.soilDryThreshold &&
      currentTelemetry.gateway.irrigation.sequencePhase === 'standby'
    ) {
      triggerSequentialWatering(`Kelembaban tanah (${currentTelemetry.soilNode.sensors.soilMoisture}%) dibawah ambang ${currentTelemetry.gateway.irrigation.soilDryThreshold}%`);
    }

    telemetryHistory.push(currentTelemetry);
    if (telemetryHistory.length > 300) telemetryHistory.shift();

    broadcastSSE({ type: 'telemetry_update', payload: currentTelemetry });

    res.json({
      status: 'ok',
      receivedAt: nowIso,
      valveCommand: currentTelemetry.gateway.irrigation.valveState,
      pumpCommand: currentTelemetry.gateway.irrigation.pumpState,
      serverTime: Date.now(),
    });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

// 2. Fetch latest telemetry
app.get('/api/telemetry/latest', (_req: Request, res: Response) => {
  const now = Date.now();
  const gwOnline = now - currentTelemetry.gateway.lastSeen < 15000;
  const soilOnline = now - currentTelemetry.soilNode.lastSeen < 20 * 60 * 1000;

  res.json({
    data: {
      ...currentTelemetry,
      gateway: {
        ...currentTelemetry.gateway,
        status: gwOnline ? 'online' : 'offline',
      },
      soilNode: {
        ...currentTelemetry.soilNode,
        status: soilOnline ? 'online' : 'offline',
      },
    },
    meta: {
      totalPackets,
      espNowPackets,
      simulationActive,
      serverUptime: process.uptime(),
    },
  });
});

// 3. Fetch history
app.get('/api/telemetry/history', (_req: Request, res: Response) => {
  res.json({ history: telemetryHistory });
});

// 4. Fetch logs
app.get('/api/logs', (_req: Request, res: Response) => {
  res.json({ logs: activityLogs });
});

// 5. SSE stream for real-time live push to browser
app.get('/api/telemetry/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(`data: ${JSON.stringify({ type: 'initial_state', payload: currentTelemetry, history: telemetryHistory, logs: activityLogs })}\n\n`);

  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// 6. Irrigation Controls (Trigger Sequence & Settings)
app.post('/api/irrigation/trigger', (_req: Request, res: Response) => {
  triggerSequentialWatering('Pengujian Manual dari Dashboard');
  res.json({ status: 'ok', irrigation: currentTelemetry.gateway.irrigation });
});

app.post('/api/irrigation/stop', (_req: Request, res: Response) => {
  stopSequentialWatering('Dihentikan manual dari Dashboard');
  res.json({ status: 'ok', irrigation: currentTelemetry.gateway.irrigation });
});

app.post('/api/irrigation/settings', (req: Request, res: Response) => {
  const { scheduleMorning, scheduleEvening, durationMinutes, soilDryThreshold } = req.body;
  if (scheduleMorning) currentTelemetry.gateway.irrigation.scheduleMorning = scheduleMorning;
  if (scheduleEvening) currentTelemetry.gateway.irrigation.scheduleEvening = scheduleEvening;
  if (typeof durationMinutes === 'number') currentTelemetry.gateway.irrigation.durationMinutes = durationMinutes;
  if (typeof soilDryThreshold === 'number') {
    currentTelemetry.gateway.irrigation.soilDryThreshold = soilDryThreshold;
    currentTelemetry.control.moistureThreshold = soilDryThreshold;
  }

  addLog('info', 'System', `Pengaturan Jadwal Diperbarui: Pagi ${currentTelemetry.gateway.irrigation.scheduleMorning}, Sore ${currentTelemetry.gateway.irrigation.scheduleEvening}, Ambang Kering ${currentTelemetry.gateway.irrigation.soilDryThreshold}%.`);
  broadcastSSE({ type: 'telemetry_update', payload: currentTelemetry });
  res.json({ status: 'ok', irrigation: currentTelemetry.gateway.irrigation });
});

app.post('/api/control', (req: Request, res: Response) => {
  const { relayState, waterPumpAuto, moistureThreshold } = req.body;
  if (typeof relayState === 'boolean') {
    if (relayState) {
      triggerSequentialWatering('Manual Switch ON');
    } else {
      stopSequentialWatering('Manual Switch OFF');
    }
  }
  if (typeof waterPumpAuto === 'boolean') {
    currentTelemetry.control.waterPumpAuto = waterPumpAuto;
    addLog('info', 'System', `Mode Otomatis Pompa: ${waterPumpAuto ? 'DIAKTIFKAN' : 'DINONAKTIFKAN'}`);
  }
  if (typeof moistureThreshold === 'number') {
    currentTelemetry.control.moistureThreshold = moistureThreshold;
    currentTelemetry.gateway.irrigation.soilDryThreshold = moistureThreshold;
  }

  broadcastSSE({ type: 'telemetry_update', payload: currentTelemetry });
  res.json({ status: 'ok', control: currentTelemetry.control, irrigation: currentTelemetry.gateway.irrigation });
});

// 7. Interactive Simulation actions
app.post('/api/simulate/action', (req: Request, res: Response) => {
  const { action, value } = req.body;

  if (action === 'press_button') {
    currentTelemetry.gateway.sensors.buttonState = 1;
    currentTelemetry.gateway.sensors.buttonPressCount += 1;
    currentTelemetry.gateway.sensors.lastButtonPressedAt = new Date().toISOString();

    addLog('button', 'Gateway (WiFi)', `[Simulasi] Tombol Push Button ESP-WROOM-32D ditekan (#${currentTelemetry.gateway.sensors.buttonPressCount})`);
    broadcastSSE({ type: 'telemetry_update', payload: currentTelemetry });

    setTimeout(() => {
      currentTelemetry.gateway.sensors.buttonState = 0;
      broadcastSSE({ type: 'telemetry_update', payload: currentTelemetry });
    }, 1200);

    return res.json({ status: 'ok', message: 'Button pressed' });
  }

  if (action === 'simulate_rain') {
    currentTelemetry.gateway.sensors.airHumidity = 94.0;
    currentTelemetry.gateway.sensors.lightLux = 110;
    currentTelemetry.gateway.irrigation.rainPrediction = evaluateRainPrediction(94.0, 110);
    addLog('alert', 'Gateway (WiFi)', 'Simulasi Hujan: Kelembaban udara naik ke 94%, cahaya redup. Penyiraman ditunda otomatis.');
    broadcastSSE({ type: 'telemetry_update', payload: currentTelemetry });
    return res.json({ status: 'ok', rain: currentTelemetry.gateway.irrigation.rainPrediction });
  }

  if (action === 'simulate_clear_sky') {
    currentTelemetry.gateway.sensors.airHumidity = 62.0;
    currentTelemetry.gateway.sensors.lightLux = 750;
    currentTelemetry.gateway.irrigation.rainPrediction = evaluateRainPrediction(62.0, 750);
    addLog('info', 'Gateway (WiFi)', 'Simulasi Cuaca Cerah: Kelembaban 62%, cahaya normal. Aman untuk penyiraman.');
    broadcastSSE({ type: 'telemetry_update', payload: currentTelemetry });
    return res.json({ status: 'ok', rain: currentTelemetry.gateway.irrigation.rainPrediction });
  }

  if (action === 'wake_soil_node' || action === 'water_soil' || action === 'set_soil_dry') {
    const isWater = action === 'water_soil';
    const isDry = action === 'set_soil_dry';

    let nextMoist = currentTelemetry.soilNode.sensors.soilMoisture;
    if (isWater) nextMoist = 72.0;
    else if (isDry) nextMoist = 18.4;
    else nextMoist = +(nextMoist + (Math.random() * 0.4 - 0.2)).toFixed(1);

    const nowIso = new Date().toISOString();
    currentTelemetry.soilNode.deepSleep.state = 'awake_transmitting';
    currentTelemetry.soilNode.deepSleep.lastWakeupIso = nowIso;
    currentTelemetry.soilNode.deepSleep.nextWakeupIso = new Date(Date.now() + 15 * 60000).toISOString();
    currentTelemetry.soilNode.sensors.soilMoisture = nextMoist;
    currentTelemetry.soilNode.sensors.moistureRaw = Math.round(3500 - (nextMoist / 100) * 2300);
    currentTelemetry.soilNode.lastSeen = Date.now();
    espNowPackets++;

    addLog('espnow', 'Soil Node (ESP-NOW)', `ESP32-C3 bangun -> Pin 10 Power On -> kirim paket ESP-NOW -> Lembab: ${nextMoist}% -> Pin 10 Off -> Deep Sleep 15m.`);
    broadcastSSE({ type: 'telemetry_update', payload: currentTelemetry });

    setTimeout(() => {
      currentTelemetry.soilNode.deepSleep.state = 'sleeping';
      broadcastSSE({ type: 'telemetry_update', payload: currentTelemetry });
    }, 2000);

    return res.json({ status: 'ok', message: 'Soil node awakened and transmitted' });
  }

  if (action === 'drain_battery') {
    const drained = computeBatteryDetails(3.38);
    currentTelemetry.soilNode.batteryVoltage = 3.38;
    currentTelemetry.soilNode.battery = drained;
    addLog('alert', 'Soil Node (ESP-NOW)', 'Simulasi Baterai: ESP32-C3 Supermini baterai lemah (3.38V, 5%).');
    broadcastSSE({ type: 'telemetry_update', payload: currentTelemetry });
    return res.json({ status: 'ok', message: 'Battery drained' });
  }

  if (action === 'recharge_battery') {
    const recharged = computeBatteryDetails(4.18);
    currentTelemetry.soilNode.batteryVoltage = 4.18;
    currentTelemetry.soilNode.battery = recharged;
    addLog('info', 'Soil Node (ESP-NOW)', 'Baterai diisi penuh: 4.18V (100%).');
    broadcastSSE({ type: 'telemetry_update', payload: currentTelemetry });
    return res.json({ status: 'ok', message: 'Battery recharged' });
  }

  if (action === 'toggle_simulation') {
    simulationActive = typeof value === 'boolean' ? value : !simulationActive;
    addLog('info', 'System', `Mode Simulasi ${simulationActive ? 'Diaktifkan' : 'Dinonaktifkan'}`);
    return res.json({ status: 'ok', simulationActive });
  }

  res.status(400).json({ error: 'Unknown action' });
});

// Periodic background simulation loop for Gateway (every 2.5 seconds)
setInterval(() => {
  if (!simulationActive) return;

  const nowIso = new Date().toISOString();
  totalPackets++;

  // Drift gateway sensor values (DHT22, LDR)
  const prevAirTemp = currentTelemetry.gateway.sensors.airTemp;
  const nextAirTemp = +(prevAirTemp + (Math.random() * 0.4 - 0.2)).toFixed(1);
  const clampedAirTemp = Math.min(38, Math.max(22, nextAirTemp));

  const prevAirHum = currentTelemetry.gateway.sensors.airHumidity;
  const nextAirHum = +(prevAirHum + (Math.random() * 0.8 - 0.4)).toFixed(1);
  const clampedAirHum = Math.min(95, Math.max(30, nextAirHum));

  const prevLight = currentTelemetry.gateway.sensors.lightLux;
  const nextLight = Math.min(1200, Math.max(100, Math.round(prevLight + (Math.random() * 30 - 15))));

  // Update RTC clock
  const rtcTime = getRtcFormattedTime();
  const rainEval = evaluateRainPrediction(clampedAirHum, nextLight);

  // If pump is running, slowly increase soil moisture
  if (currentTelemetry.gateway.irrigation.pumpState) {
    currentTelemetry.soilNode.sensors.soilMoisture = +(currentTelemetry.soilNode.sensors.soilMoisture + 1.2).toFixed(1);
    if (currentTelemetry.soilNode.sensors.soilMoisture >= 68) {
      stopSequentialWatering('Tanah telah basah optimal (68%)');
    }
  }

  currentTelemetry = {
    ...currentTelemetry,
    timestamp: nowIso,
    source: 'simulation',
    gateway: {
      ...currentTelemetry.gateway,
      status: 'online',
      lastSeen: Date.now(),
      uptimeSeconds: currentTelemetry.gateway.uptimeSeconds + 3,
      sensors: {
        ...currentTelemetry.gateway.sensors,
        airTemp: clampedAirTemp,
        airHumidity: clampedAirHum,
        lightLux: nextLight,
      },
      rtc: {
        ...currentTelemetry.gateway.rtc,
        currentTime: rtcTime.time,
        currentDate: rtcTime.date,
      },
      irrigation: {
        ...currentTelemetry.gateway.irrigation,
        rainPrediction: rainEval,
      },
    },
  };

  telemetryHistory.push(currentTelemetry);
  if (telemetryHistory.length > 300) telemetryHistory.shift();

  broadcastSSE({ type: 'telemetry_update', payload: currentTelemetry });
}, 2500);

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ESP32 Smart Telemetry & Irrigation Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
