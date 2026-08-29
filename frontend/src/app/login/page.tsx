'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '../../lib/api';
import { Mail, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('founder@reachinbox.ai');
  const [name, setName] = useState('Alex Rivera');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.login({
        email: email.trim(),
        name: name.trim(),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
        googleId: `google-oauth-${Date.now()}`,
      });
      router.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-dark-card/90 border border-dark-border rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center shadow-xl shadow-brand-500/30">
            <Mail className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">ReachInbox.ai</h1>
          <p className="text-xs text-gray-400 mt-1">Autonomous Cold Email Scheduler & Dashboard</p>
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          <div className="p-2.5 rounded-xl bg-dark-bg/60 border border-dark-border flex items-center space-x-2 text-[11px] text-gray-300">
            <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>BullMQ Scheduler</span>
          </div>
          <div className="p-2.5 rounded-xl bg-dark-bg/60 border border-dark-border flex items-center space-x-2 text-[11px] text-gray-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Persistent Queues</span>
          </div>
        </div>

        {/* Form / Google OAuth Trigger */}
        <form onSubmit={handleGoogleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Your Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Google Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
              required
            />
          </div>

          {/* Primary Google Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-white text-gray-900 hover:bg-gray-100 flex items-center justify-center space-x-2 shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
          >
            {/* Google SVG Icon */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.21 0 10.05 0 12s.47 3.79 1.29 5.42l3.99-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>{loading ? 'Authenticating...' : 'Sign in with Google Account'}</span>
            <ArrowRight className="w-4 h-4 text-gray-600" />
          </button>

        </form>

        <p className="text-[10px] text-gray-500 text-center mt-6">
          ReachInbox Assignment Engine • TypeScript + BullMQ + Redis + Ethereal SMTP
        </p>

      </div>
    </div>
  );
}
