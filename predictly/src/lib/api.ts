import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Auth ───────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; username: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  walletLogin: (walletAddress: string) =>
    api.post('/auth/wallet', { walletAddress }),
  me: () => api.get('/auth/me'),
};

// ─── Markets ────────────────────────────────────────────
export const marketsApi = {
  list: (params?: { category?: string; status?: string; search?: string }) =>
    api.get('/markets', { params }),
  categories: () => api.get('/markets/categories'),
  get: (id: string) => api.get(`/markets/${id}`),
};

// ─── Trading ────────────────────────────────────────────
export const tradingApi = {
  trade: (data: {
    marketId: string;
    side: 'YES' | 'NO';
    contracts: number;
    action: 'BUY' | 'SELL';
    txHash?: string;        // Arc on-chain ETH tx (required for BUY)
    walletAddress?: string; // trader's Arc wallet
  }) => api.post('/trading/trade', data),
  history: () => api.get('/trading/history'),
};

// ─── Portfolio ──────────────────────────────────────────
export const portfolioApi = {
  get: () => api.get('/portfolio'),
};

// ─── Admin ──────────────────────────────────────────────
export const adminApi = {
  getMarkets: () => api.get('/admin/markets'),
  getUsers: () => api.get('/admin/users'),
  createMarket: (data: {
    title: string;
    description: string;
    category: string;
    closeDate: string;
    initialYesPrice: number;
  }) => api.post('/admin/markets', data),
  resolveMarket: (id: string, resolution: 'YES' | 'NO') =>
    api.patch(`/admin/markets/${id}/resolve`, { resolution }),
  closeMarket: (id: string) => api.patch(`/admin/markets/${id}/close`),
};
