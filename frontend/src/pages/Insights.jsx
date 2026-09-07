import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, 
  ResponsiveContainer, CartesianGrid, Cell 
} from 'recharts';
import { TrendingUp, Clock, Target, Calendar } from 'lucide-react';
import { apiClient } from '../api/client';

// --- Custom Premium Tooltip for Recharts ---
const CustomTelemetryTooltip = ({ active, payload, label, suffix = "h" }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark p-3 rounded-lg shadow-lg backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95">
        <p className="text-xs text-text-secondary uppercase tracking-wider mb-1 font-semibold">{label}</p>
        <p className="text-xl font-bold text-primary font-mono">
          {payload[0].value.toFixed(1)}{suffix}
        </p>
      </div>
    );
  }
  return null;
};

export default function Insights() {
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState({ metrics: {}, daily_summary: [] });
  const [patternData, setPatternData] = useState(null);

  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true);
      try {
        // Fetching current month for the MVP dashboard
        const monthString = format(new Date(), 'yyyy-MM');
        const [monthlyRes, patternRes] = await Promise.all([
          apiClient.get(`/analytics/monthly?month=${monthString}`),
          apiClient.get('/analytics/patterns')
        ]);
        
        // Format dates for the X-Axis (e.g., "2026-09-01" -> "Sep 1")
        const formattedDaily = monthlyRes.data.daily_summary.map(day => ({
          ...day,
          displayDate: format(new Date(day.date), 'MMM d')
        }));

        setMonthlyData({ ...monthlyRes.data, daily_summary: formattedDaily });
        setPatternData(patternRes.data);
      } catch (error) {
        console.error("Failed to fetch insights:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-text-secondary">Loading telemetry...</div>;
  }

  const metrics = monthlyData.metrics;
  const timingDist = patternData?.last_meal_times?.distribution || [];

  return (
    <div className="flex flex-col h-full space-y-6 pt-4 px-4 md:px-8 max-w-5xl mx-auto pb-24">
      
      <header className="mb-2">
        <h2 className="text-2xl font-bold text-text-primary dark:text-text-light tracking-tight">Your Fasting Insights</h2>
        <p className="text-sm text-text-secondary">Telemetry and trends for {format(new Date(), 'MMMM yyyy')}</p>
      </header>

      {/* --- Top Metrics Grid --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface dark:bg-surface-dark p-5 rounded-xl border border-border dark:border-border-dark shadow-sm">
          <div className="flex items-center gap-2 text-text-secondary mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-xs uppercase font-semibold tracking-wider">Avg Duration</span>
          </div>
          <span className="text-3xl font-bold text-text-primary dark:text-text-light font-mono">{metrics.average_duration_hours || 0}h</span>
        </div>
        <div className="bg-surface dark:bg-surface-dark p-5 rounded-xl border border-border dark:border-border-dark shadow-sm">
          <div className="flex items-center gap-2 text-text-secondary mb-2">
            <Target className="w-4 h-4" />
            <span className="text-xs uppercase font-semibold tracking-wider">Goal Met</span>
          </div>
          <span className="text-3xl font-bold text-text-primary dark:text-text-light font-mono">{metrics.goal_met_percentage || 0}%</span>
        </div>
        <div className="bg-surface dark:bg-surface-dark p-5 rounded-xl border border-border dark:border-border-dark shadow-sm">
          <div className="flex items-center gap-2 text-text-secondary mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs uppercase font-semibold tracking-wider">Longest Fast</span>
          </div>
          <span className="text-3xl font-bold text-text-primary dark:text-text-light font-mono">{metrics.longest_duration_hours || 0}h</span>
        </div>
        <div className="bg-surface dark:bg-surface-dark p-5 rounded-xl border border-border dark:border-border-dark shadow-sm">
          <div className="flex items-center gap-2 text-text-secondary mb-2">
            <Calendar className="w-4 h-4" />
            <span className="text-xs uppercase font-semibold tracking-wider">Total Fasts</span>
          </div>
          <span className="text-3xl font-bold text-text-primary dark:text-text-light font-mono">{metrics.total_fasts || 0}</span>
        </div>
      </div>

      {/* --- Chart 1: Duration Trend Line --- */}
      <div className="bg-surface dark:bg-surface-dark p-6 rounded-xl border border-border dark:border-border-dark shadow-sm">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-6">Fasting Duration Trend</h3>
        <div className="h-64 w-full">
          {monthlyData.daily_summary.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData.daily_summary} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="fastingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#208080" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#208080" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.4} />
                <XAxis 
                  dataKey="displayDate" 
                  stroke="transparent" 
                  tick={{ fill: '#888', fontSize: 11 }} 
                  dy={10}
                />
                <YAxis 
                  stroke="transparent" 
                  tick={{ fill: '#888', fontSize: 11, fontFamily: 'monospace' }} 
                  domain={[0, 'dataMax + 2']}
                />
                <RechartsTooltip content={<CustomTelemetryTooltip />} cursor={{ stroke: '#208080', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area 
                  type="linear" // Raw data representation
                  dataKey="duration_hours" 
                  stroke="#208080" 
                  strokeWidth={2} 
                  fill="url(#fastingGradient)" 
                  activeDot={{ r: 5, fill: '#208080', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-secondary text-sm">
              Not enough data to display trends.
            </div>
          )}
        </div>
      </div>

      {/* --- Chart 2: Last Meal Timing Distribution --- */}
      <div className="bg-surface dark:bg-surface-dark p-6 rounded-xl border border-border dark:border-border-dark shadow-sm">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-1">Start Time Frequency</h3>
            <p className="text-xs text-text-secondary">When you typically log your last meal</p>
          </div>
          {patternData?.last_meal_times?.most_common_time && (
            <div className="text-right">
              <p className="text-xs text-text-secondary uppercase font-semibold">Most Common</p>
              <p className="text-lg font-bold text-primary font-mono">{patternData.last_meal_times.most_common_time}</p>
            </div>
          )}
        </div>
        
        <div className="h-48 w-full">
          {timingDist.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timingDist} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.4} />
                <XAxis 
                  dataKey="hour" 
                  stroke="transparent" 
                  tick={{ fill: '#888', fontSize: 11 }}
                  tickFormatter={(val) => `${val}:00`}
                  dy={10}
                />
                <YAxis 
                  stroke="transparent" 
                  tick={{ fill: '#888', fontSize: 11, fontFamily: 'monospace' }} 
                />
                <RechartsTooltip 
                  content={<CustomTelemetryTooltip suffix=" fasts" />} 
                  cursor={{ fill: 'var(--border)', opacity: 0.2 }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {timingDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.count === Math.max(...timingDist.map(d => d.count)) ? '#0f5a5a' : '#208080'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
             <div className="w-full h-full flex items-center justify-center text-text-secondary text-sm">
              Not enough data to display timing patterns.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}