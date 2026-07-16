'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { tradingApi, authApi, portfolioApi } from '@/lib/api';
import { calculateFee, formatCurrency } from '@/lib/utils';
import {
  TrendingUp, TrendingDown, AlertCircle, CheckCircle,
  ExternalLink, Loader2, Wallet, DollarSign, X, ShieldCheck,
} from 'lucide-react';
import {
  useAccount, useReadContract, useWriteContract,
  useChainId, useSwitchChain,
} from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { ARC_USDC_ADDRESS, ERC20_ABI, PLATFORM_TREASURY, usdcToUnits } from '@/lib/arcChain';

interface Market { id: string; title: string; yesPrice: number; noPrice: number; status: string; }
interface Position {
  id: string; side: string; contracts: number; avgPrice: number;
  currentPrice: number; currentValue: number; pnl: number; pnlPercent: string;
}
interface Props { market: Market; onTradeSuccess: () => void; }
type Step = 'idle' | 'switching' | 'approving' | 'sending' | 'confirming' | 'recording' | 'done' | 'error';

export default function TradePanel({ market, onTradeSuccess }: Props) {
  const { user, updateBalance, setAuth, setWallet } = useAuthStore();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const isSepolia = chainId === sepolia.id;

  // Live Sepolia USDC balance
  const { data: usdcRaw, refetch: refetchUsdc } = useReadContract({
    address:      ARC_USDC_ADDRESS,
    abi:          ERC20_ABI,
    functionName: 'balanceOf',
    args:         address ? [address] : undefined,
    chainId:      sepolia.id,
    query:        { enabled: !!address, refetchInterval: 8_000 },
  });
  const usdcBalance = usdcRaw ? Number(usdcRaw as bigint) / 1_000_000 : 0;

  const [side, setSide]           = useState<'YES' | 'NO'>('YES');
  const [action, setAction]       = useState<'BUY' | 'SELL'>('BUY');
  const [contracts, setContracts] = useState(10);
  const [step, setStep]           = useState<Step>('idle');
  const [txHash, setTxHash]       = useState('');
  const [errorMsg, setErrorMsg]   = useState('');
  const [resultMsg, setResultMsg] = useState('');
  const [positions, setPositions] = useState<Position[]>([]);

  const ensureUser = useCallback(async (): Promise<boolean> => {
    if (user) return true;
    if (isConnected && address) {
      try {
        const res = await authApi.walletLogin(address);
        setAuth(res.data.user, res.data.token);
        setWallet(address);
        return true;
      } catch { return false; }
    }
    return false;
  }, [user, isConnected, address, setAuth, setWallet]);

  const fetchPositions = useCallback(async () => {
    if (!user) return;
    try {
      const res = await portfolioApi.get();
      const all = (res.data.positions ?? [])
        .filter((p: Position & { market: { id: string } }) => p.market?.id === market.id)
        .map((p: Position & { market: { id: string; yesPrice: number; noPrice: number } }) => ({
          id: p.id, side: p.side, contracts: p.contracts, avgPrice: p.avgPrice,
          currentPrice: p.side === 'YES' ? market.yesPrice : market.noPrice,
          currentValue: p.contracts * (p.side === 'YES' ? market.yesPrice : market.noPrice),
          pnl: p.contracts * (p.side === 'YES' ? market.yesPrice : market.noPrice) - p.contracts * p.avgPrice,
          pnlPercent: p.pnlPercent,
        }));
      setPositions(all);
    } catch { /* ignore */ }
  }, [user, market.id, market.yesPrice, market.noPrice]);

  useEffect(() => { fetchPositions(); }, [fetchPositions]);

  const price     = side === 'YES' ? market.yesPrice : market.noPrice;
  const fee       = calculateFee(contracts, price);
  const totalCost = contracts * price + fee;
  const proceeds  = contracts * price - fee;
  const isOpen    = market.status === 'OPEN';
  const isLoading = ['switching','approving','sending','confirming','recording'].includes(step);

  const stepLabels: Record<Step, string> = {
    idle:       action === 'BUY' ? `Buy ${contracts} ${side}` : `Sell ${contracts} ${side}`,
    switching:  'Switching to Sepolia…',
    approving:  'Approving USDC…',
    sending:    'Sending USDC on Sepolia…',
    confirming: 'Confirming transaction…',
    recording:  'Recording trade…',
    done:       '✓ Trade complete',
    error:      'Retry',
  };

  const reset = () => { setStep('idle'); setErrorMsg(''); setTxHash(''); setResultMsg(''); };

  const closePosition = (pos: Position) => {
    setAction('SELL'); setSide(pos.side as 'YES' | 'NO');
    setContracts(pos.contracts); reset();
  };

  const handleTrade = async () => {
    setErrorMsg(''); setResultMsg('');

    // Block if not on Sepolia
    if (action === 'BUY' && !isSepolia) {
      setErrorMsg('Please switch to Sepolia network first using the button above');
      setStep('error');
      return;
    }

    // Auto-login if wallet connected but not yet logged in
    if (!user && isConnected && address) {
      try {
        const res = await authApi.walletLogin(address);
        setAuth(res.data.user, res.data.token);
        setWallet(address);
      } catch {
        setErrorMsg('Wallet login failed. Please reconnect.');
        setStep('error');
        return;
      }
    }

    if (!isConnected) {
      setErrorMsg('Connect your wallet to trade');
      setStep('error');
      return;
    }

    try {
      if (action === 'BUY') {
        // Send USDC on Sepolia
        setStep('sending');
        const units = usdcToUnits(totalCost);
        const hash = await writeContractAsync({
          address:      ARC_USDC_ADDRESS,
          abi:          ERC20_ABI,
          functionName: 'transfer',
          args:         [PLATFORM_TREASURY, units],
          chainId:      sepolia.id,
        });
        setTxHash(hash);

        // ── Step 3: wait for confirmation ──────────────────────────
        setStep('confirming');
        await new Promise(r => setTimeout(r, 2500));

        // ── Step 4: record trade on backend ───────────────────────
        setStep('recording');
        const res = await tradingApi.trade({
          marketId: market.id, side, contracts, action: 'BUY',
          txHash: hash, walletAddress: address,
        });
        if (res.data.newBalance !== undefined) updateBalance(parseFloat(String(res.data.newBalance)));
        setResultMsg(`Bought ${contracts} ${side} @ ${Math.round(price * 100)}¢`);

      } else {
        // SELL — no on-chain tx, just record
        setStep('recording');
        const res = await tradingApi.trade({
          marketId: market.id, side, contracts, action: 'SELL',
          walletAddress: address,
        });
        if (res.data.newBalance !== undefined) updateBalance(parseFloat(String(res.data.newBalance)));
        setResultMsg(`Sold ${contracts} ${side} — ${formatCurrency(proceeds)} USDC`);
      }

      setStep('done');
      refetchUsdc();
      onTradeSuccess();
      fetchPositions();

    } catch (err: unknown) {
      const msg =
        (err as { shortMessage?: string })?.shortMessage ||
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err as Error)?.message || 'Trade failed';
      setErrorMsg(msg);
      setStep('error');
    }
  };

  const canTrade = isOpen && !isLoading && !!user && isSepolia && (
    action === 'BUY' ? (isConnected && usdcBalance >= totalCost) : true
  );

  return (
    <div className="card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-100">Trade</h3>
        <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded-full text-xs text-blue-300 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Sepolia · USDC
        </span>
      </div>

      {/* Open positions */}
      {positions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Your Positions</p>
          {positions.map(pos => {
            const pp = pos.pnl >= 0;
            const sellProc = pos.contracts * (pos.side === 'YES' ? market.yesPrice : market.noPrice)
              - calculateFee(pos.contracts, pos.side === 'YES' ? market.yesPrice : market.noPrice);
            return (
              <div key={pos.id} className={`border rounded-xl p-3 space-y-2 ${pp ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`badge text-xs ${pos.side === 'YES' ? 'yes-bg' : 'no-bg'}`}>{pos.side}</span>
                    <span className="text-xs text-gray-400">{pos.contracts} contracts</span>
                    <span className="text-xs text-gray-600">avg {Math.round(pos.avgPrice * 100)}¢</span>
                  </div>
                  <div className={`text-sm font-black ${pp ? 'text-green-400' : 'text-red-400'}`}>
                    {pp ? '+' : ''}{formatCurrency(pos.pnl)}
                  </div>
                </div>
                <div className="flex items-center justify-between bg-gray-800/60 rounded-lg px-2.5 py-1.5 text-xs">
                  <span className="text-gray-500">Sell proceeds</span>
                  <span className="text-green-400 font-semibold">{formatCurrency(sellProc)} USDC</span>
                </div>
                <button onClick={() => closePosition(pos)} disabled={!isOpen}
                  className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 transition-all ${pp ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30' : 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'}`}>
                  <DollarSign size={12} />
                  {pp ? `Book Profit (+${formatCurrency(pos.pnl)})` : `Close (${formatCurrency(pos.pnl)})`}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Market closed */}
      {!isOpen && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-sm px-3 py-2 rounded-lg flex items-center gap-2">
          <AlertCircle size={14} /> Market {market.status.toLowerCase()} — trading paused.
        </div>
      )}

      {/* Not connected */}
      {!user && (
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-5 text-center">
          <Wallet size={20} className="text-gray-500 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Connect your wallet to trade</p>
        </div>
      )}

      {user && (
        <>
          {/* Wallet USDC balance */}
          {isConnected && (
            <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <ShieldCheck size={12} className="text-blue-400" />
                Wallet USDC (Sepolia)
              </div>
              <span className={`text-sm font-bold ${action === 'BUY' && usdcBalance < totalCost ? 'text-red-400' : 'text-blue-300'}`}>
                {usdcBalance.toFixed(2)} <span className="text-xs text-gray-500">USDC</span>
              </span>
            </div>
          )}

          {/* BUY / SELL */}
          <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
            {(['BUY','SELL'] as const).map(a => (
              <button key={a} onClick={() => { setAction(a); reset(); }}
                className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${action === a ? a === 'BUY' ? 'bg-brand-500 text-white' : 'bg-red-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}>
                {a}
              </button>
            ))}
          </div>
          {action === 'SELL' && (
            <div className="flex items-center justify-between bg-orange-500/10 border border-orange-500/30 rounded-xl px-3 py-2">
              <span className="text-xs text-orange-300 font-medium">Selling {contracts} {side} contracts</span>
              <button onClick={() => { setAction('BUY'); reset(); }} className="text-gray-500 hover:text-white"><X size={13} /></button>
            </div>
          )}

          {/* YES / NO */}
          <div className="grid grid-cols-2 gap-2">
            {(['YES','NO'] as const).map(s => (
              <button key={s} onClick={() => { setSide(s); reset(); }}
                className={`py-3 rounded-xl font-bold text-sm border transition-all ${side === s ? s === 'YES' ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-red-500/20 border-red-500 text-red-400' : 'border-gray-700 text-gray-400 hover:border-gray-600'}`}>
                <div className="flex items-center justify-center gap-1.5">
                  {s === 'YES' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}{s}
                </div>
                <div className="text-xl font-extrabold mt-0.5">
                  {Math.round((s === 'YES' ? market.yesPrice : market.noPrice) * 100)}¢
                </div>
              </button>
            ))}
          </div>

          {/* Contracts */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Contracts</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setContracts(Math.max(1, contracts - 10))} className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 font-bold flex items-center justify-center">−</button>
              <input type="number" min={1} max={10000} value={contracts}
                onChange={e => setContracts(Math.max(1, parseInt(e.target.value) || 1))}
                className="input text-center font-semibold" />
              <button onClick={() => setContracts(Math.min(10000, contracts + 10))} className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 font-bold flex items-center justify-center">+</button>
            </div>
            <div className="flex gap-2 mt-2">
              {[10,50,100,500].map(n => (
                <button key={n} onClick={() => setContracts(n)} className="flex-1 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 rounded-lg">{n}</button>
              ))}
            </div>
          </div>

          {/* Order summary */}
          <div className="bg-gray-800/50 rounded-xl p-3 space-y-2 text-sm">
            <div className="flex justify-between text-gray-400"><span>Price</span><span className="text-white">{Math.round(price * 100)}¢</span></div>
            <div className="flex justify-between text-gray-400"><span>Contracts</span><span className="text-white">{contracts}</span></div>
            <div className="flex justify-between text-gray-400"><span>Fee</span><span className="text-white">{formatCurrency(fee)} USDC</span></div>
            <div className="border-t border-gray-700 pt-2 flex justify-between font-semibold">
              <span className="text-gray-300">{action === 'BUY' ? 'On-chain USDC cost' : 'You receive'}</span>
              <span className={action === 'BUY' ? 'text-red-400' : 'text-green-400'}>
                {formatCurrency(action === 'BUY' ? totalCost : proceeds)} USDC
              </span>
            </div>
            {action === 'BUY' && (
              <div className="flex justify-between text-xs text-gray-400">
                <span>Max payout if {side} wins</span>
                <span className="text-green-400">+{formatCurrency(contracts - totalCost)} USDC</span>
              </div>
            )}
          </div>

          {/* Not on Sepolia — show switch button */}
          {!isSepolia && isConnected && (
            <div className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-3 py-3">
              <div className="flex items-center gap-2 text-yellow-300 text-xs">
                <AlertCircle size={12} />
                Switch to Sepolia to trade with USDC
              </div>
              <button onClick={() => switchChain({ chainId: sepolia.id })}
                className="px-3 py-1 text-xs bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg">
                Switch
              </button>
            </div>
          )}

          {/* Insufficient balance */}
          {action === 'BUY' && isConnected && usdcBalance < totalCost && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-2 rounded-lg">
              <AlertCircle size={12} />
              Need {formatCurrency(totalCost - usdcBalance)} more USDC.{' '}
              <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" className="underline">Get USDC ↗</a>
            </div>
          )}

          {/* Error */}
          {step === 'error' && errorMsg && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-2 rounded-lg">
              <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />{errorMsg}
            </div>
          )}

          {/* Success */}
          {step === 'done' && (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 text-xs px-3 py-2 rounded-lg">
              <CheckCircle size={12} />{resultMsg}
              {txHash && (
                <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1 text-blue-400 hover:underline">
                  Etherscan <ExternalLink size={9} />
                </a>
              )}
            </div>
          )}

          {/* Trade button */}
          <button onClick={step === 'done' ? reset : handleTrade} disabled={!canTrade}
            className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${step === 'done' ? 'bg-gray-700 hover:bg-gray-600 text-white' : action === 'BUY' ? 'bg-brand-500 hover:bg-brand-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}>
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            {stepLabels[step]}
          </button>
        </>
      )}
    </div>
  );
}
