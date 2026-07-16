'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { PERP_ASSETS, generateSparkline } from './perpData';
import type { PerpAsset } from './perpData';

// Binance WebSocket streams — free, no API key, ~1s updates
const BINANCE_WS = 'wss://stream.binance.com:9443/stream';

// Map our asset IDs to Binance symbols
const BINANCE_SYMBOLS: Record<string, string> = {
  bitcoin:       'btcusdt',
  ethereum:      'ethusdt',
  solana:        'solusdt',
  ripple:        'xrpusdt',
  sui:           'suiusdt',
  'bitcoin-cash':'bchusdt',
  chainlink:     'linkusdt',
  'avalanche-2': 'avaxusdt',
  dogecoin:      'dogeusdt',
  polkadot:      'dotusdt',
  uniswap:       'uniusdt',
  near:          'nearusdt',
};

interface TickerData {
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

export interface LivePerpAsset extends PerpAsset {
  high24h: number;
  low24h: number;
  prevPrice: number;   // for flash animation
  sparkline: number[];
}

export function usePerpPrices() {
  const [assets, setAssets] = useState<LivePerpAsset[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sparklineRef = useRef<Record<string, number[]>>({});
  const prevPriceRef = useRef<Record<string, number>>({});

  // Build initial asset list with zeroed prices
  const initAssets = useCallback((): LivePerpAsset[] => {
    return PERP_ASSETS.map(a => ({
      ...a,
      price:     0,
      change24h: 0,
      volume24h: 0,
      high24h:   0,
      low24h:    0,
      prevPrice: 0,
      funding:   0,
      sparkline: Array(24).fill(50),
    }));
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // Subscribe to all tickers in one combined stream
    const streams = PERP_ASSETS
      .map(a => `${BINANCE_SYMBOLS[a.id]}@ticker`)
      .join('/');

    const ws = new WebSocket(`${BINANCE_WS}?streams=${streams}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setAssets(initAssets());
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const ticker = msg.data;
        if (!ticker || !ticker.s) return;

        const symbol = ticker.s.toLowerCase();
        const assetId = Object.entries(BINANCE_SYMBOLS).find(([, s]) => s === symbol)?.[0];
        if (!assetId) return;

        const price     = parseFloat(ticker.c);   // current price
        const change24h = parseFloat(ticker.P);   // 24h change %
        const volume24h = parseFloat(ticker.q);   // quote volume (USDC)
        const high24h   = parseFloat(ticker.h);
        const low24h    = parseFloat(ticker.l);

        // Update rolling sparkline (keep last 40 points)
        const prev = sparklineRef.current[assetId] ?? Array(40).fill(price);
        const updated = [...prev.slice(-39), price];
        sparklineRef.current[assetId] = updated;

        // Normalize sparkline 0–100
        const min = Math.min(...updated);
        const max = Math.max(...updated);
        const range = max - min || 1;
        const normalized = updated.map(v => ((v - min) / range) * 90 + 5);

        const prevPrice = prevPriceRef.current[assetId] ?? price;
        prevPriceRef.current[assetId] = price;

        setAssets(prev => prev.map(a => {
          if (a.id !== assetId) return a;
          return {
            ...a,
            price,
            change24h,
            volume24h,
            high24h,
            low24h,
            funding: parseFloat((change24h * 0.00001).toFixed(6)),
            sparkline: normalized,
            prevPrice,
          };
        }));

        setLastUpdate(new Date());
      } catch { /* ignore parse errors */ }
    };

    ws.onerror = () => setConnected(false);

    ws.onclose = () => {
      setConnected(false);
      // Auto-reconnect after 3s
      setTimeout(connect, 3000);
    };
  }, [initAssets]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  const reconnect = useCallback(() => {
    wsRef.current?.close();
    setTimeout(connect, 500);
  }, [connect]);

  return { assets, connected, lastUpdate, reconnect };
}
