'use client';

import React from 'react';
import { User } from '../lib/types';
import { Mail, LogOut, Plus, Activity, CheckCircle2, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  onOpenCompose: () => void;
  onOpenSlack: () => void;
  onOpenQueue: () => void;
  slackConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  onOpenCompose,
  onOpenSlack,
  onOpenQueue,
  slackConnected,
}) => {
  return (
    <header className="border-b border-dark-border bg-dark-bg/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-white tracking-tight">ReachInbox</span>
              <span className="text-xs bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full font-medium border border-brand-500/30">
                Scheduler
              </span>
            </div>
            <p className="text-xs text-gray-400">Autonomous Cold Email Engine</p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center space-x-3">
          
          {/* Slack Integration Button */}
          <button
            onClick={onOpenSlack}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              slackConnected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
            }`}
          >
            {slackConnected ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Slack Connected</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Connect Slack Alerts</span>
              </>
            )}
          </button>

          {/* BullMQ Live Board Button */}
          <button
            onClick={onOpenQueue}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-dark-card border border-dark-border text-gray-300 hover:text-white hover:border-gray-600 transition-all"
          >
            <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>Live Queue</span>
          </button>

          {/* Compose New Email Button */}
          <button
            onClick={onOpenCompose}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-600 text-white shadow-lg shadow-brand-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="w-4 h-4" />
            <span>Compose Email</span>
          </button>

          {/* User Metadata Profile Header */}
          {user && (
            <div className="flex items-center space-x-3 pl-3 border-l border-dark-border">
              <img
                src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                alt={user.name}
                className="w-9 h-9 rounded-full ring-2 ring-brand-500/30 object-cover bg-slate-800"
              />
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-white leading-tight">{user.name}</p>
                <p className="text-[10px] text-gray-400 max-w-[120px] truncate">{user.email}</p>
              </div>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                title="Logout"
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
