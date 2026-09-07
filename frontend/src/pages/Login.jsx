import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiClient.post('/auth/request-otp', { email });
      setStep(2);
    } catch (err) {
      setError('Failed to send OTP. Please try again.');
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
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
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-surface p-8 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-semibold text-text-primary mb-6 text-center">
          {step === 1 ? 'Sign in to FastTracker' : 'Enter Verification Code'}
        </h2>
        
        {error && <div className="mb-4 text-status-error text-sm text-center">{error}</div>}

        {step === 1 ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <input
              type="email"
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-primary bg-surface"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-3 rounded-lg transition-colors">
              Send Code
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-sm text-text-secondary text-center mb-4">Code sent to {email}</p>
            <input
              type="text"
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-center text-lg tracking-widest text-text-primary bg-surface"
              placeholder="000000"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-3 rounded-lg transition-colors">
              Verify & Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}