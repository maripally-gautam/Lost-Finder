import React, { useState, useContext } from 'react';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/db';
import { APP_NAME } from '../constants';
import { Shield } from 'lucide-react';

export const Onboarding: React.FC = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);

    const uid = 'user_' + Math.random().toString(36).substr(2, 9);
    const newUser = {
      uid,
      username,
      trustScore: 100,
      reportsCount: 0,
      joinedAt: Date.now(),
      isVerified: true // Mock verified
    };

    await api.users.create(newUser);
    login(newUser);
    setLoading(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-brand-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-accent/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

      <div className="z-10 w-full max-w-sm text-center">
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 bg-gradient-to-tr from-brand-500 to-brand-accent rounded-2xl flex items-center justify-center shadow-xl shadow-brand-500/20 rotate-3">
             <Shield size={40} className="text-white" />
          </div>
        </div>
        
        <h1 className="text-4xl font-bold text-white mb-2">{APP_NAME}</h1>
        <p className="text-slate-400 mb-10">AI-Powered Smart Lost & Found.</p>

        <form onSubmit={handleStart} className="space-y-4">
          <div className="text-left">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Choose Username</label>
            <input 
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full mt-1 bg-brand-800 border border-brand-700 rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all placeholder:text-slate-600"
              placeholder="@username"
            />
          </div>

          <button 
            type="submit"
            disabled={loading || !username}
            className="w-full bg-white text-brand-900 font-bold py-4 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Profile...' : 'Get Started'}
          </button>
        </form>
        
        <p className="mt-8 text-xs text-slate-600">
          By continuing, you agree to our Terms & Privacy Policy.
        </p>
      </div>
    </div>
  );
};
