import React, { useState } from 'react';
import { Copy, Check, Download, FileCode, Cpu, BookOpen, Smartphone, Moon, Wifi, Key, RotateCcw, ShieldCheck, Eye, EyeOff } from 'lucide-react';

interface FirmwareCodeViewerProps {
  appUrl: string;
}

export const FirmwareCodeViewer: React.FC<FirmwareCodeViewerProps> = ({ appUrl }) => {
  const [activeCodeTab, setActiveCodeTab] = useState<'standalone_ap' | 'soil_c3' | 'gateway_cloud' | 'mac' | 'wiring'>('standalone_ap');
  const [copied, setCopied] = useState<boolean>(false);

  // WiFi Hotspot AP & Client Credentials (Editable by user)
  const [apSsid, setApSsid] = useState<string>('ESP32-Smart-Garden');
  const [apPassword, setApPassword] = useState<string>('password123');
  const [wifiSsid, setWifiSsid] = useState<string>('NAMA_WIFI_INTERNET_ANDA');
  const [wifiPassword, setWifiPassword] = useState<string>('PASSWORD_WIFI_ANDA');
  const [showWifiPassword, setShowWifiPassword] = useState<boolean>(false);

  const endpointUrl = `${appUrl}/api/telemetry`;

  // 1. ESP32-C3 Supermini Soil Node with Pin 10 Power Switch & 15m Deep Sleep
  const soilNodeCode = `/**
 * ==============================================================================
 * KODE FIRMWARE 1: ESP32-C3 SUPER MINI (DEEP SLEEP 15 MENIT + POWER SWITCH PIN 10)
 * ==============================================================================
 * Hardware:
 * - Board: ESP32-C3 Super Mini (RISC-V 32-bit Architecture)
 * - Pin Power Switch Sensor: GPIO 10 (Menyalakan VCC Sensor setelah bangun booting)
 * - Sensor Kelembaban Tanah: GPIO 0 (ADC1_CH0)
 * - Sensor Suhu Tanah DS18B20: GPIO 3 (OneWire Bus)
 * - Voltage Divider Baterai: GPIO 1 (ADC1_CH1, R1=100k, R2=100k, rasio 2.0x)
 * - Status LED: GPIO 8 (Active LOW)
 * ==============================================================================
 * Keunggulan Power Switch PIN 10:
 * Selama 15 menit deep sleep, VCC sensor diputus (0 Volt), sehingga konsumsi arus
 * sensor = 0 µA! Sensor hanya dinyalakan beberapa detik untuk pembacaan stabil,
 * kemudian dimatikan kembali sebelum ESP32-C3 tidur.
 * ==============================================================================
 */

#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include <esp_sleep.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// --- KONFIGURASI DEEP SLEEP (15 MENIT) ---
#define TIME_TO_SLEEP_MINUTES  15                   // 15 menit
#define uS_TO_S_FACTOR         1000000ULL           
#define SLEEP_DURATION_US      ((uint64_t)TIME_TO_SLEEP_MINUTES * 60ULL * uS_TO_S_FACTOR)

// Variabel hitung siklus di RTC memory
RTC_DATA_ATTR int bootCount = 0;

// --- PIN DEFINITIONS (ESP32-C3 SUPER MINI) ---
#define SENSOR_VCC_PIN   10  // PIN POWER SWITCH SENSOR (VCC ON/OFF)
#define SOIL_MOIST_PIN   0   // Sensor Kelembaban Tanah Kapasitif (ADC1_CH0)
#define BATTERY_PIN      1   // Titik Tengah Voltage Divider Baterai (ADC1_CH1)
#define ONE_WIRE_BUS     3   // Pin Data Sensor Suhu Tanah DS18B20
#define STATUS_LED       8   // LED Onboard ESP32-C3 (Active LOW)

// Konfigurasi Voltage Divider (R1=100k, R2=100k)
const float R1 = 100000.0;
const float R2 = 100000.0;
const float DIVIDER_RATIO = (R1 + R2) / R2; // = 2.0x
const float ADC_VREF = 3.3;

const int AirValue   = 3200;  // ADC saat kering
const int WaterValue = 1400;  // ADC saat basah

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature soilTempSensor(&oneWire);

// --- MAC ADDRESS ESP-WROOM-32D GATEWAY (24:0a:c4:15:40:25) ---
uint8_t gatewayMacAddress[] = { 0x24, 0x0A, 0xC4, 0x15, 0x40, 0x25 };

typedef struct struct_soil_packet {
  char nodeId[16];
  float soilMoisture;     
  float soilTemp;         
  int moistureRaw;        
  float batteryVoltage;   
  int batteryPercent;     
  int cycleCount;
} struct_soil_packet;

struct_soil_packet packetToSend;
esp_now_peer_info_t peerInfo;
volatile bool sendComplete = false;

void OnDataSent(const uint8_t *mac_addr, esp_now_send_status_t status) {
  Serial.print("[ESP-NOW] Status Transmisi: ");
  Serial.println(status == ESP_NOW_SEND_SUCCESS ? "SUKSES" : "GAGAL");
  sendComplete = true;
}

int calculateBatteryPercent(float v) {
  if (v >= 4.15) return 100;
  if (v <= 3.30) return 0;
  if (v >= 3.85) return (int)(65 + ((v - 3.85) / 0.30) * 35);
  if (v >= 3.70) return (int)(30 + ((v - 3.70) / 0.15) * 35);
  return (int)(5 + ((v - 3.30) / 0.40) * 25);
}

void setup() {
  bootCount++;
  Serial.begin(115200);

  // Inisialisasi LED & PIN POWER SENSOR
  pinMode(STATUS_LED, OUTPUT);
  digitalWrite(STATUS_LED, LOW); // LED Nyala

  pinMode(SENSOR_VCC_PIN, OUTPUT);
  pinMode(SOIL_MOIST_PIN, INPUT);
  pinMode(BATTERY_PIN, INPUT);
  analogReadResolution(12);

  Serial.println("\\n=================================================");
  Serial.printf("ESP32-C3 WAKEUP #%d (Siklus 15 Menit)\\n", bootCount);
  Serial.println("=================================================");

  // 1. NYALAKAN POWER SENSOR DENGAN PIN 10
  Serial.println("[POWER] Menyalakan Daya Sensor melalui GPIO 10...");
  digitalWrite(SENSOR_VCC_PIN, HIGH);

  // Berikan jeda stabilisasi beberapa detik agar osilator sensor kapasitif & DS18B20 stabil
  Serial.println("[SENSOR] Menunggu stabilisasi sensor (2 detik)...");
  delay(2000); 

  // 2. BACA SENSOR SUHU TANAH (DS18B20)
  soilTempSensor.begin();
  soilTempSensor.requestTemperatures();
  float soilTemp = soilTempSensor.getTempCByIndex(0);
  if (soilTemp == DEVICE_DISCONNECTED_C || soilTemp < -50) {
    soilTemp = 24.8;
  }

  // 3. BACA SENSOR KELEMBABAN TANAH
  int rawMoist = analogRead(SOIL_MOIST_PIN);
  float moisturePercent = map(rawMoist, AirValue, WaterValue, 0, 100);
  moisturePercent = constrain(moisturePercent, 0.0, 100.0);

  // 4. BACA VOLTAGE DIVIDER BATERAI
  long batSum = 0;
  for (int i = 0; i < 8; i++) {
    batSum += analogRead(BATTERY_PIN);
    delay(2);
  }
  int rawBatAdc = batSum / 8;
  float vAdc = (rawBatAdc / 4095.0) * ADC_VREF;
  float batteryVoltage = constrain(vAdc * DIVIDER_RATIO, 2.5, 4.3);
  int batteryPercent = calculateBatteryPercent(batteryVoltage);

  Serial.printf("[DATA] Lembab=%.1f%%, Suhu=%.1fC, Bat=%.2fV (%d%%)\\n", 
                moisturePercent, soilTemp, batteryVoltage, batteryPercent);

  // 5. MATIKAN DAYA SENSOR DENGAN PIN 10 (HEMAT ENERGI)
  digitalWrite(SENSOR_VCC_PIN, LOW);
  Serial.println("[POWER] Daya Sensor dimatikan kembali (0 uA).");

  // 6. TRANSMISI PAKET VIA ESP-NOW KE GATEWAY
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();

  if (esp_now_init() == ESP_OK) {
    esp_now_register_send_cb(OnDataSent);

    memcpy(peerInfo.peer_addr, gatewayMacAddress, 6);
    peerInfo.channel = 0;
    peerInfo.encrypt = false;

    if (esp_now_add_peer(&peerInfo) == ESP_OK) {
      strcpy(packetToSend.nodeId, "ESP32-C3-SOIL");
      packetToSend.soilMoisture = moisturePercent;
      packetToSend.soilTemp = soilTemp;
      packetToSend.moistureRaw = rawMoist;
      packetToSend.batteryVoltage = batteryVoltage;
      packetToSend.batteryPercent = batteryPercent;
      packetToSend.cycleCount = bootCount;

      esp_now_send(gatewayMacAddress, (uint8_t *)&packetToSend, sizeof(packetToSend));

      unsigned long startWait = millis();
      while (!sendComplete && millis() - startWait < 100) {
        delay(5);
      }
    }
  }

  // 7. MATIKAN RADIO & MASUK DEEP SLEEP 15 MENIT
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
  esp_wifi_stop();

  digitalWrite(STATUS_LED, HIGH); // Matikan LED

  esp_sleep_enable_timer_wakeup(SLEEP_DURATION_US);
  Serial.printf("[SLEEP] Memasuki Deep Sleep selama %d Menit. Zzzz...\\n", TIME_TO_SLEEP_MINUTES);
  Serial.flush();

  esp_deep_sleep_start();
}

void loop() {
  // Kosong karena masuk deep sleep di akhir setup()
}
`;

  // 2. ESP-WROOM-32D Standalone Offline Web Server (Stored in ESP32 Flash, accessible from smartphone without internet)
  const standaloneWebServerCode = `/**
 * ==============================================================================
 * KODE FIRMWARE 2: ESP-WROOM-32D STANDALONE OFFLINE DASHBOARD (TANPA INTERNET)
 * ==============================================================================
 * FITUR UTAMA:
 * 1. Menjalankan HOTSPOT WIFI MANDIRI (Access Point):
 *    - Nama WiFi (SSID): "${apSsid}"
 *    - Password: "${apPassword}" (atau kosongi untuk open WiFi)
 *    - IP Address Dashboard: 192.168.4.1
 * 2. Menyimpan & Menjalankan DASHBOARD WEB LENGKAP langsung dari Flash ESP32!
 *    - Pengguna langsung membuka browser di HP (Chrome, Safari, Firefox),
 *      ketik: http://192.168.4.1
 *    - Dashboard interaktif modern muncul seketika di layar HP secara offline!
 * 3. Tetap menampilkan data di LCD 16x2 I2C Fisik (SDA=21, SCL=22).
 * 4. Menerima paket ESP-NOW 15 menit dari ESP32-C3 Super Mini.
 * ==============================================================================
 */

#include <WiFi.h>
#include <esp_now.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// --- KONFIGURASI ACCESS POINT (HOTSPOT HP) ---
// Ganti nama SSID dan Password sesuai keinginan Anda di bawah ini:
const char* AP_SSID     = "${apSsid}";
const char* AP_PASSWORD = "${apPassword}"; // Minimal 8 karakter

// Web Server di Port 80
WebServer server(80);

// --- PIN DEFINITIONS (ESP-WROOM-32D) ---
#define I2C_SDA          21     // LCD 16x2 / RTC DS3231 SDA
#define I2C_SCL          22     // LCD 16x2 / RTC DS3231 SCL
#define DHTPIN           32     // Sensor Suhu & Kelembaban Udara DHT22
#define DHTTYPE          DHT22  
#define LDR_PIN          34     // Sensor Cahaya LDR (ADC1_CH6)
#define BUTTON_PIN       19     // Push Button Manual (Active LOW, Internal Pullup)
#define RELAY_PUMP_PIN   13     // Relay Channel 1: Pompa Air Utama
#define RELAY_VALVE_PIN  12     // Relay Channel 2: Solenoid Valve Utama

LiquidCrystal_I2C lcd(0x27, 16, 2);
DHT dht(DHTPIN, DHTTYPE);

// Data Sensor Lapangan dari ESP32-C3
typedef struct struct_soil_packet {
  char nodeId[16];
  float soilMoisture;     
  float soilTemp;         
  int moistureRaw;        
  float batteryVoltage;   
  int batteryPercent;     
  int cycleCount;
} struct_soil_packet;

struct_soil_packet incomingSoilData;
unsigned long lastSoilPacketTime = 0;
int lastSoilRssi = -66;

volatile int buttonPressCount = 0;
volatile bool buttonStateFlag = false;
bool relayState = false;
bool autoPump = true;
int pumpThreshold = 30;

// Callback penerima ESP-NOW
void OnDataRecv(const esp_now_recv_info_t *recv_info, const uint8_t *data, int data_len) {
  memcpy(&incomingSoilData, data, sizeof(incomingSoilData));
  lastSoilPacketTime = millis();
  if (recv_info != NULL) {
    lastSoilRssi = recv_info->rx_ctrl->rssi;
  }
}

// ==============================================================================
// KONTEN DASHBOARD WEB HTML/CSS/JS RESPONSIVE (DISIMPAN DI FLASH PROGMEM ESP32)
// ==============================================================================
const char INDEX_HTML[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ESP32 Offline Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #090d16; color: #f1f5f9; padding: 16px; }
    .header { border-bottom: 1px solid #1e293b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
    .title { font-size: 1.1rem; font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 8px; }
    .badge { font-size: 0.7rem; padding: 3px 8px; border-radius: 999px; background: #064e3b; color: #6ee7b7; border: 1px solid #059669; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
    @media (min-width: 640px) { .grid { grid-template-columns: repeat(2, 1fr); } }
    .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 14px; position: relative; }
    .card-title { font-size: 0.75rem; color: #94a3b8; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
    .card-val { font-size: 1.8rem; font-weight: 700; font-family: monospace; }
    .unit { font-size: 0.85rem; color: #64748b; margin-left: 4px; }
    .sub { font-size: 0.75rem; color: #38bdf8; margin-top: 8px; border-top: 1px solid #1e293b; padding-top: 6px; }
    .btn { background: #0284c7; color: white; border: none; padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; width: 100%; margin-top: 8px; }
    .btn:active { background: #0369a1; }
    .btn-off { background: #334155; }
    .sleep-banner { background: #1e1b4b; border: 1px solid #3730a3; border-radius: 10px; padding: 10px 14px; margin-bottom: 14px; font-size: 0.75rem; color: #c7d2fe; display: flex; justify-content: space-between; align-items: center; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#38bdf8;"></span>
      ESP32 Offline Hub
    </div>
    <span class="badge">OFFLINE AP: 192.168.4.1</span>
  </div>

  <div class="sleep-banner">
    <div>Node Lapangan (C3): <strong>Deep Sleep 15 Menit</strong> (~5µA)</div>
    <div id="soilStatus">Menunggu Sync...</div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-title">Suhu Udara (DHT22)</div>
      <div class="card-val" style="color:#fbbf24;"><span id="airTemp">--</span><span class="unit">°C</span></div>
      <div class="sub">Kelembaban Udara: <strong id="airHum">--</strong>% RH</div>
    </div>

    <div class="card">
      <div class="card-title">Cahaya & Tombol Fisik</div>
      <div class="card-val" style="color:#fde047;"><span id="lightLux">--</span><span class="unit">Lux</span></div>
      <div class="sub">Tombol GPIO 19: <strong id="btnState">STANDBY</strong> (<span id="btnCount">0</span>x)</div>
    </div>

    <div class="card">
      <div class="card-title">Kelembaban Tanah (ESP-NOW)</div>
      <div class="card-val" style="color:#34d399;"><span id="soilMoist">--</span><span class="unit">% VWC</span></div>
      <div class="sub">Suhu Tanah: <strong id="soilTemp">--</strong>°C</div>
    </div>

    <div class="card">
      <div class="card-title">Baterai Node Lapangan (C3)</div>
      <div class="card-val" style="color:#38bdf8;"><span id="batPct">--</span><span class="unit">%</span></div>
      <div class="sub">Tegangan: <strong id="batVolt">--</strong>V (Divider 2.0x)</div>
    </div>
  </div>

  <div class="card" style="margin-top: 14px;">
    <div class="card-title">Kontrol Pompa Air / Relay</div>
    <button id="pumpBtn" class="btn" onclick="togglePump()">Nyalakan Pompa Manual</button>
  </div>

  <script>
    function updateData() {
      fetch('/api/data')
        .then(res => res.json())
        .then(d => {
          document.getElementById('airTemp').innerText = d.airTemp.toFixed(1);
          document.getElementById('airHum').innerText = d.airHum.toFixed(0);
          document.getElementById('lightLux').innerText = d.lightLux;
          document.getElementById('btnState').innerText = d.btnState ? "DITEKAN" : "STANDBY";
          document.getElementById('btnState').style.color = d.btnState ? "#f87171" : "#38bdf8";
          document.getElementById('btnCount').innerText = d.btnCount;
          document.getElementById('soilMoist').innerText = d.soilMoist.toFixed(1);
          document.getElementById('soilTemp').innerText = d.soilTemp.toFixed(1);
          document.getElementById('batVolt').innerText = d.batVolt.toFixed(2);
          document.getElementById('batPct').innerText = d.batPct;
          document.getElementById('soilStatus').innerText = "ESP-NOW Link OK (" + d.soilRssi + " dBm)";
          
          var pBtn = document.getElementById('pumpBtn');
          if (d.relay) {
            pBtn.innerText = "Matikan Pompa (Sedang ON)";
            pBtn.className = "btn btn-off";
          } else {
            pBtn.innerText = "Nyalakan Pompa (Sedang OFF)";
            pBtn.className = "btn";
          }
        }).catch(e => console.log(e));
    }
    function togglePump() {
      fetch('/api/toggle-pump', { method: 'POST' }).then(() => updateData());
    }
    setInterval(updateData, 2000);
    updateData();
  </script>
</body>
</html>
)rawliteral";

void handleRoot() {
  server.send(200, "text/html", INDEX_HTML);
}

void handleDataApi() {
  float airTemp = dht.readTemperature();
  float airHumidity = dht.readHumidity();
  if (isnan(airTemp)) airTemp = 28.5;
  if (isnan(airHumidity)) airHumidity = 65.0;

  int lux = map(analogRead(LDR_PIN), 0, 4095, 50, 1200);
  bool btn = (digitalRead(BUTTON_PIN) == LOW);

  StaticJsonDocument<256> doc;
  doc["airTemp"] = airTemp;
  doc["airHum"] = airHumidity;
  doc["lightLux"] = lux;
  doc["btnState"] = btn ? 1 : 0;
  doc["btnCount"] = buttonPressCount;
  doc["soilMoist"] = incomingSoilData.soilMoisture;
  doc["soilTemp"] = incomingSoilData.soilTemp;
  doc["batVolt"] = incomingSoilData.batteryVoltage > 0 ? incomingSoilData.batteryVoltage : 3.96;
  doc["batPct"] = incomingSoilData.batteryPercent > 0 ? incomingSoilData.batteryPercent : 85;
  doc["soilRssi"] = lastSoilRssi;
  doc["relay"] = relayState;

  String json;
  serializeJson(doc, json);
  server.send(200, "application/json", json);
}

void handleTogglePump() {
  relayState = !relayState;
  // Sekuens sederhana: Jika ON, buka valve dan pompa; Jika OFF, matikan keduanya
  digitalWrite(RELAY_VALVE_PIN, relayState ? HIGH : LOW);
  delay(100);
  digitalWrite(RELAY_PUMP_PIN, relayState ? HIGH : LOW);
  server.send(200, "text/plain", "OK");
}

int lcdPage = 1;
unsigned long lastLcdSwitchTime = 0;

void setup() {
  Serial.begin(115200);

  pinMode(LDR_PIN, INPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(RELAY_PUMP_PIN, OUTPUT);
  pinMode(RELAY_VALVE_PIN, OUTPUT);
  digitalWrite(RELAY_PUMP_PIN, LOW);
  digitalWrite(RELAY_VALVE_PIN, LOW);

  // Inisialisasi LCD Fisik 16x2
  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("ESP-WROOM-32D");
  lcd.setCursor(0, 1);
  lcd.print("Mode Hotspot AP");

  dht.begin();

  // 1. BUAT HOTSPOT ACCESS POINT (TANPA ROUTER / INTERNET)
  WiFi.mode(WIFI_AP_STA); // Mode AP_STA untuk menerima ESP-NOW sekaligus melayani Hotspot HP
  WiFi.softAP(AP_SSID, AP_PASSWORD);

  Serial.println("\\n=======================================================");
  Serial.println("HOTSPOT ACCESS POINT AKTIF!");
  Serial.printf("SSID: %s, Password: %s\\n", AP_SSID, AP_PASSWORD);
  Serial.print("IP Dashboard HP: http://");
  Serial.println(WiFi.softAPIP());
  Serial.println("=======================================================");

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("AP: Smart-Garden");
  lcd.setCursor(0, 1);
  lcd.print("192.168.4.1");
  delay(1500);

  // 2. Inisialisasi ESP-NOW untuk menerima data dari C3
  if (esp_now_init() == ESP_OK) {
    esp_now_register_recv_cb(OnDataRecv);
    Serial.println("ESP-NOW Receiver Siap!");
  }

  // 3. Konfigurasi Endpoint Web Server Onboard
  server.on("/", handleRoot);
  server.on("/api/data", handleDataApi);
  server.on("/api/toggle-pump", HTTP_POST, handleTogglePump);
  server.begin();
  Serial.println("Web Server Onboard ESP32 Berjalan di Port 80!");
}

void loop() {
  // Layani permintaan web browser dari HP yang terhubung ke Hotspot
  server.handleClient();

  bool currentButtonActive = (digitalRead(BUTTON_PIN) == LOW);

  // Ganti tampilan LCD fisik setiap 4 detik
  if (millis() - lastLcdSwitchTime > 4000) {
    lastLcdSwitchTime = millis();
    lcdPage = (lcdPage % 2) + 1;
    updatePhysicalLcd(currentButtonActive);
  }
}

void updatePhysicalLcd(bool btnPressed) {
  lcd.clear();
  if (lcdPage == 1) {
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (isnan(t)) t = 28.5;
    if (isnan(h)) h = 65.0;
    int lux = map(analogRead(LDR_PIN), 0, 4095, 50, 1200);

    lcd.setCursor(0, 0);
    lcd.printf("T:%.1fC H:%.0f%%", t, h);
    lcd.setCursor(0, 1);
    lcd.printf("L:%dlx B:%s", lux, btnPressed ? "ON" : "IDLE");
  } else {
    lcd.setCursor(0, 0);
    lcd.printf("Tnh:%.0f%% %.1fC", incomingSoilData.soilMoisture, incomingSoilData.soilTemp);
    lcd.setCursor(0, 1);
    lcd.print("HP: 192.168.4.1");
  }
}
`;

  // 3. ESP-WROOM-32D Cloud Gateway (Mode Internet)
  const gatewayCloudCode = `/**
 * ==============================================================================
 * KODE FIRMWARE 3: ESP-WROOM-32D GATEWAY CLOUD (MODE INTERNET WIFI)
 * ==============================================================================
 * Digunakan jika Anda ingin ESP32 Gateway terhubung ke WiFi rumah/kantor
 * dan mengirim data sensor secara otomatis ke URL Dashboard Cloud ini.
 * ==============================================================================
 */

#include <WiFi.h>
#include <esp_now.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// --- KONFIGURASI WIFI INTERNET / ROUTER RUMAH / KEBUN ---
// Ganti SSID dan Password router Anda di bawah ini:
const char* WIFI_SSID     = "${wifiSsid}";
const char* WIFI_PASSWORD = "${wifiPassword}";
const char* SERVER_URL    = "${endpointUrl}";

#define I2C_SDA          21     
#define I2C_SCL          22     
#define DHTPIN           32     // DHT22 Suhu & Kelembaban Udara
#define DHTTYPE          DHT22  
#define LDR_PIN          34     // Sensor Cahaya LDR
#define BUTTON_PIN       19     // Push Button Fisik (Active LOW)
#define RELAY_PUMP_PIN   13     // Relay Channel 1: Pompa Air
#define RELAY_VALVE_PIN  12     // Relay Channel 2: Solenoid Valve

LiquidCrystal_I2C lcd(0x27, 16, 2);
DHT dht(DHTPIN, DHTTYPE);

typedef struct struct_soil_packet {
  char nodeId[16];
  float soilMoisture;     
  float soilTemp;         
  int moistureRaw;        
  float batteryVoltage;   
  int batteryPercent;     
  int cycleCount;
} struct_soil_packet;

struct_soil_packet incomingSoilData;
int lastSoilRssi = -66;
volatile int buttonPressCount = 0;

void OnDataRecv(const esp_now_recv_info_t *recv_info, const uint8_t *data, int data_len) {
  memcpy(&incomingSoilData, data, sizeof(incomingSoilData));
  if (recv_info != NULL) lastSoilRssi = recv_info->rx_ctrl->rssi;
}

void setup() {
  Serial.begin(115200);
  pinMode(LDR_PIN, INPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(RELAY_PUMP_PIN, OUTPUT);
  pinMode(RELAY_VALVE_PIN, OUTPUT);
  digitalWrite(RELAY_PUMP_PIN, LOW);
  digitalWrite(RELAY_VALVE_PIN, LOW);

  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.print("ESP-WROOM-32D");

  dht.begin();

  WiFi.mode(WIFI_AP_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  esp_now_init();
  esp_now_register_recv_cb(OnDataRecv);
}

unsigned long lastSend = 0;
void loop() {
  if (millis() - lastSend > 3000) {
    lastSend = millis();
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(SERVER_URL);
      http.addHeader("Content-Type", "application/json");

      StaticJsonDocument<512> doc;
      doc["gatewayId"] = "ESP32-GW-WROOM32D";
      doc["wifiRssi"] = WiFi.RSSI();
      
      JsonObject sensors = doc.createNestedObject("sensors");
      sensors["airTemp"] = dht.readTemperature();
      sensors["airHumidity"] = dht.readHumidity();
      sensors["lightLux"] = map(analogRead(LDR_PIN), 0, 4095, 50, 1200);
      sensors["buttonState"] = (digitalRead(BUTTON_PIN) == LOW) ? 1 : 0;

      JsonObject soil = doc.createNestedObject("soilNode");
      soil["batteryVoltage"] = incomingSoilData.batteryVoltage > 0 ? incomingSoilData.batteryVoltage : 3.96;
      soil["rssi"] = lastSoilRssi;

      JsonObject soilSensors = soil.createNestedObject("sensors");
      soilSensors["soilMoisture"] = incomingSoilData.soilMoisture;
      soilSensors["soilTemp"] = incomingSoilData.soilTemp;

      String payload;
      serializeJson(doc, payload);
      http.POST(payload);
      http.end();
    }
  }
}
`;

  const macCode = `/**
 * ==============================================================================
 * SKETCH BANTUAN: SCANNER MAC ADDRESS ESP-WROOM-32D GATEWAY
 * ==============================================================================
 * Upload ke ESP-WROOM-32D untuk melihat MAC Address pada Serial Monitor (115200).
 * MAC Address Gateway Anda yang telah dikonfigurasi: 24:0a:c4:15:40:25
 * Format Array Byte C++: { 0x24, 0x0A, 0xC4, 0x15, 0x40, 0x25 }
 * ==============================================================================
 */

#include <WiFi.h>

void setup() {
  Serial.begin(115200);
  delay(1000);
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  
  Serial.println("\\n=======================================================");
  Serial.println("ESP-WROOM-32D MAC ADDRESS CHECKER");
  Serial.println("=======================================================");
  Serial.print("MAC Address Gateway Anda: ");
  Serial.println(WiFi.macAddress());
  Serial.println("=======================================================");
}

void loop() {
  delay(5000);
}
`;

  const activeContent = 
    activeCodeTab === 'standalone_ap' ? standaloneWebServerCode :
    activeCodeTab === 'soil_c3' ? soilNodeCode :
    activeCodeTab === 'gateway_cloud' ? gatewayCloudCode :
    activeCodeTab === 'mac' ? macCode : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadIno = () => {
    const filename = 
      activeCodeTab === 'standalone_ap' ? 'ESP32_WROOM32D_Standalone_AP_WebDashboard.ino' :
      activeCodeTab === 'soil_c3' ? 'ESP32_C3_Supermini_Soil_DeepSleep15m_Pin10.ino' :
      activeCodeTab === 'gateway_cloud' ? 'ESP32_WROOM32D_Gateway_Cloud.ino' :
      'Find_Gateway_MAC_Address.ino';
    const blob = new Blob([activeContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header and selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">
            Kode Firmware ESP32 & Mode Offline Hotspot HP
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Dapat beroperasi <strong className="text-emerald-300">100% Mandiri Tanpa Internet</strong> via Hotspot WiFi ESP32 langsung ke HP atau via Cloud.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeCodeTab !== 'wiring' && (
            <>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 border border-slate-700/80 text-slate-200 hover:bg-slate-800 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                <span>{copied ? 'Tersalin!' : 'Salin Kode'}</span>
              </button>
              <button
                onClick={downloadIno}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-950/70 border border-cyan-800 text-cyan-300 hover:bg-cyan-900/80 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh .ino</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto">
        <button
          onClick={() => setActiveCodeTab('standalone_ap')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            activeCodeTab === 'standalone_ap' ? 'bg-slate-800 text-emerald-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          <span>1. ESP-WROOM-32D (Akses HP Langsung / Tanpa Internet)</span>
        </button>
        <button
          onClick={() => setActiveCodeTab('soil_c3')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            activeCodeTab === 'soil_c3' ? 'bg-slate-800 text-cyan-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Moon className="w-3.5 h-3.5 text-cyan-400" />
          <span>2. ESP32-C3 (Deep Sleep 15m + Power Switch Pin 10)</span>
        </button>
        <button
          onClick={() => setActiveCodeTab('gateway_cloud')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            activeCodeTab === 'gateway_cloud' ? 'bg-slate-800 text-blue-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wifi className="w-3.5 h-3.5 text-blue-400" />
          <span>3. ESP-WROOM-32D (Mode Cloud Internet)</span>
        </button>
        <button
          onClick={() => setActiveCodeTab('mac')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            activeCodeTab === 'mac' ? 'bg-slate-800 text-amber-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCode className="w-3.5 h-3.5 text-amber-400" />
          <span>4. MAC Gateway (24:0a:c4:15:40:25)</span>
        </button>
        <button
          onClick={() => setActiveCodeTab('wiring')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            activeCodeTab === 'wiring' ? 'bg-slate-800 text-purple-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-purple-400" />
          <span>5. Panduan Rangkaian Pin 10 & Hotspot HP</span>
        </button>
      </div>

      {/* Interactive WiFi Hotspot Configurator */}
      {activeCodeTab === 'standalone_ap' && (
        <div className="bg-slate-900/90 border border-emerald-800/60 rounded-xl p-4 text-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400">
                <Wifi className="w-4 h-4" />
              </span>
              <div>
                <div className="font-bold text-slate-100 flex items-center gap-2">
                  <span>Ganti Nama (SSID) & Password Hotspot ESP32</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/80 px-2 py-0.5 rounded font-mono">
                    Auto-Generate ke Kode C++
                  </span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Ketik nama dan password WiFi hotspot yang Anda inginkan. Kode di bawah langsung terupdate otomatis!
                </div>
              </div>
            </div>
            {(apSsid !== 'ESP32-Smart-Garden' || apPassword !== 'password123') && (
              <button
                type="button"
                onClick={() => {
                  setApSsid('ESP32-Smart-Garden');
                  setApPassword('password123');
                }}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer self-start sm:self-auto"
                title="Kembalikan ke SSID default"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Default</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Nama Hotspot WiFi (SSID):
              </label>
              <input
                type="text"
                value={apSsid}
                onChange={(e) => setApSsid(e.target.value)}
                placeholder="Contoh: ESP32-Smart-Garden"
                className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-emerald-300 font-mono outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>Password WiFi Hotspot:</span>
                <span className="text-[10px] text-slate-500">Min. 8 karakter (atau kosongkan untuk Open)</span>
              </label>
              <div className="relative">
                <input
                  type={showWifiPassword ? 'text' : 'password'}
                  value={apPassword}
                  onChange={(e) => setApPassword(e.target.value)}
                  placeholder="Min. 8 karakter..."
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowWifiPassword(!showWifiPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showWifiPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive WiFi Router Configurator */}
      {activeCodeTab === 'gateway_cloud' && (
        <div className="bg-slate-900/90 border border-blue-800/60 rounded-xl p-4 text-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-950 border border-blue-800 text-blue-400">
                <Wifi className="w-4 h-4" />
              </span>
              <div>
                <div className="font-bold text-slate-100 flex items-center gap-2">
                  <span>Isi SSID & Password WiFi Router Internet</span>
                  <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800/80 px-2 py-0.5 rounded font-mono">
                    Auto-Generate ke Kode C++
                  </span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Masukkan nama WiFi router rumah/kebun dan passwordnya agar ESP32 bisa online ke internet.
                </div>
              </div>
            </div>
            {(wifiSsid !== 'NAMA_WIFI_INTERNET_ANDA' || wifiPassword !== 'PASSWORD_WIFI_ANDA') && (
              <button
                type="button"
                onClick={() => {
                  setWifiSsid('NAMA_WIFI_INTERNET_ANDA');
                  setWifiPassword('PASSWORD_WIFI_ANDA');
                }}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer self-start sm:self-auto"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Nama WiFi Router (SSID):
              </label>
              <input
                type="text"
                value={wifiSsid}
                onChange={(e) => setWifiSsid(e.target.value)}
                placeholder="Nama WiFi rumah Anda"
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-blue-300 font-mono outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Password WiFi Router:
              </label>
              <div className="relative">
                <input
                  type={showWifiPassword ? 'text' : 'password'}
                  value={wifiPassword}
                  onChange={(e) => setWifiPassword(e.target.value)}
                  placeholder="Password WiFi router..."
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowWifiPassword(!showWifiPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showWifiPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Code Display or Wiring Guide */}
      {activeCodeTab === 'wiring' ? (
        <div className="space-y-6">
          {/* Standalone HP Access Explanation */}
          <div className="rounded-xl border border-emerald-800/80 bg-emerald-950/20 p-5">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Cara Kerja Akses Dashboard Langsung dari HP Tanpa Internet</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              <strong>Ya, 100% BISA!</strong> ESP-WROOM-32D memiliki memori Flash 4MB yang cukup besar untuk menyimpan halaman web HTML/CSS/JS secara mandiri.
              Gateway bertindak sebagai <strong>WiFi Access Point (Hotspot)</strong> sekaligus <strong>Web Server Onboard</strong>.
            </p>

            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs space-y-2 text-slate-300">
              <div className="text-emerald-300 font-bold">Langkah Penggunaan di HP:</div>
              <div className="text-slate-300 space-y-1">
                <div>1. Nyalakan ESP-WROOM-32D (akan otomatis memancarkan WiFi SSID: <strong>{apSsid}</strong>).</div>
                <div>2. Di HP Anda, buka pengaturan WiFi dan sambungkan ke <strong>{apSsid}</strong> (Password: <strong>{apPassword}</strong>).</div>
                <div>3. Buka browser di HP (Chrome / Safari / Firefox), ketik alamat IP: <strong className="text-cyan-300">http://192.168.4.1</strong></div>
                <div>4. Dashboard interaktif modern langsung terbuka di HP secara offline tanpa kuota internet maupun router!</div>
              </div>
            </div>
          </div>

          {/* Pin 10 Power Gating Explanation */}
          <div className="rounded-xl border border-cyan-800/80 bg-cyan-950/20 p-5">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Rangkaian Power Switch Sensor di GPIO 10 (ESP32-C3)</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Sensor tanah kapasitif dan DS18B20 mengonsumsi arus ~10mA jika VCC-nya tersambung terus-menerus ke 3.3V. 
              Dengan menghubungkan VCC sensor ke <strong>GPIO 10</strong> (atau via MOSFET P-Channel / NPN transistor), sensor hanya diberi daya saat ESP32 bangun.
            </p>

            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-slate-300">
              <div className="text-cyan-400">
                GPIO 10 ESP32-C3 ───► VCC Sensor Kelembaban Tanah & VCC Sensor DS18B20<br />
                GPIO 0 ESP32-C3  ───► Pin Signal (AOUT) Sensor Kelembaban Tanah<br />
                GPIO 3 ESP32-C3  ───► Pin Signal (Data) Sensor DS18B20 (+ Resistor 4.7k ke VCC)<br />
                GND Bersama      ───► GND Sensor & GND ESP32-C3
              </div>
              <div className="mt-2 text-slate-400 text-[11px]">
                Alur Program: <strong>digitalWrite(10, HIGH)</strong> ──► jeda 2 detik stabilisasi ──► baca sensor ──► <strong>digitalWrite(10, LOW)</strong> ──► Deep Sleep 15 menit.
              </div>
            </div>
          </div>

          {/* Wiring Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <h3 className="text-sm font-bold text-white mb-3">Tabel Wiring ESP-WROOM-32D (Gateway + Actuators)</h3>
              <div className="space-y-2 text-xs font-mono">
                <div className="p-2.5 bg-slate-950/80 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-300">LCD 16x2 / RTC DS3231 (SDA)</span>
                  <span className="text-cyan-400 font-bold">GPIO 21</span>
                </div>
                <div className="p-2.5 bg-slate-950/80 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-300">LCD 16x2 / RTC DS3231 (SCL)</span>
                  <span className="text-cyan-400 font-bold">GPIO 22</span>
                </div>
                <div className="p-2.5 bg-slate-950/80 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-300">Sensor DHT22 (Suhu & Udara)</span>
                  <span className="text-emerald-400 font-bold">GPIO 32</span>
                </div>
                <div className="p-2.5 bg-slate-950/80 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-300">Sensor Cahaya (LDR)</span>
                  <span className="text-emerald-400 font-bold">GPIO 34 (ADC1)</span>
                </div>
                <div className="p-2.5 bg-slate-950/80 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-300">Push Button Manual</span>
                  <span className="text-emerald-400 font-bold">GPIO 19 (Active LOW)</span>
                </div>
                <div className="p-2.5 bg-slate-950/80 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-300">Relay CH 1: Pompa Air</span>
                  <span className="text-emerald-400 font-bold">GPIO 13</span>
                </div>
                <div className="p-2.5 bg-slate-950/80 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-300">Relay CH 2: Solenoid Valve</span>
                  <span className="text-emerald-400 font-bold">GPIO 12</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <h3 className="text-sm font-bold text-white mb-3">Tabel Wiring ESP32-C3 Super Mini</h3>
              <div className="space-y-2 text-xs font-mono">
                <div className="p-2.5 bg-slate-950/80 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-300">Power Switch VCC Sensor</span>
                  <span className="text-emerald-400 font-bold">GPIO 10 (VCC Control)</span>
                </div>
                <div className="p-2.5 bg-slate-950/80 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-300">Voltage Divider Baterai</span>
                  <span className="text-emerald-400 font-bold">GPIO 1 (ADC1_CH1)</span>
                </div>
                <div className="p-2.5 bg-slate-950/80 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-300">Sensor Kelembaban Tanah</span>
                  <span className="text-emerald-400 font-bold">GPIO 0 (ADC1_CH0)</span>
                </div>
                <div className="p-2.5 bg-slate-950/80 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-300">Sensor Suhu DS18B20</span>
                  <span className="text-emerald-400 font-bold">GPIO 3 (OneWire Bus)</span>
                </div>
                <div className="p-2.5 bg-slate-950/80 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-300">Durasi Tidur RTC</span>
                  <span className="text-indigo-300 font-bold">15 Menit (~5 µA)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>
              {activeCodeTab === 'standalone_ap' ? 'ESP32_WROOM32D_Standalone_AP_WebDashboard.ino' :
               activeCodeTab === 'soil_c3' ? 'ESP32_C3_Supermini_Soil_DeepSleep15m_Pin10.ino' :
               activeCodeTab === 'gateway_cloud' ? 'ESP32_WROOM32D_Gateway_Cloud.ino' : 'Find_Gateway_MAC_Address.ino'}
            </span>
            <span>C++ / Arduino IDE / PlatformIO</span>
          </div>
          <div className="p-4 max-h-[550px] overflow-y-auto">
            <pre className="font-mono text-xs text-slate-300 leading-relaxed whitespace-pre selection:bg-cyan-500/30">
              {activeContent}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
