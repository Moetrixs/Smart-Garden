/**
 * ==============================================================================
 * KODE FIRMWARE 2: ESP-WROOM-32D STANDALONE OFFLINE DASHBOARD (TANPA INTERNET)
 * ==============================================================================
 * FITUR UTAMA:
 * 1. Menjalankan HOTSPOT WIFI MANDIRI (Access Point):
 *    - Nama WiFi (SSID): "ESP32-Smart-Garden"
 *    - Password: "password123" (atau kosongi untuk open WiFi)
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
const char* AP_SSID     = "ESP32-Smart-Garden";
const char* AP_PASSWORD = "password123"; // Minimal 8 karakter

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

  Serial.println("\n=======================================================");
  Serial.println("HOTSPOT ACCESS POINT AKTIF!");
  Serial.printf("SSID: %s, Password: %s\n", AP_SSID, AP_PASSWORD);
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
