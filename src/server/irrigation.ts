import type { SmartIrrigationState } from '../types/telemetry';
import {
  broadcastTelemetry,
  getTelemetry,
  logAndBroadcast,
} from './state';

/** Delay (ms) between opening the solenoid valve and starting the pump. */
const INTERLOCK_DELAY_MS = 5000;
/** Default watering duration used by the simulation (ms). */
const WATERING_DURATION_MS = 25000;
/** Delay (ms) between stopping the pump and closing the valve. */
const VALVE_CLOSE_DELAY_MS = 1500;

let interlockTimer: ReturnType<typeof setTimeout> | null = null;
let wateringDurationTimer: ReturnType<typeof setTimeout> | null = null;

function irrigation(): SmartIrrigationState {
  return getTelemetry().gateway.irrigation;
}

/**
 * Runs the safe sequential watering routine:
 *   1. Open solenoid valve (Relay 2) first
 *   2. Wait the 5-second interlock delay
 *   3. Start the water pump (Relay 1)
 *   4. After the duration elapses, stop (pump off first, then valve closed)
 *
 * The sequence is skipped when another phase is active or when the rain
 * prediction says watering should be deferred.
 */
export function triggerSequentialWatering(reason: string): void {
  const irr = irrigation();
  if (irr.sequencePhase !== 'standby') return;

  if (irr.rainPrediction.skipWatering) {
    logAndBroadcast('warning', 'System', `Penyiraman dibatalkan: ${irr.rainPrediction.reason}`);
    return;
  }

  // Phase 1: Open Solenoid Valve first (Relay Channel 2)
  irr.sequencePhase = 'valve_pre_opening';
  irr.valveState = true;
  irr.pumpState = false;

  logAndBroadcast(
    'info',
    'System',
    `[Langkah 1/2] Relay Channel 2 (Solenoid Valve) DIBUKA lebih dulu (${reason}). Menunggu jeda 5 detik...`,
  );

  // Phase 2: Start Water Pump (Relay Channel 1) after the interlock delay
  if (interlockTimer) clearTimeout(interlockTimer);
  interlockTimer = setTimeout(() => {
    const current = irrigation();
    current.sequencePhase = 'watering_active';
    current.pumpState = true;
    getTelemetry().control.relayState = true;

    logAndBroadcast(
      'info',
      'System',
      '[Langkah 2/2] Jeda 5 detik tercapai -> Relay Channel 1 (Pompa Air) MENYALA. Air mengalir.',
    );

    if (wateringDurationTimer) clearTimeout(wateringDurationTimer);
    wateringDurationTimer = setTimeout(() => {
      stopSequentialWatering('Durasi waktu penyiraman selesai');
    }, WATERING_DURATION_MS);
  }, INTERLOCK_DELAY_MS);
}

/**
 * Stops watering safely: pump off first (to relieve pressure), then the valve
 * is closed a moment later.
 */
export function stopSequentialWatering(reason: string): void {
  if (interlockTimer) clearTimeout(interlockTimer);
  if (wateringDurationTimer) clearTimeout(wateringDurationTimer);

  const irr = irrigation();
  irr.sequencePhase = 'stopping';
  irr.pumpState = false;
  getTelemetry().control.relayState = false;

  logAndBroadcast('info', 'System', `Mematikan: Pompa dimatikan lebih dulu. (${reason})`);

  setTimeout(() => {
    const current = irrigation();
    current.valveState = false;
    current.sequencePhase = 'standby';
    logAndBroadcast('info', 'System', 'Solenoid Valve ditutup kembali. Sistem standby.');
  }, VALVE_CLOSE_DELAY_MS);
}

/** True when no watering sequence is currently running. */
export function isWateringIdle(): boolean {
  return irrigation().sequencePhase === 'standby';
}

export { broadcastTelemetry };
