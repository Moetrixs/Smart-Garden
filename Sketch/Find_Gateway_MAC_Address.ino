/**
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
  
  Serial.println("\n=======================================================");
  Serial.println("ESP-WROOM-32D MAC ADDRESS CHECKER");
  Serial.println("=======================================================");
  Serial.print("MAC Address Gateway Anda: ");
  Serial.println(WiFi.macAddress());
  Serial.println("=======================================================");
}

void loop() {
  delay(5000);
}
