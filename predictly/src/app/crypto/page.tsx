'use client';

import { useState, useEffect } from 'react';
import { useCryptoPrices } from '@/lib/useCryptoPrices';
import { generateMarkets } from '@/lib/cryptoMarkets';
import type { CryptoMarket } from '@/lib/cryptoMarkets';
import { CRYPTO_ASSETS } from '@/lib/cryptoMarkets';
import CryptoMarketCard from '@/components/crypto/CryptoMarketCard';
import { useAuthStore } from '@/store/authStore';
import { useAccount, useReadContract } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { ARC_USDC_ADDRESS, ERC20_ABI } from '@/lib/arcChain';
import { useLocalTrades } from '@/lib/useLocalTrades';
import { Search, WifiOff, Zap, TrendingUp, TrendingDown, Clock, BarChart2, RefreshCw, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

type MarketTab = 'all' | 'updown' | 'abovebelow' | 'pricerange' | 'hitprice';
type PortfolioTab = 'positions' | 'history';

const MARKET_TABS: { id: MarketTab; label: string }[] = [
  { id: 'all',        label: 'All'           },
  { id: 'updown',     label: 'Up / Down'     },
  { id: 'abovebelow', label: 'Above / Below' },
  { id: 'pricerange', label: 'Price Range'   },
  { id: 'hitprice',   label: 'Hit Price'     },
];

export default function CryptoPage() {
  const { prices, connected } = useCryptoPrices();
  const { user } = useAuthStore();
  const { isConnected, address } = useAccount();

  const { data: usdcRaw } = useReadContract({
    address:      ARC_USDC_ADDRESS,
    abi:          ERC20_ABI,
    functionName: 'balanceOf',
    args:         address ? [address] : undefined,
    chainId:      sepolia.id,
    query:        { enabled: !!address, refetchInterval: 10_000 },
  });
  const usdcBalance = usdcRaw ? Number(usdcRaw as bigint) / 1_000_000 : 0;

  const { trades, positions, totalVolume, totalTrades, refresh } = useLocalTrades(address);

  const [markets, setMarkets]           = useState<CryptoMarket[]>([]);
  const [tab, setTab]                   = useState<MarketTab>('all');
  const [search, setSearch]             = useState('');
  const [portfolioTab, setPortfolioTab] = useState<PortfolioTab>('positions');

  useEffect(() => {
    const priceMap: Record<string, number> = {};
    for (const a of CRYPTO_ASSETS) priceMap[a.id] = prices[a.id]?.price ?? 0;
    if (Object.values(priceMap).some(v => v > 0)) setMarkets(generateMarkets(priceMap));
  }, [prices]);

  const filtered = markets.filter(m => {
    const matchTab    = tab === 'all' || m.type === tab;
    const matchSearch = !search ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.asset.symbol.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* sub-header */}
      <div className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-bold text-white text-lg">
              <Zap size={18} className="text-yellow-400" /> Crypto
            </div>
            {connected
              ? <span className="flex items-center gap-1 text-xs text-green-400"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>Live</span>
              : <span className="flex items-center gap-1 text-xs text-red-400"><WifiOff size={10}/>Offline</span>}
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {MARKET_TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all ${tab === t.id ? 'bg-brand-500 border-brand-500 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="ml-auto relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"/>
            <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
              className="bg-gray-900 border border-gray-800 text-gray-200 placeholder-gray-600 text-xs rounded-xl pl-7 pr-3 py-2 w-32 focus:outline-none focus:ring-1 focus:ring-brand-500"/>
          </div>
        </div>
      </div>

      {/* main layout */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6 items-start">
          {/* markets grid */}
          <div className="flex-1 min-w-0">
            {markets.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 animate-pulse space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 bg-gray-800 rounded-xl"/>
                      <div className="h-4 bg-gray-800 rounded w-36"/>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 h-10 bg-gray-800 rounded-xl"/>
                      <div className="flex-1 h-10 bg-gray-800 rounded-xl"/>
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-gray-600">No markets match your filter.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map(m => (
                  <CryptoMarketCard key={m.id} market={m} livePrice={prices[m.asset.id]}/>
                ))}
              </div>
            )}
          </div>

          {/* portfolio sidebar */}
          <div className="w-80 flex-shrink-0 hidden lg:block">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden sticky top-36">
              {/* header */}
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart2 size={14} className="text-brand-400"/> My Portfolio
                </h3>
                <button onClick={refresh} className="text-gray-500 hover:text-white transition-colors">
                  <RefreshCw size={13}/>
                </button>
              </div>

              {!isConnected ? (
                <div className="px-4 py-8 text-center">
                  <Zap size={28} className="text-gray-700 mx-auto mb-3"/>
                  <p className="text-gray-500 text-sm">Connect wallet to track your trades</p>
                </div>
              ) : (
                <>
                  {/* balance + volume */}
                  <div className="grid grid-cols-2 border-b border-gray-800">
                    <div className="px-4 py-3 border-r border-gray-800">
                      <div className="text-[10px] text-gray-500 mb-0.5 uppercase tracking-wide">USDC Balance</div>
                      <div className="text-base font-bold text-blue-300">{usdcBalance.toFixed(2)}</div>
                      <div className="text-[10px] text-gray-600">Sepolia</div>
                    </div>
                    <div className="px-4 py-3">
                      <div className="text-[10px] text-gray-500 mb-0.5 uppercase tracking-wide">Volume</div>
                      <div className="text-base font-bold text-white">${totalVolume.toFixed(2)}</div>
                      <div className="text-[10px] text-gray-600">{totalTrades} trade{totalTrades !== 1 ? 's' : ''}</div>
                    </div>
                  </div>

                  {/* tabs */}
                  <div className="flex border-b border-gray-800">
                    {(['positions','history'] as PortfolioTab[]).map(t => (
                      <button key={t} onClick={() => setPortfolioTab(t)}
                        className={`flex-1 py-2.5 text-xs font-semibold capitalize border-b-2 transition-colors ${portfolioTab === t ? 'border-brand-400 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                        {t}
                      </button>
                    ))}
                  </div>

                  {/* positions */}
                  {portfolioTab === 'positions' && (
                    <div className="max-h-96 overflow-y-auto">
                      {positions.length === 0 ? (
                        <div className="py-10 text-center text-gray-600 text-xs">
                          <BarChart2 size={24} className="mx-auto mb-2 opacity-20"/>
                          No trades yet
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-800">
                          {positions.map((pos, i) => (
                            <div key={i} className="px-4 py-3 flex items-center justify-between gap-2 hover:bg-gray-800/30">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center text-xs font-black text-yellow-400">
                                  {pos.symbol.slice(0,3)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-white">{pos.symbol}</span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${pos.side === 'Up' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                                      {pos.side === 'Up' ? <TrendingUp size={8}/> : <TrendingDown size={8}/>} {pos.side}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-gray-500">{pos.count} trade{pos.count > 1 ? 's' : ''}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-bold text-white">${pos.totalSpent.toFixed(2)}</div>
                                <div className="text-[10px] text-gray-600">USDC</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* history */}
                  {portfolioTab === 'history' && (
                    <div className="max-h-96 overflow-y-auto">
                      {trades.length === 0 ? (
                        <div className="py-10 text-center text-gray-600 text-xs">
                          <Clock size={24} className="mx-auto mb-2 opacity-20"/>
                          No trade history yet
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-800">
                          {trades.map(tx => (
                            <div key={tx.id} className="px-4 py-2.5 hover:bg-gray-800/30">
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${tx.side === 'Up' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                                    {tx.side === 'Up' ? <TrendingUp size={8}/> : <TrendingDown size={8}/>} {tx.side}
                                  </span>
                                  <span className="text-[10px] font-semibold text-white">{tx.symbol}</span>
                                </div>
                                <span className="text-xs font-bold text-red-400">-${tx.amount.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-gray-600">{format(new Date(tx.createdAt), 'MMM d, HH:mm')}</span>
                                <a href={`https://sepolia.etherscan.io/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer"
                                  className="text-[10px] text-brand-400 hover:text-brand-300 flex items-center gap-0.5">
                                  Tx <ExternalLink size={8}/>
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
