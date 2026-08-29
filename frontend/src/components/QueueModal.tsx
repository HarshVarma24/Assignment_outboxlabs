'use client';

import React from 'react';
import { X, ExternalLink, Activity } from 'lucide-react';

interface QueueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QueueModal: React.FC<QueueModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const queueUrl = 'http://localhost:5000/admin/queues';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-5xl h-[85vh] overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between bg-dark-bg">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-indigo-400 animate-pulse" />
            <h2 className="text-base font-bold text-white">Live BullMQ Queue Monitor (Bull Board)</h2>
          </div>
          <div className="flex items-center space-x-3">
            <a
              href={queueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium"
            >
              <span>Open in New Tab</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Embedded Iframe */}
        <div className="flex-1 bg-slate-950 relative">
          <iframe
            src={queueUrl}
            className="w-full h-full border-none"
            title="BullMQ Dashboard"
          />
        </div>
      </div>
    </div>
  );
};
