import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { apiClient } from '../api/client';

export default function EditSessionModal({ session, onClose, onRefresh }) {
  // Pre-populate fields if the session data exists.
  const [lastMeal, setLastMeal] = useState(
    session?.fast_start_time ? format(parseISO(session.fast_start_time), "yyyy-MM-dd'T'HH:mm") : ''
  );
  const [plannedEnd, setPlannedEnd] = useState(
    session?.planned_fast_end_time ? format(parseISO(session.planned_fast_end_time), "yyyy-MM-dd'T'HH:mm") : ''
  );
  const [notes, setNotes] = useState(session?.notes || '');
  const [editReason, setEditReason] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [actualEnd, setActualEnd] = useState(
    session?.actual_fast_end_time ? format(parseISO(session.actual_fast_end_time), "yyyy-MM-dd'T'HH:mm") : ''
  );

  const [options, setOptions] = useState({ notes: [], edit_reasons: [] });
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const { data } = await apiClient.get('/analytics/user-options');
        setOptions(data);
      } catch (error) {
        console.error("Failed to fetch autocomplete options", error);
      }
    };
    fetchOptions();
  }, []);

  const handleLastMealChange = (e) => {
    const newStartStr = e.target.value;
    setLastMeal(newStartStr);

    if (newStartStr && session?.target_duration_hours) {
      const newStartDate = new Date(newStartStr);
      newStartDate.setMinutes(newStartDate.getMinutes() + (session.target_duration_hours * 60));
      setPlannedEnd(format(newStartDate, "yyyy-MM-dd'T'HH:mm"));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.patch(`/fasting-sessions/${session.session_id}`, {
        last_meal_time: lastMeal ? new Date(lastMeal).toISOString() : null,
        planned_fast_end_time: plannedEnd ? new Date(plannedEnd).toISOString() : null,
        actual_fast_end_time: actualEnd ? new Date(actualEnd).toISOString() : null, // NEW
        notes: notes,
        edit_reason: editReason
      });
      onRefresh(); 
      onClose();
    } catch (error) {
      console.error('Failed to update session:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this session? This action cannot be undone.")) return;
    
    setLoading(true);
    try {
      await apiClient.delete(`/fasting-sessions/${session.session_id}`);
      onRefresh();
      onClose();
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Failed to delete session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-surface dark:bg-surface-dark rounded-2xl w-full max-w-md p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
        
        <button 
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h3 className="text-xl font-bold text-text-primary dark:text-text-light">Edit Session</h3>
          <p className="text-sm text-text-secondary mt-1">Adjust your fasting window post-hoc.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-text-light mb-1">Last Meal / Fast Start</label>
            <input
              type="datetime-local"
              value={lastMeal}
              onChange={handleLastMealChange}
              className="w-full px-4 py-3 rounded-lg border border-border dark:border-border-dark focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-primary dark:text-text-light bg-background dark:bg-background-dark"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-text-light mb-1">Planned Fast Target</label>
            <input
              type="datetime-local"
              value={plannedEnd}
              onChange={(e) => setPlannedEnd(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-border dark:border-border-dark focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-primary dark:text-text-light bg-background dark:bg-background-dark"
            />
          </div>
          {session.status !== 'active' && (
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-text-light mb-1">Actual Fast End</label>
              <input
                type="datetime-local"
                value={actualEnd}
                onChange={(e) => setActualEnd(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border dark:border-border-dark focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-primary dark:text-text-light bg-background dark:bg-background-dark"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-text-light mb-1">Reason for Edit <span className="text-status-error">*</span></label>
            {/* The hidden datalist powers the autocomplete */}
            <datalist id="edit-reasons-options">
                {options.edit_reasons.map((reason, idx) => (
                  <option key={idx} value={reason} />
                ))}
            </datalist>
            
            <datalist id="edit-notes-options">
                {options.notes.map((note, idx) => (
                  <option key={idx} value={note} />
                ))}
            </datalist>
            <input
              type="text"
              required
              list="edit-reasons-options"
              placeholder="e.g., Forgot to tap start, logged late"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-border dark:border-border-dark focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-primary dark:text-text-light bg-background dark:bg-background-dark"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-text-light mb-1">Notes</label>
            <textarea
              rows="2"
              placeholder="E.g., Felt great energy"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-border dark:border-border-dark focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-primary dark:text-text-light bg-background dark:bg-background-dark resize-none"
            />
          </div>
          
          <div className="pt-2 flex gap-3">
            <button 
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="flex items-center justify-center p-3 text-status-error bg-status-error/10 hover:bg-status-error/20 rounded-lg transition-colors disabled:opacity-50"
              title="Delete Session"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary-hover active:bg-primary-active text-surface font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}