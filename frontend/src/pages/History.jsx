import React, { useState, useEffect } from 'react';
import { parseISO, format, subMonths, addMonths, startOfMonth, endOfMonth, getDaysInMonth, getDay, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Award, Clock, Calendar as CalendarIcon, Flame, Zap, Download } from 'lucide-react';
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
  const [isExporting, setIsExporting] = useState(false);

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

  // --- CSV Export Logic ---
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      // Request the blob data from the backend endpoint
      const response = await apiClient.get('/sessions/export', {
        responseType: 'blob', 
      });
      
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      
      // Create a temporary <a> tag to trigger the browser's download prompt
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'fasting_history.csv');
      document.body.appendChild(link);
      
      // Trigger download and cleanup
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

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

  const getBadges = (hours) => {
    const badges = [];
    if (hours >= 16) badges.push({ text: 'F', bg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600', title: 'Fat Burning' });
    if (hours >= 24) badges.push({ text: 'K', bg: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600', title: 'Ketosis' });
    if (hours >= 48) badges.push({ text: 'A', bg: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600', title: 'Autophagy' });
    return badges;
  };

  const totalSessions = data.daily_summary.length;
  const fatBurnCount = data.daily_summary.filter(s => s.duration_hours >= 16).length;
  const ketosisCount = data.daily_summary.filter(s => s.duration_hours >= 24).length;
  const autophagyCount = data.daily_summary.filter(s => s.duration_hours >= 48).length;

  const summaryCards = [
    { label: "Avg Duration", value: formatDuration(data.metrics?.average_duration_hours), icon: Clock },
    { label: "Fat Burn (16h+)", value: `${fatBurnCount}/${totalSessions}`, icon: Flame },
    { label: "Ketosis (24h+)", value: `${ketosisCount}/${totalSessions}`, icon: Zap },
    { label: "Autophagy (48h+)", value: `${autophagyCount}/${totalSessions}`, icon: Award },
  ];

  const legendItems = [
    { code: 'F', label: 'Fat Burning (16h+)', event: 'Glycogen nears depletion; lipolysis accelerates, releasing fatty acids; growth hormone starts climbing; ketone production begins.' },
    { code: 'K', label: 'Ketosis (24h+)', event: 'Glycogen essentially depleted; gluconeogenesis becomes main glucose source; ketone levels rise meaningfully (~1-2 mmol/L); insulin near floor.' },
    { code: 'A', label: 'Autophagy (48h+)', event: 'Brain increasingly runs on ketones; growth hormone elevated; autophagy near peak; immune-cell turnover signaling rises.' }
  ];

  return (
    <div className="flex flex-col h-full space-y-6 pt-4 px-4 md:px-8 max-w-4xl mx-auto pb-24">
      
      {/* Header Row with Export Button */}
      <header className="flex justify-between items-end mb-2">
        <div>
          <h2 className="text-2xl font-bold text-text-primary dark:text-text-light tracking-tight">History</h2>
          <p className="text-sm text-text-secondary">Review your fasting timeline.</p>
        </div>
        <button 
          onClick={handleExportCSV}
          disabled={isExporting}
          className="flex items-center gap-2 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark hover:bg-gray-50 dark:hover:bg-gray-800 text-text-primary dark:text-text-light font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm shadow-sm"
        >
          <Download className="w-4 h-4 text-primary" />
          {isExporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </header>

      {/* Month Navigator */}
      <div className="flex justify-between items-center bg-surface dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border dark:border-border-dark">
        <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5 text-text-secondary" />
        </button>
        <h2 className="text-lg font-bold text-text-primary dark:text-text-light w-40 text-center tracking-tight">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" disabled={currentMonth > new Date()}>
          <ChevronRight className="w-5 h-5 text-text-secondary" />
        </button>
      </div>

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

      {/* Calendar View & Legend */}
      <div className="bg-surface dark:bg-surface-dark rounded-xl shadow-sm border border-border dark:border-border-dark p-4 space-y-4">
        <div className="grid grid-cols-7 text-center text-xs font-semibold text-text-secondary mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: getDay(startOfMonth(currentMonth)) }).map((_, i) => (
            <div key={`empty-${i}`} className="h-14 bg-transparent" />
          ))}
          
          {Array.from({ length: getDaysInMonth(currentMonth) }).map((_, i) => {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1);
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
                className="h-14 border border-border dark:border-border-dark rounded-md p-1 flex flex-col items-end justify-between cursor-pointer hover:border-primary transition-colors relative"
              >
                <div className="w-full flex justify-between items-start">
                  <span className="text-xs text-text-secondary font-medium">{i + 1}</span>
                  {session && (
                    <div className="flex gap-0.5">
                      {getBadges(session.duration_hours).map((b, idx) => (
                        <span key={idx} className={`w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold ${b.bg}`} title={b.title}>
                          {b.text}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {session && (
                  <div className={`w-full text-center rounded text-[10px] font-bold ${badgeColor}`}>
                    {formatDuration(session.duration_hours)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend Strip with Hover Tooltips */}
        <div className="border-t border-border dark:border-border-dark pt-3 flex flex-wrap gap-4 justify-center text-xs text-text-secondary">
          {legendItems.map((item, idx) => (
            <div key={idx} className="group relative cursor-help flex items-center gap-1.5 bg-background dark:bg-background-dark px-2.5 py-1 rounded border border-border dark:border-border-dark">
              <span className="font-bold text-primary">{item.code}:</span>
              <span>{item.label}</span>
              {/* Tooltip Popup */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block w-64 p-2.5 bg-surface-dark text-white text-[11px] rounded shadow-lg z-50 pointer-events-none leading-relaxed">
                <p className="font-semibold text-primary mb-1">{item.label}</p>
                {item.event}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* High-Density Data List */}
      <div className="bg-surface dark:bg-surface-dark rounded-xl shadow-sm border border-border dark:border-border-dark overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-border dark:border-border-dark bg-gray-50 dark:bg-gray-800/50">
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Fasting Log</h3>
          <button 
            onClick={() => setIsManualModalOpen(true)}
            className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-md"
          >
            + Log Past Fast
          </button>
        </div>
	
        {loading ? (
          <div className="p-8 text-center text-text-secondary">Loading telemetry...</div>
        ) : data.daily_summary.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <CalendarIcon className="w-6 h-6 text-text-secondary mb-2" />
            <p className="text-text-primary dark:text-text-light font-medium">No fasts logged this month.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.daily_summary.map((session) => {
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
                      <div className="flex items-center gap-2">
                        <p className="text-text-primary dark:text-text-light font-semibold">{actualLocalDay}</p>
                        <div className="flex gap-1">
                          {getBadges(session.duration_hours).map((b, idx) => (
                            <span key={idx} className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold ${b.bg}`} title={b.title}>{b.text}</span>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5">{session.is_goal_met ? 'Goal Met' : 'Ended Early'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-text-primary dark:text-text-light font-mono">{formatDuration(session.duration_hours)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {isEditModalOpen && selectedSession && (
          <EditSessionModal session={selectedSession} onClose={() => { setIsEditModalOpen(false); setSelectedSession(null); }} onRefresh={() => fetchMonthData(currentMonth)} />
        )}
        {isManualModalOpen && (
          <LogPastFastModal onClose={() => setIsManualModalOpen(false)} onRefresh={() => fetchMonthData(currentMonth)} />
        )}
      </div>
    </div>
  );
}