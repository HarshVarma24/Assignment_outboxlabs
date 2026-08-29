'use client';

import React from 'react';
import { DashboardStats } from '../lib/types';
import { Clock, Send, ShieldAlert, Cpu } from 'lucide-react';

interface StatsCardsProps {
  stats: DashboardStats | null;
  loading: boolean;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, loading }) => {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-dark-card/60 animate-pulse rounded-2xl border border-dark-border" />
        ))}
      </div>
    );
  }

  const { overview, queue, rateLimit } = stats;

  const cardItems = [
    {
      title: 'Scheduled Emails',
      value: overview.scheduled,
      subtitle: `${queue.delayed} delayed in BullMQ`,
      icon: Clock,
      color: 'from-amber-500/20 to-orange-500/10',
      iconColor: 'text-amber-400',
      borderColor: 'border-amber-500/20',
    },
    {
      title: 'Sent Emails',
      value: overview.sent,
      subtitle: `${overview.failed} delivery failures`,
      icon: Send,
      color: 'from-emerald-500/20 to-teal-500/10',
      iconColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/20',
    },
    {
      title: 'Rate Limited Jobs',
      value: overview.rateLimited,
      subtitle: `Cap: ${rateLimit.currentCount}/${rateLimit.maxLimit} / hr`,
      icon: ShieldAlert,
      color: 'from-purple-500/20 to-indigo-500/10',
      iconColor: 'text-purple-400',
      borderColor: 'border-purple-500/20',
    },
    {
      title: 'BullMQ Queue Engine',
      value: queue.active + queue.waiting,
      subtitle: `${queue.active} active workers`,
      icon: Cpu,
      color: 'from-blue-500/20 to-cyan-500/10',
      iconColor: 'text-blue-400',
      borderColor: 'border-blue-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cardItems.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <div
            key={idx}
            className={`p-4 rounded-2xl bg-gradient-to-br ${card.color} border ${card.borderColor} bg-dark-card/90 backdrop-blur-sm shadow-lg flex items-center justify-between transition-all hover:scale-[1.01]`}
          >
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{card.title}</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">{card.value}</h3>
              <p className="text-[11px] text-gray-400 mt-1">{card.subtitle}</p>
            </div>
            <div className={`p-3 rounded-xl bg-dark-bg/60 ${card.iconColor} border border-white/5`}>
              <IconComponent className="w-6 h-6" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
