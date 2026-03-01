"use client";

import { useState, useEffect } from 'react';
import { AlertOctagon, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SlidingNumber } from '@/components/animate-ui/primitives/texts/sliding-number';


export const AnalyticsPanel = ({ isDark }) => {
    const [stats, setStats] = useState({ todayCount: 0, history: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/alerts/stats');
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (err) { console.error("Failed to fetch analytics"); }
            setLoading(false);
        };

        fetchStats();
        // Auto-refresh the chart
        const interval = setInterval(fetchStats, 10000);
        return () => clearInterval(interval);
    }, []);

    const gridColor = isDark ? '#262626' : '#f0f0f0';
    const textColor = isDark ? '#a3a3a3' : '#64748b';
    const tooltipBg = isDark ? '#0a0a0a' : '#ffffff';
    const tooltipBorder = isDark ? '#262626' : '#e5e7eb';
    const textMutedClass = isDark ? 'text-neutral-500' : 'text-gray-500';

    return (
        <div className="flex flex-col gap-2 h-full">
            {/* Today's Alert Count */}
            <div className={`p-3 border flex items-center justify-between shrink-0 ${isDark ? 'bg-black border-neutral-800' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center gap-4">
                    <div className={`p-2 border ${stats.todayCount > 0 ? 'bg-red-600/20 border-red-500/50 text-red-500' : isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                        <AlertOctagon size={20} />
                    </div>
                    <div>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${textMutedClass}`}>Alerts Triggered Today</p>
                        <p className={`text-3xl font-black leading-none tracking-tighter ${stats.todayCount > 0 ? 'text-red-500' : isDark ? 'text-white' : 'text-black'}`}>
                            {loading ? '--' :
                                <SlidingNumber
                                    number={stats.todayCount}
                                    className={`text-2xl font-black tracking-tighter leading-none`}
                                />
                            }
                        </p>
                    </div>
                </div>
            </div>

            {/* 7-Day History Chart */}
            <div className={`flex-1 min-h-0 flex flex-col p-2 border ${isDark ? 'bg-black border-neutral-800' : 'bg-white border-gray-200'}`}>
                <div className="border-b pb-2 mb-2 border-inherit shrink-0">
                    <h3 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isDark ? 'text-white' : 'text-black'}`}>
                        <BarChart3 size={12} className={isDark ? "text-neutral-400" : "text-gray-500"} /> 7-Day Alert History
                    </h3>
                </div>

                <div className="flex-1 min-h-50">
                    {loading && stats.history.length === 0 ? (
                        <div className={`h-full flex items-center justify-center text-[9px] tracking-widest uppercase ${textMutedClass}`}>Loading...</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                <XAxis dataKey="day" stroke={textColor} fontSize={8} tickMargin={4} axisLine={false} tickLine={false} />
                                <YAxis allowDecimals={false} stroke={textColor} fontSize={8} tickCount={4} axisLine={false} tickLine={false} />
                                <Tooltip
                                    cursor={{ fill: isDark ? '#171717' : '#f3f4f6' }}
                                    contentStyle={{ borderRadius: '0px', border: `1px solid ${tooltipBorder}`, boxShadow: 'none', backgroundColor: tooltipBg, color: textColor, padding: '6px' }}
                                    labelStyle={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', color: isDark ? '#fff' : '#000' }}
                                    itemStyle={{ fontSize: '10px', color: '#ef4444', fontWeight: 'bold' }}
                                />
                                <Bar dataKey="alerts" name="Alerts" fill="#ef4444" radius={[2, 2, 0, 0]} maxBarSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
};