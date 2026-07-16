'use client';

import { useAccount, useReadContract, useChainId, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { ARC_USDC_ADDRESS, ERC20_ABI } from '@/lib/arcChain';
import { AlertTriangle } from 'lucide-react';

interface Props { compact?: boolean; }

export default function USDCBalance({ compact = false }: Props) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const isSepolia = chainId === sepolia.id;

  // Read USDC ERC-20 balance from Sepolia
  const { data: rawBalance } = useReadContract({
    address:      ARC_USDC_ADDRESS,
    abi:          ERC20_ABI,
    functionName: 'balanceOf',
    args:         address ? [address] : undefined,
    chainId:      sepolia.id,
    query:        { enabled: !!address, refetchInterval: 10_000 },
  });

  const usdcAmount = rawBalance ? Number(rawBalance as bigint) / 1_000_000 : 0;

  if (!isConnected) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded text-xs text-blue-300 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />Sepolia
        </span>
        <span className="text-sm font-semibold text-white">
          {usdcAmount.toFixed(2)}
          <span className="text-xs text-gray-400 ml-1">USDC</span>
        </span>
        {!isSepolia && (
          <button onClick={() => switchChain({ chainId: sepolia.id })}
            className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300">
            <AlertTriangle size={11} /> Switch
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded-full text-xs text-blue-300 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />Sepolia · USDC
        </span>
        {!isSepolia && (
          <button onClick={() => switchChain({ chainId: sepolia.id })}
            className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300">
            <AlertTriangle size={11} /> Switch to Sepolia
          </button>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-black text-white">{usdcAmount.toFixed(4)}</span>
        <span className="text-sm text-blue-300 font-semibold mb-0.5">USDC</span>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Sepolia USDC · Contract: {ARC_USDC_ADDRESS.slice(0,10)}…{' '}
        <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer"
          className="text-blue-400 hover:underline">Get USDC faucet ↗</a>
      </p>
    </div>
  );
}
