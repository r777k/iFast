import React from 'react';
import { Edit2, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // <-- 1. Import the hook

export default function TodaysPlanCard({ fastWindow = "16:00 - 08:00", eatingWindow = "08:00 - 16:00" }) {
  const navigate = useNavigate(); // <-- 2. Initialize the hook

  return (
    <div className="bg-surface dark:bg-surface-dark rounded-xl p-6 shadow-sm border border-border dark:border-border-dark w-full max-w-md mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Today's Schedule</h3>
        <button 
          onClick={() => navigate('/settings')} 
          className="text-primary hover:text-primary-hover active:text-primary-active flex items-center gap-1 text-xs font-semibold transition-colors duration-150"
        >
          <Edit2 className="w-3 h-3" /> Edit Plan
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <Moon className="w-4 h-4 text-primary" />
            <span className="text-text-primary dark:text-text-light font-medium text-sm">Fasting Window</span>
          </div>
          <span className="text-text-secondary font-mono text-sm font-semibold">{fastWindow}</span>
        </div>
        
        <div className="flex justify-between items-center p-3 bg-status-warning/5 dark:bg-status-warning/10 rounded-lg border border-status-warning/10">
          <div className="flex items-center gap-3">
            <Sun className="w-4 h-4 text-status-warning" />
            <span className="text-text-primary dark:text-text-light font-medium text-sm">Eating Window</span>
          </div>
          <span className="text-text-secondary font-mono text-sm font-semibold">{eatingWindow}</span>
        </div>
      </div>
    </div>
  );
}