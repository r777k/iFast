import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Zap, Flame, AlertCircle } from 'lucide-react';
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

  useEffect(() => {
    if (chartScrollRef.current) {
      chartScrollRef.current.scrollLeft = chartScrollRef.current.scrollWidth;
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

  const generateHeatmapGrid = () => {
    const grid = Array.from({ length: daysInMonth }, () => Array(24).fill(null));
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
          grid[dIdx][hIdx] = grid[dIdx][hIdx] ? Math.max(grid[dIdx][hIdx], elapsed) : elapsed;
        }
        current.setHours(current.getHours() + 1);
        elapsed++;
      }
    });
    return grid;
  };

  const heatmapGrid = generateHeatmapGrid();
  const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

  // NEW: Shading maps directly to Physiological Stages
  const getCellColor = (val) => {
    if (!val || val < 4) return 'bg-transparent text-gray-400'; // Fed State (0-4h)
    if (val < 16) return 'bg-primary/20 text-text-primary dark:text-text-light'; // Glycogenolysis (4-16h)
    if (val < 24) return 'bg-primary/50 text-surface'; // Metabolic Switch (16-24h)
    if (val < 48) return 'bg-primary text-surface'; // Ketosis (24-48h)
    return 'bg-primary-active text-surface border-none'; // Autophagy (48h+)
  };

  // NEW: Quality Telemetry Calculations
  const ketosisCount = data.daily_summary.filter(s => s.duration_hours >= 24).length;
  const autophagyCount = data.daily_summary.filter(s => s.duration_hours >= 48).length;
  const suboptimalCount = data.daily_summary.filter(s => s.duration_hours > 0 && s.duration_hours < 12).length;

  return (
    <div className="flex flex-col h-full space-y-6 pt-4 px-4 md:px-8 max-w-5xl mx-auto pb-24">
      
      {/* Header */}
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

      {/* NEW: Session Quality Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 p-4 rounded-xl flex flex-col items-center justify-center text-center">
          <Zap className="w-5 h-5 text-purple-600 mb-1" />
          <span className="text-2xl font-bold text-purple-700 dark:text-purple-400 leading-none mb-1">{ketosisCount}</span>
          <span className="text-[10px] text-purple-600/80 uppercase font-bold tracking-wider">Ketosis Sessions</span>
        </div>
        <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/30 p-4 rounded-xl flex flex-col items-center justify-center text-center">
          <Flame className="w-5 h-5 text-teal-600 mb-1" />
          <span className="text-2xl font-bold text-teal-700 dark:text-teal-400 leading-none mb-1">{autophagyCount}</span>
          <span className="text-[10px] text-teal-600/80 uppercase font-bold tracking-wider">Autophagy Reached</span>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 p-4 rounded-xl flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-5 h-5 text-orange-600 mb-1" />
          <span className="text-2xl font-bold text-orange-700 dark:text-orange-400 leading-none mb-1">{suboptimalCount}</span>
          <span className="text-[10px] text-orange-600/80 uppercase font-bold tracking-wider">Sub-optimal (&lt;12h)</span>
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

      {/* Heatmap: 24h Cycle */}
      <section className="bg-surface dark:bg-surface-dark p-4 md:p-6 rounded-xl shadow-sm border border-border dark:border-border-dark overflow-hidden">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4">Physiological Stage Heatmap</h3>
        
        <div className="overflow-x-auto pb-4">
          <div className="inline-block min-w-max">
            <div className="flex border-b border-border dark:border-border-dark pb-2 mb-2">
              <div className="w-16 flex-shrink-0 text-xs font-bold text-text-secondary">Day \ Hr</div>
              {hours.map((hour, i) => (
                <div key={i} className="w-8 flex-shrink-0 text-center text-[10px] font-medium text-text-secondary">
                  {hour.substring(0, 2)}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-1">
              {heatmapGrid.map((row, dIdx) => (
                <div key={dIdx} className="flex">
                  <div className="w-16 flex-shrink-0 text-xs font-semibold text-text-primary dark:text-text-light flex items-center">
                    {format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dIdx + 1), 'MMM dd')}
                  </div>
                  {row.map((val, hIdx) => (
                    <div 
                      key={hIdx} 
                      className={`w-8 h-8 flex-shrink-0 flex items-center justify-center text-[10px] font-bold border border-gray-100 dark:border-gray-800 transition-colors duration-300 ${getCellColor(val)}`}
                    >
                      {val || ''}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}