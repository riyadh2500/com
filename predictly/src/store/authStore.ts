import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  username: string;
  balance: number;      // platform-credited USDC balance
  isAdmin: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  walletAddress: string | null;
  walletConnected: boolean;
  arcBalance: number | null;   // live on-chain ETH on Sepolia Testnet

  setAuth: (user: User, token: string) => void;
  updateBalance: (balance: number) => void;
  setArcBalance: (balance: number) => void;
  setWallet: (address: string) => void;
  clearWallet: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:            null,
      token:           null,
      walletAddress:   null,
      walletConnected: false,
      arcBalance:      null,

      setAuth: (user, token) => {
        if (typeof window !== 'undefined') localStorage.setItem('token', token);
        set({ user, token });
      },

      updateBalance: (balance) =>
        set((state) => ({
          user: state.user ? { ...state.user, balance } : null,
        })),

      setArcBalance: (balance) => set({ arcBalance: balance }),

      setWallet: (address) => set({ walletAddress: address, walletConnected: true }),

      clearWallet: () => set({ walletAddress: null, walletConnected: false, arcBalance: null }),

      logout: () => {
        if (typeof window !== 'undefined') localStorage.removeItem('token');
        set({ user: null, token: null, walletAddress: null, walletConnected: false, arcBalance: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (s) => ({
        user:            s.user,
        token:           s.token,
        walletAddress:   s.walletAddress,
        walletConnected: s.walletConnected,
      }),
    }
  )
);
