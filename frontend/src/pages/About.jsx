import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { Activity, ShieldAlert, Zap, Flame, Award, HeartPulse } from 'lucide-react';

export default function About() {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStages = async () => {
      try {
        const { data } = await apiClient.get('/analytics/fasting-stages');
        setStages(data);
      } catch (error) {
        console.error("Failed to fetch fasting stages info", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStages();
  }, []);

  const getStageBadgeColor = (num) => {
    if (num <= 2) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (num <= 5) return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400';
    if (num <= 7) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  };

  if (loading) {
    return <div className="p-12 text-center text-text-secondary">Loading scientific framework...</div>;
  }

  return (
    <div className="flex flex-col h-full space-y-8 pt-4 px-4 md:px-8 max-w-4xl mx-auto pb-24">
      
      {/* Header */}
      <div className="bg-surface dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-border dark:border-border-dark">
        <h1 className="text-2xl font-bold text-text-primary dark:text-text-light mb-2">The Physiology of Fasting</h1>
        <p className="text-sm text-text-secondary leading-relaxed">
          Fasting is a continuum rather than hard switches. As time progresses, your body transitions through structured metabolic phases—shifting from dietary glucose oxidation to deep ketosis, cellular autophagy, and protein conservation.
        </p>
      </div>

      {/* Stage Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stages.map((stage) => (
          <div key={stage.stage_number} className="bg-surface dark:bg-surface-dark rounded-xl p-6 shadow-sm border border-border dark:border-border-dark flex flex-col justify-between relative overflow-hidden">
            
            {/* Top Row: Stage # & Duration */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStageBadgeColor(stage.stage_number)}`}>
                  Stage {stage.stage_number}
                </span>
                <span className="text-xs font-mono font-semibold text-text-secondary">
                  {stage.start_hour}h — {stage.end_hour}h
                </span>
              </div>

              <h3 className="text-lg font-bold text-text-primary dark:text-text-light mb-2">
                {stage.stage_name}
              </h3>

              <div className="mb-4 text-xs font-medium text-primary">
                <strong>Primary Fuel:</strong> {stage.primary_fuel}
              </div>

              <p className="text-xs text-text-secondary leading-relaxed mb-4">
                {stage.key_events}
              </p>
            </div>

            {/* Bottom Section: Benefits & Caution */}
            <div className="border-t border-border dark:border-border-dark pt-4 mt-2 space-y-2">
              <div className="text-xs text-text-primary dark:text-text-light">
                <strong className="text-primary">Associated Benefits:</strong> {stage.associated_benefits}
              </div>

              {stage.caution_level !== 'Standard Fast' && (
                <div className="text-[11px] font-semibold text-status-error bg-status-error/10 px-2.5 py-1.5 rounded flex items-center gap-1.5 mt-2">
                  <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{stage.caution_level}: {stage.warning_banner}</span>
                </div>
              )}
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}