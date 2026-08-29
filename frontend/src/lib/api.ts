import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('reachinbox_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const authApi = {
  login: async (userData: { email: string; name?: string; avatar?: string; googleId?: string }) => {
    const res = await api.post('/auth/login', userData);
    if (res.data.token && typeof window !== 'undefined') {
      localStorage.setItem('reachinbox_token', res.data.token);
      localStorage.setItem('reachinbox_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('reachinbox_token');
      localStorage.removeItem('reachinbox_user');
    }
  },
};

export const emailApi = {
  schedule: async (data: {
    recipients: string[];
    subject: string;
    body: string;
    startTime?: string;
    delayMs?: number;
    hourlyLimit?: number;
    senderEmail?: string;
  }) => {
    const res = await api.post('/emails/schedule', data);
    return res.data;
  },
  getScheduled: async (search?: string) => {
    const res = await api.get('/emails/scheduled', { params: { search } });
    return res.data;
  },
  getSent: async (search?: string) => {
    const res = await api.get('/emails/sent', { params: { search } });
    return res.data;
  },
  cancelJob: async (id: string) => {
    const res = await api.delete(`/emails/${id}`);
    return res.data;
  },
};

export const slackApi = {
  connect: async (data: { webhookUrl?: string; accessToken?: string; channel?: string }) => {
    const res = await api.post('/slack/connect', data);
    return res.data;
  },
  getStatus: async () => {
    const res = await api.get('/slack/status');
    return res.data;
  },
  disconnect: async () => {
    const res = await api.post('/slack/disconnect');
    return res.data;
  },
  testAlert: async () => {
    const res = await api.post('/slack/test');
    return res.data;
  },
};

export const statsApi = {
  getStats: async () => {
    const res = await api.get('/stats');
    return res.data;
  },
};
