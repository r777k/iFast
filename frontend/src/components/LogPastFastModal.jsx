import React, { useState } from 'react';
import { X } from 'lucide-react';
import { apiClient } from '../api/client';

export default function LogPastFastModal({ onClose, onRefresh }) {
  const [lastMeal, setLastMeal] = useState('');
  const [endTime, setEndTime] = useState('');
  const [target, setTarget] = useState(16);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/fasting-sessions/manual', {
        last_meal_time: new Date(lastMeal).toISOString(),
        actual_fast_end_time: new Date(endTime).toISOString(),
        target_duration_hours: Number(target)
      });
      onRefresh();
      onClose();
    } catch (error) {
      console.error('Failed to log session:', error);
      alert('Failed to log fast.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-surface dark:bg-surface-dark rounded-2xl w-full max-w-md p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
        <button onClick={onClose} disabled={loading} className="absolute top-4 right-4 text-text-secondary hover:text-text-primary">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-bold mb-4">Log Past Fast</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Last Meal Time</label>
            <input type="datetime-local" required value={lastMeal} onChange={(e) => setLastMeal(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-border bg-background" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fast Ended At</label>
            <input type="datetime-local" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-border bg-background" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Target Hours (e.g., 16)</label>
            <input type="number" required value={target} onChange={(e) => setTarget(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-border bg-background" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-primary text-white py-3 rounded-lg mt-2">
            {loading ? 'Saving...' : 'Save Fast'}
          </button>
        </form>
      </div>
    </div>
  );
}