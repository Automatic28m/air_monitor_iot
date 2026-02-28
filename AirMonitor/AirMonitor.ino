// --- กำหนดตรรกะสำหรับ Active Low ---
#define LED_ON  LOW   // ส่ง 0V เพื่อให้ไฟติด
#define LED_OFF HIGH  // ส่ง 3.3V เพื่อให้ไฟดับ

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "DHT.h"

// --- ตั้งค่าพิน LED ---
const int ledGreen = 26; 
const int ledRed = 27;   

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

const int gasThreshold = 70;

void setup() {
  Serial.begin(115200);

  pinMode(ledGreen, OUTPUT);
  pinMode(ledRed, OUTPUT);
  
  // เริ่มต้นให้ไฟดับทั้งคู่
  digitalWrite(ledGreen, LED_OFF); 
  digitalWrite(ledRed, LED_OFF);   

  lcd.init();
  lcd.backlight();
  pinMode(ledPin, OUTPUT);
  pinMode(gasDigitalPin, INPUT);
  dht.begin();

  lcd.setCursor(0, 0);
  lcd.print("Auto's Air Mon.");
  delay(2000);
  lcd.clear();
}

void loop() {
  // --- 1. อ่านค่า PM2.5 ---
  digitalWrite(ledPin, LOW);
  delayMicroseconds(samplingTime);
  float voMeasured = analogRead(measurePin);
  delayMicroseconds(deltaTime);
  digitalWrite(ledPin, HIGH);
  delayMicroseconds(sleepTime);

  float calcVoltage = voMeasured * (3.3 / 4095.0);
  float dustDensity = (0.17 * calcVoltage - 0.1) * 1000;
  if (dustDensity < 0) dustDensity = 0;

  float h = dht.readHumidity();
  float t = dht.readTemperature();
  int gasValue = analogRead(gasAnalogPin);
  int gasAlert = digitalRead(gasDigitalPin);

  float gasPercent = (gasValue / 4095.0) * 100.0;

  // --- 2. ตรรกะการแจ้งเตือน ---
  bool isDanger = (dustDensity > 50.0) || (gasPercent >= gasThreshold);

  if (isDanger) {
    digitalWrite(ledGreen, LED_OFF); // ปิดไฟเขียว
    
    // ไฟแดงกะพริบ 5 ครั้ง
    for (int i = 0; i < 5; i++) {
      digitalWrite(ledRed, LED_ON);  // เปิด
      delay(200);
      digitalWrite(ledRed, LED_OFF); // ปิด
      delay(200);
    }
    lcd.setCursor(13, 0); lcd.print("!!!"); 
  } else {
    digitalWrite(ledGreen, LED_ON);  // เปิดไฟเขียว (ปลอดภัย)
    digitalWrite(ledRed, LED_OFF);   // ปิดไฟแดง
    lcd.setCursor(13, 0); lcd.print("   ");
    delay(2000); 
  }

  // --- 3. แสดงผล LCD ---
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("T:"); lcd.print(t, 1); lcd.print("C H:"); lcd.print(h, 0); lcd.print("%");
  lcd.setCursor(0, 1);
  lcd.print("D:"); lcd.print(dustDensity, 0); lcd.print(" G:"); lcd.print(gasPercent); lcd.print("%");
  
  Serial.print("PM2.5: "); Serial.print(dustDensity);
  Serial.print(" | Gas: "); Serial.print(gasPercent); Serial.println("%");
}