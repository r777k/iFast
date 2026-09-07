import React, { useState, useEffect } from 'react';
import { Save, Bell, Calendar, Clock } from 'lucide-react';
import { apiClient } from '../api/client';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // 1. Fasting Rules State (Matched to RulesUpdate schema)
  const [rules, setRules] = useState({
    min_duration_to_count_hours: 12,
    snack_behavior: 'ask_each_time',
    allow_edit_past_meals: true
  });
  
  // 2. Notifications State (Matched to NotificationsUpdate schema)
  const [notifications, setNotifications] = useState({
    notifications_enabled: true,
    remind_before_eating_window_end: false,
    remind_before_minutes: 30,
    light_checkins_enabled: false
  });

  // 3. Plan State (Matched to PlanCreate schema)
  const [plan, setPlan] = useState({
    name: '16:8 Standard',
    fast_start_time: '20:00',
    fast_end_time: '12:00',
    target_duration_hours: 16
  });

  useEffect(() => {
    const fetchAllSettings = async () => {
      try {
        const [rulesRes, notifRes, plansRes] = await Promise.all([
          apiClient.get('/settings/fasting-rules'),
          apiClient.get('/settings/notifications'),
          apiClient.get('/fasting-plans') 
        ]);
        
        if (rulesRes.data) setRules(rulesRes.data);
        if (notifRes.data) setNotifications(notifRes.data);
        
        // Fix: Correctly access the nested "plans" array from the API response
        const planList = plansRes.data?.plans;
        if (planList && planList.length > 0) {
          const defaultPlan = planList.find(p => p.is_default) || planList[0];
          setPlan({
            name: defaultPlan.name || '16:8 Standard',
            fast_start_time: defaultPlan.fast_start_time.substring(0, 5),
            fast_end_time: defaultPlan.fast_end_time.substring(0, 5),
            target_duration_hours: defaultPlan.target_duration_hours || 16,
          });
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllSettings();
  }, []);

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Bulletproof time formatting to strictly guarantee "HH:MM:SS"
      const formatTime = (t) => {
        if (!t) return "00:00:00";
        const parts = t.split(':');
        const hh = (parts[0] || '00').padStart(2, '0');
        const mm = (parts[1] || '00').padStart(2, '0');
        return `${hh}:${mm}:00`;
      };

      // Payload matched perfectly to PlanCreate Pydantic schema
      const planPayload = {
        name: plan.name,
        fast_start_time: formatTime(plan.fast_start_time),
        fast_end_time: formatTime(plan.fast_end_time),
        target_duration_hours: Number(plan.target_duration_hours),
        is_default: true,
        is_daily: true
      };

      await Promise.all([
        apiClient.patch('/settings/fasting-rules', rules),
        apiClient.patch('/settings/notifications', notifications),
        // Since there is no PATCH route for updating plan times, we create a new default plan
        apiClient.post('/fasting-plans', planPayload)
      ]);
      
      alert('All settings saved successfully.');
    } catch (error) {
      console.error('Save error:', error);
      if (error.response?.status === 422 && error.response?.data?.detail) {
        const details = error.response.data.detail;
        const messages = Array.isArray(details) 
          ? details.map(d => `Field '${d.loc[d.loc.length - 1]}': ${d.msg}`).join('\n')
          : JSON.stringify(details);
        
        alert(`Server Validation Error:\n\n${messages}`);
      } else {
        alert('Failed to save settings. Check console for details.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-text-secondary">Loading settings...</div>;
  }

  return (
    <div className="flex flex-col h-full space-y-6 pt-4 px-4 md:px-8 max-w-3xl mx-auto pb-32">
      
      <header className="mb-2 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-text-primary dark:text-text-light tracking-tight">Settings</h2>
          <p className="text-sm text-text-secondary">Configure your fasting experience</p>
        </div>
        <button 
          onClick={handleSaveAll}
          disabled={saving}
          className="hidden md:flex items-center gap-2 bg-primary hover:bg-primary-hover active:bg-primary-active text-surface font-medium px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save All'}
        </button>
      </header>

      {/* --- Section 1: Daily Plan Template --- */}
      <section className="bg-surface dark:bg-surface-dark p-6 rounded-xl border border-border dark:border-border-dark shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-text-primary dark:text-text-light">Default Fasting Plan</h3>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-text-light mb-1">Fast Starts</label>
              <input 
                type="time" 
                value={plan.fast_start_time}
                onChange={(e) => setPlan({...plan, fast_start_time: e.target.value})}
                className="w-full px-4 py-3 rounded-lg border border-border dark:border-border-dark bg-background dark:bg-background-dark focus:ring-2 focus:ring-primary/50 text-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-text-light mb-1">Fast Ends</label>
              <input 
                type="time" 
                value={plan.fast_end_time}
                onChange={(e) => setPlan({...plan, fast_end_time: e.target.value})}
                className="w-full px-4 py-3 rounded-lg border border-border dark:border-border-dark bg-background dark:bg-background-dark focus:ring-2 focus:ring-primary/50 text-text-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-text-light mb-1">Target Duration (Hours)</label>
            <input 
              type="number" 
              value={plan.target_duration_hours}
              onChange={(e) => setPlan({...plan, target_duration_hours: Number(e.target.value)})}
              className="w-full md:w-1/2 px-4 py-3 rounded-lg border border-border dark:border-border-dark bg-background dark:bg-background-dark focus:ring-2 focus:ring-primary/50 text-text-primary"
            />
          </div>
        </div>
      </section>

      {/* --- Section 2: Notifications --- */}
      <section className="bg-surface dark:bg-surface-dark p-6 rounded-xl border border-border dark:border-border-dark shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-text-primary dark:text-text-light">Notifications</h3>
        </div>
        
        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 border border-border dark:border-border-dark rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <div>
              <span className="block text-sm font-bold text-text-primary dark:text-text-light">Global Notifications</span>
              <span className="block text-xs text-text-secondary mt-0.5">Enable or disable all app alerts</span>
            </div>
            <input 
              type="checkbox" 
              checked={notifications.notifications_enabled}
              onChange={(e) => setNotifications({...notifications, notifications_enabled: e.target.checked})}
              className="w-5 h-5 text-primary focus:ring-primary border-gray-300 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-4 border border-border dark:border-border-dark rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <div>
              <span className="block text-sm font-bold text-text-primary dark:text-text-light">Eating Window Closing</span>
              <span className="block text-xs text-text-secondary mt-0.5">Remind me before it's time to fast again</span>
            </div>
            <input 
              type="checkbox" 
              checked={notifications.remind_before_eating_window_end}
              onChange={(e) => setNotifications({...notifications, remind_before_eating_window_end: e.target.checked})}
              className="w-5 h-5 text-primary focus:ring-primary border-gray-300 rounded"
            />
          </label>
        </div>
      </section>

      {/* --- Section 3: Fasting Rules --- */}
      <section className="bg-surface dark:bg-surface-dark p-6 rounded-xl border border-border dark:border-border-dark shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-text-primary dark:text-text-light">Fasting Rules</h3>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-text-light mb-1">
              Minimum Fast Duration (Hours)
            </label>
            <p className="text-xs text-text-secondary mb-3">Fasts shorter than this won't be saved to your history.</p>
            <input 
              type="number" 
              min="1"
              max="72"
              value={rules.min_duration_to_count_hours}
              onChange={(e) => setRules({...rules, min_duration_to_count_hours: Number(e.target.value)})}
              className="w-full md:w-1/2 px-4 py-3 rounded-lg border border-border dark:border-border-dark bg-background dark:bg-background-dark focus:ring-2 focus:ring-primary/50 text-text-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-text-light mb-1">
              Snack Behavior
            </label>
            <p className="text-xs text-text-secondary mb-3">What happens when you log a snack?</p>
            <div className="space-y-3">
              {[
                { id: 'ask_each_time', label: 'Ask me each time', desc: 'Opens the decision modal' },
                { id: 'auto_restart', label: 'Automatically restart', desc: 'Treats the snack as your new last meal' },
                { id: 'ignore', label: 'Ignore snacks', desc: 'Keeps the original timer running' }
              ].map((option) => (
                <label 
                  key={option.id} 
                  className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    rules.snack_behavior === option.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border dark:border-border-dark hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="snack_behavior" 
                    value={option.id}
                    checked={rules.snack_behavior === option.id}
                    onChange={(e) => setRules({...rules, snack_behavior: e.target.value})}
                    className="mt-0.5 text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="block text-sm font-bold text-text-primary dark:text-text-light">{option.label}</span>
                    <span className="block text-xs text-text-secondary mt-0.5">{option.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Floating Save Button */}
      <div className="md:hidden fixed bottom-[72px] left-4 right-4 z-40">
        <button 
          onClick={handleSaveAll}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover active:bg-primary-active text-surface font-medium px-6 py-4 rounded-xl shadow-lg transition-colors disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>

    </div>
  );
}