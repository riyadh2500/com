'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { CRYPTO_ASSETS } from './cryptoMarkets';
import type { PricePoint } from './cryptoMarkets';

export interface LivePrice {
  price: number;
  prev: number;
  change24h: number;
  high24h: number;
  low24h: number;
  history: PricePoint[];  // rolling 5-min history for chart
}

export type PriceMap = Record<string, LivePrice>;

const BINANCE_WS = 'wss://stream.binance.com:9443/stream';
const MAX_HISTORY = 300; // ~5 min at 1 tick/sec

export function useCryptoPrices() {
  const [prices, setPrices] = useState<PriceMap>({});
  const [connected, setConnected] = useState(false);
  const wsRef  = useRef<WebSocket | null>(null);
  const dataRef = useRef<PriceMap>({});

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const streams = CRYPTO_ASSETS
      .map(a => `${a.binanceSymbol}@ticker`)
      .join('/');

    const ws = new WebSocket(`${BINANCE_WS}?streams=${streams}`);
    wsRef.current = ws;

    ws.onopen  = () => setConnected(true);
    ws.onerror = () => setConnected(false);
    ws.onclose = () => { setConnected(false); setTimeout(connect, 3000); };

    ws.onmessage = (evt) => {
      try {
        const msg  = JSON.parse(evt.data);
        const d    = msg.data;
        if (!d?.s) return;

        const sym   = d.s.toLowerCase();
        const asset = CRYPTO_ASSETS.find(a => a.binanceSymbol === sym);
        if (!asset) return;

        const price     = parseFloat(d.c);
        const change24h = parseFloat(d.P);
        const high24h   = parseFloat(d.h);
        const low24h    = parseFloat(d.l);
        const now       = Date.now();

        const existing  = dataRef.current[asset.id];
        const prevPrice = existing?.price ?? price;
        const history   = existing?.history ?? [];
        const newHistory: PricePoint[] = [
          ...history.slice(-(MAX_HISTORY - 1)),
          { time: now, price },
        ];

        const updated: LivePrice = {
          price, prev: prevPrice, change24h,
          high24h, low24h, history: newHistory,
        };

        dataRef.current = { ...dataRef.current, [asset.id]: updated };
        setPrices(prev => ({ ...prev, [asset.id]: updated }));
      } catch { /* skip */ }
    };
  }, []);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  return { prices, connected };
}
