import type { TelemetryData } from '../types/telemetry';
import { formatRtcTime } from '../data/initialTelemetry';
import { evaluateRainPrediction } from './rainPrediction';
import { stopSequentialWatering } from './irrigation';
import {
  broadcastTelemetry,
  getTelemetry,
  incrementTotalPackets,
  isSimulationActive,
  pushHistory,
  setTelemetry,
} from './state';

/** Interval between background simulation ticks (ms). */
const SIMULATION_TICK_MS = 2500;

const AIR_TEMP_RANGE: [number, number] = [22, 38];
const AIR_HUMIDITY_RANGE: [number, number] = [30, 95];
const LIGHT_LUX_RANGE: [number, number] = [100, 1200];
/** Soil moisture level at which an active watering run is considered complete. */
const OPTIMAL_SOIL_MOISTURE = 68;

function clamp(value: number, [min, max]: [number, number]): number {
  return Math.min(max, Math.max(min, value));
}

function drift(value: number, amplitude: number): number {
  return +(value + (Math.random() * amplitude - amplitude / 2)).toFixed(1);
}

/** One simulation tick: random-walks the gateway sensors and re-evaluates rain. */
export function runSimulationTick(): void {
  const prev = getTelemetry();

  const clampedAirTemp = clamp(drift(prev.gateway.sensors.airTemp, 0.4), AIR_TEMP_RANGE);
  const clampedAirHum = clamp(drift(prev.gateway.sensors.airHumidity, 0.8), AIR_HUMIDITY_RANGE);
  const nextLight = Math.round(clamp(prev.gateway.sensors.lightLux + (Math.random() * 30 - 15), LIGHT_LUX_RANGE));

  // While the pump runs, soil moisture rises until it is optimally wet.
  if (prev.gateway.irrigation.pumpState) {
    prev.soilNode.sensors.soilMoisture = +(prev.soilNode.sensors.soilMoisture + 1.2).toFixed(1);
    if (prev.soilNode.sensors.soilMoisture >= OPTIMAL_SOIL_MOISTURE) {
      stopSequentialWatering(`Tanah telah basah optimal (${OPTIMAL_SOIL_MOISTURE}%)`);
    }
  }

  const rtcTime = formatRtcTime();
  const next: TelemetryData = {
    ...prev,
    timestamp: new Date().toISOString(),
    source: 'simulation',
    gateway: {
      ...prev.gateway,
      status: 'online',
      lastSeen: Date.now(),
      uptimeSeconds: prev.gateway.uptimeSeconds + 3,
      sensors: {
        ...prev.gateway.sensors,
        airTemp: clampedAirTemp,
        airHumidity: clampedAirHum,
        lightLux: nextLight,
      },
      rtc: {
        ...prev.gateway.rtc,
        currentTime: rtcTime,
        currentDate: new Date().toISOString().slice(0, 10),
      },
      irrigation: {
        ...prev.gateway.irrigation,
        rainPrediction: evaluateRainPrediction(clampedAirHum, nextLight),
      },
    },
  };

  incrementTotalPackets();
  setTelemetry(next);
  pushHistory(next);
  broadcastTelemetry();
}

/** Starts the periodic background simulation loop (no-op when disabled). */
export function startSimulationLoop(): ReturnType<typeof setInterval> {
  return setInterval(() => {
    if (!isSimulationActive()) return;
    runSimulationTick();
  }, SIMULATION_TICK_MS);
}
