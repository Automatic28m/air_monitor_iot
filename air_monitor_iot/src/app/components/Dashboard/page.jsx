"use client";

import { useState, useEffect } from 'react';
import { Wind, Thermometer, Droplets, CloudFog, Settings, X, Send, Activity, Link, Cpu, Download, AlertTriangle, CheckSquare, Sun, Moon, Check } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import mqtt from 'mqtt';

const SensorGraph = ({ data, dataKey, color, label, thresholds, id, isDark }) => {
    const showMin = id === 'temp' || id === 'humidity';
    const minVal = id === 'temp' ? thresholds.tempMin : thresholds.humMin;
    const maxVal = id === 'pm25' ? thresholds.pm25 : id === 'gas' ? thresholds.gas : id === 'temp' ? thresholds.tempMax : thresholds.humMax;

    const yDomain = [
        (dataMin) => showMin ? Math.min(dataMin, minVal - 5) : Math.min(dataMin, 0),
        (dataMax) => Math.max(dataMax, maxVal + (maxVal * 0.15))
    ];

    const gridColor = isDark ? '#262626' : '#f0f0f0';
    const textColor = isDark ? '#a3a3a3' : '#64748b';
    const tooltipBg = isDark ? '#0a0a0a' : '#ffffff';
    const tooltipBorder = isDark ? '#262626' : '#e5e7eb';

    return (
        <div className={`h-56 w-full p-2 border mt-6 ${isDark ? 'bg-black border-neutral-800' : 'bg-white border-gray-200'}`}>
            <p className={`text-xs font-bold mb-2 px-2 flex items-center gap-1 uppercase tracking-widest ${isDark ? 'text-neutral-400' : 'text-gray-400'}`}>
                <Activity size={12} /> {label} Timeline
            </p>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 15, right: 30, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />

                    <XAxis
                        dataKey="time"
                        stroke={textColor}
                        fontSize={10}
                        tickMargin={8}
                        minTickGap={20}
                        // Format time to hide seconds on the axis for a cleaner look
                        tickFormatter={(timeStr) => {
                            if (!timeStr) return '';
                            const parts = timeStr.split(':');
                            return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : timeStr;
                        }}
                    />

                    <YAxis domain={yDomain} fontSize={10} tickCount={5} stroke={textColor} />
                    <Tooltip
                        contentStyle={{ borderRadius: '0px', border: `1px solid ${tooltipBorder}`, boxShadow: 'none', backgroundColor: tooltipBg, color: textColor }}
                        labelStyle={{ display: 'none' }}
                    />

                    {/* CHANGED: Added dynamic value to the MAX label */}
                    <ReferenceLine y={maxVal} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 5" label={{ position: 'top', value: `MAX: ${maxVal}`, fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />

                    {/* CHANGED: Added dynamic value to the MIN label */}
                    {showMin && <ReferenceLine y={minVal} stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 5" label={{ position: 'bottom', value: `MIN: ${minVal}`, fill: '#3b82f6', fontSize: 10, fontWeight: 'bold' }} />}

                    <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={false} isAnimationActive={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default function Dashboard() {
    const [isDark, setIsDark] = useState(false);
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);

    const [thresholds, setThresholds] = useState({ pm25: 50, gas: 70, tempMax: 35, tempMin: 18, humMax: 70, humMin: 30 });
    const [draftThresholds, setDraftThresholds] = useState({ ...thresholds });
    const [showSettings, setShowSettings] = useState(false);

    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);

    const [isMqttConnected, setIsMqttConnected] = useState(false);
    const [isDeviceOnline, setIsDeviceOnline] = useState(false);
    const [sensorData, setSensorData] = useState({ pm25: 0, gas: 0, temp: 0, humidity: 0 });

    const [history, setHistory] = useState([]);
    const [fullHistory, setFullHistory] = useState([]);

    const initStat = { min: Infinity, max: -Infinity, sum: 0, count: 0 };
    const [stats, setStats] = useState({ pm25: { ...initStat }, gas: { ...initStat }, temp: { ...initStat }, humidity: { ...initStat } });

    const [mqttClient, setMqttClient] = useState(null);

    // FETCH SETTINGS FROM MONGODB ON MOUNT
    useEffect(() => {
        const fetchInitialSettings = async () => {
            try {
                const res = await fetch('/api/settings');
                if (res.ok) {
                    const dbSettings = await res.json();
                    const cleanSettings = {
                        pm25: dbSettings.pm25, gas: dbSettings.gas, tempMax: dbSettings.tempMax,
                        tempMin: dbSettings.tempMin, humMax: dbSettings.humMax, humMin: dbSettings.humMin
                    };
                    setThresholds(cleanSettings);
                    setDraftThresholds(cleanSettings);
                }
            } catch (error) {
                console.error("Failed to load settings from DB", error);
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
                        time: timeStr, rawDate: new Date().toISOString()
                    };

                    setSensorData({ pm25: newDataPoint.pm25, gas: newDataPoint.gas, temp: newDataPoint.temp, humidity: newDataPoint.humidity });
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
                    window.deviceTimeout = setTimeout(() => setIsDeviceOnline(false), 10000);
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
            };

            setIsSyncModalOpen(false);

            setThresholds(sanitizedThresholds);
            setDraftThresholds(sanitizedThresholds);
            mqttClient.publish('sensor/airmonitor/settings', JSON.stringify(sanitizedThresholds));

            showToast("Settings sent to ESP32! Saving to database...");

            try {
                const res = await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(sanitizedThresholds)
                });

                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
            } catch (error) {
                console.error("Database Save Error:", error);
                showToast("⚠️ Hardware updated, but database save failed! Check MongoDB settings.");
            }

        } else {
            setIsSyncModalOpen(false);
            showToast("Error: Not connected to MQTT broker!");
        }
    };

    const exportCSV = () => {
        if (fullHistory.length === 0) return showToast("No data to export yet.");
        const headers = "Timestamp,Time,PM2.5,Gas %,Temperature,Humidity\n";
        const rows = fullHistory.map(row => `${row.rawDate},${row.time},${row.pm25},${row.gas},${row.temp},${row.humidity}\n`);
        const csvContent = "data:text/csv;charset=utf-8," + headers + rows.join("");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `air_monitor_log_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("CSV Exported successfully.");
    };

    const sensors = [
        { id: 'pm25', name: 'PM2.5', value: sensorData.pm25, unit: 'µg/m³', icon: Wind, color: isDark ? '#4ade80' : '#22c55e', isWarning: sensorData.pm25 > thresholds.pm25 },
        { id: 'gas', name: 'Gas Level', value: sensorData.gas, unit: '%', icon: CloudFog, color: isDark ? '#f87171' : '#ef4444', isWarning: sensorData.gas > thresholds.gas },
        { id: 'temp', name: 'Temperature', value: sensorData.temp, unit: '°C', icon: Thermometer, color: isDark ? '#fb923c' : '#f97316', isWarning: sensorData.temp > thresholds.tempMax || sensorData.temp < thresholds.tempMin },
        { id: 'humidity', name: 'Humidity', value: sensorData.humidity, unit: '%', icon: Droplets, color: isDark ? '#60a5fa' : '#3b82f6', isWarning: sensorData.humidity > thresholds.humMax || sensorData.humidity < thresholds.humMin },
    ];

    const isSystemCritical = sensors.some(s => s.isWarning);

    const bgClass = isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-gray-50 text-gray-900';
    const cardClass = isDark ? 'bg-black border-neutral-800' : 'bg-white border-gray-200';
    const textMutedClass = isDark ? 'text-neutral-400' : 'text-gray-500';
    const borderClass = isDark ? 'border-neutral-800' : 'border-gray-200';

    if (isLoadingSettings) {
        return <div className={`min-h-screen flex items-center justify-center font-bold tracking-widest uppercase ${bgClass}`}>Loading Database...</div>
    }

    return (
        <div className={`min-h-screen p-6 md:p-12 font-sans rounded-none transition-colors duration-300 ${bgClass} relative`}>

            {toastMessage && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border shadow-xl ${isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-gray-300 text-black'}`}>
                        <Check size={16} className="text-green-500" />
                        {toastMessage}
                    </div>
                </div>
            )}

            {isSyncModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className={`w-full max-w-md p-6 border shadow-2xl animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#0a0a0a] border-neutral-800 text-white' : 'bg-white border-gray-300 text-black'}`}>
                        <h3 className="text-xl font-bold mb-2">Are you absolutely sure?</h3>
                        <p className={`mb-6 text-sm font-medium ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>
                            This action cannot be undone. This will permanently push the new thresholds to your ESP32 hardware and overwrite the current safety limits in the database.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsSyncModalOpen(false)}
                                className={`px-4 py-2 font-bold text-sm border transition-colors ${isDark ? 'bg-[#262626] border-[#404040] text-white hover:bg-[#333333]' : 'bg-gray-100 border-gray-300 text-black hover:bg-gray-200'}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeSync}
                                className={`px-4 py-2 font-bold text-sm transition-colors ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="mx-auto max-w-7xl rounded-none">
                <header className={`mb-8 flex flex-col md:flex-row items-start md:items-center justify-between border-b-2 pb-6 rounded-none gap-4 md:gap-0 ${borderClass}`}>
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter uppercase">Air Monitor <span className={isDark ? "text-neutral-500" : "text-gray-400"}>PRO</span></h1>
                        <p className={`font-bold uppercase tracking-widest text-xs mt-1 ${textMutedClass}`}>Industrial Telemetry Dashboard</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsDark(!isDark)}
                            className={`p-3 border-2 transition-colors ${isDark ? 'bg-black border-neutral-700 text-yellow-500 hover:bg-neutral-900' : 'bg-white border-gray-300 text-gray-800 hover:bg-gray-100'}`}
                            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        >
                            {isDark ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        <button onClick={exportCSV} className={`flex items-center gap-2 p-3 border-2 transition-colors font-bold text-sm uppercase tracking-widest ${isDark ? 'bg-black border-neutral-700 text-neutral-200 hover:bg-neutral-900' : 'bg-white border-gray-300 hover:bg-gray-100 text-gray-700'}`}>
                            <Download size={18} /> Export CSV
                        </button>

                        <button onClick={() => {
                            setShowSettings(!showSettings);
                            setDraftThresholds(thresholds);
                        }} className={`p-3 border-2 transition-colors ${isDark ? 'bg-neutral-200 text-black border-neutral-200 hover:bg-white' : 'bg-black text-white border-black hover:bg-gray-800'}`}>
                            {showSettings ? <X size={20} /> : <Settings size={20} />}
                        </button>
                    </div>
                </header>

                {showSettings && (
                    <div className={`mb-8 p-8 border-2 ${cardClass}`}>
                        <div className={`flex flex-col md:flex-row md:justify-between mb-8 border-b pb-4 gap-4 ${borderClass}`}>
                            <h2 className="text-xl font-black uppercase tracking-widest">Parameter Configuration</h2>
                            <button onClick={() => setIsSyncModalOpen(true)} className={`flex items-center gap-2 px-6 py-3 font-bold uppercase tracking-widest text-sm transition-colors ${isDark ? 'bg-neutral-200 text-black hover:bg-white' : 'bg-black text-white hover:bg-gray-800'}`}>
                                <Send size={16} /> Sync to Hardware
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { title: 'Air Quality Limits', inputs: [{ label: 'PM2.5 Max', key: 'pm25' }, { label: 'Gas Max (%)', key: 'gas' }] },
                                { title: 'Temp Range (°C)', inputs: [{ label: 'Minimum', key: 'tempMin' }, { label: 'Maximum', key: 'tempMax' }] },
                                { title: 'Humidity Range (%)', inputs: [{ label: 'Minimum', key: 'humMin' }, { label: 'Maximum', key: 'humMax' }] },
                            ].map((section, idx) => (
                                <div key={idx} className={`space-y-4 p-5 border ${isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-gray-50 border-gray-200'}`}>
                                    <label className={`text-xs font-black uppercase tracking-widest ${textMutedClass}`}>{section.title}</label>
                                    <div className="space-y-3">
                                        {section.inputs.map((input, i) => (
                                            <div key={i} className="flex justify-between items-center">
                                                <span className="text-sm font-bold">{input.label}</span>
                                                <input
                                                    type="number"
                                                    value={draftThresholds[input.key] === '' ? '' : Number(draftThresholds[input.key]).toString()}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setDraftThresholds({
                                                            ...draftThresholds,
                                                            [input.key]: val === '' ? '' : Number(val)
                                                        });
                                                    }}
                                                    className={`w-24 p-2 border font-bold text-center outline-none focus:ring-2 focus:ring-neutral-500 ${isDark ? 'bg-black border-neutral-700 text-white' : 'bg-white border-gray-400 text-black'}`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mb-6 grid grid-cols-1 lg:grid-cols-12 justify-between items-stretch gap-4 rounded-none">
                    <div className="col-span-1 lg:col-span-8 gap-4 flex flex-col md:flex-row">
                        <div className={`flex items-center gap-3 p-3 border transition-all flex-1 ${isMqttConnected ? (isDark ? 'bg-green-950/40 border-green-900 text-green-500' : 'bg-green-50 border-green-300 text-green-800') : (isDark ? 'bg-red-950/40 border-red-900 text-red-500' : 'bg-red-50 border-red-300 text-red-800')}`}>
                            <div className={`p-2 ${isMqttConnected ? (isDark ? 'bg-green-600' : 'bg-green-600') : (isDark ? 'bg-red-600' : 'bg-red-600')} text-white`}><Link size={18} /></div>
                            <div>
                                <p className={`text-[10px] uppercase font-black tracking-widest ${isDark ? 'opacity-80' : 'opacity-60'}`}>MQTT Broker</p>
                                <p className="text-sm font-bold">{isMqttConnected ? 'CONNECTED' : 'DISCONNECTED'}</p>
                            </div>
                        </div>
                        <div className={`flex items-center gap-3 p-3 border transition-all flex-1 ${isDeviceOnline ? (isDark ? 'bg-blue-950/40 border-blue-900 text-blue-500' : 'bg-blue-50 border-blue-300 text-blue-800') : (isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-500' : 'bg-gray-100 border-gray-300 text-gray-500')}`}>
                            <div className={`p-2 ${isDeviceOnline ? 'bg-blue-600' : 'bg-gray-500'} text-white`}><Cpu size={18} /></div>
                            <div>
                                <p className={`text-[10px] uppercase font-black tracking-widest ${isDark ? 'opacity-80' : 'opacity-60'}`}>Hardware Node</p>
                                <p className="text-sm font-bold">{isDeviceOnline ? 'ONLINE' : 'OFFLINE'}</p>
                            </div>
                        </div>
                    </div>

                    <div className={`col-span-1 lg:col-span-4 items-center gap-4 p-4 border-2 flex flex-1 justify-center transition-colors ${isSystemCritical ? 'bg-red-600 border-red-800 text-white' : (isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-neutral-800 border-neutral-900 text-white')}`}>
                        {isSystemCritical ? <AlertTriangle size={28} /> : <CheckSquare size={28} />}
                        <div>
                            <p className="text-[10px] uppercase font-black tracking-widest opacity-80">Overall Status</p>
                            <p className="text-xl font-black tracking-widest">{isSystemCritical ? 'CRITICAL ALARM' : 'OPTIMAL'}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 rounded-none">
                    {sensors.map((sensor) => {
                        const sData = stats[sensor.id];
                        const avg = sData.count > 0 ? (sData.sum / sData.count).toFixed(1) : '--';
                        const min = sData.min === Infinity ? '--' : sData.min.toFixed(1);
                        const max = sData.max === -Infinity ? '--' : sData.max.toFixed(1);

                        let currentCardClass = '';
                        if (sensor.isWarning) {
                            currentCardClass = isDark ? 'bg-red-950/30 border-red-900' : 'bg-red-50/30 border-red-600';
                        } else {
                            currentCardClass = cardClass;
                        }

                        return (
                            <div key={sensor.id} className={`col-span-1 lg:col-span-6 p-6 border-2 transition-colors duration-200 ${currentCardClass}`}>

                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-4 border-2 ${sensor.isWarning ? 'bg-red-600 border-red-700 text-white' : (isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-300' : 'bg-gray-50 border-gray-200 text-gray-800')}`}>
                                        <sensor.icon size={36} />
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-xs font-black uppercase tracking-widest mb-1 ${textMutedClass}`}>{sensor.name}</p>
                                        <div className="flex items-baseline justify-end gap-2">
                                            <span className={`text-6xl font-black tracking-tighter ${sensor.isWarning ? 'text-red-500' : (isDark ? 'text-white' : 'text-gray-900')}`}>{sensor.value}</span>
                                            <span className={`text-sm font-bold uppercase ${textMutedClass}`}>{sensor.unit}</span>
                                        </div>
                                    </div>
                                </div>

                                <SensorGraph data={history} dataKey={sensor.id === 'temp' ? 'temp' : sensor.id} color={sensor.isWarning ? '#ef4444' : sensor.color} label={sensor.name} thresholds={thresholds} id={sensor.id} isDark={isDark} />

                                <div className={`mt-6 pt-4 border-t-2 border-dashed grid grid-cols-3 gap-4 text-center ${borderClass}`}>
                                    <div className={`p-2 border ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-gray-50 border-gray-200'}`}>
                                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${textMutedClass}`}>Session Min</p>
                                        <p className={`font-mono font-bold ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>{min}</p>
                                    </div>
                                    <div className={`p-2 border ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-gray-50 border-gray-200'}`}>
                                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${textMutedClass}`}>Session Avg</p>
                                        <p className={`font-mono font-bold ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>{avg}</p>
                                    </div>
                                    <div className={`p-2 border ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-gray-50 border-gray-200'}`}>
                                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${textMutedClass}`}>Session Max</p>
                                        <p className={`font-mono font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>{max}</p>
                                    </div>
                                </div>

                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}