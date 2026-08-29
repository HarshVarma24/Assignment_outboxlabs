'use client';

import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { X, Upload, Send, FileText, CheckCircle2, Clock, ShieldAlert, AlertCircle, Loader2 } from 'lucide-react';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onSchedule: (data: {
    recipients: string[];
    subject: string;
    body: string;
    startTime?: string;
    delayMs?: number;
    hourlyLimit?: number;
  }) => Promise<any>;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onSchedule,
}) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipientsInput, setRecipientsInput] = useState('');
  const [parsedRecipients, setParsedRecipients] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  
  // Timing & Limiting controls
  const [startTime, setStartTime] = useState<string>('');
  const [delaySeconds, setDelaySeconds] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(100);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle CSV/TXT File Upload & Parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

    Papa.parse(file, {
      complete: (results) => {
        const extractedEmails: string[] = [];
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

        results.data.forEach((row: any) => {
          const rowText = typeof row === 'string' ? row : Object.values(row).join(' ');
          const matches = rowText.match(emailRegex);
          if (matches) {
            extractedEmails.push(...matches);
          }
        });

        const uniqueEmails = Array.from(new Set(extractedEmails));
        setParsedRecipients(uniqueEmails);
        if (uniqueEmails.length === 0) {
          setError('No valid email addresses detected in uploaded file.');
        }
      },
      error: () => {
        setError('Failed to parse uploaded file.');
      },
    });
  };

  // Combine uploaded CSV emails + manual textarea input
  const getCombinedRecipients = (): string[] => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const manualMatches = recipientsInput.match(emailRegex) || [];
    const all = [...parsedRecipients, ...manualMatches];
    return Array.from(new Set(all));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const recipients = getCombinedRecipients();
    if (recipients.length === 0) {
      setError('Please upload a CSV file or enter at least one valid recipient email address.');
      return;
    }

    if (!subject.trim() || !body.trim()) {
      setError('Please provide both an email subject and body.');
      return;
    }

    setLoading(true);
    try {
      await onSchedule({
        recipients,
        subject,
        body,
        startTime: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
        delayMs: delaySeconds * 1000,
        hourlyLimit,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to schedule emails.');
    } finally {
      setLoading(false);
    }
  };

  const totalDetected = getCombinedRecipients().length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between bg-dark-bg/60">
          <div className="flex items-center space-x-2">
            <Send className="w-5 h-5 text-brand-400" />
            <h2 className="text-base font-bold text-white">Compose & Schedule Campaign</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-dark-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Email Subject */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Subject Line</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Quick question regarding cold outreach scaling"
              className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
              required
            />
          </div>

          {/* Email Body */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Email Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Hi {{name}},\n\nI noticed your team is scaling lead acquisition. ReachInbox automatically handles schedules..."
              className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 font-sans"
              required
            />
          </div>

          {/* CSV File Upload Section */}
          <div className="p-4 rounded-xl bg-dark-bg/60 border border-dark-border space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-brand-400" />
                Upload CSV Lead File
              </label>
              {totalDetected > 0 && (
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {totalDetected} email address{totalDetected > 1 ? 'es' : ''} detected
                </span>
              )}
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-dark-border hover:border-brand-500/50 rounded-xl p-4 text-center cursor-pointer transition-colors bg-dark-card/40"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <FileText className="w-6 h-6 text-brand-400 mx-auto mb-1" />
              <p className="text-xs font-medium text-gray-300">
                {fileName ? `File: ${fileName}` : 'Click to select or drag & drop CSV/TXT file'}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">Automated lead parser extracts email addresses</p>
            </div>

            {/* Manual Recipient fallback */}
            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">
                Or manually enter recipient emails (comma or newline separated):
              </label>
              <textarea
                value={recipientsInput}
                onChange={(e) => setRecipientsInput(e.target.value)}
                rows={2}
                placeholder="lead1@targetcompany.com, lead2@targetcompany.com"
                className="w-full px-3 py-1.5 bg-dark-bg border border-dark-border rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Timing & Rate Limit Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Start Time */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Start Time
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-dark-bg border border-dark-border rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
              />
              <p className="text-[10px] text-gray-500 mt-1">Leave empty for immediate dispatch</p>
            </div>

            {/* Min Delay */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Min Delay (sec)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(parseInt(e.target.value, 10) || 0)}
                className="w-full px-2.5 py-1.5 bg-dark-bg border border-dark-border rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
              />
              <p className="text-[10px] text-gray-500 mt-1">Provider throttling minimum</p>
            </div>

            {/* Hourly Rate Limit */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                Hourly Limit
              </label>
              <input
                type="number"
                min="1"
                max="10000"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 100)}
                className="w-full px-2.5 py-1.5 bg-dark-bg border border-dark-border rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
              />
              <p className="text-[10px] text-gray-500 mt-1">Sender max emails / hr cap</p>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-dark-border flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-dark-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-600 text-white shadow-lg shadow-brand-500/25 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enqueueing Jobs...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Schedule Outreach ({totalDetected})</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
