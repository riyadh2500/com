'use client';

import { useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useAuthStore } from '@/store/authStore';
import { authApi } from './api';

/**
 * Automatically logs in the user when a wallet is connected.
 * Call this in any component that needs trading to work.
 */
export function useAutoLogin() {
  const { address, isConnected } = useAccount();
  const { user, setAuth, logout, clearWallet, setWallet } = useAuthStore();

  const ensureLoggedIn = useCallback(async (): Promise<boolean> => {
    // Already logged in
    if (user) return true;

    // Try wallet login if connected — backend failure is non-fatal
    if (isConnected && address) {
      try {
        const res = await authApi.walletLogin(address);
        setAuth(res.data.user, res.data.token);
        setWallet(address);
      } catch { /* backend offline — wallet-only mode */ }
      return true;
    }

    return false;
  }, [user, isConnected, address, setAuth, setWallet]);

  // Auto-login whenever wallet connects
  useEffect(() => {
    if (isConnected && address) {
      const expectedEmail = `wallet:${address.toLowerCase()}`;
      if (!user || user.email !== expectedEmail) {
        ensureLoggedIn();
      }
    } else if (!isConnected) {
      const isWalletUser = user?.email?.startsWith('wallet:') ?? false;
      if (isWalletUser) logout();
      else clearWallet();
    }
  }, [isConnected, address]);

  return { ensureLoggedIn, user, isConnected };
}
