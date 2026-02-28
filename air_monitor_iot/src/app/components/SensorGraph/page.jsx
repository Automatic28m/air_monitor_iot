import { useState, useEffect } from 'react';
import { Wind, Thermometer, Droplets, CloudFog, Settings, X, Send, Activity, Link, Cpu, Download, AlertTriangle, CheckSquare, Sun, Moon, Check, Clock, Volume2, VolumeX } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import mqtt from 'mqtt';

export const SensorGraph = ({ data, dataKey, color, label, thresholds, id, isDark }) => {
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
        <div className={`h-28 w-full p-1 border mt-2 ${isDark ? 'bg-black border-neutral-800' : 'bg-white border-gray-200'}`}>
            <p className={`text-[9px] font-bold mb-1 px-1 flex items-center gap-1 uppercase tracking-widest ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>
                <Activity size={10} /> {label}
            </p>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 25, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                    <XAxis
                        dataKey="time"
                        stroke={textColor}
                        fontSize={8}
                        tickMargin={4}
                        minTickGap={15}
                    />
                    <YAxis domain={yDomain} fontSize={8} tickCount={3} stroke={textColor} />
                    <Tooltip
                        contentStyle={{ borderRadius: '0px', border: `1px solid ${tooltipBorder}`, boxShadow: 'none', backgroundColor: tooltipBg, color: textColor, padding: '4px' }}
                        labelStyle={{ display: 'none' }}
                        itemStyle={{ fontSize: '10px' }}
                    />
                    <ReferenceLine y={maxVal} stroke="#ef4444" strokeWidth={1} strokeDasharray="3 3" label={{ position: 'top', value: `MAX:${maxVal}`, fill: '#ef4444', fontSize: 8, fontWeight: 'bold' }} />
                    {showMin && <ReferenceLine y={minVal} stroke="#3b82f6" strokeWidth={1} strokeDasharray="3 3" label={{ position: 'bottom', value: `MIN:${minVal}`, fill: '#3b82f6', fontSize: 8, fontWeight: 'bold' }} />}
                    <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};