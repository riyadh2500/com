'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId, useSwitchChain, useReadContract } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { ARC_USDC_ADDRESS, ERC20_ABI, PLATFORM_TREASURY, usdcToUnits } from '@/lib/arcChain';
import { X, AlertCircle, CheckCircle, Loader2, ExternalLink, ArrowDownToLine } from 'lucide-react';

interface Props { onClose: () => void; }

type Step = 'idle' | 'switching' | 'approving' | 'transferring' | 'confirming' | 'crediting' | 'done' | 'error';

export default function DepositModal({ onClose }: Props) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const { user, updateBalance } = useAuthStore();

  const [amount, setAmount] = useState('10');
  const [step, setStep] = useState<Step>('idle');
  const [txHash, setTxHash] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const isSepolia = chainId === sepolia.id;
  const parsedAmount = parseFloat(amount) || 0;

  // Read USDC balance
  const { data: usdcRaw } = useReadContract({
    address:      ARC_USDC_ADDRESS,
    abi:          ERC20_ABI,
    functionName: 'balanceOf',
    args:         address ? [address] : undefined,
    chainId:      sepolia.id,
    query:        { enabled: !!address, refetchInterval: 5_000 },
  });
  const usdcBalance = usdcRaw ? Number(usdcRaw as bigint) / 1_000_000 : 0;

  const isLoading = ['switching','approving','transferring','confirming','crediting'].includes(step);

  const stepLabel: Record<Step, string> = {
    idle:         'Deposit USDC',
    switching:    'Switching to Sepolia…',
    approving:    'Approving USDC…',
    transferring: 'Sending USDC…',
    confirming:   'Confirming on Sepolia…',
    crediting:    'Crediting balance…',
    done:         '✓ Deposited!',
    error:        'Retry',
  };

  const handleDeposit = async () => {
    if (!address || parsedAmount <= 0) return;
    setErrorMsg('');

    try {
      // 1. Switch to Sepolia if needed
      if (!isSepolia) {
        setStep('switching');
        await switchChain({ chainId: sepolia.id });
        await new Promise(r => setTimeout(r, 2000));
      }

      // 2. Transfer USDC from wallet to platform treasury
      setStep('transferring');
      const units = usdcToUnits(parsedAmount);
      const hash = await writeContractAsync({
        address:      ARC_USDC_ADDRESS,
        abi:          ERC20_ABI,
        functionName: 'transfer',
        args:         [PLATFORM_TREASURY, units],
        chainId:      sepolia.id,
      });
      setTxHash(hash);

      // 3. Wait for confirmation
      setStep('confirming');
      await new Promise(r => setTimeout(r, 3000));

      // 4. Credit platform balance via backend
      setStep('crediting');
      const res = await api.post('/trading/deposit', {
        txHash:        hash,
        amount:        parsedAmount,
        walletAddress: address,
        chain:         'sepolia',
      });

      if (res.data.newBalance !== undefined) updateBalance(res.data.newBalance);
      setStep('done');

    } catch (err: unknown) {
      const msg =
        (err as { shortMessage?: string })?.shortMessage ||
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err as Error)?.message || 'Deposit failed';
      setErrorMsg(msg);
      setStep('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <ArrowDownToLine size={16} className="text-brand-400" />
            <h3 className="font-semibold text-white">Deposit USDC</h3>
            <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded-full text-xs text-blue-300">
              <span className="w-1 h-1 rounded-full bg-blue-400" />Sepolia
            </span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Balances */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800/50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Wallet USDC</p>
              <p className="text-lg font-bold text-blue-300">{usdcBalance.toFixed(2)}</p>
              <p className="text-xs text-gray-600">USDC</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Platform Balance</p>
              <p className="text-lg font-bold text-brand-300">{(user?.balance ?? 0).toFixed(2)}</p>
              <p className="text-xs text-gray-600">USDC</p>
            </div>
          </div>

          {/* Not connected */}
          {!isConnected && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertCircle size={12} /> Connect your wallet first
            </div>
          )}

          {/* Amount input */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Amount (USDC)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">$</span>
              <input type="number" min="1" step="1" value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-8 pr-20 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-blue-400 font-bold">USDC</span>
            </div>
            <div className="flex gap-2 mt-2">
              {[5, 10, 25, 50, 100].map(n => (
                <button key={n} onClick={() => setAmount(String(n))}
                  className="flex-1 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg">${n}</button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="bg-gray-800/40 rounded-xl p-3 space-y-1.5 text-xs text-gray-400">
            <div className="flex justify-between"><span>Network</span><span className="text-blue-300">Sepolia Testnet</span></div>
            <div className="flex justify-between"><span>Token</span><span className="text-white font-mono">{ARC_USDC_ADDRESS.slice(0,10)}…</span></div>
            <div className="flex justify-between"><span>You deposit</span><span className="text-white font-semibold">${parsedAmount > 0 ? parsedAmount.toFixed(2) : '0'} USDC</span></div>
            <div className="flex justify-between"><span>Platform credits</span><span className="text-brand-400 font-semibold">${parsedAmount > 0 ? parsedAmount.toFixed(2) : '0'} USDC</span></div>
          </div>

          {/* Low balance */}
          {isConnected && usdcBalance < parsedAmount && parsedAmount > 0 && (
            <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs px-3 py-2 rounded-lg">
              <AlertCircle size={12} />
              Not enough USDC.{' '}
              <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" className="underline">Get from faucet ↗</a>
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
            <div className="flex flex-col items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl px-3 py-4 text-center">
              <CheckCircle size={28} className="text-green-400" />
              <p className="text-sm font-semibold text-green-400">${parsedAmount.toFixed(2)} USDC deposited!</p>
              {txHash && (
                <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-400 hover:underline">
                  View on Etherscan <ExternalLink size={10} />
                </a>
              )}
              <button onClick={onClose} className="mt-1 text-xs text-gray-500 hover:text-gray-300">Close</button>
            </div>
          )}

          {/* CTA */}
          {step !== 'done' && (
            <button onClick={handleDeposit}
              disabled={isLoading || parsedAmount <= 0 || !isConnected || usdcBalance < parsedAmount}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? <><Loader2 size={14} className="animate-spin" />{stepLabel[step]}</> : <><ArrowDownToLine size={14} />{stepLabel[step]}</>}
            </button>
          )}

          <p className="text-xs text-gray-600 text-center">
            Get Sepolia USDC at{' '}
            <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">faucet.circle.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
