'use client';

import React, { useState } from 'react';
import { X, MessageSquare, Send, CheckCircle2, AlertCircle, Loader2, Unplug } from 'lucide-react';
import { slackApi } from '../lib/api';

interface SlackConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  slackConnected: boolean;
  onStatusChange: () => void;
}

export const SlackConnectModal: React.FC<SlackConnectModalProps> = ({
  isOpen,
  onClose,
  slackConnected,
  onStatusChange,
}) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [channel, setChannel] = useState('#general');
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim()) {
      setMessage({ type: 'error', text: 'Please enter a valid Slack Incoming Webhook URL' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      await slackApi.connect({ webhookUrl: webhookUrl.trim(), channel: channel.trim() });
      setMessage({ type: 'success', text: 'Slack alerts connected successfully!' });
      onStatusChange();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to connect Slack' });
    } finally {
      setLoading(false);
    }
  };

  const handleTestAlert = async () => {
    setTestLoading(true);
    setMessage(null);
    try {
      await slackApi.testAlert();
      setMessage({ type: 'success', text: 'Test rate-limit alert sent to Slack channel!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to send Slack test alert' });
    } finally {
      setTestLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await slackApi.disconnect();
      setWebhookUrl('');
      setMessage({ type: 'success', text: 'Slack alerts disconnected' });
      onStatusChange();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to disconnect Slack' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between bg-dark-bg/60">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Slack Rate Limit Notifications</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          
          {message && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{message.text}</span>
            </div>
          )}

          <p className="text-xs text-gray-300">
            Connect your Slack channel to receive real-time alerts whenever a sender reaches their hourly rate limit cap.
          </p>

          {slackConnected ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Slack Alerts are Active
                </span>
                <button
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 border border-red-500/30 transition-all flex items-center gap-1"
                >
                  <Unplug className="w-3 h-3" />
                  Disconnect
                </button>
              </div>

              <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between">
                <span className="text-xs text-gray-400">Test notification dispatch:</span>
                <button
                  onClick={handleTestAlert}
                  disabled={testLoading}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md flex items-center gap-1.5 transition-all"
                >
                  {testLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  <span>Send Test Alert</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Slack Incoming Webhook URL
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/T00/B00/XXXX"
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                  required
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Create a Webhook in your Slack Workspace apps settings and paste it here.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Target Channel (Optional)
                </label>
                <input
                  type="text"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  placeholder="#outreach-alerts"
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                  <span>Save & Connect Slack</span>
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
