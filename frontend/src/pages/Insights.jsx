import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Zap, Flame, AlertCircle, Play, Square } from 'lucide-react';
import { parseISO, format, subMonths, addMonths, getDaysInMonth, isSameMonth } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { apiClient } from '../api/client';

export default function Insights() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [data, setData] = useState({ metrics: {}, daily_summary: [] });
  const [loading, setLoading] = useState(true);
  const chartScrollRef = useRef(null);

  useEffect(() => {
    const fetchMonthData = async () => {
      setLoading(true);
      try {
        const monthString = format(currentMonth, 'yyyy-MM');
        const response = await apiClient.get(`/analytics/monthly?month=${monthString}`);
        setData(response.data);
      } catch (error) {
        console.error("Failed to fetch insights:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMonthData();
  }, [currentMonth]);

  // Smart Auto-Scroll for Chart (Desktop: today - 14, Mobile: today - 5)
  useEffect(() => {
    if (chartScrollRef.current) {
      const isMobile = window.innerWidth < 768;
      const offsetDays = isMobile ? 5 : 14;
      const todayDate = new Date().getDate();
      const targetDay = Math.max(0, todayDate - offsetDays);
      const scrollPosition = targetDay * 60; // ~60px per day column
      chartScrollRef.current.scrollLeft = scrollPosition;
    }
  }, [data]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const daysInMonth = getDaysInMonth(currentMonth);
  const chartData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day), 'yyyy-MM-dd');
    const session = data.daily_summary.find(s => s.date === dateStr);
    return {
      day: day,
      date: format(new Date(dateStr), 'MMM dd'),
      duration: session ? session.duration_hours : 0
    };
  });

  // Transposed Heatmap Grid: Rows = Hours (0-23), Cols = Days (1-daysInMonth)
  const generateTransposedGrid = () => {
    // grid[hour_index][day_index] = elapsed_hours
    const grid = Array.from({ length: 24 }, () => Array(daysInMonth).fill(null));

    data.daily_summary.forEach(session => {
      if (!session.fast_start_time || !session.actual_fast_end_time) return;
      const start = parseISO(session.fast_start_time);
      const end = parseISO(session.actual_fast_end_time);
      
      let current = new Date(start);
      current.setMinutes(0, 0, 0); 
      let elapsed = 1;

      while (current <= end) {
        if (isSameMonth(current, currentMonth)) {
          const dIdx = current.getDate() - 1;
          const hIdx = current.getHours();
          grid[hIdx][dIdx] = grid[hIdx][dIdx] ? Math.max(grid[hIdx][dIdx], elapsed) : elapsed;
        }
        current.setHours(current.getHours() + 1);
        elapsed++;
      }
    });
    return grid;
  };

  const transposedGrid = generateTransposedGrid();
  const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

  const getCellColor = (val) => {
    if (!val || val < 4) return 'bg-transparent text-gray-300 dark:text-gray-700'; 
    if (val < 16) return 'bg-primary/20 text-text-primary dark:text-text-light'; 
    if (val < 24) return 'bg-primary/50 text-surface'; 
    if (val < 48) return 'bg-primary text-surface'; 
    return 'bg-primary-active text-surface'; 
  };

  const totalSessions = data.daily_summary.length;
  const fatBurnCount = data.daily_summary.filter(s => s.duration_hours >= 16).length;
  const ketosisCount = data.daily_summary.filter(s => s.duration_hours >= 24).length;
  const autophagyCount = data.daily_summary.filter(s => s.duration_hours >= 48).length;
  const suboptimalCount = data.daily_summary.filter(s => s.duration_hours > 0 && s.duration_hours < 12).length;

  return (
    <div className="flex flex-col h-full space-y-6 pt-4 px-4 md:px-8 max-w-5xl mx-auto pb-24">
      <header className="flex justify-between items-center bg-surface dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border dark:border-border-dark">
        <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5 text-text-secondary" />
        </button>
        <h2 className="text-lg font-bold text-text-primary dark:text-text-light text-center tracking-tight">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" disabled={currentMonth > new Date()}>
          <ChevronRight className="w-5 h-5 text-text-secondary" />
        </button>
      </header>

      {/* Session Quality Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 p-4 rounded-xl flex flex-col items-center justify-center text-center">
          <Flame className="w-5 h-5 text-orange-600 mb-1" />
          <span className="text-2xl font-bold text-orange-700 dark:text-orange-400 leading-none mb-1">{fatBurnCount}/{totalSessions}</span>
          <span className="text-[10px] text-orange-600/80 uppercase font-bold tracking-wider">Fat Burn (16h+)</span>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 p-4 rounded-xl flex flex-col items-center justify-center text-center">
          <Zap className="w-5 h-5 text-purple-600 mb-1" />
          <span className="text-2xl font-bold text-purple-700 dark:text-purple-400 leading-none mb-1">{ketosisCount}/{totalSessions}</span>
          <span className="text-[10px] text-purple-600/80 uppercase font-bold tracking-wider">Ketosis (24h+)</span>
        </div>
        <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/30 p-4 rounded-xl flex flex-col items-center justify-center text-center">
          <Zap className="w-5 h-5 text-teal-600 mb-1" />
          <span className="text-2xl font-bold text-teal-700 dark:text-teal-400 leading-none mb-1">{autophagyCount}/{totalSessions}</span>
          <span className="text-[10px] text-teal-600/80 uppercase font-bold tracking-wider">Autophagy (48h+)</span>
        </div>
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-4 rounded-xl flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-5 h-5 text-red-600 mb-1" />
          <span className="text-2xl font-bold text-red-700 dark:text-red-400 leading-none mb-1">{suboptimalCount}/{totalSessions}</span>
          <span className="text-[10px] text-red-600/80 uppercase font-bold tracking-wider">Sub-optimal (&lt;12h)</span>
        </div>
      </div>

      {/* Chart: Duration Trend */}
      <section className="bg-surface dark:bg-surface-dark p-4 md:p-6 rounded-xl shadow-sm border border-border dark:border-border-dark">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4">Fasting Duration Trend</h3>
        <div ref={chartScrollRef} className="overflow-x-auto overflow-y-hidden pb-4 smooth-scroll">
          <div style={{ minWidth: `${daysInMonth * 60}px`, height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} />
                <Tooltip cursor={{ stroke: '#e5e7eb', strokeWidth: 2 }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <ReferenceLine y={16} stroke="#F59E0B" strokeDasharray="3 3" label={{ value: 'Target', position: 'insideTopLeft', fill: '#F59E0B', fontSize: 10 }} />
                <Line type="monotone" dataKey="duration" name="Hours" stroke="#14b8a6" strokeWidth={3} dot={{ r: 4, fill: '#14b8a6', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Heatmap: Transposed 24h Cycle (Rows = hh:00, Cols = Days) */}
      <section className="bg-surface dark:bg-surface-dark p-4 md:p-6 rounded-xl shadow-sm border border-border dark:border-border-dark overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Physiological Stage Heatmap</h3>
          {/* Intuitive Legend */}
          <div className="flex items-center gap-4 text-xs text-text-secondary">
            <span className="flex items-center gap-1"><Play className="w-3 h-3 text-primary fill-current" /> Start (Hour 1)</span>
            <span className="flex items-center gap-1"><Square className="w-3 h-3 text-status-warning fill-current" /> Elapsed Hours</span>
          </div>
        </div>
        
        <div className="overflow-x-auto pb-4">
          <div className="inline-block min-w-max">
            {/* Header Row: Days of Month */}
            <div className="flex border-b border-border dark:border-border-dark pb-2 mb-1">
              <div className="w-14 flex-shrink-0 text-xs font-bold text-text-secondary">Hr \ Day</div>
              {Array.from({ length: daysInMonth }).map((_, dIdx) => (
                <div key={dIdx} className="w-6 flex-shrink-0 text-center text-[10px] font-semibold text-text-secondary">
                  {dIdx + 1}
                </div>
              ))}
            </div>

            {/* Body Rows: Hours (hh:00) */}
            <div className="flex flex-col gap-0.5">
              {transposedGrid.map((row, hIdx) => (
                <div key={hIdx} className="flex items-center">
                  <div className="w-14 flex-shrink-0 text-[11px] font-mono font-medium text-text-secondary">
                    {hours[hIdx]}
                  </div>
                  {row.map((val, dIdx) => {
                    const isStart = val === 1;
                    return (
                      <div 
                        key={dIdx} 
                        className={`w-6 h-6 flex-shrink-0 flex items-center justify-center text-[9px] font-bold border border-gray-100 dark:border-gray-800/60 rounded-[2px] relative transition-colors duration-200 ${getCellColor(val)}`}
                        title={`Day ${dIdx + 1}, ${hours[hIdx]} — Elapsed: ${val ? `${val}h` : 'Non-fasting'}`}
                      >
                        {isStart ? (
                          <Play className="w-3 h-3 text-white fill-current drop-shadow" />
                        ) : (
                          val ? val : ''
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}