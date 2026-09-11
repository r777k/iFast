import React, { useState, useEffect } from 'react';
import { parseISO, format, subMonths, addMonths, startOfMonth, endOfMonth, getDaysInMonth, getDay, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Award, Clock, Calendar as CalendarIcon, Flame } from 'lucide-react';
import { apiClient } from '../api/client';
import EditSessionModal from '../components/EditSessionModal';
import LogPastFastModal from '../components/LogPastFastModal';

export default function History() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [data, setData] = useState({ metrics: {}, daily_summary: [] });
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  const fetchMonthData = async (date) => {
    setLoading(true);
    try {
      const monthString = format(date, 'yyyy-MM');
      const response = await apiClient.get(`/analytics/monthly?month=${monthString}`);
      setData(response.data);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthData(currentMonth);
  }, [currentMonth]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const summaryCards = [
    { label: "Avg Duration", value: formatDuration(data.metrics?.average_duration_hours), icon: Clock },
    { label: "Completed", value: `${data.metrics?.completed_fasts || 0}`, icon: Award },
    { label: "Longest", value: `${data.metrics?.longest_duration_hours || 0}h`, icon: CalendarIcon },
    { label: "Streak", value: `${data.metrics?.current_streak || 0} days`, icon: Flame },
  ];

  const formatDuration = (decimalHours) => {
    if (!decimalHours) return '00:00';
    const totalMins = Math.round(decimalHours * 60);
   const d = Math.floor(totalMins / (24 * 60));
   const h = Math.floor((totalMins % (24 * 60)) / 60);
    const m = totalMins % 60;
  
    const pad = (num) => num.toString().padStart(2, '0');
  
    if (d > 0) return `${d}d ${pad(h)}:${pad(m)}`;
    return `${pad(h)}:${pad(m)}`;
  };

  return (
    <div className="flex flex-col h-full space-y-6 pt-4 px-4 md:px-8 max-w-4xl mx-auto pb-24">
      
      {/* Header & Month Selector */}
      <header className="flex justify-between items-center bg-surface dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border dark:border-border-dark">
        <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5 text-text-secondary" />
        </button>
        <h2 className="text-lg font-bold text-text-primary dark:text-text-light w-40 text-center tracking-tight">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" disabled={currentMonth > new Date()}>
          <ChevronRight className="w-5 h-5 text-text-secondary" />
        </button>
      </header>

      {/* Stats Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((card, idx) => (
          <div key={idx} className="bg-surface dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border dark:border-border-dark flex flex-col items-center justify-center text-center">
            <card.icon className="w-5 h-5 text-primary mb-2" />
            <span className="text-2xl font-bold text-text-primary dark:text-text-light font-mono leading-none mb-1">{card.value}</span>
            <span className="text-xs text-text-secondary uppercase tracking-wider font-semibold">{card.label}</span>
          </div>
        ))}
      </div>

      {/* Calendar View */}
      <div className="bg-surface dark:bg-surface-dark rounded-xl shadow-sm border border-border dark:border-border-dark p-4">
        <div className="grid grid-cols-7 text-center text-xs font-semibold text-text-secondary mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: getDay(startOfMonth(currentMonth)) }).map((_, i) => (
            <div key={`empty-${i}`} className="h-14 bg-transparent" />
          ))}
          
          {Array.from({ length: getDaysInMonth(currentMonth) }).map((_, i) => {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1);
            
            // FIX: Using fast_start_time parsed dynamically for local timezone accuracy
            const session = data.daily_summary.find(s => s.fast_start_time && isSameDay(parseISO(s.fast_start_time), date));
            
            let badgeColor = 'bg-gray-100 dark:bg-gray-800'; 
            if (session) {
              if (session.duration_hours < 12) badgeColor = 'bg-primary/30 text-primary-active'; 
              else if (session.duration_hours < 16) badgeColor = 'bg-primary text-surface'; 
              else if (session.duration_hours < 20) badgeColor = 'bg-primary-active text-surface'; 
              else badgeColor = 'bg-status-warning text-surface'; 
            }

            return (
              <div 
                key={i} 
                onClick={() => {
                  if (session) {
                    setSelectedSession(session);
                    setIsEditModalOpen(true);
                  }
                }}
                className="h-14 border border-border dark:border-border-dark rounded-md p-1 flex flex-col items-end cursor-pointer hover:border-primary transition-colors relative"
              >
                <span className="text-xs text-text-secondary font-medium">{i + 1}</span>
                {session && (
                  <div className={`absolute bottom-1 left-1 right-1 text-center rounded text-[10px] font-bold ${badgeColor}`}>
                    {formatDuration(session.duration_hours)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* High-Density Data List */}
      <div className="bg-surface dark:bg-surface-dark rounded-xl shadow-sm border border-border dark:border-border-dark overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-border dark:border-border-dark bg-gray-50 dark:bg-gray-800/50">
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Fasting Log</h3>
          <button 
            onClick={() => setIsManualModalOpen(true)}
            className="text-xs font-semibold text-primary hover:text-primary-hover active:text-primary-active transition-colors flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-md"
          >
            + Log Past Fast
          </button>
        </div>
	
        {loading ? (
          <div className="p-8 text-center text-text-secondary">Loading telemetry...</div>
        ) : data.daily_summary.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <CalendarIcon className="w-6 h-6 text-text-secondary" />
            </div>
            <p className="text-text-primary dark:text-text-light font-medium">No fasts logged this month.</p>
            <p className="text-sm text-text-secondary mt-1">Your completed sessions will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.daily_summary.map((session) => {
              // FIX: Dynamically parsing the UTC timestamp into a local date string
              const actualLocalDay = session.fast_start_time 
                ? format(parseISO(session.fast_start_time), 'MMM dd, yyyy')
                : format(new Date(session.date), 'MMM dd, yyyy');

              return (
                <div 
                  key={session.session_id} 
                  onClick={() => {
                    setSelectedSession(session);
                    setIsEditModalOpen(true);
                  }}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-10 rounded-full ${session.is_goal_met ? 'bg-primary' : 'bg-status-warning'}`} />
                    <div>
                      <p className="text-text-primary dark:text-text-light font-semibold">
                        {actualLocalDay}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {session.is_goal_met ? 'Goal Met' : 'Ended Early'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-text-primary dark:text-text-light font-mono">
                      {formatDuration(session.duration_hours)}
                    </p>
                    <button className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                      Edit Session
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {isEditModalOpen && selectedSession && (
          <EditSessionModal 
            session={selectedSession} 
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedSession(null);
            }}
            onRefresh={() => fetchMonthData(currentMonth)}
          />
        )}
        {isManualModalOpen && (
          <LogPastFastModal 
            onClose={() => setIsManualModalOpen(false)}
            onRefresh={() => fetchMonthData(currentMonth)}
          />
        )}
      </div>

    </div>
  );
}