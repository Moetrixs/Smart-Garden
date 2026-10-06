import type { SmartIrrigationState } from '../types/telemetry';

type RainPrediction = SmartIrrigationState['rainPrediction'];

/** Air humidity (%) at or above which it is considered actively raining. */
export const RAINING_HUMIDITY_THRESHOLD = 92;
/** Air humidity (%) indicating heavy overcast skies. */
export const OVERCAST_HUMIDITY_THRESHOLD = 84;
/** Light level (Lux) below which overcast skies are treated as rain-imminent. */
export const OVERCAST_LUX_THRESHOLD = 350;

/**
 * Derives a simple rain prediction from the gateway's air humidity and light
 * sensor readings. Used to automatically defer scheduled watering when rain is
 * falling or imminent.
 */
export function evaluateRainPrediction(humidity: number, lux: number): RainPrediction {
  if (humidity >= RAINING_HUMIDITY_THRESHOLD) {
    return {
      status: 'raining',
      skipWatering: true,
      probabilityPercent: 95,
      reason: `Sensor mendeteksi hujan sedang berlangsung (Kelembaban udara sangat jenuh >= ${RAINING_HUMIDITY_THRESHOLD}%).`,
    };
  }
  if (humidity >= OVERCAST_HUMIDITY_THRESHOLD && lux < OVERCAST_LUX_THRESHOLD) {
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
