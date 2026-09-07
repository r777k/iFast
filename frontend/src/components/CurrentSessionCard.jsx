import React from 'react';
import { Clock, Target, ArrowRight, Edit2 } from 'lucide-react';

export default function CurrentSessionCard({ 
  status = 'fasting', // 'fasting', 'eating', 'unplanned'
  elapsedTime = '8h 32m',
  progressPercent = 53,
  currentPhase = 'Fat Burning',
  lastMealTime = '2:30 PM',
  fastTargetTime = '4:30 PM',
  remainingTime = '8h 0m',
  onEdit
}) {
  
  // 1. Determine if we should show dummy data or zeroes
  const isUnplanned = status === 'unplanned';
  const safeProgress = isUnplanned ? 0 : progressPercent;
  
  // SVG Circle Math
  const circleRadius = 90;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (circumference * safeProgress) / 100;

  // Status configuration mapping
  const statusConfig = {
    fasting: { text: 'Currently Fasting', color: 'bg-primary text-surface', dot: 'bg-surface' },
    eating: { text: 'Eating Window', color: 'bg-status-warning text-surface', dot: 'bg-surface' },
    unplanned: { text: 'Not Scheduled', color: 'bg-gray-200 text-text-primary', dot: 'bg-gray-400' }
  };
  const activeStatus = statusConfig[status];

  return (
    <div className="bg-surface dark:bg-surface-dark rounded-xl p-6 shadow-sm border border-border dark:border-border-dark flex flex-col items-center max-w-md w-full mx-auto">
      
      {/* 1. Status Badge */}
      <div className="w-full flex justify-start mb-6">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${activeStatus.color}`}>
          <div className={`w-2 h-2 rounded-full ${activeStatus.dot}`} />
          {activeStatus.text}
        </div>
      </div>

      {/* 2. Large Circular Timer */}
      <div className="relative flex items-center justify-center mb-8">
        <svg width="220" height="220" viewBox="0 0 200 200" className="transform -rotate-90">
          {/* Background Track */}
          <circle
            cx="100" cy="100" r={circleRadius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="12"
            className="text-gray-100 dark:text-gray-800"
          />
          {/* Progress Ring */}
          <circle
            cx="100" cy="100" r={circleRadius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
            className="text-primary transition-all duration-1000 ease-in-out"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: strokeDashoffset,
            }}
          />
        </svg>

        {/* Center Text inside Timer */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-text-secondary dark:text-gray-400 text-sm font-medium mb-1">
            {isUnplanned ? '0%' : `${safeProgress}%`} • {isUnplanned ? 'Waiting' : currentPhase}
          </span>
          <span className="text-4xl font-bold text-text-primary dark:text-text-light font-mono tracking-tight">
            {isUnplanned ? '0h 0m' : elapsedTime}
          </span>
        </div>
      </div>

      {/* 3. Phase Indicator Bar */}
      <div className="w-full mb-8">
        <div className="flex h-2 w-full rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 mb-2">
          {/* Mute the phase colors if unplanned */}
          <div className={`h-full ${isUnplanned ? 'bg-transparent' : 'bg-primary/40'} w-1/4`} title="Ramp-up (0-25%)" />
          <div className={`h-full ${isUnplanned ? 'bg-transparent' : 'bg-primary'} w-2/4`} title="Fat Burning (25-75%)" />
          <div className={`h-full ${isUnplanned ? 'bg-transparent' : 'bg-primary-active'} w-1/4`} title="Deep Fast (75-100%)" />
          {safeProgress > 100 && (
            <div className="h-full bg-status-warning w-1/4" title="Extended (100%+)" />
          )}
        </div>
        <div className="flex justify-between text-[10px] text-text-secondary uppercase font-semibold px-1">
          <span>Ramp-up</span>
          <span>Fat Burn</span>
          <span>Deep Fast</span>
        </div>
      </div>

      {/* 4. Key Metrics Row */}
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