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

  // --- 3D Isometric Teaser Component ---
  const renderCinematicTeaser = () => (
    <div className={`relative w-full h-full flex items-center justify-center overflow-hidden perspective-[1200px]`}>
      <style>{`
        .iso-container {
          transform-style: preserve-3d;
          position: relative;
          width: 400px; height: 260px;
        }
        
        /* Responsive Scaling for Mobile vs Desktop */
        @media (max-width: 767px) {
          .iso-container { transform: rotateX(55deg) rotateY(0deg) rotateZ(-45deg) scale(0.65); }
        }
        @media (min-width: 768px) {
          .iso-container { transform: rotateX(55deg) rotateY(0deg) rotateZ(-45deg) scale(1.1); }
        }
        
        .iso-layer {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          border-radius: 16px;
          background-repeat: no-repeat;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: -35px 35px 50px rgba(0,0,0,0.4);
          background-color: #0f172a; /* Slate 900 */
        }

        .layer-vertical {
          background-size: 100% auto; 
          animation: floatLayer 6s ease-in-out infinite, scrollVertical 15s linear infinite alternate;
        }

        .layer-horizontal {
          background-size: auto 100%; 
          animation: floatLayer 6s ease-in-out infinite, scrollHorizontal 20s linear infinite alternate;
        }

        .layer-map-cycle {
          background-size: 100% auto;
          animation: floatLayer 6s ease-in-out infinite, cycleMaps 12s infinite;
        }

        @keyframes scrollVertical {
          0% { background-position: 0% 0%; }
          100% { background-position: 0% 100%; }
        }

        @keyframes scrollHorizontal {
          0% { background-position: 0% 0%; }
          100% { background-position: 100% 0%; }
        }

        @keyframes floatLayer {
          0%, 100% { transform: translateZ(var(--z-offset)) translateY(0px); }
          50% { transform: translateZ(var(--z-offset)) translateY(-15px); }
        }

        @keyframes cycleMaps {
          0%, 45% { background-image: url('/preview-dashboard.png'); }
          50%, 95% { background-image: url('/preview-heatmap.png'); }
          100% { background-image: url('/preview-dashboard.png'); }
        }
      `}</style>

      <div className="iso-container">
        {/* BOTTOM CARD */}
        <div 
          className="iso-layer layer-vertical" 
          style={{ '--z-offset': '-200px', backgroundImage: "url('/preview-history.png')", animationDelay: '0s', opacity: 0.4 }} 
        />
        {/* MIDDLE CARD */}
        <div 
          className="iso-layer layer-horizontal" 
          style={{ '--z-offset': '0px', backgroundImage: "url('/preview-insights.png')", animationDelay: '0.2s', opacity: 0.7 }} 
        />
        {/* TOP CARD */}
        <div 
          className="iso-layer layer-map-cycle" 
          style={{ '--z-offset': '200px', animationDelay: '0.4s', opacity: 1 }} 
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background dark:bg-background-dark flex flex-col md:flex-row font-sans">
      
      {/* Top/Left Side: Animated 3D Preview */}
      <div className="flex w-full h-[40vh] md:h-auto md:w-1/2 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex-col items-center justify-center relative overflow-hidden">
        
        {/* Responsive Branding Overlay */}
        <div className="absolute top-6 left-6 md:top-12 md:left-12 z-20">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Activity className="w-5 h-5 md:w-6 md:h-6 text-teal-400" />
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">FastTracker</h1>
          </div>
          <p className="text-[9px] md:text-xs text-slate-400 font-bold uppercase tracking-widest">
            Engineer Your Metabolism
          </p>
        </div>

        {/* 3D Render Canvas */}
        <div className="w-full h-full pt-16 md:pt-20 pb-8 md:pb-12 flex items-center justify-center">
            {renderCinematicTeaser()}
        </div>

        {/* Subtle Bottom Glow */}
        <div className="absolute bottom-0 left-0 right-0 h-24 md:h-32 bg-gradient-to-t from-primary/20 to-transparent pointer-events-none" />
      </div>

      {/* Bottom/Right Side: Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 relative">
        <div className="w-full max-w-sm bg-surface dark:bg-surface-dark p-8 rounded-2xl shadow-sm border border-border dark:border-border-dark">
          <h2 className="text-xl md:text-2xl font-bold text-text-primary dark:text-text-light mb-2 text-center">
            {step === 1 ? 'Welcome Back' : 'Verify Code'}
          </h2>
          <p className="text-xs md:text-sm text-text-secondary text-center mb-8">
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
                className="w-full bg-primary hover:bg-primary-hover active:bg-primary-active text-surface font-medium py-3 rounded-lg transition-colors disabled:opacity-50 mt-2 shadow-sm"
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
                  className="w-full px-4 py-3 rounded-lg border border-border dark:border-border-dark focus:outline-none focus:ring-2 focus:ring-primary/50 text-center text-xl font-mono tracking-widest text-text-primary dark:text-text-light bg-background dark:bg-background-dark transition-shadow uppercase"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-hover active:bg-primary-active text-surface font-medium py-3 rounded-lg transition-colors disabled:opacity-50 mt-2 shadow-sm"
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
