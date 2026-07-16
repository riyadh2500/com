'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { CryptoMarket } from '@/lib/cryptoMarkets';
import type { LivePrice } from '@/lib/useCryptoPrices';
import { formatMarketPrice, formatVol } from '@/lib/cryptoMarkets';
import { TrendingUp, TrendingDown, Bookmark } from 'lucide-react';

interface Props {
  market: CryptoMarket;
  livePrice?: LivePrice;
}

// ── circular progress arc ────────────────────────────────────────────
function CircleProb({ prob, color }: { prob: number; color: string }) {
  const r = 20; const circ = 2 * Math.PI * r;
  const dash = (prob / 100) * circ;
  return (
    <svg width="52" height="52" className="rotate-[-90deg]">
      <circle cx="26" cy="26" r={r} fill="none" stroke="#374151" strokeWidth="4" />
      <circle cx="26" cy="26" r={r} fill="none" stroke={color}
        strokeWidth="4" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      <text x="26" y="26" textAnchor="middle" dominantBaseline="central"
        className="rotate-90" fill="white" fontSize="10" fontWeight="bold"
        transform="rotate(90,26,26)">{prob}%</text>
    </svg>
  );
}

// ── countdown for 5m / hourly ────────────────────────────────────────
function useCountdown(minutes: number) {
  const [secs, setSecs] = useState(() => {
    const now = Date.now();
    const interval = minutes * 60 * 1000;
    return Math.floor((interval - (now % interval)) / 1000);
  });
  useEffect(() => {
    const t = setInterval(() => {
      setSecs(s => (s <= 1 ? minutes * 60 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [minutes]);
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return { m, s };
}

export default function CryptoMarketCard({ market, livePrice }: Props) {
  const router = useRouter();
  const price = livePrice?.price ?? 0;
  const positive = (livePrice?.change24h ?? 0) >= 0;

  return (
    <div
      onClick={() => router.push(`/crypto/${market.id}`)}
      className="bg-gray-900 border border-gray-800 rounded-2xl p-4 cursor-pointer hover:border-gray-600 hover:bg-gray-800/60 transition-all group relative overflow-hidden"
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
            style={{ background: market.asset.color + '25', color: market.asset.color }}>
            {market.asset.icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white leading-tight">{market.title}</h3>
            {market.type === 'updown' && market.expiryMinutes && (
              <CountdownBadge minutes={market.expiryMinutes} />
            )}
          </div>
        </div>

        {/* Circle prob for updown */}
        {market.type === 'updown' && market.upProb !== undefined && (
          <CircleProb
            prob={market.upProb}
            color={market.upProb >= 50 ? '#22c55e' : '#ef4444'}
          />
        )}

        {/* Bookmark */}
        <button
          onClick={e => e.stopPropagation()}
          className="absolute top-3 right-3 text-gray-700 hover:text-gray-400 transition-colors"
        >
          <Bookmark size={13} />
        </button>
      </div>

      {/* Body by type */}
      {market.type === 'updown' && (
        <UpDownBody market={market} price={price} livePrice={livePrice} />
      )}
      {(market.type === 'abovebelow' || market.type === 'pricerange' || market.type === 'hitprice') && (
        <LevelBody market={market} />
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-800">
        <span className="flex items-center gap-1 text-xs text-red-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          LIVE
        </span>
        {market.volume24h && (
          <span className="text-xs text-gray-600">· {formatVol(market.volume24h)} Vol.</span>
        )}
        <span className="text-xs text-gray-600">· {market.asset.name}</span>
      </div>
    </div>
  );
}

function CountdownBadge({ minutes }: { minutes: number }) {
  const { m, s } = useCountdown(minutes);
  if (minutes >= 1440) return <span className="text-xs text-gray-500">Daily</span>;
  return (
    <span className="text-xs text-gray-500 font-mono">{m}:{s}</span>
  );
}

function UpDownBody({ market, price, livePrice }: { market: CryptoMarket; price: number; livePrice?: LivePrice }) {
  const up = market.upProb ?? 50;
  const dn = 100 - up;

  return (
    <div className="space-y-2">
      {price > 0 && (
        <div className="text-xs text-gray-500 font-mono">
          Current: <span className="text-white font-bold">${formatMarketPrice(price)}</span>
          {livePrice && (
            <span className={`ml-2 ${livePrice.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {livePrice.change24h >= 0 ? '+' : ''}{livePrice.change24h.toFixed(2)}%
            </span>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={e => { e.stopPropagation(); }}
          className="flex-1 flex items-center justify-between px-3 py-2 bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 rounded-xl text-green-400 font-bold text-sm transition-all"
        >
          <div className="flex items-center gap-1.5">
            <TrendingUp size={13} />
            Up
          </div>
          <span className="text-xs">{up}¢</span>
        </button>
        <button
          onClick={e => { e.stopPropagation(); }}
          className="flex-1 flex items-center justify-between px-3 py-2 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 rounded-xl text-red-400 font-bold text-sm transition-all"
        >
          <div className="flex items-center gap-1.5">
            <TrendingDown size={13} />
            Down
          </div>
          <span className="text-xs">{dn}¢</span>
        </button>
      </div>
    </div>
  );
}

function LevelBody({ market }: { market: CryptoMarket }) {
  const levels = market.levels ?? [];
  return (
    <div className="space-y-1.5">
      {levels.map((lvl, i) => (
        <div key={i} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5 text-gray-300">
            <span className={i === 0 ? 'text-green-400' : 'text-red-400'}>
              {i === 0 ? '↑' : '↓'}
            </span>
            <span className="font-mono font-medium">{formatMarketPrice(lvl.price)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs font-medium">{lvl.prob}%</span>
            <button
              onClick={e => e.stopPropagation()}
              className="px-2 py-0.5 bg-green-500/20 hover:bg-green-500/40 text-green-400 text-xs font-bold rounded-lg border border-green-500/30 transition-all"
            >
              Yes
            </button>
            <button
              onClick={e => e.stopPropagation()}
              className="px-2 py-0.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 text-xs font-bold rounded-lg border border-red-500/30 transition-all"
            >
              No
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
