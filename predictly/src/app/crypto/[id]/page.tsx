'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCryptoPrices } from '@/lib/useCryptoPrices';
import { generateMarkets, formatMarketPrice, CRYPTO_ASSETS } from '@/lib/cryptoMarkets';
import type { CryptoMarket, PricePoint } from '@/lib/cryptoMarkets';
import { api, authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useAccount, useReadContract, useWriteContract, useChainId, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { ARC_USDC_ADDRESS, ERC20_ABI, PLATFORM_TREASURY, usdcToUnits } from '@/lib/arcChain';
import { useLocalTrades } from '@/lib/useLocalTrades';
import {
  ArrowLeft, TrendingUp, TrendingDown,
  Loader2, CheckCircle, AlertCircle,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';

function useCountdown(minutes: number) {
  const [secs, setSecs] = useState(() => {
    const ms = minutes * 60 * 1000;
    return Math.floor((ms - (Date.now() % ms)) / 1000);
  });
  useEffect(() => {
    const t = setInterval(() => setSecs(s => s <= 1 ? minutes * 60 : s - 1), 1000);
    return () => clearInterval(t);
  }, [minutes]);
  return { m: Math.floor(secs / 60).toString().padStart(2, '0'), s: (secs % 60).toString().padStart(2, '0') };
}

type TradeStep = 'idle' | 'switching' | 'sending' | 'confirming' | 'recording' | 'done' | 'error';

export default function CryptoTradePage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const { prices, connected } = useCryptoPrices();

  const { user, updateBalance, setAuth, setWallet } = useAuthStore();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const isSepolia = chainId === sepolia.id;
  const { writeContractAsync } = useWriteContract();
  const { addTrade } = useLocalTrades(address);

  const { data: usdcRaw } = useReadContract({
    address:      ARC_USDC_ADDRESS,
    abi:          ERC20_ABI,
    functionName: 'balanceOf',
    args:         address ? [address] : undefined,
    chainId:      sepolia.id,
    query:        { enabled: !!address, refetchInterval: 8_000 },
  });
  const sepoliaEth = usdcRaw ? Number(usdcRaw as bigint) / 1_000_000 : 0;

  const ensureUser = useCallback(async (): Promise<boolean> => {
    // Wallet connected is sufficient — backend login is optional
    if (user) return true;
    if (isConnected && address) {
      try {
        const res = await authApi.walletLogin(address);
        setAuth(res.data.user, res.data.token);
        setWallet(address);
      } catch { /* backend offline — continue with wallet-only mode */ }
      return true; // allow trade regardless of backend
    }
    return false;
  }, [user, isConnected, address, setAuth, setWallet]);

  const [market, setMarket] = useState<CryptoMarket | null>(null);
  useEffect(() => {
    const priceMap: Record<string, number> = {};
    for (const a of CRYPTO_ASSETS) priceMap[a.id] = prices[a.id]?.price ?? 50000;
    const all = generateMarkets(priceMap);
    setMarket(all.find(m => m.id === id) ?? null);
  }, [id, prices]);

  const lp = market ? prices[market.asset.id] : null;
  const currentPrice = lp?.price ?? 0;
  const priceBeat = useRef(currentPrice);
  useEffect(() => { if (currentPrice > 0 && priceBeat.current === 0) priceBeat.current = currentPrice; }, [currentPrice]);

  const countdown = useCountdown(market?.expiryMinutes ?? 5);
  const chartData = (lp?.history ?? []).map((p: PricePoint) => ({
    time: format(new Date(p.time), 'HH:mm:ss'),
    price: p.price,
  }));

  const [side, setSide]   = useState<'Up'|'Down'>('Up');
  const [amount, setAmount] = useState('10');
  const [step, setStep]   = useState<TradeStep>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const size = parseFloat(amount) || 0;
  const upProb  = market?.upProb ?? 50;
  const dnProb  = 100 - upProb;
  const contractPrice = (side === 'Up' ? upProb : dnProb) / 100;
  const payout = size / contractPrice;
  const profit = payout - size;
  const isLoading = ['switching','sending','confirming','recording'].includes(step);

  const handleTrade = async () => {
    if (size <= 0) return;
    setErrorMsg('');
    const ok = await ensureUser();
    if (!ok) { setErrorMsg('Connect your wallet to trade'); setStep('error'); return; }

    if (!isSepolia) {
      setErrorMsg('Please switch to Sepolia network first using the button above');
      setStep('error');
      return;
    }

    try {
      // Send USDC on-chain
      setStep('sending');
      const units = usdcToUnits(size);
      const hash = await writeContractAsync({
        address:      ARC_USDC_ADDRESS,
        abi:          ERC20_ABI,
        functionName: 'transfer',
        args:         [PLATFORM_TREASURY, units],
        chainId:      sepolia.id,
      });

      // Wait briefly for confirmation
      setStep('confirming');
      await new Promise(r => setTimeout(r, 2500));

      // Save trade locally — no backend needed
      setStep('recording');
      addTrade({
        symbol:        market!.asset.symbol,
        marketId:      market!.id,
        marketTitle:   market!.title,
        side,
        amount:        size,
        contractPrice,
        entryPrice:    currentPrice,
        payout,
        profit,
        txHash:        hash,
        walletAddress: address!,
      });

      setStep('done');

    } catch (err: unknown) {
      setErrorMsg(
        (err as { shortMessage?: string })?.shortMessage ||
        (err as Error)?.message || 'Trade failed'
      );
      setStep('error');
    }
  };

  const priceDiff = currentPrice - priceBeat.current;

  if (!market) return <div className="max-w-5xl mx-auto px-4 py-16 text-center text-gray-500"><p>Loading market…</p></div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-4 transition-colors">
        <ArrowLeft size={15} /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* ── Chart ── */}
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl font-black"
                  style={{ background: market.asset.color + '25', color: market.asset.color }}>
                  {market.asset.icon}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">{market.title}</h1>
                  <p className="text-xs text-gray-500">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
              {market.expiryMinutes && market.expiryMinutes < 1440 && (
                <div className="flex items-center gap-3 text-center">
                  <div><div className="text-3xl font-black text-white font-mono">{countdown.m}</div><div className="text-xs text-gray-500">MIN</div></div>
                  <div className="text-2xl font-black text-gray-600">:</div>
                  <div><div className="text-3xl font-black text-white font-mono">{countdown.s}</div><div className="text-xs text-gray-500">SECS</div></div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-8 mb-4">
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Price To Beat</div>
                <div className="text-xl font-bold text-white font-mono">${formatMarketPrice(priceBeat.current || currentPrice)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                  Current Price
                  {priceDiff !== 0 && <span className={`font-semibold ${priceDiff > 0 ? 'text-green-400' : 'text-red-400'}`}>{priceDiff > 0 ? '▲' : '▼'} ${Math.abs(priceDiff).toFixed(2)}</span>}
                </div>
                <div className="text-xl font-bold text-yellow-400 font-mono">${currentPrice > 0 ? formatMarketPrice(currentPrice) : '—'}</div>
              </div>
              <div className="ml-auto">{connected ? <span className="flex items-center gap-1 text-xs text-green-400"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>Live</span> : <span className="text-xs text-red-400">Offline</span>}</div>
            </div>

            <div className="h-52 -mx-1">
              {chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <defs>
                      <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#4b5563' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis domain={['auto','auto']} tick={{ fontSize: 9, fill: '#4b5563' }} tickLine={false} axisLine={false} tickFormatter={v => `$${formatMarketPrice(v)}`} width={72} />
                    <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [`$${formatMarketPrice(v)}`, 'Price']} />
                    {priceBeat.current > 0 && <ReferenceLine y={priceBeat.current} stroke="#6b7280" strokeDasharray="4 4" label={{ value: 'Target', fill: '#9ca3af', fontSize: 10, position: 'right' }} />}
                    <Area type="monotone" dataKey="price" stroke="#f59e0b" strokeWidth={2} fill="url(#priceGrad)" dot={false} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-600 text-sm">{connected ? 'Collecting price data…' : 'Connecting…'}</div>
              )}
            </div>
          </div>
        </div>

        {/* ── Trade panel ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 h-fit space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black" style={{ background: market.asset.color + '25', color: market.asset.color }}>{market.asset.icon}</div>
              <div>
                <div className="text-sm font-bold text-white">{market.title}</div>
                <div className={`text-xs font-semibold ${side === 'Up' ? 'text-green-400' : 'text-red-400'}`}>{side}</div>
              </div>
            </div>
            <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-xs text-indigo-300">
              <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" />Sepolia
            </span>
          </div>

          {/* Up / Down */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setSide('Up')}
              className={`py-3 rounded-xl font-bold text-sm transition-all border ${side === 'Up' ? 'bg-green-500 text-black border-green-500' : 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'}`}>
              <div className="flex items-center justify-center gap-1.5"><TrendingUp size={14} /> Up</div>
              <div className="text-lg font-black mt-0.5">{upProb}¢</div>
            </button>
            <button onClick={() => setSide('Down')}
              className={`py-3 rounded-xl font-bold text-sm transition-all border ${side === 'Down' ? 'bg-red-500 text-white border-red-500' : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'}`}>
              <div className="flex items-center justify-center gap-1.5"><TrendingDown size={14} /> Down</div>
              <div className="text-lg font-black mt-0.5">{dnProb}¢</div>
            </button>
          </div>

          <div className="text-xs text-gray-500 font-semibold">Amount in USDC</div>

          {/* Quick USDC amounts */}
          <div className="grid grid-cols-4 gap-2">
            {['5', '10', '25', '50'].map(n => (
              <button key={n} onClick={() => setAmount(n)}
                className={`py-2 rounded-xl border text-center transition-all text-xs font-bold ${amount === n ? 'border-brand-500 bg-brand-500/20 text-white' : 'border-gray-700 bg-gray-800 hover:border-gray-600 text-gray-300'}`}>
                ${n}
              </button>
            ))}
          </div>

          {/* Custom USDC amount */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">$</span>
            <input type="number" min="1" step="1" value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-8 pr-20 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-blue-400 font-bold">USDC</span>
          </div>

          {/* Sepolia USDC balance */}
          <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2">
            <span className="text-xs text-gray-400">Sepolia USDC balance</span>
            <span className="text-sm font-bold text-blue-300">{sepoliaEth.toFixed(2)} <span className="text-xs text-gray-500">USDC</span></span>
          </div>

          {/* Payout summary */}
            {size > 0 && (
            <div className="bg-gray-800/50 rounded-xl px-3 py-2 text-xs space-y-1">
              <div className="flex justify-between text-gray-400"><span>Cost</span><span className="text-white">${size.toFixed(2)} USDC</span></div>
              <div className="flex justify-between text-gray-400"><span>Max payout</span><span className="text-green-400">${payout.toFixed(2)} USDC</span></div>
              <div className="flex justify-between text-gray-400"><span>Profit if correct</span><span className="text-green-400">+${profit.toFixed(2)} USDC</span></div>
            </div>
          )}

          {/* Switch Network if not on Sepolia */}
          {isConnected && !isSepolia && (
            <div className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-3 py-2.5">
              <span className="text-xs text-yellow-300 font-medium">Switch to Sepolia to trade</span>
              <button onClick={() => switchChain({ chainId: sepolia.id })}
                className="px-3 py-1 text-xs bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg">
                Switch Network
              </button>
            </div>
          )}

          {/* Low balance */}
          {isConnected && sepoliaEth < size && size > 0 && (
            <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs px-3 py-2 rounded-lg">
              <AlertCircle size={11} />
              Not enough USDC.{' '}
              <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" className="underline">Get Sepolia USDC ↗</a>
            </div>
          )}

          {step === 'error' && errorMsg && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-2 rounded-lg">
              <AlertCircle size={11} className="mt-0.5 flex-shrink-0" />{errorMsg}
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center gap-1.5 bg-green-500/10 border border-green-500/30 rounded-xl px-3 py-3 text-center">
              <CheckCircle size={22} className="text-green-400" />
              <p className="text-xs font-semibold text-green-400">Trade placed! {side} {market.asset.symbol}</p>
              <button onClick={() => setStep('idle')} className="text-xs text-gray-500 hover:text-gray-300 mt-1">Trade again</button>
            </div>
          )}

          {step !== 'done' && (
            <button onClick={handleTrade} disabled={isLoading || size <= 0 || !isConnected || !isSepolia}
              className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${side === 'Up' ? 'bg-green-500 hover:bg-green-400 text-black' : 'bg-red-500 hover:bg-red-400 text-white'}`}>
              {isLoading ? <><Loader2 size={14} className="animate-spin" />{
                step === 'switching' ? 'Switching to Sepolia…' :
                step === 'sending' ? 'Sending USDC…' :
                step === 'confirming' ? 'Confirming…' :
                'Recording trade…'
              }</> : `Buy ${side} — $${size > 0 ? size.toFixed(2) : '0'} USDC`}
            </button>
          )}

          <p className="text-[10px] text-gray-700 text-center">Sepolia Testnet · USDC · No real funds</p>
        </div>
      </div>
    </div>
  );
}
