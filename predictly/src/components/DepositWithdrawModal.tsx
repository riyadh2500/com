'use client';

import { useState } from 'react';
import {
  useAccount, useWriteContract, useWaitForTransactionReceipt,
  useSwitchChain, useChainId, useBalance,
} from 'wagmi';
import {
  ARC_USDC_ADDRESS, ERC20_ABI, arcTestnet,
  usdcToUnits, PLATFORM_TREASURY, unitsToUsdc,
} from '@/lib/arcChain';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import {
  X, ArrowDownToLine, ArrowUpFromLine,
  AlertTriangle, CheckCircle, ExternalLink, Loader2,
} from 'lucide-react';

interface Props {
  onClose: () => void;
}

type Tab = 'deposit' | 'withdraw';
type Step = 'idle' | 'switching' | 'approving' | 'sending' | 'confirming' | 'success' | 'error';

export default function DepositWithdrawModal({ onClose }: Props) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { user, updateBalance } = useAuthStore();

  const [tab, setTab] = useState<Tab>('deposit');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [txHash, setTxHash] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const isArc = chainId === arcTestnet.id;

  const { data: nativeBal } = useBalance({ address, chainId: arcTestnet.id });
  const onChainUsdc = nativeBal ? parseFloat(nativeBal.formatted) : 0;

  const { writeContractAsync } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: txConfirmed } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}` | undefined,
  });

  const parsedAmount = parseFloat(amount) || 0;

  const handleDeposit = async () => {
    if (!address || parsedAmount <= 0) return;
    setErrorMsg('');

    try {
      // 1. Switch to Arc if needed
      if (!isArc) {
        setStep('switching');
        await switchChain({ chainId: arcTestnet.id });
        await new Promise(r => setTimeout(r, 1000));
      }

      // 2. Send USDC transfer on Arc to platform treasury
      setStep('sending');
      const units = usdcToUnits(parsedAmount);

      const hash = await writeContractAsync({
        address: ARC_USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [PLATFORM_TREASURY, units],
        chainId: arcTestnet.id,
      });

      setTxHash(hash);
      setStep('confirming');

      // 3. Notify backend to credit user balance
      setStep('confirming');
      await new Promise(r => setTimeout(r, 2000)); // wait for Arc sub-second finality

      const res = await api.post('/trading/deposit', {
        txHash: hash,
        amount: parsedAmount,
        walletAddress: address,
        chain: 'arc-testnet',
      });

      if (res.data.newBalance) updateBalance(res.data.newBalance);
      setStep('success');

    } catch (err: unknown) {
      const msg = (err as { shortMessage?: string; message?: string })?.shortMessage
        || (err as Error)?.message
        || 'Transaction failed';
      setErrorMsg(msg);
      setStep('error');
    }
  };

  const handleWithdraw = async () => {
    if (!address || parsedAmount <= 0 || !user) return;
    if (parsedAmount > user.balance) {
      setErrorMsg('Insufficient platform balance');
      return;
    }
    setErrorMsg('');
    setStep('sending');

    try {
      const res = await api.post('/trading/withdraw', {
        amount: parsedAmount,
        walletAddress: address,
        chain: 'arc-testnet',
      });

      if (res.data.newBalance) updateBalance(res.data.newBalance);
      if (res.data.txHash) setTxHash(res.data.txHash);
      setStep('success');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Withdrawal failed';
      setErrorMsg(msg);
      setStep('error');
    }
  };

  const isLoading = ['switching', 'approving', 'sending', 'confirming'].includes(step);

  const stepLabel: Record<Step, string> = {
    idle: tab === 'deposit' ? 'Deposit USDC' : 'Withdraw USDC',
    switching: 'Switching to Arc...',
    approving: 'Approving USDC...',
    sending: 'Sending transaction...',
    confirming: 'Confirming on Arc...',
    success: 'Success!',
    error: 'Try again',
  };

  const quickAmounts = [10, 50, 100, 500];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md card shadow-2xl border border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded-full text-xs text-blue-300 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Sepolia Testnet
            </span>
            <span className="text-white font-semibold">ETH</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-900/60 border-b border-gray-800">
          {(['deposit', 'withdraw'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setStep('idle'); setErrorMsg(''); setAmount(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold capitalize transition-colors border-b-2 ${
                tab === t
                  ? 'border-brand-400 text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {t === 'deposit'
                ? <><ArrowDownToLine size={14} /> Deposit</>
                : <><ArrowUpFromLine size={14} /> Withdraw</>
              }
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {/* Chain warning */}
          {!isArc && tab === 'deposit' && (
            <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs px-3 py-2 rounded-lg">
              <AlertTriangle size={12} />
              You&apos;re not on Sepolia Testnet. We&apos;ll switch automatically when you deposit.
              <button
                onClick={() => switchChain({ chainId: arcTestnet.id })}
                className="ml-auto underline"
              >
                Switch now
              </button>
            </div>
          )}

          {/* Balances */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800/50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">On-chain (Arc)</p>
              <p className="text-lg font-bold text-blue-300">
                {onChainUsdc.toFixed(2)}
                <span className="text-xs text-gray-500 ml-1">ETH</span>
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Platform balance</p>
              <p className="text-lg font-bold text-brand-300">
                {(user?.balance ?? 0).toFixed(2)}
                <span className="text-xs text-gray-500 ml-1">ETH</span>
              </p>
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">
              Amount (USDC)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="input pl-7 text-lg font-semibold"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isLoading}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-400 font-semibold">ETH</span>
            </div>

            {/* Quick amounts */}
            <div className="flex gap-2 mt-2">
              {quickAmounts.map((a) => (
                <button
                  key={a}
                  onClick={() => setAmount(String(a))}
                  className="flex-1 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors"
                >
                  ${a}
                </button>
              ))}
              {tab === 'deposit' && (
                <button
                  onClick={() => setAmount(onChainUsdc.toFixed(2))}
                  className="px-3 py-1 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-colors"
                >
                  Max
                </button>
              )}
              {tab === 'withdraw' && user && (
                <button
                  onClick={() => setAmount(user.balance.toFixed(2))}
                  className="px-3 py-1 text-xs bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 rounded-lg transition-colors"
                >
                  Max
                </button>
              )}
            </div>
          </div>

          {/* Info box */}
          <div className="bg-gray-800/40 rounded-xl p-3 text-xs text-gray-400 space-y-1.5">
            {tab === 'deposit' ? (
              <>
                <div className="flex justify-between"><span>Network</span><span className="text-blue-300">Sepolia Testnet</span></div>
                <div className="flex justify-between"><span>Gas token</span><span className="text-blue-300">USDC (not ETH)</span></div>
                <div className="flex justify-between"><span>Finality</span><span className="text-green-400">Sub-second</span></div>
                <div className="flex justify-between"><span>You deposit</span><span className="text-white font-medium">{parsedAmount > 0 ? `$${parsedAmount.toFixed(2)} USDC` : '—'}</span></div>
                <div className="flex justify-between"><span>Platform credits</span><span className="text-brand-400 font-medium">{parsedAmount > 0 ? `$${parsedAmount.toFixed(2)} USDC` : '—'}</span></div>
              </>
            ) : (
              <>
                <div className="flex justify-between"><span>Network</span><span className="text-blue-300">Sepolia Testnet</span></div>
                <div className="flex justify-between"><span>You withdraw</span><span className="text-white font-medium">{parsedAmount > 0 ? `$${parsedAmount.toFixed(2)} USDC` : '—'}</span></div>
                <div className="flex justify-between"><span>Sent to wallet</span><span className="text-blue-300 font-mono">{address ? `${address.slice(0,6)}…${address.slice(-4)}` : '—'}</span></div>
              </>
            )}
          </div>

          {/* Error */}
          {step === 'error' && errorMsg && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-2 rounded-lg">
              <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Success */}
          {step === 'success' && (
            <div className="flex flex-col items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 px-3 py-4 rounded-xl text-sm text-center">
              <CheckCircle size={28} />
              <p className="font-semibold">
                {tab === 'deposit'
                  ? `$${parsedAmount.toFixed(2)} USDC deposited!`
                  : `$${parsedAmount.toFixed(2)} USDC withdrawn!`
                }
              </p>
              {txHash && (
                <a
                  href={`https://testnet.arcscan.app/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-400 hover:underline"
                >
                  View on ArcScan <ExternalLink size={10} />
                </a>
              )}
            </div>
          )}

          {/* Action button */}
          {step !== 'success' && (
            <button
              onClick={tab === 'deposit' ? handleDeposit : handleWithdraw}
              disabled={isLoading || parsedAmount <= 0 || !isConnected}
              className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                tab === 'deposit'
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-brand-500 hover:bg-brand-600 text-white'
              }`}
            >
              {isLoading ? (
                <><Loader2 size={16} className="animate-spin" />{stepLabel[step]}</>
              ) : (
                <>
                  {tab === 'deposit' ? <ArrowDownToLine size={15} /> : <ArrowUpFromLine size={15} />}
                  {stepLabel[step]}
                </>
              )}
            </button>
          )}

          {/* Footer note */}
          <p className="text-xs text-gray-600 text-center">
            Arc is Circle&apos;s stablecoin-native L1 — USDC is gas, settlement is sub-second.{' '}
            <a href="https://docs.arc.network" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              Learn more ↗
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
