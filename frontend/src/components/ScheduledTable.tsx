'use client';

import React from 'react';
import { ScheduledEmailJob } from '../lib/types';
import { Search, Clock, Trash2, ShieldAlert, CheckCircle2, Loader2, Mail } from 'lucide-react';

interface ScheduledTableProps {
  jobs: ScheduledEmailJob[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onCancelJob: (id: string) => void;
}

export const ScheduledTable: React.FC<ScheduledTableProps> = ({
  jobs,
  loading,
  searchQuery,
  onSearchChange,
  onCancelJob,
}) => {
  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl p-5 shadow-xl">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            Scheduled Email Queue
          </h2>
          <p className="text-xs text-gray-400">Emails queued for future automated dispatch via BullMQ</p>
        </div>

        {/* Elasticsearch Powered Live Search */}
        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search email, subject, or content (Elasticsearch)..."
            className="w-full pl-9 pr-4 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="py-16 text-center text-gray-400 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin mb-3" />
          <p className="text-sm">Querying scheduled email queue via Elasticsearch...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-dark-border rounded-xl">
          <Mail className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-gray-300">No Scheduled Emails Found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No scheduled emails matched "${searchQuery}". Try clearing your search.`
              : 'You have no pending scheduled outreach jobs. Click "Compose Email" to schedule your first campaign!'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-dark-border text-gray-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Scheduled Time</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {jobs.map((job) => {
                const isRateLimited = job.status === 'RATE_LIMITED';
                const isProcessing = job.status === 'PROCESSING';

                return (
                  <tr key={job.id} className="hover:bg-dark-hover/50 transition-colors group">
                    {/* Recipient */}
                    <td className="py-3.5 px-4 font-medium text-white">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-[10px]">
                          {job.recipientEmail.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="truncate max-w-[200px]">{job.recipientEmail}</span>
                      </div>
                    </td>

                    {/* Subject */}
                    <td className="py-3.5 px-4 text-gray-300">
                      <p className="font-semibold text-white truncate max-w-[240px]">{job.subject}</p>
                      <p className="text-[11px] text-gray-500 truncate max-w-[240px]">{job.body}</p>
                    </td>

                    {/* Scheduled Time */}
                    <td className="py-3.5 px-4 text-gray-300">
                      <div className="flex flex-col">
                        <span className="font-medium text-white">
                          {new Date(job.scheduledAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {new Date(job.scheduledAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {isRateLimited ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-purple-500/10 border border-purple-500/30 text-purple-400">
                          <ShieldAlert className="w-3 h-3" />
                          Rate-Throttled
                        </span>
                      ) : isProcessing ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-500/10 border border-blue-500/30 text-blue-400">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Processing
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 border border-amber-500/30 text-amber-400">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onCancelJob(job.id)}
                        title="Cancel Job"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
