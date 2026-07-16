'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, polygon, optimism, arbitrum, base, sepolia } from 'wagmi/chains';
import { injected, coinbaseWallet } from 'wagmi/connectors';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

const wagmiConfig = createConfig({
  chains: [sepolia, mainnet, polygon, optimism, arbitrum, base], // Sepolia first = default
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'Predictly' }),
  ],
  transports: {
    [sepolia.id]:   http('https://ethereum-sepolia-rpc.publicnode.com'),
    [mainnet.id]:   http(),
    [polygon.id]:   http(),
    [optimism.id]:  http(),
    [arbitrum.id]:  http(),
    [base.id]:      http(),
  },
  ssr: true,
});

export { wagmiConfig };

export default function WalletProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
