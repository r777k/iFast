import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import CurrentSessionCard from '../components/CurrentSessionCard'; 
import { apiClient } from '../api/client';
import { format, differenceInMinutes, parseISO } from 'date-fns';
import { Square, Coffee, Settings, LogOut, Play, X } from 'lucide-react';
import SnackDecisionModal from '../components/SnackDecisionModal';
import TodaysPlanCard from '../components/TodaysPlanCard';
import EditSessionModal from '../components/EditSessionModal';

export default function Dashboard() {
  const { logout } = useAuth();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [now, setNow] = useState(new Date());
  const [isMealModalOpen, setIsMealModalOpen] = useState(false);
  const [mealNotes, setMealNotes] = useState('');
  const [todayPlan, setTodayPlan] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchDashboard = async () => {
    try {
      const { data } = await apiClient.get('/analytics/dashboard');
      setSession(data.current_session);
      setTodayPlan(data.today_plan);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleStartFast = async () => {
    setActionLoading(true);
    try {
      await apiClient.post('/fasting-sessions', {
        last_meal_time: new Date().toISOString(),
        target_duration_hours: 16, 
        notes: "Started from UI"
      });
      await fetchDashboard(); 
    } catch (error) {
      console.error('Failed to start fast:', error);
      alert('Failed to start fast. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndFast = async () => {
    if (!session) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/fasting-sessions/${session.id}/end`, {
        actual_fast_end_time: new Date().toISOString(),
        notes: "Ended from UI"
      });
      await fetchDashboard(); 
    } catch (error) {
      console.error('Failed to end fast:', error);
      alert('Failed to end fast. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogMeal = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await apiClient.post('/meals', {
        meal_time: new Date().toISOString(),
        meal_type: 'interruption',
        notes: mealNotes
      });
      setIsMealModalOpen(false);
      setMealNotes('');
      await fetchDashboard(); 
    } catch (error) {
      console.error('Failed to log meal:', error);
      alert('Failed to log meal. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const getPhase = (percent) => {
    if (percent < 25) return "Ramp-up";
    if (percent < 75) return "Fat Burning";
    if (percent < 100) return "Deep Fast";
    return "Extended";
  };

  if (loading) {
    return <div className="min-h-screen bg-background dark:bg-background-dark flex items-center justify-center text-text-primary dark:text-text-light">Loading...</div>;
  }

  // --- Date Math & Prop Preparation ---
  let elapsedString = "0h 0m";
  let remainingString = "0h 0m";
  let progressPct = 0;
  let phase = "Not Started";
  let lastMealFormatted = "--:--";
  let targetFormatted = "--:--";

  if (session) {
    const start = parseISO(session.fast_start_time);
    const target = parseISO(session.planned_fast_end_time);
    
    const elapsedMins = Math.max(0, differenceInMinutes(now, start));
    const eHours = Math.floor(elapsedMins / 60);
    const eMins = elapsedMins % 60;
    elapsedString = `${eHours}h ${eMins}m`;

    const remainingMins = Math.max(0, differenceInMinutes(target, now));
    const rHours = Math.floor(remainingMins / 60);
    const rMins = remainingMins % 60;
    remainingString = remainingMins > 0 ? `${rHours}h ${rMins}m` : "Goal Met!";

    const targetTotalMins = session.target_duration_hours * 60;
    progressPct = Math.min(100, Math.round((elapsedMins / targetTotalMins) * 100));
    phase = getPhase(progressPct);

    lastMealFormatted = format(start, 'HH:mm');
    targetFormatted = format(target, 'HH:mm');
  }

  // ---> THE FIX: Smart Window Formatting <---
  let fastStart = '20:00';
  let fastEnd = '12:00';

  if (session) {
    // If actively fasting, sync the card to the active session limits
    fastStart = format(parseISO(session.fast_start_time), 'HH:mm');
    fastEnd = format(parseISO(session.planned_fast_end_time), 'HH:mm');
  } else if (todayPlan) {
    // If not fasting, show the default template
    fastStart = todayPlan.fast_start_time?.substring(0, 5) || '20:00';
    fastEnd = todayPlan.fast_end_time?.substring(0, 5) || '12:00';
  }

  const formattedFastWindow = `${fastStart} - ${fastEnd}`;
  const formattedEatingWindow = `${fastEnd} - ${fastStart}`;

  return (
    <div className="flex flex-col h-full space-y-6 pt-4 px-4 md:px-8 max-w-3xl mx-auto">
      
      {/* Mobile Top Header */}
      <header className="md:hidden flex justify-between items-center pb-2">
        <h1 className="text-xl font-bold text-primary tracking-tight">FastTracker</h1>
        <div className="flex gap-4 text-text-secondary">
          <button className="hover:text-primary transition-colors"><Settings className="w-5 h-5" /></button>
          <button onClick={logout} className="hover:text-status-error transition-colors"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="flex flex-col gap-6">
        
        {session ? (
          <>
            <CurrentSessionCard 
              status="fasting"
              elapsedTime={elapsedString}
              progressPercent={progressPct}
              currentPhase={phase}
              lastMealTime={lastMealFormatted}
              fastTargetTime={targetFormatted}
              remainingTime={remainingString}
              onEdit={() => setIsEditModalOpen(true)}
            />

            <TodaysPlanCard 
                fastWindow={formattedFastWindow} 
                eatingWindow={formattedEatingWindow} 
            />
	    
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto w-full">
              <button 
                onClick={handleEndFast}
                disabled={actionLoading}
                className="flex flex-col items-center justify-center p-4 bg-primary text-surface rounded-xl shadow-sm hover:bg-primary-hover active:bg-primary-active transition-all duration-150 disabled:opacity-50"
              >
                <Square className="w-6 h-6 mb-2 fill-current" />
                <span className="font-semibold text-sm">End Fast</span>
              </button>
              
              <button 
                onClick={() => setIsMealModalOpen(true)}
                disabled={actionLoading}
                className="flex flex-col items-center justify-center p-4 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text-primary dark:text-text-light rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150 disabled:opacity-50"
              >
                <Coffee className="w-6 h-6 mb-2 text-primary" />
                <span className="font-semibold text-sm">I Ate Something</span>
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <CurrentSessionCard status="unplanned" />
            <div className="w-full mt-6">
              <TodaysPlanCard 
                  fastWindow={formattedFastWindow} 
                  eatingWindow={formattedEatingWindow} 
              />
            </div>
            <button 
              onClick={handleStartFast}
              disabled={actionLoading}
              className="mt-8 flex flex-col items-center justify-center px-12 py-4 bg-primary text-surface rounded-full shadow-md hover:bg-primary-hover transition-all duration-150 disabled:opacity-50 border-4 border-background dark:border-background-dark"
            >
              <span className="font-semibold text-lg flex items-center gap-2">
                <Play className="w-5 h-5 fill-current" /> Start Fast Now
              </span>
            </button>
          </div>
        )}
      </main>

      {/* "I Ate Something" Modal */}
      {isMealModalOpen && (
        <SnackDecisionModal 
          session={session} 
          onClose={() => setIsMealModalOpen(false)} 
          onComplete={() => {
            setIsMealModalOpen(false);
            fetchDashboard();
          }} 
        />
      )}
      
      {/* Edit Session Modal */}
      {isEditModalOpen && session && (
        <EditSessionModal 
          session={{ ...session, session_id: session.id }} 
          onClose={() => setIsEditModalOpen(false)} 
          onRefresh={fetchDashboard} 
        />
      )}
    </div>
  );
}