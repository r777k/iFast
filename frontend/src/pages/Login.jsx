import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Previews data
  const images = [
    { src: '/preview-LiveMetabolicState.png', alt: 'Live Metabolic State' },
    { src: '/preview-Calendar.png', alt: 'Fasting Calendar' },
    { src: '/preview-Trends.png', alt: 'Duration Trends' }
  ];

  // Desktop cycling indices
  const [slotIndices, setSlotIndices] = useState([0, 1, 2]);

  // Mobile stacked carousel index
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isFocused || isHovered || prefersReducedMotion) return;

    const timer = setInterval(() => {
      // Rotate desktop slots
      setSlotIndices((prev) => [prev[1], prev[2], prev[0]]);
      // Advance mobile stacked carousel
      setCurrentSlide((prev) => (prev + 1) % images.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [isFocused, isHovered, images.length]);

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

  const renderSignInForm = () => (
    <div className="bg-white text-slate-900 p-8 sm:p-10 rounded-2xl shadow-2xl shadow-black/60 border border-slate-200 w-full max-w-md">
      <h3 className="text-2xl font-bold text-slate-900 mb-2 text-center">
        Welcome back
      </h3>
      <p className="text-sm text-slate-500 text-center mb-8 leading-relaxed">
        Sign in to engineer your metabolism, track your fasts!
      </p>

      {error && (
        <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-lg text-center font-medium">
          {error}
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={handleRequestOtp} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Email address
            </label>
            <input
              type="email"
              required
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/50 text-slate-900 bg-white transition-shadow"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 mt-2 shadow-sm"
          >
            {loading ? 'Sending Code...' : 'Send Code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 text-center">
              6-Digit OTP
            </label>
            <input
              type="text"
              required
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/50 text-center text-xl font-mono tracking-widest text-slate-900 bg-white transition-shadow uppercase"
              placeholder="000000"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 mt-2 shadow-sm"
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
  );

  return (
    <div className="min-h-screen w-full bg-slate-900 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 to-slate-950 relative overflow-x-hidden flex flex-col font-sans text-slate-100">
      
      {/* Technical Grid Background */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.12]" 
        style={{ 
          backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }}
      />

      <div className="relative z-10 flex flex-col max-w-7xl mx-auto w-full px-6 py-8 lg:px-12 lg:py-12 flex-1">
        
        {/* --- TOP: Branding & Title --- */}
        <div className="flex flex-col mb-8 lg:mb-12">
          <div className="flex items-center gap-3 mb-1.5">
            <img src="/icon.svg" alt="FastTracker Logo" className="w-8 h-8 rounded-lg shadow-md bg-white p-1" />
            <div className="flex flex-col">
              <h1 className="text-xl font-bold tracking-tight text-white leading-none">FastTracker</h1>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Engineer Your Metabolism</span>
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl lg:text-3xl font-light text-slate-200 tracking-tight whitespace-nowrap overflow-x-auto mt-4 pb-2">
            Know where you are in your fast—<span className="font-semibold text-white"> and what comes next.</span>
          </h2>
        </div>

        {/* --- MOBILE VIEW: Form Above, Stacked Image Carousel Below --- */}
        <div className="flex flex-col lg:hidden items-center w-full space-y-8 pb-12">
          {/* Sign-in Form */}
          <div className="w-full flex justify-center">
            {renderSignInForm()}
          </div>

          {/* Absolute-Stacked Image Carousel */}
          <div className="w-full max-w-md pt-2">
            <div className="relative w-full aspect-[4/3] sm:aspect-video mb-8">
              {images.map((slide, idx) => (
                <img
                  key={slide.src}
                  src={slide.src}
                  alt={slide.alt}
                  className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-1000 ease-in-out motion-reduce:transition-none ${
                    idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                  }`}
                />
              ))}
              {/* Carousel Indicators */}
              <div className="absolute -bottom-6 left-0 right-0 flex justify-center gap-2 z-20">
                {images.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentSlide ? 'w-6 bg-teal-400' : 'w-1.5 bg-slate-600'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* --- DESKTOP VIEW: Unchanged 2-Column Grid --- */}
        <div className="hidden lg:grid grid-cols-12 gap-10 items-start flex-1">
          
          {/* LEFT COLUMN: Visual Preview Matrix (7 Cols) */}
          <div 
            className="col-span-7 flex flex-col gap-5 select-none"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Slot 0: Main Hero Preview Position */}
            <div className="w-full bg-slate-950/60 p-2.5 rounded-2xl border border-slate-700/60 shadow-2xl backdrop-blur-sm transition-all duration-700 ease-in-out">
              <img 
                src={images[slotIndices[0]].src} 
                alt={images[slotIndices[0]].alt} 
                className="w-full h-auto rounded-xl shadow-inner object-cover transition-opacity duration-500"
              />
            </div>

            {/* Slot 1 & 2: Secondary Side-by-Side Thumbnails */}
            <div className="grid grid-cols-2 gap-5">
              <div className="w-full bg-slate-950/60 p-2 rounded-xl border border-slate-700/60 shadow-xl backdrop-blur-sm transition-all duration-700 ease-in-out">
                <img 
                  src={images[slotIndices[1]].src} 
                  alt={images[slotIndices[1]].alt} 
                  className="w-full h-auto rounded-lg shadow-inner object-cover transition-opacity duration-500"
                />
              </div>
              <div className="w-full bg-slate-950/60 p-2 rounded-xl border border-slate-700/60 shadow-xl backdrop-blur-sm transition-all duration-700 ease-in-out">
                <img 
                  src={images[slotIndices[2]].src} 
                  alt={images[slotIndices[2]].alt} 
                  className="w-full h-auto rounded-lg shadow-inner object-cover transition-opacity duration-500"
                />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Sign-in Card (5 Cols) */}
          <div className="col-span-5 flex justify-end w-full">
            {renderSignInForm()}
          </div>

        </div>

      </div>
    </div>
  );
}