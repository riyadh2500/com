'use client';

import Link from 'next/link';
import { TrendingUp, Zap, ShieldCheck, BarChart2, ArrowRight, Activity } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* Hero */}
      <section className="text-center mb-16">
        <div className="inline-flex items-center gap-2 bg-brand-500/10 text-brand-400 border border-brand-500/30 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
          <Zap size={14} />
          Trade on real-world events · Powered by Sepolia ETH
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold text-white mb-6 leading-tight">
          Predict the Future.
          <br />
          <span className="text-brand-400">Get Paid for Being Right.</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
          Trade binary contracts on crypto prices and perpetuals with leverage.
          Settled on Ethereum Sepolia Testnet — connect MetaMask to start.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/crypto" className="btn-primary px-8 py-3 text-base rounded-xl">
            Trade Crypto
          </Link>
          <Link href="/perps" className="btn-secondary px-8 py-3 text-base rounded-xl flex items-center gap-2">
            Trade Perpetuals <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Stats strip */}
      <section className="grid grid-cols-2 gap-4 mb-16">
        {[
          { label: 'Crypto Assets', value: '12'          },
          { label: 'Settlement',    value: 'Sepolia USDC'},
        ].map(({ label, value }) => (
          <div key={label} className="card p-4 text-center">
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className="text-sm text-gray-400 mt-0.5">{label}</div>
          </div>
        ))}
      </section>

      {/* Product cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
        <Link href="/crypto" className="card p-6 hover:border-yellow-500/40 transition-all group">
          <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center mb-4">
            <Zap size={20} className="text-yellow-400" />
          </div>
          <h3 className="font-bold text-white mb-2 group-hover:text-yellow-400 transition-colors">Crypto Binary</h3>
          <p className="text-gray-400 text-sm leading-relaxed mb-4">
            Trade Up/Down, Above/Below on BTC, ETH, SOL and XRP with real-time live prices.
          </p>
          <span className="text-yellow-400 text-sm flex items-center gap-1">Trade now <ArrowRight size={13} /></span>
        </Link>

        <Link href="/perps" className="card p-6 hover:border-green-500/40 transition-all group">
          <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center mb-4">
            <Activity size={20} className="text-green-400" />
          </div>
          <h3 className="font-bold text-white mb-2 group-hover:text-green-400 transition-colors">Perpetuals</h3>
          <p className="text-gray-400 text-sm leading-relaxed mb-4">
            Long or short BTC, ETH, SOL and more with up to 20× leverage. Real-time Binance prices.
          </p>
          <span className="text-green-400 text-sm flex items-center gap-1">Trade now <ArrowRight size={13} /></span>
        </Link>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {[
          {
            icon: ShieldCheck,
            title: 'Ethereum Sepolia Testnet',
            desc: 'Connect MetaMask to Sepolia and get free test ETH from the Alchemy faucet. No real funds needed.',
          },
          {
            icon: BarChart2,
            title: 'Real-Time Prices',
            desc: 'Live Binance WebSocket prices on every asset. Price charts update every second.',
          },
          {
            icon: TrendingUp,
            title: 'Crypto + Perpetuals',
            desc: 'Trade crypto binary contracts and perpetuals with up to 20× leverage — all settled in Sepolia ETH.',
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="card p-6">
            <div className="w-10 h-10 bg-brand-500/20 rounded-xl flex items-center justify-center mb-4">
              <Icon size={20} className="text-brand-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">{title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
          </div>
        ))}
      </section>

    </div>
  );
}
