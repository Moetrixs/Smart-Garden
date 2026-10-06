export type IrrigationSettingsInput = {
  scheduleMorning?: string;
  scheduleEvening?: string;
  durationMinutes?: number;
  soilDryThreshold?: number;
};

export function validateIrrigationSettings(payload: unknown): IrrigationSettingsInput {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload tidak valid');
  }

  const settings = payload as Record<string, unknown>;

  if (settings.scheduleMorning !== undefined) {
    const time = String(settings.scheduleMorning);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      throw new Error('Format jam pagi tidak valid');
    }
  }

  if (settings.scheduleEvening !== undefined) {
    const time = String(settings.scheduleEvening);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      throw new Error('Format jam sore tidak valid');
    }
  }

  if (settings.durationMinutes !== undefined) {
    const duration = Number(settings.durationMinutes);
    if (!Number.isFinite(duration) || duration < 1 || duration > 30) {
      throw new Error('Durasi penyiraman harus di antara 1 dan 30 menit');
    }
  }

  if (settings.soilDryThreshold !== undefined) {
    const threshold = Number(settings.soilDryThreshold);
    if (!Number.isFinite(threshold) || threshold < 10 || threshold > 90) {
      throw new Error('Ambang kelembapan tanah harus di antara 10% dan 90%');
    }
  }

  return {
    scheduleMorning: settings.scheduleMorning ? String(settings.scheduleMorning) : undefined,
    scheduleEvening: settings.scheduleEvening ? String(settings.scheduleEvening) : undefined,
    durationMinutes: settings.durationMinutes !== undefined ? Number(settings.durationMinutes) : undefined,
    soilDryThreshold: settings.soilDryThreshold !== undefined ? Number(settings.soilDryThreshold) : undefined,
  };
}
