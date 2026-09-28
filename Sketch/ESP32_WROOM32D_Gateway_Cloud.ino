/**
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

const char* WIFI_SSID     = "NAMA_WIFI_INTERNET_ANDA";
const char* WIFI_PASSWORD = "PASSWORD_WIFI_ANDA";
const char* SERVER_URL    = "https://ais-dev-nlurcb53a45zlsaicv3xer-141804297563.asia-southeast1.run.app/api/telemetry";

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
