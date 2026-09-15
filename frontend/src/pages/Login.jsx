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
  const [isFocused, setIsFocused] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // --- Mobile Quiet Carousel State ---
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [
    { src: '/preview-LiveMetabolicState.jpg', alt: 'Live Metabolic State' },
    { src: '/preview-Calendar.jpg', alt: 'Fasting Calendar' },
    { src: '/preview-Trends.jpg', alt: 'Duration Trends' }
  ];

  useEffect(() => {
    // Respect system-level accessibility settings for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Pause the cycle if the user is interacting with the form or prefers no motion
    if (isFocused || prefersReducedMotion) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000); // Quiet 6-second interval

    return () => clearInterval(timer);
  }, [isFocused]);

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
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { data } = await apiClient.post('/auth/verify-otp', { email, otp, timezone: userTimezone });
      login(data.access_token);
      navigate('/');
    } catch (err) {
      setError('Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans bg-white dark:bg-background-dark">
      
      {/* --- DESKTOP: Left Panel (Product Story) --- */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] bg-slate-900 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 to-slate-950 flex-col relative overflow-hidden p-12 xl:p-16 border-r border-slate-800">
        
        {/* Subtle Technical Grid Background */}
        <div className="absolute inset-0 z-0 opacity-[0.15]" style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        {/* Branding */}
        <div className="relative z-10 flex items-center gap-2 text-teal-400 mb-1">
          <Activity className="w-7 h-7" />
          <h1 className="text-3xl font-bold tracking-tight text-white">FastTracker</h1>
        </div>
        <p className="relative z-10 text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-16">
          Engineer Your Metabolism
        </p>

        {/* Narrative */}
        <div className="relative z-10 mb-10 max-w-xl">
          <h2 className="text-3xl xl:text-4xl font-light text-slate-200 leading-snug">
            Know where you are in your fast—<br/><span className="font-semibold text-white">and what comes next.</span>
          </h2>
        </div>

        {/* Static 3-Crop Layout */}
        <div className="relative z-10 flex-1 flex flex-col w-full max-w-[700px]">
          {/* Main Hero Crop */}
          <div className="mb-6">
            <img 
              src="/preview-LiveMetabolicState.png" 
              alt="Live Metabolic State" 
              className="w-full max-w-[360px] xl:max-w-[420px] rounded-xl shadow-2xl shadow-black/60 border border-slate-700/50"
            />
          </div>
          
          {/* Supporting Previews Row */}
          <div className="flex gap-6 pl-8 xl:pl-16">
            <img 
              src="/preview-Calendar.png" 
              alt="Build a fasting rhythm" 
              className="w-[180px] xl:w-[220px] rounded-lg shadow-xl shadow-black/40 border border-slate-700/50 opacity-95 transition-transform hover:-translate-y-1"
            />
            <img 
              src="/preview-Trends.png" 
              alt="Make progress visible" 
              className="w-[180px] xl:w-[220px] rounded-lg shadow-xl shadow-black/40 border border-slate-700/50 opacity-95 transition-transform hover:-translate-y-1"
            />
          </div>
        </div>
      </div>

      {/* --- RIGHT/MOBILE: Login Area --- */}
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-background-dark min-h-screen lg:min-h-0 relative">
        
        {/* Mobile App Branding & Carousel (Hidden on Desktop) */}
        <div className="lg:hidden flex flex-col bg-slate-900 px-6 pt-10 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-2 text-teal-400 mb-1">
            <Activity className="w-6 h-6" />
            <h1 className="text-2xl font-bold tracking-tight text-white">FastTracker</h1>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">
            Engineer Your Metabolism
          </p>
          
          {/* Mobile Preview Carousel (160 - 220px tall) */}
          <div className="relative w-full max-w-sm mx-auto aspect-[4/3] max-h-[200px] bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-700/50">
            {slides.map((slide, idx) => (
              <img
                key={slide.src}
                src={slide.src}
                alt={slide.alt}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out motion-reduce:transition-none ${
                  idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
              />
            ))}
            {/* Carousel Indicators (Hidden on very short screens) */}
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-20 hidden min-[600px]:flex">
              {slides.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentSlide ? 'w-6 bg-teal-400' : 'w-1.5 bg-white/30'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12">
          <div className="w-full max-w-sm bg-white dark:bg-surface-dark p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-border-dark">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-text-light mb-2 text-center">
              Welcome back
            </h2>
            <p className="text-sm text-slate-500 dark:text-text-secondary text-center mb-8 leading-relaxed">
              Sign in to engineer your metabolism, track your fasts!
            </p>

            {error && (
              <div className="mb-6 p-3 bg-rose-50 dark:bg-status-error/10 border border-rose-200 dark:border-status-error/20 text-rose-600 dark:text-status-error text-sm rounded-lg text-center font-medium">
                {error}
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={handleRequestOtp} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-text-light mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-border-dark focus:outline-none focus:ring-2 focus:ring-teal-500/50 text-slate-900 dark:text-text-light bg-white dark:bg-background-dark transition-shadow"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 mt-2 shadow-sm"
                >
                  {loading ? 'Sending Code...' : 'Send Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-text-light mb-1.5 text-center">
                    6-Digit OTP
                  </label>
                  <input
                    type="text"
                    required
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-border-dark focus:outline-none focus:ring-2 focus:ring-teal-500/50 text-center text-xl font-mono tracking-widest text-slate-900 dark:text-text-light bg-white dark:bg-background-dark transition-shadow uppercase"
                    placeholder="000000"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 mt-2 shadow-sm"
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
                  className="w-full text-sm text-slate-500 hover:text-teal-600 transition-colors mt-2 font-medium"
                >
                  Use a different email
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}