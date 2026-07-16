import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}¢`;
}

export function priceToPercent(price: number): number {
  return Math.round(price * 100);
}

export function calculateFee(contracts: number, price: number): number {
  if (price <= 0.02 || price >= 0.98) return 0;
  return 0.07 * contracts * price * (1 - price);
}

export function timeUntil(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  if (diff < 0) return 'Closed';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 30) {
    const months = Math.floor(days / 30);
    return `${months}mo`;
  }
  if (days > 0) return `${days}d`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  return `${hours}h`;
}

export const CATEGORY_ICONS: Record<string, string> = {
  Politics: '🗳️',
  Economics: '📊',
  Sports: '⚽',
  Crypto: '₿',
  Climate: '🌍',
  Finance: '💹',
  'Tech & Science': '🔬',
  Culture: '🎭',
  Commodities: '🏅',
};

export const CATEGORY_COLORS: Record<string, string> = {
  Politics: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  Economics: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  Sports: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  Crypto: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  Climate: 'bg-green-500/20 text-green-300 border-green-500/30',
  Finance: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'Tech & Science': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  Culture: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  Commodities: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};
