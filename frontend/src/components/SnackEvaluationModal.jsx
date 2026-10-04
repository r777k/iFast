import React, { useState } from 'react';
import { X, Search, AlertTriangle, CheckCircle, HelpCircle, Coffee } from 'lucide-react';
import { apiClient } from '../api/client';

export default function SnackEvaluationModal({ isOpen, onClose, onEndFast }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Sends the text to the Groq/FastAPI endpoint we built
      const res = await apiClient.post('/fasting-sessions/snack-inference', {
        text: input,
        fasting_mode: 'practical' // In the future, you could pull this from settings
      });
      setResult(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to evaluate intake. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setInput('');
    setResult(null);
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold">
            <Coffee className="w-5 h-5 text-teal-500" />
            <h3>Log an Intake</h3>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* Default Input State */}
          {!result && !loading && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  What did you just have?
                </label>
                <textarea
                  autoFocus
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 resize-none transition-shadow"
                  placeholder="e.g., A splash of whole milk in my coffee, or one sugar-free mint."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim()}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-600/50 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Search className="w-5 h-5" />
                Analyze Intake
              </button>
            </form>
          )}

          {/* Loading State */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin"></div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium animate-pulse">Running nutritional analysis...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 dark:text-rose-400 text-sm mb-4">
              {error}
            </div>
          )}

          {/* Result State */}
          {result && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
              {/* Dynamic Icon & Title based on the Deterministic Decision */}
              <div className="flex flex-col items-center text-center space-y-3">
                {result.decision === 'continue' && (
                  <>
                    <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Fast Untouched!</h3>
                  </>
                )}
                {result.decision === 'break_fast' && (
                  <>
                    <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Fast Broken</h3>
                  </>
                )}
                {result.decision === 'needs_confirmation' && (
                  <>
                    <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Need More Info</h3>
                  </>
                )}
              </div>

              {/* Message Box */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 leading-relaxed text-center">
                {result.message}
                {result.needs_user_input && (
                  <div className="mt-3 font-semibold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800 pt-3">
                    {result.needs_user_input}
                  </div>
                )}
              </div>

              {/* Adaptive Actions */}
              <div className="space-y-3 pt-2">
                {result.decision === 'continue' && (
                  <button onClick={handleClose} className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold py-3 px-4 rounded-xl transition-colors">
                    Awesome, keep fasting
                  </button>
                )}
                
                {result.decision === 'break_fast' && (
                  <button 
                    onClick={() => {
                      onEndFast();
                      handleClose();
                    }} 
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-xl transition-colors"
                  >
                    End Fast Now
                  </button>
                )}

                {result.decision === 'needs_confirmation' && (
                  <button onClick={() => {
                    setInput(input + " "); // Add space for continuation
                    setResult(null); // Return to input state
                  }} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-xl transition-colors">
                    Provide Clarification
                  </button>
                )}

                {(result.decision === 'break_fast' || result.decision === 'needs_confirmation') && (
                  <button onClick={reset} className="w-full text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium py-2 px-4 transition-colors text-sm">
                    Cancel
                  </button>
                )}
              </div>
              
              {/* Telemetry Debug Snippet */}
              {result.extracted && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] uppercase font-mono text-slate-400">
                  <span className="truncate pr-2">Detected: {result.extracted.item_name}</span>
                  {result.estimated_calories_kcal !== undefined && result.estimated_calories_kcal !== null && (
                    <span className="shrink-0">Est: {result.estimated_calories_kcal} kcal</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}