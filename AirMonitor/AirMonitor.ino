#define LED_ON LOW
#define LED_OFF HIGH

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "DHT.h"
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* ssid = "Automatic iPhone";
const char* password = "12345678";
const char* mqtt_server = "mqtt-dashboard.com";
const int mqtt_port = 1883;

// Topics
const char* topic_publish = "sensor/airmonitor";
const char* topic_subscribe = "sensor/airmonitor/settings";

WiFiClient espClient;
PubSubClient client(espClient);

const int ledGreen = 26;
const int ledRed = 27;
const int buzzerPin = 32;

LiquidCrystal_I2C lcd(0x27, 16, 2);
#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

const int measurePin = 35;
const int ledPin = 2;
int samplingTime = 280;
int deltaTime = 40;
int sleepTime = 9680;

const int gasAnalogPin = 34;
const int gasDigitalPin = 14;

// Thresholds & Settings
float pm25Threshold = 50.0;
float gasThreshold = 70.0;
float tempMax = 35.0;
float tempMin = 18.0;
float humMax = 70.0;
float humMin = 30.0;
bool buzzerEnabled = true;  // <--- NEW: ตัวแปรควบคุมการเปิด/ปิด Buzzer

void setup_wifi() {
  delay(10);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
}

// ฟังก์ชันรับข้อมูลจาก NextJS
void callback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (int i = 0; i < length; i++) message += (char)payload[i];

  if (String(topic) == topic_subscribe) {
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, message);

    if (!error) {
      if (doc.containsKey("pm25")) pm25Threshold = doc["pm25"];
      if (doc.containsKey("gas")) gasThreshold = doc["gas"];
      if (doc.containsKey("tempMax")) tempMax = doc["tempMax"];
      if (doc.containsKey("tempMin")) tempMin = doc["tempMin"];
      if (doc.containsKey("humMax")) humMax = doc["humMax"];
      if (doc.containsKey("humMin")) humMin = doc["humMin"];

      // <--- NEW: รับค่าการเปิด/ปิด Buzzer จาก Web
      if (doc.containsKey("buzzerEnabled")) buzzerEnabled = doc["buzzerEnabled"];

      Serial.println("✅ Config & Settings Updated!");
      Serial.print("Buzzer Enabled: ");
      Serial.println(buzzerEnabled ? "YES" : "NO");
    }
  }
}

void reconnect() {
  while (!client.connected()) {
    String clientId = "ESP32Client-" + String(random(0xffff), HEX);
    if (client.connect(clientId.c_str())) {
      client.subscribe(topic_subscribe);
    } else {
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);

  pinMode(ledGreen, OUTPUT);
  pinMode(ledRed, OUTPUT);
  pinMode(buzzerPin, OUTPUT);

  digitalWrite(ledGreen, LED_OFF);
  digitalWrite(ledRed, LED_OFF);
  digitalWrite(buzzerPin, LOW);

  lcd.init();
  lcd.backlight();
  pinMode(ledPin, OUTPUT);
  pinMode(gasDigitalPin, INPUT);
  dht.begin();

  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // อ่านค่าฝุ่น
  digitalWrite(ledPin, LOW);
  delayMicroseconds(samplingTime);
  float voMeasured = analogRead(measurePin);
  delayMicroseconds(deltaTime);
  digitalWrite(ledPin, HIGH);
  delayMicroseconds(sleepTime);

  float calcVoltage = voMeasured * (3.3 / 4095.0);
  float dustDensity = (0.17 * calcVoltage - 0.1) * 1000;
  if (dustDensity < 0) dustDensity = 0;

  // อ่านค่าอื่นๆ
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  int gasValue = analogRead(gasAnalogPin);
  float gasPercent = (gasValue / 4095.0) * 100.0;

  // ตรวจสอบอันตราย
  bool isDanger = (dustDensity > pm25Threshold) || (gasPercent >= gasThreshold) || (t > tempMax || t < tempMin) || (h > humMax || h < humMin);

  if (isDanger) {
    digitalWrite(ledGreen, LED_OFF);
    for (int i = 0; i < 5; i++) {
      digitalWrite(ledRed, LED_ON);

      // <--- CHANGED: เช็คสถานะ buzzerEnabled ก่อนให้เสียงดัง
      if (buzzerEnabled) {
        digitalWrite(buzzerPin, HIGH);
      }

      delay(200);
      digitalWrite(ledRed, LED_OFF);
      digitalWrite(buzzerPin, LOW);  // มั่นใจว่าปิดเสียงทุกรอบ
      delay(200);
      client.loop();
    }
    lcd.setCursor(13, 0);
    lcd.print("!!!");
  } else {
    digitalWrite(ledGreen, LED_ON);
    digitalWrite(ledRed, LED_OFF);
    digitalWrite(buzzerPin, LOW);
    lcd.setCursor(13, 0);
    lcd.print("   ");
    for (int i = 0; i < 20; i++) {
      delay(100);
      client.loop();
    }
  }

  // แสดงผล LCD
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("T:");
  lcd.print(t, 1);
  lcd.print("C H:");
  lcd.print(h, 0);
  lcd.print("%");
  lcd.setCursor(0, 1);
  lcd.print("D:");
  lcd.print(dustDensity, 0);
  lcd.print(" G:");
  lcd.print(gasPercent);
  lcd.print("%");

  // ส่งข้อมูลขึ้นเว็บ
  String payload = "{";
  payload += "\"temperature\":" + String(t, 1) + ",";
  payload += "\"humidity\":" + String(h, 0) + ",";
  payload += "\"pm25\":" + String(dustDensity, 0) + ",";
  payload += "\"gas\":" + String(gasPercent, 1);
  payload += "}";

  client.publish(topic_publish, payload.c_str());
}