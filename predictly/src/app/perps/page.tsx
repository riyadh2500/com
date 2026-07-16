'use client';

import { useState, useRef, useEffect } from 'react';
import { usePerpPrices } from '@/lib/usePerpPrices';
import type { LivePerpAsset } from '@/lib/usePerpPrices';
import Sparkline from '@/components/Sparkline';
import PerpTradeModal from '@/components/PerpTradeModal';
import type { PerpAsset } from '@/lib/perpData';
import { formatPrice, formatVolume } from '@/lib/perpData';
import {
  TrendingUp, TrendingDown, Zap, ExternalLink,
  Wifi, WifiOff, RefreshCw,
} from 'lucide-react';

export default function PerpsPage() {
  const { assets, connected, lastUpdate, reconnect } = usePerpPrices();
  const [modal, setModal] = useState<{ asset: PerpAsset; side: 'long' | 'short' } | null>(null);
  const [search, setSearch] = useState('');

  const filtered = assets.filter(
    a => a.symbol.toLowerCase().includes(search.toLowerCase()) ||
         a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* ── Banner ── */}
      <div className="relative mx-4 mt-6 mb-8 rounded-2xl overflow-hidden border border-gray-800">
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 75% 50%, #00ff9d0a 0%, transparent 60%)' }} />
        {/* decorative mesh */}
        <div className="absolute right-0 top-0 w-64 h-full opacity-10 pointer-events-none"
          style={{ background: 'repeating-linear-gradient(45deg,#00ff9d 0,#00ff9d 1px,transparent 0,transparent 50%)' ,backgroundSize:'12px 12px'}} />
        <div className="relative px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={14} className="text-brand-400" />
              <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">Intro to Perpetuals</span>
            </div>
            <h2 className="text-lg font-bold text-white mb-1">
              Trade with leverage, go long or short, and keep your position open without an expiration date.
            </h2>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <button
              onClick={() => assets.length > 0 && setModal({ asset: assets[0], side: 'long' })}
              disabled={assets.length === 0}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              Get started
            </button>
            <a
              href="https://docs.arc.network"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-xl border border-gray-700 transition-colors"
            >
              Learn about Perps
            </a>
          </div>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="max-w-7xl mx-auto px-4 mb-4 flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-white">All perpetuals</h1>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-gray-900 border border-gray-800 text-gray-200 placeholder-gray-600 text-sm rounded-xl px-3 py-2 w-36 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          {/* Live status indicator */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs">
            {connected ? (
              <>
                <Wifi size={12} className="text-green-400" />
                <span className="text-green-400 font-medium">Live</span>
                {lastUpdate && (
                  <span className="text-gray-600">{lastUpdate.toLocaleTimeString()}</span>
                )}
              </>
            ) : (
              <>
                <WifiOff size={12} className="text-red-400" />
                <span className="text-red-400">Disconnected</span>
                <button onClick={reconnect} className="text-gray-500 hover:text-white">
                  <RefreshCw size={11} />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs text-blue-300 font-medium">Arc · USDC</span>
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl overflow-hidden">

          {/* Header */}
          <div className="hidden md:grid grid-cols-[2fr_1.6fr_2fr_1.4fr_1fr] gap-4 px-5 py-3 border-b border-gray-800 text-xs text-gray-600 uppercase tracking-wider">
            <span>Market</span>
            <span>Price</span>
            <span>24h Volume · Funding</span>
            <span className="text-center">Chart (live)</span>
            <span className="text-right">Trade</span>
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div className="space-y-0">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="hidden md:grid grid-cols-[2fr_1.6fr_2fr_1.4fr_1fr] gap-4 px-5 py-4 border-b border-gray-800/50 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-800" />
                    <div className="space-y-1.5">
                      <div className="h-3 bg-gray-800 rounded w-12" />
                      <div className="h-2 bg-gray-800 rounded w-20" />
                    </div>
                  </div>
                  <div className="self-center space-y-1.5">
                    <div className="h-3 bg-gray-800 rounded w-24" />
                    <div className="h-2 bg-gray-800 rounded w-12" />
                  </div>
                  <div className="self-center space-y-1.5">
                    <div className="h-3 bg-gray-800 rounded w-32" />
                    <div className="h-2 bg-gray-800 rounded w-20" />
                  </div>
                  <div className="h-10 bg-gray-800 rounded self-center" />
                  <div className="flex gap-2 self-center justify-end">
                    <div className="h-7 w-14 bg-gray-800 rounded-lg" />
                    <div className="h-7 w-14 bg-gray-800 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            filtered.map((asset, idx) => (
              <PerpRow
                key={asset.id}
                asset={asset}
                isLast={idx === filtered.length - 1}
                onTrade={side => setModal({ asset, side })}
              />
            ))
          )}
        </div>

        <p className="text-xs text-gray-700 text-center mt-4">
          Real-time prices via Binance WebSocket · Settles in ETH on Sepolia Testnet ·{' '}
          <a href="https://www.alchemy.com/faucets/ethereum-sepolia" target="_blank" rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-500">Get Sepolia ETH</a>
        </p>
      </div>

      {/* Trade modal */}
      {modal && (
        <PerpTradeModal
          asset={modal.asset}
          initialSide={modal.side}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

/* ── Row with price flash animation ────────────────────────────── */
function PerpRow({
  asset,
  isLast,
  onTrade,
}: {
  asset: LivePerpAsset;
  isLast: boolean;
  onTrade: (side: 'long' | 'short') => void;
}) {
  const positive = asset.change24h >= 0;
  const priceUp  = asset.price >= asset.prevPrice;

  // Flash color on price change
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const prevRef = useRef(asset.price);

  useEffect(() => {
    if (prevRef.current === asset.price) return;
    setFlash(asset.price > prevRef.current ? 'up' : 'down');
    prevRef.current = asset.price;
    const t = setTimeout(() => setFlash(null), 600);
    return () => clearTimeout(t);
  }, [asset.price]);

  return (
    <div className={`
      grid grid-cols-[2fr_1.6fr_2fr_1.4fr_1fr] gap-4 px-5 py-3.5 items-center
      hover:bg-gray-800/30 transition-colors
      ${!isLast ? 'border-b border-gray-800/40' : ''}
      ${flash === 'up'   ? 'bg-green-500/5' : ''}
      ${flash === 'down' ? 'bg-red-500/5'   : ''}
    `}>

      {/* Market */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-base font-black flex-shrink-0 select-none"
          style={{ background: asset.color + '22', color: asset.color, border: `1px solid ${asset.color}44` }}
        >
          {asset.icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white text-sm">{asset.symbol}</span>
            <span className="px-1.5 py-0.5 bg-gray-800 text-gray-500 text-[10px] rounded font-mono">
              {asset.maxLeverage}×
            </span>
          </div>
          <span className="text-xs text-gray-600 truncate block">{asset.name}</span>
        </div>
      </div>

      {/* Price — flashes green/red on change */}
      <div>
        <div className={`font-mono font-bold text-sm transition-colors duration-300 ${
          flash === 'up'   ? 'text-green-400' :
          flash === 'down' ? 'text-red-400'   : 'text-white'
        }`}>
          ${asset.price > 0 ? formatPrice(asset.price) : '—'}
        </div>
        <div className={`text-xs font-medium flex items-center gap-0.5 ${positive ? 'text-green-400' : 'text-red-400'}`}>
          {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {positive ? '+' : ''}{asset.change24h.toFixed(2)}%
        </div>
      </div>

      {/* Volume + Funding */}
      <div>
        <div className="text-sm text-gray-400">
          24h vol: <span className="text-gray-200 font-medium">{asset.volume24h > 0 ? formatVolume(asset.volume24h) : '—'}</span>
        </div>
        <div className={`text-xs ${asset.funding === 0 ? 'text-gray-700' : asset.funding > 0 ? 'text-green-500' : 'text-red-500'}`}>
          Fund {asset.funding > 0 ? '+' : ''}{asset.funding.toFixed(4)}%
        </div>
      </div>

      {/* Sparkline — live rolling chart */}
      <div className="flex justify-center">
        <Sparkline data={asset.sparkline} positive={positive} width={120} height={42} />
      </div>

      {/* Long / Short */}
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={() => onTrade('long')}
          className="px-3.5 py-1.5 text-xs font-bold rounded-lg border border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-black hover:border-green-500 transition-all"
        >
          Long
        </button>
        <button
          onClick={() => onTrade('short')}
          className="px-3.5 py-1.5 text-xs font-bold rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
        >
          Short
        </button>
      </div>
    </div>
  );
}
