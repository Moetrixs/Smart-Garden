export interface GatewaySensors {
  airTemp: number;
  airHumidity: number;
  lightLux: number;
  buttonState: 0 | 1;
  buttonPressCount: number;
  lastButtonPressedAt: string | null;
}

export interface SoilSensors {
  soilMoisture: number; // 0 - 100%
  soilTemp: number; // °C
  moistureRaw: number; // 0 - 4095
}

export interface LcdDisplayState {
  enabled: boolean;
  i2cAddress: string;
  screenPage: number;
  line1: string;
  line2: string;
  backlight: boolean;
}

export interface BatteryMonitoringState {
  voltage: number;
  percentage: number;
  adcRaw: number;
  dividerRatio: number; // (R1 + R2) / R2
  r1Kohm: number; // e.g. 100k
  r2Kohm: number; // e.g. 100k
  status: 'full' | 'normal' | 'low' | 'critical';
}

export interface DeepSleepInfo {
  enabled: boolean;
  intervalMinutes: number; // 15 menit
  state: 'sleeping' | 'awake_transmitting';
  lastWakeupIso: string;
  nextWakeupIso: string;
  estimatedBatteryLifeMonths: number; // ~18 bulan
  currentDrawUa: number; // ~5 uA saat deep sleep
}

export interface RtcState {
  enabled: boolean;
  model: 'DS3231';
  currentTime: string; // e.g. "06:30:15"
  currentDate: string; // e.g. "2026-09-28"
  temperature: number; // RTC internal temp °C
}

export interface SmartIrrigationState {
  valveState: boolean; // Relay Channel 2: Solenoid Valve
  pumpState: boolean;  // Relay Channel 1: Pompa Air
  sequencePhase: 'standby' | 'valve_pre_opening' | 'watering_active' | 'stopping';
  interlockDelaySeconds: number; // 5 detik
  scheduleMorning: string; // "06:30"
  scheduleEvening: string; // "16:30"
  durationMinutes: number; // 5 menit
  soilDryThreshold: number; // 35%
  rainPrediction: {
    status: 'clear' | 'overcast_rain_likely' | 'raining';
    skipWatering: boolean; // true if rain detected or high likelihood
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

export interface GatewayNode {
  id: string;
  boardModel: 'ESP-WROOM-32D';
  status: 'online' | 'offline';
  lastSeen: number;
  ip: string;
  wifiSsid: string;
  wifiRssi: number;
  uptimeSeconds: number;
  sensors: GatewaySensors;
  hasPhysicalLcd: boolean;
  rtc: RtcState;
  irrigation: SmartIrrigationState;
  network: NetworkDualMode;
}

export interface SoilNode {
  id: string;
  boardModel: 'ESP32-C3 Super Mini';
  protocol: 'ESP-NOW';
  status: 'online' | 'offline';
  macAddress: string;
  rssi: number;
  batteryVoltage: number;
  battery: BatteryMonitoringState;
  deepSleep: DeepSleepInfo;
  lastSeen: number;
  sensors: SoilSensors;
}

export interface ControlSettings {
  relayState: boolean;
  waterPumpAuto: boolean;
  moistureThreshold: number;
  buzzerAlert: boolean;
}

export interface TelemetryData {
  timestamp: string;
  source: 'hardware' | 'simulation';
  gateway: GatewayNode;
  soilNode: SoilNode;
  control: ControlSettings;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  type: 'info' | 'warning' | 'alert' | 'button' | 'espnow';
  node: 'Gateway (WiFi)' | 'Soil Node (ESP-NOW)' | 'System';
  message: string;
}

export interface ServerMeta {
  totalPackets: number;
  espNowPackets: number;
  simulationActive: boolean;
  serverUptime: number;
}
