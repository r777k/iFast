import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

  // Auto-scroll the chart to the right (last 7 days view)
  useEffect(() => {
    if (chartScrollRef.current) {
      chartScrollRef.current.scrollLeft = chartScrollRef.current.scrollWidth;
    }
  }, [data]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // --- Prepare Chart Data (Full Month) ---
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

  // --- Prepare Heatmap Data (24h Grid) ---
  const generateHeatmapGrid = () => {
    // grid[day_index][hour_index] = elapsed_hours
    const grid = Array.from({ length: daysInMonth }, () => Array(24).fill(null));

    data.daily_summary.forEach(session => {
      if (!session.fast_start_time || !session.actual_fast_end_time) return;
      
      const start = parseISO(session.fast_start_time);
      const end = parseISO(session.actual_fast_end_time);
      
      let current = new Date(start);
      current.setMinutes(0, 0, 0); // truncate to start of hour
      let elapsed = 1;

      while (current <= end) {
        // Only map if the block falls within the currently selected month
        if (isSameMonth(current, currentMonth)) {
          const dIdx = current.getDate() - 1;
          const hIdx = current.getHours();
          // Prefer higher elapsed time if overlapping
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

  // Heatmap Shading Logic
  const getCellColor = (val) => {
    if (!val) return 'bg-transparent';
    if (val <= 4) return 'bg-primary/20 text-text-primary dark:text-text-light';
    if (val <= 8) return 'bg-primary/40 text-text-primary dark:text-text-light';
    if (val <= 12) return 'bg-primary/70 text-surface';
    if (val <= 16) return 'bg-primary text-surface';
    if (val <= 20) return 'bg-primary-active text-surface';
    return 'bg-status-warning text-surface border-none';
  };

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

      {/* Chart: Duration Trend */}
      <section className="bg-surface dark:bg-surface-dark p-4 md:p-6 rounded-xl shadow-sm border border-border dark:border-border-dark">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4">Fasting Duration Trend</h3>
        
        {/* Scrollable Container (Shows 7 days on standard mobile viewport) */}
        <div 
          ref={chartScrollRef} 
          className="overflow-x-auto overflow-y-hidden pb-4 smooth-scroll"
        >
          <div style={{ minWidth: `${daysInMonth * 60}px`, height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#888' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#888' }}
                />
                <Tooltip 
                  cursor={{ stroke: '#e5e7eb', strokeWidth: 2 }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <ReferenceLine y={16} stroke="#F59E0B" strokeDasharray="3 3" label={{ value: 'Target', position: 'insideTopLeft', fill: '#F59E0B', fontSize: 10 }} />
                <Line 
                  type="monotone" 
                  dataKey="duration" 
                  name="Hours"
                  stroke="#14b8a6" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#14b8a6', strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Heatmap: 24h Cycle */}
      <section className="bg-surface dark:bg-surface-dark p-4 md:p-6 rounded-xl shadow-sm border border-border dark:border-border-dark overflow-hidden">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4">Fasting Schedule Heatmap</h3>
        
        <div className="overflow-x-auto pb-4">
          <div className="inline-block min-w-max">
            {/* Heatmap Header (Hours) */}
            <div className="flex border-b border-border dark:border-border-dark pb-2 mb-2">
              <div className="w-16 flex-shrink-0 text-xs font-bold text-text-secondary">Day \ Hr</div>
              {hours.map((hour, i) => (
                <div key={i} className="w-8 flex-shrink-0 text-center text-[10px] font-medium text-text-secondary">
                  {hour.substring(0, 2)}
                </div>
              ))}
            </div>

            {/* Heatmap Body */}
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