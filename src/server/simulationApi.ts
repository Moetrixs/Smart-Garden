import type { Request, Response } from 'express';
import { computeBatteryDetails } from '../utils/battery';
import { evaluateRainPrediction } from './rainPrediction';
import {
  broadcastTelemetry,
  getTelemetry,
  incrementEspNowPackets,
  isSimulationActive,
  logAndBroadcast,
  setSimulationActive,
} from './state';

const ESP_NOW_WAKEUP_INTERVAL_MS = 15 * 60 * 1000;
/** How long the button stays visibly "pressed" in the UI after an event. */
const TRANSIENT_EVENT_MS = 1200;
/** How long the soil node stays visible as "awake transmitting". */
const AWAKE_TRANSMIT_DISPLAY_MS = 2000;

type SimulationHandler = (value: unknown) => unknown;

/**
 * Registry of interactive simulation actions exposed via POST /api/simulate/action.
 * Each handler mutates the shared telemetry state and broadcasts the updates.
 */
const simulationActions: Record<string, SimulationHandler> = {
  press_button() {
    const t = getTelemetry();
    t.gateway.sensors.buttonState = 1;
    t.gateway.sensors.buttonPressCount += 1;
    t.gateway.sensors.lastButtonPressedAt = new Date().toISOString();

    logAndBroadcast(
      'button',
      'Gateway (WiFi)',
      `[Simulasi] Tombol Push Button ESP-WROOM-32D ditekan (#${t.gateway.sensors.buttonPressCount})`,
    );

    setTimeout(() => {
      getTelemetry().gateway.sensors.buttonState = 0;
      broadcastTelemetry();
    }, TRANSIENT_EVENT_MS);

    return { message: 'Button pressed' };
  },

  simulate_rain() {
    const t = getTelemetry();
    t.gateway.sensors.airHumidity = 94.0;
    t.gateway.sensors.lightLux = 110;
    t.gateway.irrigation.rainPrediction = evaluateRainPrediction(94.0, 110);
    logAndBroadcast(
      'alert',
      'Gateway (WiFi)',
      'Simulasi Hujan: Kelembaban udara naik ke 94%, cahaya redup. Penyiraman ditunda otomatis.',
    );
    return { rain: t.gateway.irrigation.rainPrediction };
  },

  simulate_clear_sky() {
    const t = getTelemetry();
    t.gateway.sensors.airHumidity = 62.0;
    t.gateway.sensors.lightLux = 750;
    t.gateway.irrigation.rainPrediction = evaluateRainPrediction(62.0, 750);
    logAndBroadcast(
      'info',
      'Gateway (WiFi)',
      'Simulasi Cuaca Cerah: Kelembaban 62%, cahaya normal. Aman untuk penyiraman.',
    );
    return { rain: t.gateway.irrigation.rainPrediction };
  },

  wake_soil_node() {
    return simulateSoilNode('wake');
  },

  water_soil() {
    return simulateSoilNode('water');
  },

  set_soil_dry() {
    return simulateSoilNode('dry');
  },

  drain_battery() {
    return setSoilBattery(3.38, 'alert', 'Simulasi Baterai: ESP32-C3 Supermini baterai lemah (3.38V, 5%).');
  },

  recharge_battery() {
    return setSoilBattery(4.18, 'info', 'Baterai diisi penuh: 4.18V (100%).');
  },

  toggle_simulation(value) {
    const target = typeof value === 'boolean' ? value : !isSimulationActive();
    setSimulationActive(target);
    logAndBroadcast('info', 'System', `Mode Simulasi ${target ? 'Diaktifkan' : 'Dinonaktifkan'}`);
    return { simulationActive: target };
  },
};

function setSoilBattery(voltage: number, level: 'alert' | 'info', message: string): unknown {
  const battery = computeBatteryDetails(voltage);
  const t = getTelemetry();
  t.soilNode.batteryVoltage = voltage;
  t.soilNode.battery = battery;
  logAndBroadcast(level, 'Soil Node (ESP-NOW)', message);
  return { battery };
}

/** Shared implementation for wake_soil_node / water_soil / set_soil_dry. */
function simulateSoilNode(mode: unknown): unknown {
  const t = getTelemetry();
  let nextMoist = t.soilNode.sensors.soilMoisture;
  if (mode === 'water') nextMoist = 72.0;
  else if (mode === 'dry') nextMoist = 18.4;
  else nextMoist = +(nextMoist + (Math.random() * 0.4 - 0.2)).toFixed(1);

  const nowIso = new Date().toISOString();
  t.soilNode.deepSleep.state = 'awake_transmitting';
  t.soilNode.deepSleep.lastWakeupIso = nowIso;
  t.soilNode.deepSleep.nextWakeupIso = new Date(Date.now() + ESP_NOW_WAKEUP_INTERVAL_MS).toISOString();
  t.soilNode.sensors.soilMoisture = nextMoist;
  t.soilNode.sensors.moistureRaw = Math.round(3500 - (nextMoist / 100) * 2300);
  t.soilNode.lastSeen = Date.now();
  incrementEspNowPackets();

  logAndBroadcast(
    'espnow',
    'Soil Node (ESP-NOW)',
    `ESP32-C3 bangun -> Pin 10 Power On -> kirim paket ESP-NOW -> Lembab: ${nextMoist}% -> Pin 10 Off -> Deep Sleep 15m.`,
  );

  setTimeout(() => {
    getTelemetry().soilNode.deepSleep.state = 'sleeping';
    broadcastTelemetry();
  }, AWAKE_TRANSMIT_DISPLAY_MS);

  return { message: 'Soil node awakened and transmitted' };
}

export function handleSimulateAction(req: Request, res: Response): void {
  const { action, value } = req.body ?? {};
  const handler = typeof action === 'string' ? simulationActions[action] : undefined;

  if (!handler) {
    res.status(400).json({ error: 'Unknown action' });
    return;
  }

  const result = handler(value);
  res.json({ status: 'ok', ...(result as object) });
}
