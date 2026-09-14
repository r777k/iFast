import React from 'react';
import { Clock, Target, ArrowRight, Edit2, AlertTriangle, Flame, Zap, Activity, Utensils } from 'lucide-react';

export default function CurrentSessionCard({ 
  status = 'fasting', 
  elapsedTime = '0h 0m',
  elapsedHours = 0,
  stages = [],
  progressPercent = 0,
  lastMealTime = '--:--',
  fastTargetTime = '--:--',
  remainingTime = '--:--',
  onEdit
}) {
  const isUnplanned = status === 'unplanned';
  const safeProgress = isUnplanned ? 0 : progressPercent;
  
  const currentStage = stages.find(s => elapsedHours >= s.start_hour && elapsedHours < s.end_hour) 
    || stages[stages.length - 1] 
    || { stage_name: 'Not Started', primary_fuel: '-', associated_benefits: '-', key_events: '-', caution_level: 'Standard Fast', warning_banner: '' };

  const circleRadius = 80;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (circumference * safeProgress) / 100;

  const statusConfig = {
    fasting: { text: 'Currently Fasting', color: 'bg-primary text-surface', dot: 'bg-surface' },
    eating: { text: 'Eating Window', color: 'bg-status-warning text-surface', dot: 'bg-surface' },
    unplanned: { text: 'Not Scheduled', color: 'bg-gray-200 text-text-primary', dot: 'bg-gray-400' }
  };
  const activeStatus = statusConfig[status];
  const isCaution = currentStage.caution_level !== 'Standard Fast';

  // Elegant icon mapping for fuel sources
  const getFuelIcon = (fuelText) => {
    const text = fuelText.toLowerCase();
    if (text.includes('dietary glucose')) return <Utensils className="w-5 h-5 mb-1.5 text-text-secondary/60" />;
    if (text.includes('ketones (dominant)')) return <Zap className="w-5 h-5 mb-1.5 text-text-secondary/60" />;
    if (text.includes('ketones + fat')) return (
      <div className="flex gap-1 mb-1.5 text-text-secondary/60">
        <Zap className="w-4 h-4"/><Flame className="w-4 h-4"/>
      </div>
    );
    if (text.includes('ketones')) return <Zap className="w-5 h-5 mb-1.5 text-text-secondary/60" />;
    if (text.includes('glycogen + free fatty acids')) return (
      <div className="flex gap-1 mb-1.5 text-text-secondary/60">
        <Activity className="w-4 h-4"/><Flame className="w-4 h-4"/>
      </div>
    );
    if (text.includes('fat')) return <Flame className="w-5 h-5 mb-1.5 text-text-secondary/60" />;
    return <Activity className="w-5 h-5 mb-1.5 text-text-secondary/60" />;
  };

  return (
    <div className="bg-surface dark:bg-surface-dark rounded-xl p-4 md:p-6 shadow-sm border border-border dark:border-border-dark flex flex-col items-center max-w-lg w-full mx-auto">
      
      {/* INJECTED AUTO-SCROLL CSS */}
      <style>{`
        @keyframes marquee-x {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes marquee-y {
          0% { transform: translateY(100%); }
          100% { transform: translateY(-100%); }
        }
        .auto-scroll-x {
          display: inline-block;
          white-space: nowrap;
          animation: marquee-x 18s linear infinite;
        }
        .auto-scroll-y {
          display: inline-block;
          animation: marquee-y 25s linear infinite;
        }
        .pause-on-hover:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* 1. Header Row */}
      <div className="w-full flex items-center gap-3 mb-6">
        <div className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${activeStatus.color}`}>
          <div className={`w-2 h-2 rounded-full ${activeStatus.dot}`} />
          {activeStatus.text}
        </div>
        
        {!isUnplanned && (
          // Replaced yellow with a subtle, transparent inset cut-out
          <div className="flex-1 overflow-hidden bg-black/[0.03] dark:bg-white/[0.03] shadow-inner border border-black/5 dark:border-white/5 rounded-lg px-3 py-1.5 relative h-7">
            <span className="text-xs font-medium text-primary dark:text-primary-hover absolute left-0 w-full auto-scroll-x pause-on-hover cursor-default">
              ✨ {currentStage.associated_benefits}
            </span>
          </div>
        )}
      </div>

      {/* 2. Main Display Row */}
      <div className="w-full flex justify-between items-center mb-6 gap-2 md:gap-4">
        
        {/* Left: Primary Fuel Box (Inset Styling + Icons) */}
        <div className="w-1/4 h-24 bg-black/[0.03] dark:bg-white/[0.03] shadow-inner border border-black/5 dark:border-white/5 rounded-lg p-2 flex flex-col justify-center items-center text-center">
          {getFuelIcon(currentStage.primary_fuel)}
          <span className="text-[9px] md:text-[10px] uppercase text-text-secondary font-bold tracking-wider mb-0.5">Fuel Source</span>
          <span className="text-xs font-semibold text-primary leading-tight">
            {isUnplanned ? '--' : currentStage.primary_fuel}
          </span>
        </div>

        {/* Center: Circular Timer */}
        <div className="relative flex items-center justify-center flex-shrink-0 w-48 h-48">
          <svg width="100%" height="100%" viewBox="0 0 200 200" className="transform -rotate-90 absolute inset-0">
            <circle cx="100" cy="100" r={circleRadius} fill="transparent" stroke="currentColor" strokeWidth="10" className="text-gray-100 dark:text-gray-800" />
            <circle
              cx="100" cy="100" r={circleRadius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth="10"
              strokeLinecap="round"
              className="text-primary transition-all duration-1000 ease-in-out"
              style={{ strokeDasharray: circumference, strokeDashoffset: strokeDashoffset }}
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center w-3/4">
            <span className="text-text-secondary dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">
              {isUnplanned ? '0%' : `${safeProgress}%`}
            </span>
            <span className="text-3xl md:text-4xl font-bold text-text-primary dark:text-text-light font-mono tracking-tight leading-none mb-1">
              {isUnplanned ? '0h 0m' : elapsedTime}
            </span>
            <span className="text-primary text-xs font-bold bg-primary/10 px-2 py-0.5 rounded uppercase tracking-wide">
              {isUnplanned ? 'Waiting' : currentStage.stage_name}
            </span>
          </div>
        </div>

        {/* Right: Physiology Vertical Auto-Scroll (Inset Styling) */}
        <div className="w-1/4 h-24 overflow-hidden bg-black/[0.03] dark:bg-white/[0.03] shadow-inner border border-black/5 dark:border-white/5 rounded-lg p-2 flex flex-col relative text-center">
          <span className="text-[9px] md:text-[10px] uppercase text-text-secondary font-bold tracking-wider mb-1 flex-shrink-0 z-10 bg-transparent">Physiology</span>
          <div className="relative flex-1 w-full overflow-hidden">
            <div className="absolute top-0 left-0 w-full auto-scroll-y pause-on-hover cursor-default text-[10px] font-medium text-primary leading-relaxed px-1">
              {isUnplanned ? '--' : currentStage.key_events}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Caution / Warning Banner */}
      {!isUnplanned && (
        <div className={`w-full px-4 py-2.5 rounded-lg mb-6 flex flex-col md:flex-row md:items-center gap-2 ${
          isCaution ? 'bg-status-error/10 border border-status-error/20 text-status-error' : 'bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text-secondary'
        }`}>
          {isCaution && <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          <span className="text-xs font-medium">
            <strong className="mr-1">{currentStage.caution_level}:</strong> 
            {currentStage.warning_banner}
          </span>
        </div>
      )}

      {/* 4. Segmented Stage Timeline */}
      <div className="w-full mb-8">
        <div className="flex h-2 w-full rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 mb-2 gap-0.5">
          {stages.slice(0, 4).map((stage, idx) => (
             <div 
               key={idx} 
               className={`h-full transition-colors ${elapsedHours >= stage.start_hour ? 'bg-primary' : 'bg-transparent'}`} 
               style={{ width: `${100 / Math.min(stages.length, 4)}%` }} 
               title={stage.stage_name} 
             />
          ))}
        </div>
        <div className="flex justify-between text-[9px] md:text-[10px] text-text-secondary font-bold px-1">
          {stages.slice(0, 4).map((stage, idx) => (
            <span key={idx} className={elapsedHours >= stage.start_hour ? 'text-primary' : ''}>
              {stage.stage_name}
            </span>
          ))}
        </div>
      </div>

      {/* 5. Key Metrics Row */}
      <div className="w-full grid grid-cols-3 gap-4 border-t border-border dark:border-border-dark pt-6">
        <div className="flex flex-col items-center relative group">
          <Clock className="w-4 h-4 text-text-secondary mb-1" />
          <span className="text-xs text-text-secondary mb-1">Last Meal</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-primary dark:text-text-light font-mono">
              {isUnplanned ? '--:--' : lastMealTime}
            </span>
            {!isUnplanned && onEdit && (
              <button onClick={onEdit} className="text-text-secondary hover:text-primary transition-colors">
                <Edit2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center border-l border-r border-border dark:border-border-dark relative group">
          <Target className="w-4 h-4 text-text-secondary mb-1" />
          <span className="text-xs text-text-secondary mb-1">Target</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-primary dark:text-text-light font-mono">
              {isUnplanned ? '--:--' : fastTargetTime}
            </span>
            {!isUnplanned && onEdit && (
              <button onClick={onEdit} className="text-text-secondary hover:text-primary transition-colors">
                <Edit2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center">
          <ArrowRight className="w-4 h-4 text-text-secondary mb-1" />
          <span className="text-xs text-text-secondary mb-1">Remaining</span>
          <span className="text-sm font-semibold text-text-primary dark:text-text-light font-mono">
            {isUnplanned ? '--:--' : remainingTime}
          </span>
        </div>
      </div>

    </div>
  );
}