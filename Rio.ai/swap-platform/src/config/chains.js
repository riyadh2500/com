// ── Chain Configurations ──
export const CHAINS = {
  ethereum: {
    id: 1,
    name: 'Ethereum',
    shortName: 'eth',
    rpcUrl: 'https://eth.llamarpc.com',
    fallbackRpc: 'https://rpc.ankr.com/eth',
    explorerUrl: 'https://etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    color: '#627eea',
    dotClass: 'eth',
    icon: '⟠',
    // Key protocol router addresses on Ethereum
    routers: {
      uniswapV3: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      uniswapV2: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      sushiswap:  '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
      oneInch:    '0x1111111254EEB25477B68fb85Ed929f73A960582',
    },
    gasMultiplier: 1.2,
    avgBlockTime: 12,    // seconds
    confirmations: 2,
  },

  base: {
    id: 8453,
    name: 'Base',
    shortName: 'base',
    rpcUrl: 'https://mainnet.base.org',
    fallbackRpc: 'https://base.llamarpc.com',
    explorerUrl: 'https://basescan.org',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    color: '#0052ff',
    dotClass: 'base',
    icon: '🔵',
    routers: {
      uniswapV3: '0x2626664c2603336E57B271c5C0b26F421741e481',
      aerodrome:  '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
      baseswap:   '0x327Df1E6de05895d2ab08513aaDD9313Fe505d86',
      oneInch:    '0x1111111254EEB25477B68fb85Ed929f73A960582',
    },
    gasMultiplier: 1.1,
    avgBlockTime: 2,
    confirmations: 1,
  },

  arc: {
    id: 1313161554,   // Aurora / Arc Network chain ID (configurable)
    name: 'Arc Network',
    shortName: 'arc',
    rpcUrl: 'https://mainnet.aurora.dev',
    fallbackRpc: 'https://1rpc.io/aurora',
    explorerUrl: 'https://explorer.aurora.dev',
    nativeCurrency: { name: 'Arc Token', symbol: 'ARC', decimals: 18 },
    color: '#34d399',
    dotClass: 'arc',
    icon: '🌐',
    routers: {
      trisolaris: '0x2CB45Edb4517d5947aFdE3BEAbF95A582506858B',
      wannaswap:  '0xa3a1eF5Ae6561572023363862e238aFA84C72ef5',
      refFinance: '0xa3a1eF5Ae6561572023363862e238aFA84C72ef5',
      oneInch:    '0x1111111254EEB25477B68fb85Ed929f73A960582',
    },
    gasMultiplier: 1.05,
    avgBlockTime: 1,
    confirmations: 1,
  },

  // ── TESTNETS ──
  sepolia: {
    id: 11155111,
    name: 'Sepolia',
    shortName: 'sepolia',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    fallbackRpc: 'https://rpc.sepolia.org',
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    color: '#627eea',
    dotClass: 'eth',
    icon: '⟠',
    routers: {
      uniswapV3: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      swapRouter02: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    },
    gasMultiplier: 1.2,
    avgBlockTime: 12,
    confirmations: 1,
    isTestnet: true,
  },

  'base-sepolia': {
    id: 84532,
    name: 'Base Sepolia',
    shortName: 'base-sepolia',
    rpcUrl: 'https://sepolia.base.org',
    fallbackRpc: 'https://base-sepolia-rpc.publicnode.com',
    explorerUrl: 'https://sepolia.basescan.org',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    color: '#0052ff',
    dotClass: 'base',
    icon: '🔵',
    routers: {
      uniswapV3: '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4',
      swapRouter02: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    },
    gasMultiplier: 1.1,
    avgBlockTime: 2,
    confirmations: 1,
    isTestnet: true,
  },

  'arc-testnet': {
    id: 12345, // Placeholder - replace with actual Arc testnet chain ID
    name: 'Arc Testnet',
    shortName: 'arc-testnet',
    rpcUrl: 'https://rpc.testnet.arc.network',
    fallbackRpc: 'https://rpc.testnet.arc.network',
    explorerUrl: 'https://testnet-explorer.arc.network',
    nativeCurrency: { name: 'Test Arc', symbol: 'ARC', decimals: 18 },
    color: '#34d399',
    dotClass: 'arc',
    icon: '🌐',
    routers: {
      // Arc testnet may not have standard routers - will use simulated swaps
      custom: '0x0000000000000000000000000000000000000000',
    },
    gasMultiplier: 1.05,
    avgBlockTime: 1,
    confirmations: 1,
    isTestnet: true,
  },
};

// Chain ID → key lookup
export const CHAIN_BY_ID = Object.fromEntries(
  Object.entries(CHAINS).map(([key, c]) => [c.id, key])
);

export const SUPPORTED_CHAIN_IDS = Object.values(CHAINS).map(c => c.id);

export function getChain(keyOrId) {
  if (typeof keyOrId === 'number') return CHAINS[CHAIN_BY_ID[keyOrId]] ?? null;
  return CHAINS[keyOrId] ?? null;
}

// Add chain to MetaMask / wallet
export async function addChainToWallet(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain || !window.ethereum) return;
  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: '0x' + chain.id.toString(16),
        chainName: chain.name,
        rpcUrls: [chain.rpcUrl],
        nativeCurrency: chain.nativeCurrency,
        blockExplorerUrls: [chain.explorerUrl],
      }],
    });
  } catch (err) {
    console.warn(`Failed to add chain ${chain.name}:`, err.message);
  }
}

export async function switchChain(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain || !window.ethereum) return false;
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x' + chain.id.toString(16) }],
    });
    return true;
  } catch (err) {
    if (err.code === 4902) {
      await addChainToWallet(chainKey);
      return true;
    }
    return false;
  }
}
