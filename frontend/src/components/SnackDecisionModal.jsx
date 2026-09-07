import React, { useState } from 'react';
import { X, RefreshCw, Play, Square } from 'lucide-react';
import { apiClient } from '../api/client';

export default function SnackDecisionModal({ session, onClose, onComplete }) {
  const [step, setStep] = useState(1);
  const [notes, setNotes] = useState('');
  const [mealSize, setMealSize] = useState('small');
  const [loading, setLoading] = useState(false);
  const [decisionData, setDecisionData] = useState(null);

  // Suggested snacks based on athletic preferences
  const commonSnacks = [
    "Run-Energy Gel",
    "Run-Citrulline",
    "Run-Banana",
    "Evening snacks",
    "Fruits"
  ];

  // Step 1: Log the snack and fetch decision options
  const handleLogSnack = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await apiClient.post(`/fasting-sessions/${session.id}/log-snack`, {
        snack_time: new Date().toISOString(),
        meal_size: mealSize,
        description: notes
      });
      setDecisionData(data); 
      setStep(2);
    } catch (error) {
      console.error('Failed to log snack:', error);
      alert('Failed to log snack. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit the user's decision
  const handleDecision = async (decisionId) => {
    setLoading(true);
    try {
      await apiClient.patch(`/fasting-sessions/${session.id}/handle-snack-decision`, {
        decision: decisionId,
        meal_id: decisionData.meal_id
      });
      onComplete(); 
    } catch (error) {
      console.error('Failed to process decision:', error);
      alert('Failed to process your decision.');
    } finally {
      setLoading(false);
    }
  };

  const getDecisionIcon = (id) => {
    switch (id) {
      case 'restart': return <RefreshCw className="w-5 h-5 text-primary" />;
      case 'ignore': return <Play className="w-5 h-5 text-status-success" />;
      case 'end': return <Square className="w-5 h-5 text-status-warning" />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-surface dark:bg-surface-dark rounded-2xl w-full max-w-md p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 1 ? (
          <>
            <div className="mb-6 mt-2">
              <h3 className="text-xl font-bold text-text-primary dark:text-text-light">Log a Snack</h3>
              <p className="text-sm text-text-secondary mt-1">What did you have? We'll decide what to do with your timer next.</p>
            </div>

            <form onSubmit={handleLogSnack} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-text-light mb-2">Size</label>
                <div className="grid grid-cols-3 gap-2">
                  {['small', 'medium', 'large'].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setMealSize(size)}
                      className={`py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                        mealSize === size 
                          ? 'bg-primary text-surface' 
                          : 'bg-gray-100 dark:bg-gray-800 text-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-text-light mb-1">Description (Optional)</label>
                
                <datalist id="snack-options">
                  {commonSnacks.map((snack, idx) => (
                    <option key={idx} value={snack} />
                  ))}
                </datalist>

                <input
                  type="text"
                  autoFocus
                  list="snack-options"
                  placeholder="e.g., Energy gel, Citrulline"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-border dark:border-border-dark focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-primary dark:text-text-light bg-background dark:bg-background-dark"
                />
              </div>
              
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-hover text-surface font-medium py-3 rounded-lg transition-colors mt-4 disabled:opacity-50"
              >
                {loading ? 'Logging...' : 'Next'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="mb-6 mt-2">
              <h3 className="text-xl font-bold text-text-primary dark:text-text-light">Snack Logged</h3>
              <p className="text-sm text-text-secondary mt-1">
                You were fasting for <span className="font-semibold text-text-primary dark:text-text-light">{decisionData?.current_elapsed_hours} hours</span>. What would you like to do?
              </p>
            </div>

            <div className="space-y-3">
              {decisionData?.decision_options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleDecision(option.id)}
                  disabled={loading}
                  className="w-full flex items-start text-left p-4 rounded-xl border border-border dark:border-border-dark hover:border-primary dark:hover:border-primary hover:bg-primary/5 transition-all duration-150 disabled:opacity-50"
                >
                  <div className="mr-4 mt-1 bg-surface dark:bg-surface-dark p-2 rounded-full shadow-sm border border-gray-100 dark:border-gray-800">
                    {getDecisionIcon(option.id)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-text-primary dark:text-text-light">{option.title}</h4>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}