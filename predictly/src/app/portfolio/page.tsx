'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useReadContract } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { ARC_USDC_ADDRESS, ERC20_ABI } from '@/lib/arcChain';
import { useLocalTrades } from '@/lib/useLocalTrades';
import {
  ArrowLeft, TrendingUp, TrendingDown, Wallet,
  BarChart2, Clock, ExternalLink, RefreshCw, Zap,
} from 'lucide-react';
import { format } from 'date-fns';

type Tab = 'overview' | 'positions' | 'history';

export default function PortfolioPage() {
  const router = useRouter();
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
  const [tab, setTab] = useState<Tab>('overview');

  const totalPayout  = trades.reduce((s, t) => s + t.payout, 0);
  const avgSize      = totalTrades > 0 ? totalVolume / totalTrades : 0;

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Wallet size={48} className="text-gray-700 mx-auto mb-4"/>
          <p className="text-gray-400 text-lg font-semibold mb-2">Wallet not connected</p>
          <p className="text-gray-600 text-sm mb-6">Connect your wallet to see your portfolio</p>
          <button onClick={() => router.back()} className="px-6 py-2.5 bg-brand-500 hover:bg-brand-400 text-white rounded-xl text-sm font-semibold transition-colors">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition-colors">
              <ArrowLeft size={18}/>
            </button>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <BarChart2 size={20} className="text-brand-400"/> My Portfolio
              </h1>
              <p className="text-xs text-gray-500 mt-0.5 font-mono">
                {address ? `${address.slice(0,6)}…${address.slice(-4)}` : ''}
              </p>
            </div>
          </div>
          <button onClick={refresh} className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-xs text-gray-300 transition-colors">
            <RefreshCw size={12}/> Refresh
          </button>
        </div>

        {/* stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">USDC Balance</div>
            <div className="text-2xl font-black text-blue-300">{usdcBalance.toFixed(2)}</div>
            <div className="text-xs text-gray-600 mt-0.5">Sepolia testnet</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Total Volume</div>
            <div className="text-2xl font-black text-white">${totalVolume.toFixed(2)}</div>
            <div className="text-xs text-gray-600 mt-0.5">USDC spent</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Total Trades</div>
            <div className="text-2xl font-black text-white">{totalTrades}</div>
            <div className="text-xs text-gray-600 mt-0.5">Avg ${avgSize.toFixed(2)} each</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Max Payout</div>
            <div className="text-2xl font-black text-green-400">${totalPayout.toFixed(2)}</div>
            <div className="text-xs text-gray-600 mt-0.5">if all correct</div>
          </div>
        </div>

        {/* tabs */}
        <div className="flex gap-1 mb-4 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
          {(['overview','positions','history'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${tab === t ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* overview */}
        {tab === 'overview' && (
          <div className="space-y-4">
            {totalTrades === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                <Zap size={40} className="text-gray-700 mx-auto mb-4"/>
                <p className="text-gray-400 font-semibold mb-1">No trades yet</p>
                <p className="text-gray-600 text-sm mb-4">Place your first trade on the Crypto page</p>
                <button onClick={() => router.push('/crypto')} className="px-5 py-2.5 bg-brand-500 hover:bg-brand-400 text-white rounded-xl text-sm font-semibold transition-colors">
                  Go to Crypto Markets
                </button>
              </div>
            ) : (
              <>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <BarChart2 size={14} className="text-brand-400"/> Positions by Asset
                  </h3>
                  <div className="space-y-2">
                    {positions.map((pos, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl">
                        <div className="w-9 h-9 rounded-xl bg-yellow-500/20 flex items-center justify-center text-xs font-black text-yellow-400 flex-shrink-0">
                          {pos.symbol.slice(0,3)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-bold text-white">{pos.symbol}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${pos.side === 'Up' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                              {pos.side === 'Up' ? <TrendingUp size={8}/> : <TrendingDown size={8}/>} {pos.side}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">{pos.count} trade{pos.count > 1 ? 's' : ''}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-white">${pos.totalSpent.toFixed(2)}</div>
                          <div className="text-xs text-gray-600">USDC</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* recent 5 */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Clock size={14} className="text-gray-400"/> Recent Trades
                  </h3>
                  <div className="space-y-2">
                    {trades.slice(0,5).map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${tx.side === 'Up' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                            {tx.side === 'Up' ? <TrendingUp size={8}/> : <TrendingDown size={8}/>} {tx.side}
                          </span>
                          <span className="text-sm font-semibold text-white">{tx.symbol}</span>
                          <span className="text-xs text-gray-500">{format(new Date(tx.createdAt), 'MMM d, HH:mm')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-red-400">-${tx.amount.toFixed(2)}</span>
                          <a href={`https://sepolia.etherscan.io/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer"
                            className="text-gray-600 hover:text-brand-400 transition-colors">
                            <ExternalLink size={12}/>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* positions tab */}
        {tab === 'positions' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            {positions.length === 0 ? (
              <div className="py-16 text-center text-gray-600">
                <BarChart2 size={32} className="mx-auto mb-3 opacity-20"/>
                <p>No positions yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {positions.map((pos, i) => (
                  <div key={i} className="p-4 flex items-center justify-between gap-3 hover:bg-gray-800/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center text-sm font-black text-yellow-400">
                        {pos.symbol.slice(0,3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-white">{pos.symbol}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${pos.side === 'Up' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                            {pos.side === 'Up' ? <TrendingUp size={8}/> : <TrendingDown size={8}/>} {pos.side}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">{pos.count} trade{pos.count > 1 ? 's' : ''}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-white">${pos.totalSpent.toFixed(2)} <span className="text-xs text-gray-600">USDC</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* history tab */}
        {tab === 'history' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            {trades.length === 0 ? (
              <div className="py-16 text-center text-gray-600">
                <Clock size={32} className="mx-auto mb-3 opacity-20"/>
                <p>No trade history yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {trades.map(tx => (
                  <div key={tx.id} className="p-4 flex items-center justify-between gap-3 hover:bg-gray-800/30">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-yellow-500/20 flex items-center justify-center text-xs font-black text-yellow-400">
                        {tx.symbol.slice(0,3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${tx.side === 'Up' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                            {tx.side === 'Up' ? <TrendingUp size={8}/> : <TrendingDown size={8}/>} {tx.side}
                          </span>
                          <span className="font-semibold text-white text-sm">{tx.symbol}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Entry ${tx.entryPrice.toLocaleString()} · {format(new Date(tx.createdAt), 'MMM d, HH:mm')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <div className="font-bold text-red-400">-${tx.amount.toFixed(2)}</div>
                        <div className="text-xs text-green-500">max +${tx.profit.toFixed(2)}</div>
                      </div>
                      <a href={`https://sepolia.etherscan.io/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer"
                        className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-500 hover:text-brand-400 transition-colors">
                        <ExternalLink size={13}/>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
