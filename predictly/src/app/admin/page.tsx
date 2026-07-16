'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatNumber, CATEGORY_COLORS, CATEGORY_ICONS } from '@/lib/utils';
import { format } from 'date-fns';
import { Plus, ShieldCheck, Users, BarChart2, CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

interface Market {
  id: string;
  title: string;
  category: string;
  status: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  closeDate: string;
  resolution?: string | null;
}

interface User {
  id: string;
  email: string;
  username: string;
  balance: number;
  isAdmin: boolean;
  createdAt: string;
}

const CATEGORIES = ['Politics', 'Economics', 'Sports', 'Crypto', 'Climate', 'Finance', 'Tech & Science', 'Culture', 'Commodities'];

export default function AdminPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [tab, setTab] = useState<'markets' | 'users' | 'create'>('markets');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  // Create market form
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Economics',
    closeDate: '',
    initialYesPrice: 0.5,
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    if (!user.isAdmin) { router.push('/'); return; }
    fetchAll();
  }, [user, router]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [mRes, uRes] = await Promise.all([adminApi.getMarkets(), adminApi.getUsers()]);
      setMarkets(mRes.data.markets);
      setUsers(uRes.data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id: string, resolution: 'YES' | 'NO') => {
    try {
      await adminApi.resolveMarket(id, resolution);
      setActionMsg(`Market resolved as ${resolution}`);
      fetchAll();
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err: unknown) {
      setActionMsg((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error');
    }
  };

  const handleClose = async (id: string) => {
    try {
      await adminApi.closeMarket(id);
      setActionMsg('Market closed');
      fetchAll();
      setTimeout(() => setActionMsg(''), 3000);
    } catch {
      setActionMsg('Error closing market');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await adminApi.createMarket({ ...form, closeDate: new Date(form.closeDate).toISOString() });
      setActionMsg('Market created successfully!');
      setTab('markets');
      fetchAll();
      setForm({ title: '', description: '', category: 'Economics', closeDate: '', initialYesPrice: 0.5 });
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err: unknown) {
      setActionMsg((err as { response?: { data?: { error?: unknown } } })?.response?.data?.error as string || 'Error creating market');
    } finally {
      setCreating(false);
    }
  };

  if (!user?.isAdmin) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
          <ShieldCheck size={20} className="text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-sm text-gray-400">Manage markets and users</p>
        </div>
      </div>

      {/* Action message */}
      {actionMsg && (
        <div className="flex items-center justify-between bg-brand-500/10 border border-brand-500/30 text-brand-400 px-4 py-2.5 rounded-lg mb-6 text-sm">
          <div className="flex items-center gap-2"><CheckCircle size={14} />{actionMsg}</div>
          <button onClick={() => setActionMsg('')}><X size={14} /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Markets', value: markets.length, icon: BarChart2 },
          { label: 'Open Markets', value: markets.filter(m => m.status === 'OPEN').length, icon: CheckCircle },
          { label: 'Total Users', value: users.length, icon: Users },
          { label: 'Total Volume', value: formatNumber(markets.reduce((s, m) => s + m.volume, 0)), icon: BarChart2 },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-4">
            <Icon size={16} className="text-gray-500 mb-2" />
            <div className="text-xl font-bold text-white">{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit mb-6">
        {[
          { id: 'markets', label: 'Markets', icon: BarChart2 },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'create', label: 'Create Market', icon: Plus },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id as typeof tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === id ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* Markets tab */}
      {tab === 'markets' && (
        <div className="space-y-3">
          {loading ? (
            [...Array(4)].map((_, i) => <div key={i} className="card h-20 animate-pulse" />)
          ) : markets.map((m) => (
            <div key={m.id} className="card p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`badge border text-xs ${CATEGORY_COLORS[m.category] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                      {CATEGORY_ICONS[m.category]} {m.category}
                    </span>
                    <span className={`badge text-xs ${
                      m.status === 'OPEN' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                      m.status === 'RESOLVED' ? (m.resolution === 'YES' ? 'yes-bg' : 'no-bg') :
                      'bg-gray-700 text-gray-400 border border-gray-600'
                    }`}>
                      {m.status}{m.resolution ? ` (${m.resolution})` : ''}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-200 truncate">{m.title}</p>
                  <div className="flex gap-4 mt-1 text-xs text-gray-500">
                    <span>YES: {Math.round(m.yesPrice * 100)}¢</span>
                    <span>Vol: {formatNumber(m.volume)}</span>
                    <span>Closes: {format(new Date(m.closeDate), 'MMM d, yyyy')}</span>
                  </div>
                </div>

                {m.status === 'OPEN' && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleResolve(m.id, 'YES')}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg border border-green-500/30 transition-colors"
                    >
                      <CheckCircle size={12} /> Resolve YES
                    </button>
                    <button
                      onClick={() => handleResolve(m.id, 'NO')}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg border border-red-500/30 transition-colors"
                    >
                      <XCircle size={12} /> Resolve NO
                    </button>
                    <button
                      onClick={() => handleClose(m.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Users tab */}
      {tab === 'users' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3 text-center">Role</th>
                <th className="px-4 py-3 text-right">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-medium text-gray-200">@{u.username}</td>
                  <td className="px-4 py-3 text-gray-400">{u.email}</td>
                  <td className="px-4 py-3 text-right text-white">{formatCurrency(u.balance)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`badge text-xs ${u.isAdmin ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-gray-700 text-gray-400 border border-gray-600'}`}>
                      {u.isAdmin ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 text-xs">{format(new Date(u.createdAt), 'MMM d, yyyy')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create market tab */}
      {tab === 'create' && (
        <div className="max-w-2xl">
          <div className="card p-6">
            <h3 className="font-semibold text-white mb-6 flex items-center gap-2">
              <Plus size={16} className="text-brand-400" />
              Create New Market
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Title</label>
                <input
                  required
                  className="input"
                  placeholder="Will X happen by Y date?"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Description / Resolution criteria</label>
                <textarea
                  required
                  rows={3}
                  className="input resize-none"
                  placeholder="Resolves YES if... Resolves NO if..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Category</label>
                  <select
                    className="input"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Close Date</label>
                  <input
                    type="datetime-local"
                    required
                    className="input"
                    value={form.closeDate}
                    onChange={(e) => setForm({ ...form, closeDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Initial YES Price: <span className="text-white font-semibold">{Math.round(form.initialYesPrice * 100)}¢</span>
                </label>
                <input
                  type="range"
                  min={2}
                  max={98}
                  value={Math.round(form.initialYesPrice * 100)}
                  onChange={(e) => setForm({ ...form, initialYesPrice: parseInt(e.target.value) / 100 })}
                  className="w-full accent-brand-500"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>2¢ (unlikely)</span>
                  <span>50¢ (50/50)</span>
                  <span>98¢ (very likely)</span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs px-3 py-2 rounded-lg">
                <AlertCircle size={12} />
                Make sure to set clear resolution criteria before publishing.
              </div>

              <button type="submit" disabled={creating} className="btn-primary w-full py-3">
                {creating ? 'Creating...' : 'Create Market'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
