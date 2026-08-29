'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../components/Header';
import { StatsCards } from '../../components/StatsCards';
import { ScheduledTable } from '../../components/ScheduledTable';
import { SentTable } from '../../components/SentTable';
import { ComposeModal } from '../../components/ComposeModal';
import { SlackConnectModal } from '../../components/SlackConnectModal';
import { QueueModal } from '../../components/QueueModal';
import { authApi, emailApi, statsApi, slackApi } from '../../lib/api';
import { User, ScheduledEmailJob, DashboardStats } from '../../lib/types';
import { Clock, Send, RefreshCw, AlertCircle } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Tabs: 'scheduled' | 'sent'
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Data States
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledEmailJob[]>([]);
  const [sentJobs, setSentJobs] = useState<ScheduledEmailJob[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [slackConnected, setSlackConnected] = useState(false);

  // Modals
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSlackOpen, setIsSlackOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  // Fetch stats & emails
  const fetchData = useCallback(async () => {
    try {
      const [statsData, scheduledData, sentData, slackStatus] = await Promise.all([
        statsApi.getStats().catch(() => null),
        emailApi.getScheduled(searchQuery).catch(() => ({ scheduledEmails: [] })),
        emailApi.getSent(searchQuery).catch(() => ({ sentEmails: [] })),
        slackApi.getStatus().catch(() => ({ connected: false })),
      ]);

      if (statsData) setStats(statsData);
      setScheduledJobs(scheduledData.scheduledEmails || []);
      setSentJobs(sentData.sentEmails || []);
      setSlackConnected(!!slackStatus.connected);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoadingData(false);
    }
  }, [searchQuery]);

  // Auth Check on mount
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('reachinbox_token') : null;
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('reachinbox_user') : null;

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setLoadingAuth(false);
        return;
      } catch (e) {
        // fallback
      }
    }

    const defaultUser: User = {
      id: 'default-user-id',
      email: 'harshvarma242@gmail.com',
      name: 'Harsh Varma',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HarshVarma',
    };
    setUser(defaultUser);
    setLoadingAuth(false);
  }, [router]);

  // Periodic polling for stats & job status updates every 5 seconds
  useEffect(() => {
    if (!user) return;
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [user, fetchData]);

  const handleLogout = () => {
    authApi.logout();
    router.push('/login');
  };

  const handleCancelJob = async (id: string) => {
    try {
      await emailApi.cancelJob(id);
      fetchData();
    } catch (err) {
      console.error('Failed to cancel job:', err);
    }
  };

  const handleScheduleSubmit = async (data: any) => {
    await emailApi.schedule(data);
    fetchData();
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-dark-bg text-white flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-400 font-medium">Loading ReachInbox Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white flex flex-col">
      
      {/* Navigation Header */}
      <Header
        user={user}
        onLogout={handleLogout}
        onOpenCompose={() => setIsComposeOpen(true)}
        onOpenSlack={() => setIsSlackOpen(true)}
        onOpenQueue={() => setIsQueueOpen(true)}
        slackConnected={slackConnected}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Top Summary Cards */}
        <StatsCards stats={stats} loading={loadingData} />

        {/* Dashboard Tabs & Actions Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6 border-b border-dark-border pb-4">
          
          {/* Tabs */}
          <div className="flex items-center space-x-2 bg-dark-card/60 p-1.5 rounded-2xl border border-dark-border">
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'scheduled'
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-dark-hover'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Scheduled Emails</span>
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-white/10 text-white font-bold">
                {scheduledJobs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('sent')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'sent'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-dark-hover'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Sent Emails</span>
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-white/10 text-white font-bold">
                {sentJobs.length}
              </span>
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchData()}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-dark-card border border-dark-border text-gray-300 hover:text-white hover:border-gray-600 transition-all self-end sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Data</span>
          </button>
        </div>

        {/* Tab Panel Content */}
        {activeTab === 'scheduled' ? (
          <ScheduledTable
            jobs={scheduledJobs}
            loading={loadingData}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onCancelJob={handleCancelJob}
          />
        ) : (
          <SentTable
            jobs={sentJobs}
            loading={loadingData}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}

      </main>

      {/* Modals */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={fetchData}
        onSchedule={handleScheduleSubmit}
      />

      <SlackConnectModal
        isOpen={isSlackOpen}
        onClose={() => setIsSlackOpen(false)}
        slackConnected={slackConnected}
        onStatusChange={fetchData}
      />

      <QueueModal
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
      />

    </div>
  );
}
