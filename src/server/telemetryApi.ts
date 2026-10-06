import type { Request, Response } from 'express';
import type { TelemetryData } from '../types/telemetry';
import { computeBatteryDetails } from '../utils/battery';
import { formatRtcTime } from '../data/initialTelemetry';
import { evaluateRainPrediction } from './rainPrediction';
import { stopSequentialWatering, triggerSequentialWatering } from './irrigation';
import {
  broadcastTelemetry,
  getCounters,
  getHistory,
  getLogs,
  getTelemetry,
  incrementEspNowPackets,
  incrementTotalPackets,
  isSimulationActive,
  logAndBroadcast,
  pushHistory,
  registerSseClient,
  setSimulationActive,
  setTelemetry,
  unregisterSseClient,
} from './state';

const GATEWAY_ONLINE_WINDOW_MS = 15000;
const SOIL_NODE_ONLINE_WINDOW_MS = 20 * 60 * 1000;
const ESP_NOW_WAKEUP_INTERVAL_MS = 15 * 60 * 1000;
/** How long the soil node stays visible as "awake transmitting" after a packet. */
const AWAKE_TRANSMIT_DISPLAY_MS = 2000;

/** Picks the first defined (non-null/undefined) value, like ?? across arrays. */
function pick<T>(...values: Array<T | null | undefined>): T | undefined {
  for (const v of values) if (v !== undefined && v !== null) return v;
  return undefined;
}

// ---------------------------------------------------------------------------
// POST /api/telemetry — ingestion endpoint for the real ESP-WROOM-32D gateway
// ---------------------------------------------------------------------------

