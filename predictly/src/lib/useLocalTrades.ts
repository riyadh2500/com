'use client';

import { useState, useEffect, useCallback } from 'react';

export interface LocalTrade {
  id: string;
  symbol: string;
  marketId: string;
  marketTitle: string;
  side: 'Up' | 'Down';
  amount: number;       // USDC spent
  contractPrice: number;
  entryPrice: number;
  payout: number;       // max payout
  profit: number;       // potential profit
  txHash: string;
  walletAddress: string;
  createdAt: string;    // ISO string
}

const KEY = 'predictly_trades';

function loadTrades(): LocalTrade[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveTrades(trades: LocalTrade[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(trades));
}

export function useLocalTrades(walletAddress?: string) {
  const [trades, setTrades] = useState<LocalTrade[]>([]);

  const refresh = useCallback(() => {
    const all = loadTrades();
    // filter to this wallet if address provided
    setTrades(walletAddress
      ? all.filter(t => t.walletAddress.toLowerCase() === walletAddress.toLowerCase())
      : all
    );
  }, [walletAddress]);

  useEffect(() => { refresh(); }, [refresh]);

  const addTrade = useCallback((trade: Omit<LocalTrade, 'id' | 'createdAt'>) => {
    const newTrade: LocalTrade = {
      ...trade,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    const all = loadTrades();
    const updated = [newTrade, ...all];
    saveTrades(updated);
    setTrades(walletAddress
      ? updated.filter(t => t.walletAddress.toLowerCase() === walletAddress.toLowerCase())
      : updated
    );
    return newTrade;
  }, [walletAddress]);

  // Derived stats
  const totalVolume = trades.reduce((s, t) => s + t.amount, 0);
  const totalTrades = trades.length;

  // Group into positions by symbol+side
  const positions = Object.values(
    trades.reduce((map, t) => {
      const key = `${t.symbol}-${t.side}`;
      if (!map[key]) map[key] = { symbol: t.symbol, side: t.side, count: 0, totalSpent: 0 };
      map[key].count++;
      map[key].totalSpent += t.amount;
      return map;
    }, {} as Record<string, { symbol: string; side: string; count: number; totalSpent: number }>)
  );

  return { trades, positions, totalVolume, totalTrades, addTrade, refresh };
}
