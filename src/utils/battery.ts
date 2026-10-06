import type { BatteryMonitoringState } from '../types/telemetry';

const MIN_VOLTAGE = 2.8;
const MAX_VOLTAGE = 4.25;
const ADC_MAX = 4095;
const ADC_REF_VOLTS = 3.3;

/** Voltage divider resistors (kOhm) used by the ESP32-C3 battery monitoring circuit. */
export const DIVIDER_R1_KOHM = 100;
export const DIVIDER_R2_KOHM = 100;

/**
 * Maps a LiPo cell voltage to a battery monitoring state (percentage, status and
 * expected raw ADC reading behind the 100k/100k voltage divider).
 *
 * Shared between the server simulation and the browser so both always agree.
 */
export function computeBatteryDetails(voltage: number): BatteryMonitoringState {
  const v = Math.min(MAX_VOLTAGE, Math.max(MIN_VOLTAGE, voltage));

  let pct = 0;
  if (v >= 4.15) pct = 100;
  else if (v >= 3.85) pct = Math.round(65 + ((v - 3.85) / 0.3) * 35);
  else if (v >= 3.7) pct = Math.round(30 + ((v - 3.7) / 0.15) * 35);
  else if (v >= 3.4) pct = Math.round(5 + ((v - 3.4) / 0.3) * 25);
  else pct = Math.max(0, Math.round(((v - 2.8) / 0.6) * 5));

  let status: BatteryMonitoringState['status'] = 'normal';
  if (pct >= 90) status = 'full';
  else if (pct <= 15) status = 'critical';
  else if (pct <= 30) status = 'low';

  const ratio = (DIVIDER_R1_KOHM + DIVIDER_R2_KOHM) / DIVIDER_R2_KOHM;
  const adcRaw = Math.min(ADC_MAX, Math.round(v / ratio / ADC_REF_VOLTS * ADC_MAX));

  return {
    voltage: +v.toFixed(2),
    percentage: pct,
    adcRaw,
    dividerRatio: ratio,
    r1Kohm: DIVIDER_R1_KOHM,
    r2Kohm: DIVIDER_R2_KOHM,
    status,
  };
}
