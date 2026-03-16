
---

# Air Monitor Pro: Smart Industrial Environmental Guard

**Air Monitor Pro** is a comprehensive IoT ecosystem designed for real-time environmental monitoring in warehouses, laboratories, and industrial spaces. By integrating high-precision hardware with a cloud-based Next.js dashboard, the system provides 24/7 surveillance of air quality, safety thresholds, and early fire detection.

## 🚀 System Features

* **4-in-1 Sensing:** Real-time tracking of PM2.5 (dust), Gas (CO2/Smoke), Temperature, and Humidity.
* **Intelligent Alert System:** Local visual/audio alarms (LED & Buzzer) coupled with a digital "System Alert Log."
* **Over-the-Air (OTA) Configuration:** Remote adjustment of sensor thresholds (e.g., changing temp limits) via MQTT without reflashing the hardware.
* **Responsive Dashboard:** A sleek, Next.js-powered interface featuring Dark/Light modes, real-time gauges, and 7-day historical analytics.
* **Industrial Reliability:** Built on a state-machine architecture for stable, non-blocking hardware performance.

---

## 🛠️ Technology Stack

### **Software & Cloud**

* **Frontend:** Next.js (React) - Optimized for high-speed performance and responsiveness.
* **Backend/Database:** MongoDB - For persistent storage of logs and alert history.
* **Communication:** MQTT (via PubSubClient) - Low-latency, bi-directional messaging between hardware and dashboard.
* **Deployment:** Netlify - Ensuring 24/7 dashboard availability.

### **Hardware Component List**

Based on the system architecture, here are the core components used:

* **Microcontroller:** ESP32 (Dual-core, built-in WiFi).
* **Environment Sensor:** DHT22 (High-accuracy Temperature & Humidity).
* **Air Quality Sensor:** Sharp GP2Y1010AU0F (PM2.5 Dust Sensing).
* **Gas/Smoke Sensor:** MQ-Series Sensor (Analog output for CO2/Smoke percentage).
* **Display:** 16x2 LCD with I2C Interface.
* **Indicators:** * Green LED (System Healthy)
* Red LED (Critical Warning)
* Active Piezo Buzzer (Audio Alert)



---

## 📡 Hardware State Machine Logic

The firmware operates on a five-state machine to ensure the ESP32 remains responsive to MQTT messages while processing sensor data:

1. **SENSOR_READ:** High-frequency sampling of analog and digital signals.
2. **DANGER_CHECK:** Comparison of live data against remote-configured thresholds.
3. **ALARM_ACTIVE:** Triggering local hardware alerts (Blinking Red LED/Buzzer).
4. **NORMAL_ACTIVE:** Power-saving stable state when conditions are optimal.
5. **DISPLAY_PUBLISH:** Updating the local LCD and pushing JSON payloads to the cloud.

---

## 📸 Dashboard Preview

The dashboard provides a "Command Center" view of your facility:

* **Live Gauges:** Visualizing the "health" of each sensor.
* **Threshold Management:** A dedicated "Push Config" UI to update hardware limits remotely.
* **Alert Analytics:** Identifying trends in environmental spikes over a 7-day period.

---

## 🔧 Installation & Setup

1. **Hardware:** Flash the provided `.ino` code to your ESP32 using the Arduino IDE. Ensure all libraries (`PubSubClient`, `ArduinoJson`, `DHT`, `LiquidCrystal_I2C`) are installed.
2. **Dashboard:** Clone the Next.js repository, configure your `MONGODB_URI` and MQTT credentials in `.env`, and run `npm install && npm run dev`.

---

![Alt text](images/image (1).png)