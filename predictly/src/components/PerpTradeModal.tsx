'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useChainId, useSwitchChain, useWriteContract, useReadContract } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/lib/api';
import { ARC_USDC_ADDRESS, ERC20_ABI, PLATFORM_TREASURY, usdcToUnits } from '@/lib/arcChain';
import { formatPrice } from '@/lib/perpData';
import type { PerpAsset } from '@/lib/perpData';
import { useLocalTrades } from '@/lib/useLocalTrades';
import { X, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Loader2, Zap } from 'lucide-react';

interface Props { asset: PerpAsset; initialSide: 'long' | 'short'; onClose: () => void; }
type Step = 'idle' | 'switching' | 'sending' | 'confirming' | 'recording' | 'done' | 'error';
const LEVERAGES = [1, 2, 3, 5, 10, 20];

export default function PerpTradeModal({ asset, initialSide, onClose }: Props) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { user, setAuth, setWallet } = useAuthStore();
  const isSepolia = chainId === sepolia.id;
  const { addTrade } = useLocalTrades(address);

  // Read USDC ERC-20 balance on Sepolia
  const { data: usdcRaw } = useReadContract({
    address:      ARC_USDC_ADDRESS,
    abi:          ERC20_ABI,
    functionName: 'balanceOf',
    args:         address ? [address] : undefined,
    chainId:      sepolia.id,
    query:        { enabled: !!address, refetchInterval: 8_000 },
  });
  const usdcBalance = usdcRaw ? Number(usdcRaw as bigint) / 1_000_000 : 0;

  const [side, setSide]         = useState<'long'|'short'>(initialSide);
  const [leverage, setLeverage] = useState(Math.min(asset.maxLeverage, 5));
  const [sizeUsdc, setSizeUsdc] = useState('10');
  const [step, setStep]         = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [resultMsg, setResultMsg] = useState('');
  const [livePrice, setLivePrice] = useState(asset.price);

  useEffect(() => { if (asset.price > 0) setLivePrice(asset.price); }, [asset.price]);

  const size     = parseFloat(sizeUsdc) || 0;
  const notional = size * leverage;
  const fee      = notional * 0.0005;
  const total    = size + fee;
  const liqPct   = (size / Math.max(notional, 1)) * 0.95 * 100;
  const liqPrice = side === 'long' ? livePrice * (1 - liqPct / 100) : livePrice * (1 + liqPct / 100);
  const { writeContractAsync } = useWriteContract();
  const isLoading = ['switching','sending','confirming','recording'].includes(step);

  const ensureUser = useCallback(async (): Promise<boolean> => {
    if (user) return true;
    if (isConnected && address) {
      try {
        const res = await authApi.walletLogin(address);
        setAuth(res.data.user, res.data.token);
        setWallet(address);
      } catch { /* backend offline — wallet-only mode */ }
      return true; // allow trade regardless
    }
    return false;
  }, [user, isConnected, address, setAuth, setWallet]);

  const handleTrade = async () => {
    if (size <= 0) return;
    setErrorMsg('');

    if (!isConnected) { setErrorMsg('Connect your wallet to trade'); setStep('error'); return; }
    if (!isSepolia) { setErrorMsg('Please switch to Sepolia network first'); setStep('error'); return; }

    await ensureUser();

    try {
      // Send USDC on-chain
      setStep('sending');
      const hash = await writeContractAsync({
        address:      ARC_USDC_ADDRESS,
        abi:          ERC20_ABI,
        functionName: 'transfer',
        args:         [PLATFORM_TREASURY, usdcToUnits(total)],
        chainId:      sepolia.id,
      });

      // Brief confirmation wait
      setStep('confirming');
      await new Promise(r => setTimeout(r, 2500));

      // Save locally — no backend needed
      setStep('recording');
      addTrade({
        symbol:        asset.symbol,
        marketId:      `perp-${asset.symbol.toLowerCase()}-${side}`,
        marketTitle:   `${asset.symbol} ${leverage}× ${side === 'long' ? 'Long' : 'Short'}`,
        side:          side === 'long' ? 'Up' : 'Down',
        amount:        total,
        contractPrice: leverage,
        entryPrice:    livePrice,
        payout:        notional,
        profit:        notional - total,
        txHash:        hash,
        walletAddress: address!,
      });

      setResultMsg(`${side === 'long' ? 'Long' : 'Short'} ${asset.symbol} · $${notional.toLocaleString(undefined, { maximumFractionDigits: 2 })} notional`);
      setStep('done');

    } catch (err: unknown) {
      setErrorMsg(
        (err as { shortMessage?: string })?.shortMessage ||
        (err as Error)?.message || 'Trade failed'
      );
      setStep('error');
    }
  };

  const stepLabel = {
    idle:       `Open ${side === 'long' ? 'Long' : 'Short'}`,
    switching:  'Switching to Sepolia…',
    sending:    'Sending USDC…',
    confirming: 'Confirming…',
    recording:  'Opening position…',
    done:       '✓ Done',
    error:      'Retry',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black" style={{ background: asset.color + '33', color: asset.color }}>{asset.icon}</div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-lg">{asset.symbol}</span>
                <span className="px-1.5 py-0.5 bg-gray-800 text-gray-400 text-xs rounded font-mono">{leverage}×</span>
                <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-xs text-indigo-300">
                  <span className="w-1 h-1 rounded-full bg-indigo-400" />Sepolia
                </span>
              </div>
              <div className="text-sm text-gray-400 font-mono">${formatPrice(livePrice)}<span className="ml-2 text-xs text-green-400 animate-pulse">● live</span></div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>

        {/* Long / Short */}
        <div className="flex m-4 bg-gray-900 rounded-xl p-1 gap-1">
          {(['long','short'] as const).map(s => (
            <button key={s} onClick={() => setSide(s)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${side === s ? s === 'long' ? 'bg-green-500 text-black shadow-lg' : 'bg-red-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>
              {s === 'long' ? <TrendingUp size={15}/> : <TrendingDown size={15}/>}
              {s === 'long' ? 'Long' : 'Short'}
            </button>
          ))}
        </div>

        <div className="px-4 pb-4 space-y-4">
          {/* Leverage */}
          <div>
            <div className="flex justify-between mb-2"><label className="text-xs text-gray-400">Leverage</label><span className="text-sm font-bold text-white">{leverage}×</span></div>
            <input type="range" min={1} max={asset.maxLeverage} value={leverage} onChange={e => setLeverage(Number(e.target.value))} className="w-full accent-brand-500" />
            <div className="flex gap-1.5 mt-2">
              {LEVERAGES.filter(l => l <= asset.maxLeverage).map(l => (
                <button key={l} onClick={() => setLeverage(l)}
                  className={`flex-1 py-1 text-xs rounded font-semibold border transition-all ${leverage === l ? 'bg-brand-500 border-brand-500 text-white' : 'border-gray-700 text-gray-500 hover:text-gray-300'}`}>{l}×</button>
              ))}
            </div>
          </div>

          {/* Size */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Size (USDC collateral)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">$</span>
              <input type="number" min="1" step="1" value={sizeUsdc} onChange={e => setSizeUsdc(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl pl-8 pr-20 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-blue-400 font-bold">USDC</span>
            </div>
            <div className="flex gap-2 mt-2">
              {[5, 10, 25, 50, 100].map(n => (<button key={n} onClick={() => setSizeUsdc(String(n))} className="flex-1 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg">${n}</button>))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-900 rounded-xl p-3 space-y-2 text-sm border border-gray-800">
            <div className="flex justify-between text-gray-400"><span>Entry</span><span className="text-white font-mono">${formatPrice(livePrice)}</span></div>
            <div className="flex justify-between text-gray-400"><span>Notional</span><span className="text-white">${notional.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC</span></div>
            <div className="flex justify-between text-gray-400"><span>Fee (0.05%)</span><span className="text-white">{fee.toFixed(4)} USDC</span></div>
            <div className="flex justify-between text-gray-400"><span>Collateral</span><span className={`font-semibold ${user && user.balance < total ? 'text-red-400' : 'text-brand-400'}`}>${total.toFixed(4)} USDC</span></div>
            <div className="border-t border-gray-800 pt-2 flex justify-between text-gray-400"><span>Est. liquidation</span><span className="text-red-400 font-mono">${formatPrice(liqPrice)}</span></div>
          </div>

          {/* Wallet USDC balance — replaces ETH */}
          {isConnected && (
            <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2">
              <span className="text-xs text-gray-400">Wallet USDC (Sepolia)</span>
              <span className="text-sm font-bold text-blue-300">{usdcBalance.toFixed(2)} <span className="text-xs text-gray-500">USDC</span></span>
            </div>
          )}

          {/* Switch Network button if not on Sepolia */}
          {isConnected && !isSepolia && (
            <div className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-3 py-2.5">
              <span className="text-xs text-yellow-300">Switch to Sepolia to trade</span>
              <button onClick={() => switchChain({ chainId: sepolia.id })}
                className="px-3 py-1 text-xs bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg">
                Switch
              </button>
            </div>
          )}

          {!user && !isConnected && (<div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs px-3 py-2 rounded-lg"><AlertCircle size={12}/>Connect wallet to trade</div>)}
          {step === 'error' && errorMsg && (<div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-2 rounded-lg"><AlertCircle size={12} className="mt-0.5 flex-shrink-0"/>{errorMsg}</div>)}

          {step === 'done' && (
            <div className="flex flex-col items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl px-3 py-4 text-center">
              <CheckCircle size={28} className="text-green-400"/>
              <p className="text-sm font-semibold text-green-400">{resultMsg}</p>
              <button onClick={onClose} className="mt-1 text-xs text-gray-500 hover:text-gray-300">Close</button>
            </div>
          )}

          {step !== 'done' && (
            <button onClick={handleTrade} disabled={isLoading || size <= 0 || !isSepolia}
              className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${side === 'long' ? 'bg-green-500 hover:bg-green-400 text-black' : 'bg-red-500 hover:bg-red-400 text-white'}`}>
              {isLoading ? <><Loader2 size={15} className="animate-spin"/>{stepLabel.recording}</> : <><Zap size={15}/>{stepLabel[step]}</>}
            </button>
          )}
          <p className="text-xs text-gray-700 text-center">Trades settled on platform balance · Sepolia Testnet</p>
        </div>
      </div>
    </div>
  );
}
