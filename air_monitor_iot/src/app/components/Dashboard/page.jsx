"use client";

import { useState } from 'react';
import { Wind, Thermometer, Droplets, CloudFog, Settings, X } from 'lucide-react';

export default function Dashboard() {
    // 1. State for threshold settings
    const [thresholds, setThresholds] = useState({
        pm25: 35,     // µg/m³
        co2: 1000,    // ppm
        temp: 30,     // °C
        humidity: 60, // %
    });

    // 2. State to toggle settings panel visibility
    const [showSettings, setShowSettings] = useState(false);

    // 3. Simulated sensor data (hardcoded for now, but evaluated dynamically)
    const sensors = [
        {
            id: 'pm25',
            name: 'PM2.5',
            value: 12,
            unit: 'µg/m³',
            icon: Wind,
            threshold: thresholds.pm25,
        },
        {
            id: 'co2',
            name: 'CO2 Level',
            value: 1050, // Setting this high so you can see the "Warning" state by default
            unit: 'ppm',
            icon: CloudFog,
            threshold: thresholds.co2,
        },
        {
            id: 'temp',
            name: 'Temperature',
            value: 24.5,
            unit: '°C',
            icon: Thermometer,
            threshold: thresholds.temp,
        },
        {
            id: 'humidity',
            name: 'Humidity',
            value: 45,
            unit: '%',
            icon: Droplets,
            threshold: thresholds.humidity,
        },
    ];

    // Handler for updating thresholds
    const handleThresholdChange = (e, id) => {
        setThresholds({
            ...thresholds,
            [id]: Number(e.target.value),
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
            <div className="max-w-4xl mx-auto">

                {/* Header */}
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Air Monitor</h1>
                        <p className="text-gray-500 mt-1">Live environmental sensor readings</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            System Online
                        </div>
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100 transition-colors"
                            title="Settings"
                        >
                            {showSettings ? <X size={20} className="text-gray-600" /> : <Settings size={20} className="text-gray-600" />}
                        </button>
                    </div>
                </header>

                {/* Settings Panel */}
                {showSettings && (
                    <div className="mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all">
                        <h2 className="text-lg font-semibold mb-4">Warning Thresholds</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {sensors.map((sensor) => (
                                <div key={`setting-${sensor.id}`}>
                                    <label className="block text-sm text-gray-500 mb-1">{sensor.name} Max ({sensor.unit})</label>
                                    <input
                                        type="number"
                                        value={thresholds[sensor.id]}
                                        onChange={(e) => handleThresholdChange(e, sensor.id)}
                                        className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Sensor Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {sensors.map((sensor) => {
                        const Icon = sensor.icon;
                        // Dynamically determine status based on threshold
                        const isWarning = sensor.value > sensor.threshold;
                        const statusText = isWarning ? 'Warning' : 'Good';
                        const colorClass = isWarning ? 'text-red-500' : 'text-green-500';
                        const bgClass = isWarning ? 'bg-red-50' : 'bg-gray-50';

                        return (
                            <div
                                key={sensor.id}
                                className={`bg-white p-6 rounded-2xl shadow-sm border transition-shadow ${isWarning ? 'border-red-200 shadow-red-50' : 'border-gray-100 hover:shadow-md'}`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-lg ${bgClass} ${colorClass}`}>
                                        <Icon size={24} />
                                    </div>
                                    <span className={`text-sm font-medium ${isWarning ? 'text-red-500' : 'text-gray-400'}`}>
                                        {statusText}
                                    </span>
                                </div>

                                <div>
                                    <h2 className="text-gray-500 text-sm font-medium">{sensor.name}</h2>
                                    <div className="flex items-baseline gap-1 mt-1">
                                        <span className={`text-4xl font-semibold tracking-tight ${isWarning ? 'text-red-600' : 'text-gray-900'}`}>
                                            {sensor.value}
                                        </span>
                                        <span className="text-gray-400 font-medium">
                                            {sensor.unit}
                                        </span>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-400">
                                        Threshold limit: {sensor.threshold} {sensor.unit}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer info */}
                <div className="mt-8 text-center text-sm text-gray-400">
                    Last updated: {new Date().toLocaleTimeString()}
                </div>

            </div>
        </div>
    );
}