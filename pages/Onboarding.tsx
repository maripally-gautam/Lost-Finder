import React, { useState, useContext } from 'react';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/db';
import { signInWithGoogle, signInWithGoogleForLogin } from '../services/firebase';
import { APP_NAME } from '../constants';
import { Shield, Sparkles, Lock, CheckCircle, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const slides = [
  {
    icon: Sparkles,
    title: "Lost items recovered faster with AI",
    description: "Advanced matching algorithms connect you with found items in seconds",
    gradient: "from-[#00A3FF] to-[#8B5CF6]",
  },
  {
    icon: Lock,
    title: "Found items stay private & secure",
    description: "End-to-end encryption keeps sensitive information protected",
    gradient: "from-[#8B5CF6] to-[#00A3FF]",
  },
  {
    icon: CheckCircle,
    title: "Verified handover prevents theft",
    description: "Smart verification ensures items reach their rightful owners",
    gradient: "from-[#10B981] to-[#00A3FF]",
  },
];

export const Onboarding: React.FC = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [step, setStep] = useState<'slides' | 'username' | 'google' | 'signin'>('slides');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      setStep('username');
    }
  };

  const handleSkip = () => {
    setStep('username');
  };

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setError('');

    // Check if username is available
    const isTaken = await api.users.isUsernameTaken(username.trim());
    if (isTaken) {
      setError('Username already exists. Please choose a different username.');
      setLoading(false);
      return;
    }

    setLoading(false);
    setStep('google');
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    const { user: googleUser, error: googleError } = await signInWithGoogle();

    if (googleError || !googleUser) {
      setError(googleError || 'Failed to sign in with Google');
      setLoading(false);
      return;
    }

    const newUser = {
      uid: googleUser.uid,
      username: username.trim(),
      email: googleUser.email || undefined,
      photoURL: googleUser.photoURL || undefined,
      trustScore: 100,
      reportsCount: 0,
      joinedAt: Date.now(),
      isVerified: true
    };

    const result = await api.users.create(newUser);

    if (!result.success) {
      setError(result.error || 'Failed to create account');
      setLoading(false);
      return;
    }

    login(newUser);
    setLoading(false);
    navigate('/');
  };

  // Sign In flow - for existing users
  const handleSignIn = async () => {
    setLoading(true);
    setError('');

    const result = await signInWithGoogleForLogin();

    if (result.error || !result.user) {
      setError(result.error || 'Failed to sign in with Google');
      setLoading(false);
      return;
    }

    // Check if this Google account is linked to an existing user
    const existingUser = await api.users.get(result.user.uid);

    if (!existingUser) {
      setError('Account not linked. You have to sign up first.');
      setLoading(false);
      return;
    }

    // User exists - log them in
    login(existingUser);
    setLoading(false);
    navigate('/');
  };

  // Sign In Step (for existing users)
  if (step === 'signin') {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-[#3b82f6]/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#8b5cf6]/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

        <div className="z-10 w-full max-w-sm text-center">
          <div className="mb-8 flex justify-center">
            <div className="w-20 h-20 bg-gradient-to-tr from-[#3b82f6] to-[#8b5cf6] rounded-2xl flex items-center justify-center shadow-xl">
              <Shield size={40} className="text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Welcome Back!</h1>
          <p className="text-[#94a3b8] mb-10">Sign in to your existing account</p>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full bg-white text-gray-800 font-semibold py-4 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>

          <button
            onClick={() => {
              setError('');
              setStep('username');
            }}
            className="mt-4 text-[#94a3b8] text-sm hover:text-white transition-colors"
          >
            ← Back to Sign Up
          </button>

          <p className="mt-8 text-xs text-[#64748b]">
            By continuing, you agree to our Terms & Privacy Policy.
          </p>
        </div>
      </div>
    );
  }

  // Google Sign-in Step
  if (step === 'google') {
    return (
      <div className="min-h-screen bg-brand-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-accent/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

        <div className="z-10 w-full max-w-sm text-center">
          <div className="mb-8 flex justify-center">
            <div className="w-20 h-20 bg-gradient-to-tr from-brand-500 to-brand-accent rounded-2xl flex items-center justify-center shadow-xl shadow-brand-500/20">
              <Shield size={40} className="text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Welcome, {username}!</h1>
          <p className="text-slate-400 mb-10">Continue with Google to complete your registration</p>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white text-gray-800 font-semibold py-4 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>

          <button
            onClick={() => setStep('username')}
            className="mt-4 text-slate-400 text-sm hover:text-white transition-colors"
          >
            ← Go back
          </button>

          <p className="mt-8 text-xs text-slate-600">
            By continuing, you agree to our Terms & Privacy Policy.
          </p>
        </div>
      </div>
    );
  }

  // Username Step
  if (step === 'username') {
    return (
      <div className="min-h-screen bg-brand-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-accent/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

        <div className="z-10 w-full max-w-sm text-center">
          <div className="mb-8 flex justify-center">
            <div className="w-20 h-20 bg-gradient-to-tr from-brand-500 to-brand-accent rounded-2xl flex items-center justify-center shadow-xl shadow-brand-500/20">
              <Shield size={40} className="text-white" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white mb-2">{APP_NAME}</h1>
          <p className="text-slate-400 mb-10">AI-Powered Smart Lost & Found.</p>

          <form onSubmit={handleUsernameSubmit} className="space-y-4">
            <div className="text-left">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Choose Username</label>
              <input
                type="text"
                value={username}
                onChange={e => {
                  setUsername(e.target.value);
                  setError('');
                }}
                className={`w-full mt-1 bg-brand-800 border rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all placeholder:text-slate-600 ${error ? 'border-red-500' : 'border-brand-700'}`}
                placeholder="username"
              />
              {error && (
                <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !username}
              className="w-full bg-white text-[#0f172a] font-bold py-4 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Checking...' : 'Continue'}
            </button>
          </form>

          {/* Sign In option for existing users */}
          <div className="mt-6 pt-6 border-t border-brand-700">
            <p className="text-slate-400 text-sm mb-3">Already have an account?</p>
            <button
              onClick={() => {
                setError('');
                setStep('signin');
              }}
              className="w-full bg-transparent border border-brand-700 text-white font-semibold py-3 rounded-xl hover:bg-brand-800 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign In with Google
            </button>
          </div>

          <p className="mt-8 text-xs text-slate-600">
            By continuing, you agree to our Terms & Privacy Policy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0E27] flex flex-col relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#131733]/50 to-[#0A0E27]" />

      {/* Noise texture */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`
      }} />

      {/* Skip button */}
      <div className="relative z-10 p-6 flex justify-end">
        <button
          onClick={handleSkip}
          className="text-[#C0C5D0] text-sm hover:text-[#E8EAEF] transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center max-w-md"
          >
            {/* Icon with gradient background */}
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="relative mb-12"
            >
              <motion.div
                className={`absolute inset-0 bg-gradient-to-r ${slides[currentSlide].gradient} rounded-full blur-3xl opacity-40`}
                animate={{
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                }}
              />
              <div className="relative bg-[#131733] border border-[#C0C5D0]/10 rounded-3xl p-12 backdrop-blur-sm">
                {(() => {
                  const Icon = slides[currentSlide].icon;
                  return <Icon className="w-16 h-16 text-[#E8EAEF]" strokeWidth={1.5} />;
                })()}
              </div>
            </motion.div>

            {/* Title */}
            <h2 className="text-2xl text-[#E8EAEF] mb-4 leading-tight">
              {slides[currentSlide].title}
            </h2>

            {/* Description */}
            <p className="text-[#C0C5D0] leading-relaxed">
              {slides[currentSlide].description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom section */}
      <div className="relative z-10 px-8 pb-10">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${index === currentSlide
                ? "w-8 bg-gradient-to-r from-[#00A3FF] to-[#8B5CF6]"
                : "w-1.5 bg-[#C0C5D0]/20"
                }`}
            />
          ))}
        </div>

        {/* Next button */}
        <button
          onClick={handleNext}
          className="w-full bg-gradient-to-r from-[#00A3FF] to-[#8B5CF6] text-white py-4 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          <span>{currentSlide === slides.length - 1 ? "Get Started" : "Next"}</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
