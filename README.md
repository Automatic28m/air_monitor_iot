# Air Monitor Pro: Smart Industrial Environmental Guard

**Air Monitor Pro** is a comprehensive IoT ecosystem designed for real-time environmental monitoring in warehouses, laboratories, and industrial spaces. By integrating high-precision hardware with a cloud-based Next.js dashboard, the system provides 24/7 surveillance of air quality, safety thresholds, and early fire detection.

## 🚀 System Features
* **4-in-1 Sensing:** Real-time tracking of PM2.5 (dust), Gas (CO2/Smoke), Temperature, and Humidity.
* **Intelligent Alert System:** Local visual/audio alarms (LED & Buzzer) coupled with a digital "System Alert Log."
* **Over-the-Air (OTA) Configuration:** Remote adjustment of sensor thresholds via MQTT without reflashing the hardware.
* **Responsive Dashboard:** A sleek interface featuring Dark/Light modes and 7-day historical analytics.

---

## 📸 Dashboard Preview

### Desktop Experience
The dashboard provides a "Command Center" view. Toggle between Light and Dark modes depending on your environment.

<p align="center">
  <img src="images/image%20(1).png" width="45%" alt="Dashboard Dark Mode">
  <img src="images/image%20(3).png" width="45%" alt="Dashboard Light Mode">
</p>

### Mobile & Tablet Responsive Design
Stay connected to your warehouse environment from anywhere in the world.

<p align="center">
  <img src="images/image%20(4).png" width="25%" alt="Mobile View">
  <img src="images/image%20(2).png" width="60%" alt="Tablet View">
</p>

---

## 🛠️ Technology Stack

### **Software & Cloud**
* **Frontend:** Next.js (React) - Optimized for high-speed performance.
* **Backend:** MongoDB - Persistent storage for alert logs.
* **Communication:** MQTT (via PubSubClient) - Low-latency bi-directional messaging.

### **Hardware Component List**
* **Microcontroller:** ESP32 (Dual-core, WiFi)
* **Environment Sensor:** DHT22 (Temp & Humidity)
* **Air Quality Sensor:** Sharp GP2Y1010AU0F (PM2.5)
* **Gas Sensor:** MQ-Series (CO2/Smoke)
* **Display:** 16x2 LCD with I2C

---

## 📡 Hardware State Machine
The firmware operates on a robust state machine to ensure non-blocking performance:
1. **SENSOR_READ:** High-frequency sampling.
2. **DANGER_CHECK:** Threshold comparison.
3. **ALARM_ACTIVE:** Visual/Audio alert triggering.
4. **NORMAL_ACTIVE:** Power-saving stable state.
5. **DISPLAY_PUBLISH:** LCD update & MQTT cloud sync.

---

## 🔧 Installation
1. **Hardware:** Flash the `.ino` code in the `AirMonitor/` folder using Arduino IDE.
2. **Dashboard:** Navigate to `air_monitor_iot/`, run `npm install`, and configure your `.env` credentials.