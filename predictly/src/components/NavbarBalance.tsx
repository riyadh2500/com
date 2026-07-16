'use client';

import { useAccount, useBalance } from 'wagmi';
import { arcTestnet } from '@/lib/arcChain';
import { useAuthStore } from '@/store/authStore';

export default function NavbarBalance() {
  const { address, isConnected } = useAccount();
  const { user } = useAuthStore();
  const { data: arcBal } = useBalance({ address, chainId: arcTestnet.id });

  const onChainUsdc = arcBal ? parseFloat(arcBal.formatted) : null;

  if (!user) return null;

  const display = isConnected && onChainUsdc !== null
    ? `${onChainUsdc.toFixed(2)} USDC`
    : `$${(user.balance ?? 0).toFixed(2)} USDC`;

  return (
    <span className="text-sm font-bold text-white">{display}</span>
  );
}
