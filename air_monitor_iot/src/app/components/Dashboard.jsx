"use client";

import { useState, useEffect, useRef } from 'react';
import { Wind, Thermometer, Droplets, CloudFog, Settings, X, Send, Link, Cpu, Wifi, Download, AlertTriangle, CheckSquare, Sun, Moon, Check, Clock } from 'lucide-react';
import mqtt from 'mqtt';
import { SensorGraph } from './SensorGraph';
import { AlertLog } from './AlertLog';
import { AnalyticsPanel } from './AnalyticsPanel';

// --- NEW HELPER: Determine Wi-Fi Quality based on dBm ---
const getWifiStatus = (rssi) => {
    if (rssi === 0) return "WAIT";
    if (rssi >= -60) return "PERFECT";
    if (rssi >= -70) return "GOOD";
    if (rssi >= -80) return "FAIR";
    return "WEAK";
};

export default function Dashboard() {
    const [isDark, setIsDark] = useState(true);
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);

    const [thresholds, setThresholds] = useState({ pm25: 50, gas: 70, tempMax: 35, tempMin: 18, humMax: 70, humMin: 30, buzzerEnabled: true });
    const thresholdsRef = useRef(thresholds);
    useEffect(() => { thresholdsRef.current = thresholds; }, [thresholds]);
    const activeAlertsRef = useRef({ pm25: false, gas: false, temp: false, humidity: false });
    const [draftThresholds, setDraftThresholds] = useState({ ...thresholds });
    const [showSettings, setShowSettings] = useState(false);

    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);

    const [isMqttConnected, setIsMqttConnected] = useState(false);
    const [isDeviceOnline, setIsDeviceOnline] = useState(false);
    const [sensorData, setSensorData] = useState({ pm25: 0, gas: 0, temp: 0, humidity: 0, rssi: 0 });

    const [history, setHistory] = useState([]);
    const [fullHistory, setFullHistory] = useState([]);

    const initStat = { min: Infinity, max: -Infinity, sum: 0, count: 0 };
    const [stats, setStats] = useState({ pm25: { ...initStat }, gas: { ...initStat }, temp: { ...initStat }, humidity: { ...initStat } });

    const [mqttClient, setMqttClient] = useState(null);

    useEffect(() => {
        const fetchInitialSettings = async () => {
            try {
                const res = await fetch('/api/settings');
                if (res.ok) {
                    const dbSettings = await res.json();
                    const cleanSettings = {
                        pm25: dbSettings.pm25, gas: dbSettings.gas, tempMax: dbSettings.tempMax,
                        tempMin: dbSettings.tempMin, humMax: dbSettings.humMax, humMin: dbSettings.humMin,
                        buzzerEnabled: dbSettings.buzzerEnabled !== undefined ? dbSettings.buzzerEnabled : true
                    };
                    setThresholds(cleanSettings);
                    setDraftThresholds(cleanSettings);
                }
            } catch (error) {
                console.error("Failed to load DB", error);
            } finally {
                setIsLoadingSettings(false);
            }
        };
        fetchInitialSettings();
    }, []);

    useEffect(() => {
        const client = mqtt.connect('wss://mqtt-dashboard.com:8884/mqtt');
        setMqttClient(client);

        client.on('connect', () => {
            setIsMqttConnected(true);
            client.subscribe('sensor/airmonitor');
            client.subscribe('sensor/airmonitor/settings');
        });

        client.on('message', (topic, message) => {
            if (topic === 'sensor/airmonitor') {
                try {
                    const payload = JSON.parse(message.toString());
                    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                    const newDataPoint = {
                        pm25: payload.pm25 || 0, gas: payload.gas || 0,
                        temp: payload.temperature || 0, humidity: payload.humidity || 0,
                        rssi: payload.rssi || 0,
                        time: timeStr, rawDate: new Date().toISOString()
                    };

                    setSensorData({ pm25: newDataPoint.pm25, gas: newDataPoint.gas, temp: newDataPoint.temp, humidity: newDataPoint.humidity, rssi: newDataPoint.rssi });
                    setHistory(prev => [...prev, newDataPoint].slice(-30));
                    setFullHistory(prev => [...prev, newDataPoint].slice(-8640));

                    setStats(prev => {
                        const updateTracker = (key, val) => ({
                            min: Math.min(prev[key].min, val), max: Math.max(prev[key].max, val), sum: prev[key].sum + val, count: prev[key].count + 1
                        });
                        return { pm25: updateTracker('pm25', newDataPoint.pm25), gas: updateTracker('gas', newDataPoint.gas), temp: updateTracker('temp', newDataPoint.temp), humidity: updateTracker('humidity', newDataPoint.humidity) };
                    });

                    setIsDeviceOnline(true);
                    clearTimeout(window.deviceTimeout);
                    window.deviceTimeout = setTimeout(() => {
                        setIsDeviceOnline(false);
                        activeAlertsRef.current = { pm25: false, gas: false, temp: false, humidity: false };
                    }, 10000);

                    const t = thresholdsRef.current;

                    const currentWarnings = {
                        pm25: newDataPoint.pm25 > t.pm25,
                        gas: newDataPoint.gas > t.gas,
                        temp: newDataPoint.temp > t.tempMax || newDataPoint.temp < t.tempMin,
                        humidity: newDataPoint.humidity > t.humMax || newDataPoint.humidity < t.humMin
                    };

                    Object.keys(currentWarnings).forEach(key => {
                        if (currentWarnings[key] && !activeAlertsRef.current[key]) {
                            fetch('/api/alerts', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ sensor: key, value: newDataPoint[key] })
                            });
                        }
                        activeAlertsRef.current[key] = currentWarnings[key];
                    });
                } catch (e) { console.error(e); }
            } else if (topic === 'sensor/airmonitor/settings') {
                try {
                    const newSettings = JSON.parse(message.toString());
                    setThresholds(newSettings);
                    setDraftThresholds(newSettings);
                } catch (e) { console.error(e); }
            }
        });

        client.on('close', () => setIsMqttConnected(false));
        return () => {
            client.end();
            clearTimeout(window.deviceTimeout);
        };
    }, []);

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const executeSync = async () => {
        if (mqttClient && isMqttConnected) {
            const sanitizedThresholds = {
                pm25: draftThresholds.pm25 === '' ? 50 : draftThresholds.pm25,
                gas: draftThresholds.gas === '' ? 70 : draftThresholds.gas,
                tempMax: draftThresholds.tempMax === '' ? 35 : draftThresholds.tempMax,
                tempMin: draftThresholds.tempMin === '' ? 18 : draftThresholds.tempMin,
                humMax: draftThresholds.humMax === '' ? 70 : draftThresholds.humMax,
                humMin: draftThresholds.humMin === '' ? 30 : draftThresholds.humMin,
                buzzerEnabled: draftThresholds.buzzerEnabled
            };

            setIsSyncModalOpen(false);
            setShowSettings(false);

            setThresholds(sanitizedThresholds);
            setDraftThresholds(sanitizedThresholds);
            mqttClient.publish('sensor/airmonitor/settings', JSON.stringify(sanitizedThresholds));

            showToast("Syncing to hardware & DB...");

            try {
                await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(sanitizedThresholds)
                });
            } catch (error) {
                console.error("DB Error:", error);
            }
        } else {
            setIsSyncModalOpen(false);
            showToast("Error: No MQTT connection.");
        }
    };

    const exportCSV = () => {
        if (fullHistory.length === 0) return showToast("No data.");
        const headers = "Timestamp,Time,PM2.5,Gas %,Temperature,Humidity\n";
        const rows = fullHistory.map(row => `${row.rawDate},${row.time},${row.pm25},${row.gas},${row.temp},${row.humidity}\n`);
        const csvContent = "data:text/csv;charset=utf-8," + headers + rows.join("");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `log_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const sensors = [
        { id: 'pm25', name: 'PM2.5', value: sensorData.pm25, unit: 'µg/m³', icon: Wind, color: isDark ? '#4ade80' : '#22c55e', isWarning: isDeviceOnline && (sensorData.pm25 > thresholds.pm25) },
        { id: 'gas', name: 'Gas Level', value: sensorData.gas, unit: '%', icon: CloudFog, color: isDark ? '#f87171' : '#ef4444', isWarning: isDeviceOnline && (sensorData.gas > thresholds.gas) },
        { id: 'temp', name: 'Temperature', value: sensorData.temp, unit: '°C', icon: Thermometer, color: isDark ? '#fb923c' : '#f97316', isWarning: isDeviceOnline && (sensorData.temp > thresholds.tempMax || sensorData.temp < thresholds.tempMin) },
        { id: 'humidity', name: 'Humidity', value: sensorData.humidity, unit: '%', icon: Droplets, color: isDark ? '#60a5fa' : '#3b82f6', isWarning: isDeviceOnline && (sensorData.humidity > thresholds.humMax || sensorData.humidity < thresholds.humMin) },
    ];

    const isSystemCritical = sensors.some(s => s.isWarning);

    const bgClass = isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-gray-50 text-gray-900';
    const cardClass = isDark ? 'bg-black border-neutral-800' : 'bg-white border-gray-200';
    const textMutedClass = isDark ? 'text-neutral-500' : 'text-gray-500';
    const borderClass = isDark ? 'border-neutral-800' : 'border-gray-200';

    if (isLoadingSettings) return <div className={`h-screen w-screen flex items-center justify-center font-bold tracking-widest text-xs uppercase ${bgClass}`}>Initializing...</div>;

    return (
        <div className={`min-h-screen w-screen overflow-hidden p-2 md:p-4 font-sans rounded-none transition-colors duration-300 flex flex-col ${bgClass} relative`}>

            {toastMessage && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className={`flex items-center gap-2 px-4 py-2 font-bold text-[10px] uppercase tracking-widest border shadow-xl ${isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-gray-300 text-black'}`}>
                        <Check size={12} className="text-green-500" />
                        {toastMessage}
                    </div>
                </div>
            )}

            {isSyncModalOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className={`w-80 p-4 border shadow-2xl ${isDark ? 'bg-[#0a0a0a] border-neutral-800 text-white' : 'bg-white border-gray-300 text-black'}`}>
                        <h3 className="text-sm font-bold mb-1 uppercase tracking-widest">Confirm Sync?</h3>
                        <p className={`mb-4 text-[10px] ${textMutedClass}`}>Overwrite hardware and database limits.</p>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsSyncModalOpen(false)} className={`px-3 py-1.5 font-bold text-[10px] uppercase tracking-widest border ${isDark ? 'bg-[#262626] border-[#404040]' : 'bg-gray-100 border-gray-300'}`}>Cancel</button>
                            <button onClick={executeSync} className={`px-3 py-1.5 font-bold text-[10px] uppercase tracking-widest ${isDark ? 'bg-white text-black' : 'bg-black text-white'}`}>Deploy</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col max-w-[1400px] mx-auto w-full gap-2">

                {/* COMPACT HEADER */}
                <header className={`flex items-center justify-between border-b pb-2 ${borderClass} shrink-0`}>
                    <div className="flex items-baseline gap-2">
                        <h1 className="text-xl md:text-2xl font-black tracking-tighter uppercase">Air Monitor <span className={isDark ? "text-neutral-600" : "text-gray-400"}>PRO</span></h1>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setIsDark(!isDark)} className={`p-1.5 border transition-colors ${isDark ? 'bg-black border-neutral-700 text-yellow-500' : 'bg-white border-gray-300 text-gray-800'}`}>
                            {isDark ? <Sun size={14} /> : <Moon size={14} />}
                        </button>
                        <button onClick={exportCSV} className={`p-1.5 border transition-colors ${isDark ? 'bg-black border-neutral-700 text-neutral-300' : 'bg-white border-gray-300 text-gray-700'}`}>
                            <Download size={14} />
                        </button>
                        <button onClick={() => { setShowSettings(!showSettings); setDraftThresholds(thresholds); }} className={`p-1.5 border transition-colors ${isDark ? 'bg-neutral-200 text-black border-neutral-200' : 'bg-black text-white border-black'}`}>
                            {showSettings ? <X size={14} /> : <Settings size={14} />}
                        </button>
                    </div>
                </header>

                {/* SLIDING SETTINGS PANEL */}
                {showSettings && (
                    <div className={`p-3 border shrink-0 animate-in slide-in-from-top-2 ${cardClass}`}>
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold uppercase tracking-widest">Hardware Buzzer</span>
                                <button onClick={() => setDraftThresholds({ ...draftThresholds, buzzerEnabled: !draftThresholds.buzzerEnabled })} className={`relative flex items-center w-8 h-4 border ${draftThresholds.buzzerEnabled ? (isDark ? 'bg-green-600 border-green-500' : 'bg-green-500 border-green-600') : (isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-gray-300 border-gray-400')}`}>
                                    <div className={`absolute w-3 h-3 bg-white transition-transform ${draftThresholds.buzzerEnabled ? 'translate-x-4' : 'translate-x-0.5'}`}></div>
                                </button>
                            </div>
                            <button onClick={() => setIsSyncModalOpen(true)} className={`flex items-center gap-1 px-3 py-1.5 font-bold text-[9px] uppercase tracking-widest ${isDark ? 'bg-neutral-200 text-black' : 'bg-black text-white'}`}>
                                <Send size={10} /> Push config
                            </button>
                        </div>
                        <div className="flex gap-2">
                            {[
                                { title: 'Air', inputs: [{ label: 'PM2.5', key: 'pm25' }, { label: 'Gas %', key: 'gas' }] },
                                { title: 'Temp °C', inputs: [{ label: 'Min', key: 'tempMin' }, { label: 'Max', key: 'tempMax' }] },
                                { title: 'Hum %', inputs: [{ label: 'Min', key: 'humMin' }, { label: 'Max', key: 'humMax' }] },
                            ].map((section, idx) => (
                                <div key={idx} className={`flex-1 p-2 border flex items-center justify-between ${isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-gray-50 border-gray-200'}`}>
                                    <label className={`text-[9px] font-black uppercase ${textMutedClass}`}>{section.title}</label>
                                    <div className="flex flex-col-reverse gap-2">
                                        {section.inputs.map((input, i) => (
                                            <div key={i} className="flex items-center gap-1">
                                                <span className="text-[9px] font-bold">{input.label}</span>
                                                <input type="number" value={draftThresholds[input.key] === '' ? '' : Number(draftThresholds[input.key]).toString()} onChange={(e) => setDraftThresholds({ ...draftThresholds, [input.key]: e.target.value === '' ? '' : Number(e.target.value) })} className={`w-12 p-0.5 text-[10px] border text-center font-mono ${isDark ? 'bg-black border-neutral-700' : 'bg-white border-gray-400'}`} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* COMPACT STATUS BAR */}
                <div className="grid grid-cols-12 gap-2 shrink-0">
                    <div className={`col-span-3 flex items-center justify-center gap-1.5 p-1.5 border flex-1 ${isMqttConnected ? (isDark ? 'bg-green-950/40 border-green-900 text-green-500' : 'bg-green-50 border-green-300 text-green-800') : (isDark ? 'bg-red-950/40 border-red-900 text-red-500' : 'bg-red-50 border-red-300 text-red-800')}`}>
                        <Link size={10} />
                        <span className="text-[9px] font-black tracking-widest uppercase">{isMqttConnected ? 'MQTT: OK' : 'MQTT: DROP'}</span>
                    </div>
                    {/* CHANGED: This section now evaluates the signal quality text dynamically */}
                    <div className={`col-span-3 flex items-center justify-center gap-1.5 p-1.5 border flex-1 ${isDeviceOnline ? (isDark ? 'bg-blue-950/40 border-blue-900 text-blue-500' : 'bg-blue-50 border-blue-300 text-blue-800') : (isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-500' : 'bg-gray-100 border-gray-300 text-gray-500')}`}>
                        {isDeviceOnline ? <Wifi size={10} /> : <Cpu size={10} />}
                        <span className="text-[9px] font-black tracking-widest uppercase">
                            {isDeviceOnline ? `HARDWARE WIFI: ${sensorData.rssi} dBm [${getWifiStatus(sensorData.rssi)}]` : 'NODE: WAIT'}
                        </span>
                    </div>
                    <div className={`col-span-6 flex items-center justify-center gap-1.5 p-1.5 border flex-[1.5] ${!isDeviceOnline ? (isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-400' : 'bg-gray-100 border-gray-300 text-gray-500') : isSystemCritical ? 'bg-red-600 border-red-800 text-white animate-pulse' : (isDark ? 'bg-green-600 border-green-800 text-white' : 'bg-green-500 border-green-700 text-white')}`}>
                        {!isDeviceOnline ? <Clock size={10} /> : isSystemCritical ? <AlertTriangle size={10} /> : <CheckSquare size={10} />}
                        <span className="text-[9px] font-black tracking-widest uppercase">{!isDeviceOnline ? 'STANDBY' : isSystemCritical ? 'CRITICAL ALARM' : 'OPTIMAL'}</span>
                    </div>
                </div>

                {/* SENSOR GRID - Takes remaining height */}
                <div className="grid grid-cols-6 lg:grid-cols-12 gap-2">
                    {sensors.map((sensor) => {
                        const sData = stats[sensor.id];
                        const avg = sData.count > 0 ? (sData.sum / sData.count).toFixed(1) : '--';
                        const min = sData.min === Infinity ? '--' : sData.min.toFixed(1);
                        const max = sData.max === -Infinity ? '--' : sData.max.toFixed(1);

                        const isWarn = sensor.isWarning;
                        const cardStyle = isWarn ? (isDark ? 'bg-red-950/20 border-red-900' : 'bg-red-50/50 border-red-400') : cardClass;
                        const iconBg = isWarn ? 'animate-pulse bg-red-600 border-red-700 text-white' : (isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-300' : 'bg-gray-50 border-gray-200 text-gray-700');
                        const valueColor = isWarn ? 'animate-pulse text-red-500' : (isDark ? 'text-white' : 'text-black');

                        return (
                            <div key={sensor.id} className={`col-span-3 h-fit p-2 border ${cardStyle}`}>
                                {/* Card Header */}
                                <div className="flex justify-between items-start shrink-0">
                                    <div className="flex items-center md:gap-4 gap-2">
                                        <div className={`p-1.5 border ${iconBg}`}>
                                            <sensor.icon size={16} />
                                        </div>
                                        <p className={`text-[8px] md:text-sm font-black uppercase tracking-widest leading-none ${textMutedClass}`}>{sensor.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-baseline justify-end gap-0.5">
                                            <span className={`text-2xl font-black tracking-tighter leading-none ${valueColor}`}>{sensor.value}</span>
                                            <span className={`text-[8px] font-bold uppercase ${textMutedClass}`}>{sensor.unit}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Graph Area */}
                                <div className="flex-1 min-h-0 flex flex-col justify-end">
                                    <SensorGraph data={history} dataKey={sensor.id === 'temp' ? 'temp' : sensor.id} color={isWarn ? '#ef4444' : sensor.color} label="" thresholds={thresholds} id={sensor.id} isDark={isDark} />
                                </div>

                                {/* Mini Stats Footer */}
                                <div className={`grid grid-cols-3 gap-1 pt-1 shrink-0 ${borderClass}`}>
                                    <div className={`p-0.5 text-center border ${isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-gray-50 border-gray-100'}`}>
                                        <p className={`text-[7px] font-black uppercase ${textMutedClass}`}>Min</p>
                                        <p className={`text-[9px] font-mono font-bold leading-none ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>{min}</p>
                                    </div>
                                    <div className={`p-0.5 text-center border ${isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-gray-50 border-gray-100'}`}>
                                        <p className={`text-[7px] font-black uppercase ${textMutedClass}`}>Avg</p>
                                        <p className={`text-[9px] font-mono font-bold leading-none ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>{avg}</p>
                                    </div>
                                    <div className={`p-0.5 text-center border ${isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-gray-50 border-gray-100'}`}>
                                        <p className={`text-[7px] font-black uppercase ${textMutedClass}`}>Max</p>
                                        <p className={`text-[9px] font-mono font-bold leading-none ${isDark ? 'text-red-400' : 'text-red-600'}`}>{max}</p>
                                    </div>
                                </div>
                            </div>

                        );
                    })}
                    <div className="col-span-6"><AlertLog isDark={isDark} /></div>
                    <div className="col-span-6 h-full">
                        <AnalyticsPanel isDark={isDark} />
                    </div>
                </div>

            </div>
        </div>
    );
}