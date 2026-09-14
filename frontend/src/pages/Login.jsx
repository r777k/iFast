import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Activity } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // --- Carousel State & Logic ---
  const [currentImage, setCurrentImage] = useState(0);
  const previews = [
    '/preview-dashboard.png',
    '/preview-history.png',
    '/preview-insights.png',
    '/preview-heatmap.png'
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % previews.length);
    }, 4000); // Crossfade every 4 seconds
    return () => clearInterval(timer);
  }, [previews.length]);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiClient.post('/auth/request-otp', { email });
      setStep(2);
    } catch (err) {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Magically gets 'Asia/Kolkata' or wherever the user currently is
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      const { data } = await apiClient.post('/auth/verify-otp', { 
        email, 
        otp,
        timezone: userTimezone 
      });
      login(data.access_token);
      navigate('/');
    } catch (err) {
      setError('Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background dark:bg-background-dark flex flex-col md:flex-row font-sans">
      
      {/* Left Side: Animated App Preview */}
      <div className="hidden md:flex md:w-1/2 bg-surface dark:bg-surface-dark border-r border-border dark:border-border-dark flex-col items-center justify-center p-12 relative overflow-hidden">
        
        {/* Branding Overlay */}
        <div className="absolute top-12 left-12 z-20">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Activity className="w-6 h-6" />
            <h1 className="text-2xl font-bold tracking-tight">FastTracker</h1>
          </div>
          <p className="text-xs text-text-secondary font-bold uppercase tracking-widest">
            Engineer Your Metabolism
          </p>
        </div>

        {/* Cross-fading Image Carousel */}
        <div className="relative w-full max-w-lg aspect-square mt-12 rounded-2xl shadow-2xl border border-border dark:border-border-dark overflow-hidden bg-white dark:bg-gray-900">
          {previews.map((src, idx) => (
            <img
              key={src}
              src={src}
              alt={`App Preview ${idx + 1}`}
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out ${
                idx === currentImage 
                  ? 'opacity-100 scale-100' 
                  : 'opacity-0 scale-105'
              }`}
            />
          ))}
        </div>
        
        {/* Carousel Indicators */}
        <div className="absolute bottom-12 flex gap-3 z-20">
          {previews.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-1.5 rounded-full transition-all duration-500 ${
                idx === currentImage ? 'w-8 bg-primary' : 'w-2 bg-gray-300 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 relative">
        
        {/* Mobile Branding (Hidden on Desktop) */}
        <div className="md:hidden flex flex-col items-center mb-10">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Activity className="w-8 h-8" />
            <h1 className="text-3xl font-bold tracking-tight">FastTracker</h1>
          </div>
          <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">
            Engineer Your Metabolism
          </p>
        </div>

        <div className="w-full max-w-sm bg-surface dark:bg-surface-dark p-8 rounded-2xl shadow-sm border border-border dark:border-border-dark">
          <h2 className="text-2xl font-bold text-text-primary dark:text-text-light mb-2 text-center">
            {step === 1 ? 'Welcome Back' : 'Verify Code'}
          </h2>
          <p className="text-sm text-text-secondary text-center mb-8">
            {step === 1 ? 'Enter your email to access your telemetry.' : `Code sent to ${email}`}
          </p>

          {error && (
            <div className="mb-6 p-3 bg-status-error/10 border border-status-error/20 text-status-error text-sm rounded-lg text-center font-medium">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-text-light mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-border dark:border-border-dark focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-primary dark:text-text-light bg-background dark:bg-background-dark transition-shadow"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-hover active:bg-primary-active text-surface font-medium py-3 rounded-lg transition-colors disabled:opacity-50 mt-2"
              >
                {loading ? 'Sending Code...' : 'Send Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-text-light mb-1.5 text-center">
                  6-Digit OTP
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-border dark:border-border-dark focus:outline-none focus:ring-2 focus:ring-primary/50 text-center text-xl font-mono tracking-widest text-text-primary dark:text-text-light bg-background dark:bg-background-dark transition-shadow"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-hover active:bg-primary-active text-surface font-medium py-3 rounded-lg transition-colors disabled:opacity-50 mt-2"
              >
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setStep(1);
                  setOtp('');
                  setError('');
                }}
                className="w-full text-sm text-text-secondary hover:text-primary transition-colors mt-2 font-medium"
              >
                Use a different email
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}