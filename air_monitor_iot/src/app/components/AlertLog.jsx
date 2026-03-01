"use client";
const { AlertTriangle, ChevronLeft, ChevronRight } = require("lucide-react");
import { useEffect, useState } from "react";

export const AlertLog = ({ isDark }) => {
    const [alerts, setAlerts] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchAlerts = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/alerts?page=${page}`);
                const data = await res.json();
                setAlerts(data.alerts || []);
                setTotalPages(data.totalPages || 1);
            } catch (err) {
                console.error(err);
                setAlerts([]);
            }
            setLoading(false);
        };

        fetchAlerts();

        // Auto-refresh the log every 5 seconds to show new alerts dynamically
        const interval = setInterval(fetchAlerts, 5000);
        return () => clearInterval(interval);
    }, [page]);

    const sensorLabels = { pm25: "PM2.5", gas: "Gas", temp: "Temperature", humidity: "Humidity" };
    const textMutedClass = isDark ? 'text-neutral-500' : 'text-gray-500';

    return (
        <div className={`flex-1 min-h-0 flex flex-col p-2 border ${isDark ? 'bg-black border-neutral-800' : 'bg-white border-gray-200'}`}>
            {/* Header & Pagination Controls */}
            <div className="flex justify-between items-center border-b pb-2 mb-2 border-inherit shrink-0">
                <h3 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isDark ? 'text-white' : 'text-black'}`}>
                    <AlertTriangle size={12} className="text-red-500" /> System Alert Log
                </h3>
                <div className="flex items-center gap-3">
                    <span className={`text-[8px] font-bold uppercase tracking-widest ${textMutedClass}`}>Page {page} of {totalPages}</span>
                    <div className="flex gap-1">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className={`p-1 border transition-colors disabled:opacity-30 ${isDark ? 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800 text-white' : 'bg-gray-100 border-gray-200 hover:bg-gray-200 text-black'}`}>
                            <ChevronLeft size={10} />
                        </button>
                        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className={`p-1 border transition-colors disabled:opacity-30 ${isDark ? 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800 text-white' : 'bg-gray-100 border-gray-200 hover:bg-gray-200 text-black'}`}>
                            <ChevronRight size={10} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Scrollable Alert List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
                {loading && alerts?.length === 0 ? (
                    <div className={`h-full flex items-center justify-center text-[9px] tracking-widest uppercase ${textMutedClass}`}>Loading...</div>
                ) : (!alerts || alerts.length === 0) ? (
                    <div className={`h-full flex items-center justify-center text-[9px] tracking-widest uppercase ${textMutedClass}`}>No alerts recorded.</div>
                ) : (
                    alerts.map((alert) => (
                        <div key={alert._id} className={`flex justify-between items-center p-2 border ${isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex items-center gap-3">
                                <div className="p-1 bg-red-500/10 text-red-500 border border-red-500/20">
                                    <AlertTriangle size={10} />
                                </div>
                                <div>
                                    <p className={`text-[9px] font-bold uppercase tracking-widest leading-none mb-1 ${isDark ? 'text-white' : 'text-black'}`}>
                                        {sensorLabels[alert.sensor] || alert.sensor} Warning
                                    </p>
                                    <p className={`text-[8px] font-mono leading-none ${textMutedClass}`}>
                                        {new Date(alert.timestamp).toLocaleDateString()} at {new Date(alert.timestamp).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right flex items-baseline gap-1.5">
                                <span className={`text-[7px] font-bold uppercase ${textMutedClass}`}>Trigger:</span>
                                <span className="text-sm font-black text-red-500 leading-none">{alert.value}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};