export function handleTelemetryIngest(req: Request, res: Response): void {
  try {
    const body = req.body ?? {};
    setSimulationActive(false);
    incrementTotalPackets();

    const prev = getTelemetry();
    const nowIso = new Date().toISOString();
    const gatewaySensors = body.sensors || body.gateway?.sensors || {};
    const soilSensors = body.soilNode?.sensors || body.soil || {};

    const prevButton = prev.gateway.sensors.buttonState;
    const newButton = (pick(gatewaySensors.buttonState, body.button ? 1 : 0) ?? 0) as 0 | 1;
    const buttonJustPressed = newButton === 1 && prevButton === 0;

    const rawVoltage = pick<number>(
      body.soilNode?.batteryVoltage,
      body.soilNode?.battery,
      body.batteryVoltage,
      prev.soilNode.batteryVoltage,
    )!;
    const computedBattery = computeBatteryDetails(rawVoltage);

    const hasNewSoilPacket = Boolean(body.soilNode || body.soil);
    const airTemp = pick(gatewaySensors.airTemp, body.airTemp, prev.gateway.sensors.airTemp)!;
    const airHumidity = pick(gatewaySensors.airHumidity, body.airHumidity, prev.gateway.sensors.airHumidity)!;
    const lightLux = pick(gatewaySensors.lightLux, body.lightLux, prev.gateway.sensors.lightLux)!;

    const next: TelemetryData = {
      timestamp: nowIso,
      source: 'hardware',
      gateway: {
        ...prev.gateway,
        id: body.gatewayId || body.gateway?.id || prev.gateway.id,
        status: 'online',
        lastSeen: Date.now(),
        ip: req.ip || body.ip || prev.gateway.ip,
        wifiSsid: body.wifiSsid || prev.gateway.wifiSsid,
        wifiRssi: pick(body.wifiRssi, prev.gateway.wifiRssi)!,
        uptimeSeconds: pick(body.uptimeSeconds, prev.gateway.uptimeSeconds + 2)!,
        sensors: {
          airTemp,
          airHumidity,
          lightLux,
          buttonState: newButton,
          buttonPressCount: buttonJustPressed
            ? prev.gateway.sensors.buttonPressCount + 1
            : pick(body.buttonPressCount, prev.gateway.sensors.buttonPressCount)!,
          lastButtonPressedAt: buttonJustPressed ? nowIso : prev.gateway.sensors.lastButtonPressedAt,
        },
        rtc: {
          ...prev.gateway.rtc,
          currentTime: body.rtcTime || formatRtcTime(),
          currentDate: body.rtcDate || new Date().toISOString().slice(0, 10),
          temperature: pick(body.rtcTemp, prev.gateway.rtc.temperature)!,
        },
        irrigation: {
          ...prev.gateway.irrigation,
          rainPrediction: evaluateRainPrediction(airHumidity, lightLux),
        },
        network: {
          ...prev.gateway.network,
          internetConnected: true,
          internetIp: req.ip || body.ip || prev.gateway.ip,
        },
      },
      soilNode: {
        ...prev.soilNode,
        id: body.soilNode?.id || prev.soilNode.id,
        status: hasNewSoilPacket ? 'online' : prev.soilNode.status,
        macAddress: body.soilNode?.mac || body.soilNode?.macAddress || prev.soilNode.macAddress,
        rssi: pick(body.soilNode?.rssi, prev.soilNode.rssi)!,
        batteryVoltage: computedBattery.voltage,
        battery: computedBattery,
        deepSleep: {
          ...prev.soilNode.deepSleep,
          state: hasNewSoilPacket ? 'awake_transmitting' : 'sleeping',
          lastWakeupIso: hasNewSoilPacket ? nowIso : prev.soilNode.deepSleep.lastWakeupIso,
          nextWakeupIso: hasNewSoilPacket
            ? new Date(Date.now() + ESP_NOW_WAKEUP_INTERVAL_MS).toISOString()
            : prev.soilNode.deepSleep.nextWakeupIso,
        },
        lastSeen: hasNewSoilPacket ? Date.now() : prev.soilNode.lastSeen,
        sensors: {
          soilMoisture: pick(soilSensors.soilMoisture, body.soilMoisture, prev.soilNode.sensors.soilMoisture)!,
          soilTemp: pick(soilSensors.soilTemp, body.soilTemp, prev.soilNode.sensors.soilTemp)!,
          moistureRaw: pick(soilSensors.moistureRaw, body.moistureRaw, prev.soilNode.sensors.moistureRaw)!,
        },
      },
      control: {
        ...prev.control,
        ...(body.control || {}),
      },
    };

    setTelemetry(next);
    pushHistory(next);

    if (hasNewSoilPacket) {
      incrementEspNowPackets();
      const s = next.soilNode.sensors;
      logAndBroadcast(
        'espnow',
        'Soil Node (ESP-NOW)',
        `ESP32-C3 bangun dari Deep Sleep (15m): Lembab=${s.soilMoisture}%, Suhu=${s.soilTemp}C, Bat=${computedBattery.voltage}V (${computedBattery.percentage}%).`,
      );
      setTimeout(() => {
        getTelemetry().soilNode.deepSleep.state = 'sleeping';
        broadcastTelemetry();
      }, AWAKE_TRANSMIT_DISPLAY_MS);
    }

    if (buttonJustPressed) {
      logAndBroadcast(
        'button',
        'Gateway (WiFi)',
        `Tombol Push Button fisik ditekan (Event #${next.gateway.sensors.buttonPressCount})`,
      );
    }

    // Auto-watering check: soil below dry threshold + pump in auto mode.
    if (
      next.control.waterPumpAuto &&
      next.soilNode.sensors.soilMoisture < next.gateway.irrigation.soilDryThreshold &&
      next.gateway.irrigation.sequencePhase === 'standby'
    ) {
      triggerSequentialWatering(
        `Kelembaban tanah (${next.soilNode.sensors.soilMoisture}%) dibawah ambang ${next.gateway.irrigation.soilDryThreshold}%`,
      );
    } else {
      broadcastTelemetry();
    }

    res.json({
      status: 'ok',
      receivedAt: nowIso,
      valveCommand: next.gateway.irrigation.valveState,
      pumpCommand: next.gateway.irrigation.pumpState,
      serverTime: Date.now(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ status: 'error', message });
  }
}

// ---------------------------------------------------------------------------
// GET endpoints
// ---------------------------------------------------------------------------

export function handleLatestTelemetry(_req: Request, res: Response): void {
  const now = Date.now();
  const current = getTelemetry();
  const gwOnline = now - current.gateway.lastSeen < GATEWAY_ONLINE_WINDOW_MS;
  const soilOnline = now - current.soilNode.lastSeen < SOIL_NODE_ONLINE_WINDOW_MS;
  const { totalPackets, espNowPackets } = getCounters();

  res.json({
    data: {
      ...current,
      gateway: { ...current.gateway, status: gwOnline ? 'online' : 'offline' },
      soilNode: { ...current.soilNode, status: soilOnline ? 'online' : 'offline' },
    },
    meta: {
      totalPackets,
      espNowPackets,
      simulationActive: isSimulationActive(),
      serverUptime: process.uptime(),
    },
  });
}

export function handleHistory(_req: Request, res: Response): void {
  res.json({ history: getHistory() });
}

export function handleLogs(_req: Request, res: Response): void {
  res.json({ logs: getLogs() });
}

// ---------------------------------------------------------------------------
// GET /api/telemetry/stream — SSE live push to browsers
// ---------------------------------------------------------------------------

export function handleTelemetryStream(req: Request, res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const initialState = JSON.stringify({
    type: 'initial_state',
    payload: getTelemetry(),
    history: getHistory(),
    logs: getLogs(),
  });
  res.write(`data: ${initialState}\n\n`);

  registerSseClient(res);
  req.on('close', () => unregisterSseClient(res));
}

// ---------------------------------------------------------------------------
// Irrigation & control endpoints
// ---------------------------------------------------------------------------

export function handleIrrigationTrigger(_req: Request, res: Response): void {
  triggerSequentialWatering('Pengujian Manual dari Dashboard');
  res.json({ status: 'ok', irrigation: getTelemetry().gateway.irrigation });
}

export function handleIrrigationStop(_req: Request, res: Response): void {
  stopSequentialWatering('Dihentikan manual dari Dashboard');
  res.json({ status: 'ok', irrigation: getTelemetry().gateway.irrigation });
}

export function handleIrrigationSettings(req: Request, res: Response): void {
  const { scheduleMorning, scheduleEvening, durationMinutes, soilDryThreshold } = req.body ?? {};
  const irr = getTelemetry().gateway.irrigation;

  if (scheduleMorning) irr.scheduleMorning = scheduleMorning;
  if (scheduleEvening) irr.scheduleEvening = scheduleEvening;
  if (typeof durationMinutes === 'number') irr.durationMinutes = durationMinutes;
  if (typeof soilDryThreshold === 'number') {
    irr.soilDryThreshold = soilDryThreshold;
    getTelemetry().control.moistureThreshold = soilDryThreshold;
  }

  logAndBroadcast(
    'info',
    'System',
    `Pengaturan Jadwal Diperbarui: Pagi ${irr.scheduleMorning}, Sore ${irr.scheduleEvening}, Ambang Kering ${irr.soilDryThreshold}%.`,
  );
  res.json({ status: 'ok', irrigation: irr });
}

export function handleControl(req: Request, res: Response): void {
  const { relayState, waterPumpAuto, moistureThreshold } = req.body ?? {};

  if (typeof relayState === 'boolean') {
    if (relayState) {
      triggerSequentialWatering('Manual Switch ON');
    } else {
      stopSequentialWatering('Manual Switch OFF');
    }
  }
  if (typeof waterPumpAuto === 'boolean') {
    getTelemetry().control.waterPumpAuto = waterPumpAuto;
    logAndBroadcast('info', 'System', `Mode Otomatis Pompa: ${waterPumpAuto ? 'DIAKTIFKAN' : 'DINONAKTIFKAN'}`);
  }
  if (typeof moistureThreshold === 'number') {
    getTelemetry().control.moistureThreshold = moistureThreshold;
    getTelemetry().gateway.irrigation.soilDryThreshold = moistureThreshold;
  }

  broadcastTelemetry();
  const current = getTelemetry();
  res.json({ status: 'ok', control: current.control, irrigation: current.gateway.irrigation });
}
