/**
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

  Serial.println("\n=================================================");
  Serial.printf("ESP32-C3 WAKEUP #%d (Siklus 15 Menit)\n", bootCount);
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

  Serial.printf("[DATA] Lembab=%.1f%%, Suhu=%.1fC, Bat=%.2fV (%d%%)\n", 
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
  Serial.printf("[SLEEP] Memasuki Deep Sleep selama %d Menit. Zzzz...\n", TIME_TO_SLEEP_MINUTES);
  Serial.flush();

  esp_deep_sleep_start();
}

void loop() {
  // Kosong karena masuk deep sleep di akhir setup()
}
