// ── Token Registry ──
// Each token has: symbol, name, decimals, chainKey, address, color, coingeckoId
export const TOKENS = [
  // ── Ethereum ──
  {
    symbol: 'ETH', name: 'Ethereum', decimals: 18,
    chain: 'ethereum', address: 'NATIVE',
    color: 'linear-gradient(135deg,#627eea,#a78bfa)',
    coingeckoId: 'ethereum', logoText: 'ETH',
  },
  {
    symbol: 'WETH', name: 'Wrapped Ether', decimals: 18,
    chain: 'ethereum', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    color: 'linear-gradient(135deg,#627eea,#a78bfa)',
    coingeckoId: 'weth', logoText: 'WETH',
  },
  {
    symbol: 'USDC', name: 'USD Coin', decimals: 6,
    chain: 'ethereum', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    color: 'linear-gradient(135deg,#2775ca,#5bb4f5)',
    coingeckoId: 'usd-coin', logoText: 'USDC',
  },
  {
    symbol: 'USDT', name: 'Tether USD', decimals: 6,
    chain: 'ethereum', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    color: 'linear-gradient(135deg,#26a17b,#4ecba3)',
    coingeckoId: 'tether', logoText: 'USDT',
  },
  {
    symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8,
    chain: 'ethereum', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    color: 'linear-gradient(135deg,#f7931a,#ffb74d)',
    coingeckoId: 'wrapped-bitcoin', logoText: 'WBTC',
  },
  {
    symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18,
    chain: 'ethereum', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    color: 'linear-gradient(135deg,#f5ac37,#ffd166)',
    coingeckoId: 'dai', logoText: 'DAI',
  },
  {
    symbol: 'UNI', name: 'Uniswap', decimals: 18,
    chain: 'ethereum', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    color: 'linear-gradient(135deg,#ff007a,#ff69b4)',
    coingeckoId: 'uniswap', logoText: 'UNI',
  },
  {
    symbol: 'LINK', name: 'Chainlink', decimals: 18,
    chain: 'ethereum', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    color: 'linear-gradient(135deg,#375bd2,#6690f5)',
    coingeckoId: 'chainlink', logoText: 'LINK',
  },

  // ── Base ──
  {
    symbol: 'ETH', name: 'Ethereum', decimals: 18,
    chain: 'base', address: 'NATIVE',
    color: 'linear-gradient(135deg,#0052ff,#4d88ff)',
    coingeckoId: 'ethereum', logoText: 'ETH',
  },
  {
    symbol: 'USDC', name: 'USD Coin', decimals: 6,
    chain: 'base', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    color: 'linear-gradient(135deg,#2775ca,#5bb4f5)',
    coingeckoId: 'usd-coin', logoText: 'USDC',
  },
  {
    symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18,
    chain: 'base', address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    color: 'linear-gradient(135deg,#f5ac37,#ffd166)',
    coingeckoId: 'dai', logoText: 'DAI',
  },
  {
    symbol: 'WETH', name: 'Wrapped Ether', decimals: 18,
    chain: 'base', address: '0x4200000000000000000000000000000000000006',
    color: 'linear-gradient(135deg,#627eea,#a78bfa)',
    coingeckoId: 'weth', logoText: 'WETH',
  },
  {
    symbol: 'cbETH', name: 'Coinbase Wrapped Staked ETH', decimals: 18,
    chain: 'base', address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
    color: 'linear-gradient(135deg,#0052ff,#34d399)',
    coingeckoId: 'coinbase-wrapped-staked-eth', logoText: 'cbETH',
  },
  {
    symbol: 'AERO', name: 'Aerodrome', decimals: 18,
    chain: 'base', address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
    color: 'linear-gradient(135deg,#818cf8,#f472b6)',
    coingeckoId: 'aerodrome-finance', logoText: 'AERO',
  },

  // ── Arc Network ──
  {
    symbol: 'ARC', name: 'Arc Token', decimals: 18,
    chain: 'arc', address: 'NATIVE',
    color: 'linear-gradient(135deg,#34d399,#059669)',
    coingeckoId: 'arc-token', logoText: 'ARC',
  },
  {
    symbol: 'USDC', name: 'USD Coin', decimals: 6,
    chain: 'arc', address: '0xB12BFcA5A55806AaF64E99521918A4bf0fC40802',
    color: 'linear-gradient(135deg,#2775ca,#5bb4f5)',
    coingeckoId: 'usd-coin', logoText: 'USDC',
  },
  {
    symbol: 'USDT', name: 'Tether USD', decimals: 6,
    chain: 'arc', address: '0x4988a896b1227218e4A686fdE5EabdcAbd91571f',
    color: 'linear-gradient(135deg,#26a17b,#4ecba3)',
    coingeckoId: 'tether', logoText: 'USDT',
  },
  {
    symbol: 'WETH', name: 'Wrapped Ether', decimals: 18,
    chain: 'arc', address: '0xC9BdeEd33CD01541e1eeD10f90519d2C06Fe3feB',
    color: 'linear-gradient(135deg,#627eea,#a78bfa)',
    coingeckoId: 'weth', logoText: 'WETH',
  },
  {
    symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8,
    chain: 'arc', address: '0xF4eB217Ba2454613b15dBdea6e5f22276410e89e',
    color: 'linear-gradient(135deg,#f7931a,#ffb74d)',
    coingeckoId: 'wrapped-bitcoin', logoText: 'WBTC',
  },

  // ── TESTNETS ──

  // Sepolia Testnet
  {
    symbol: 'ETH', name: 'Sepolia Ether', decimals: 18,
    chain: 'sepolia', address: 'NATIVE',
    color: 'linear-gradient(135deg,#627eea,#a78bfa)',
    coingeckoId: 'ethereum', logoText: 'ETH',
  },
  {
    symbol: 'WETH', name: 'Wrapped Ether', decimals: 18,
    chain: 'sepolia', address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
    color: 'linear-gradient(135deg,#627eea,#a78bfa)',
    coingeckoId: 'weth', logoText: 'WETH',
  },
  {
    symbol: 'USDC', name: 'USD Coin', decimals: 6,
    chain: 'sepolia', address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    color: 'linear-gradient(135deg,#2775ca,#5bb4f5)',
    coingeckoId: 'usd-coin', logoText: 'USDC',
  },
  {
    symbol: 'USDT', name: 'Tether USD', decimals: 6,
    chain: 'sepolia', address: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
    color: 'linear-gradient(135deg,#26a17b,#4ecba3)',
    coingeckoId: 'tether', logoText: 'USDT',
  },
  {
    symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18,
    chain: 'sepolia', address: '0x3e622317f8C93f7328350cF0B56d9eD4C620C5d6',
    color: 'linear-gradient(135deg,#f5ac37,#ffd166)',
    coingeckoId: 'dai', logoText: 'DAI',
  },
  {
    symbol: 'EURC', name: 'Euro Coin', decimals: 6,
    chain: 'sepolia', address: '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4',
    color: 'linear-gradient(135deg,#003399,#0066cc)',
    coingeckoId: 'euro-coin', logoText: 'EURC',
  },

  // Base Sepolia Testnet
  {
    symbol: 'ETH', name: 'Base Sepolia Ether', decimals: 18,
    chain: 'base-sepolia', address: 'NATIVE',
    color: 'linear-gradient(135deg,#0052ff,#4d88ff)',
    coingeckoId: 'ethereum', logoText: 'ETH',
  },
  {
    symbol: 'WETH', name: 'Wrapped Ether', decimals: 18,
    chain: 'base-sepolia', address: '0x4200000000000000000000000000000000000006',
    color: 'linear-gradient(135deg,#627eea,#a78bfa)',
    coingeckoId: 'weth', logoText: 'WETH',
  },
  {
    symbol: 'USDC', name: 'USD Coin', decimals: 6,
    chain: 'base-sepolia', address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    color: 'linear-gradient(135deg,#2775ca,#5bb4f5)',
    coingeckoId: 'usd-coin', logoText: 'USDC',
  },
  {
    symbol: 'USDT', name: 'Tether USD', decimals: 6,
    chain: 'base-sepolia', address: '0xf305d719089a9AA9eC50e0e1Fc5d94c0c3F62b6e',
    color: 'linear-gradient(135deg,#26a17b,#4ecba3)',
    coingeckoId: 'tether', logoText: 'USDT',
  },
  {
    symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18,
    chain: 'base-sepolia', address: '0x7683022d84F726a96c4A6611cD31DBf5409c0Ac9',
    color: 'linear-gradient(135deg,#f5ac37,#ffd166)',
    coingeckoId: 'dai', logoText: 'DAI',
  },
  {
    symbol: 'EURC', name: 'Euro Coin', decimals: 6,
    chain: 'base-sepolia', address: '0xC8D3a11a27D3F2F35F83A2f8143F1234567890AB',
    color: 'linear-gradient(135deg,#003399,#0066cc)',
    coingeckoId: 'euro-coin', logoText: 'EURC',
  },

  // Arc Testnet
  {
    symbol: 'ARC', name: 'Test Arc Token', decimals: 18,
    chain: 'arc-testnet', address: 'NATIVE',
    color: 'linear-gradient(135deg,#34d399,#059669)',
    coingeckoId: 'arc-token', logoText: 'ARC',
  },
  {
    symbol: 'USDC', name: 'USD Coin (Test)', decimals: 6,
    chain: 'arc-testnet', address: '0x0000000000000000000000000000000000000001',
    color: 'linear-gradient(135deg,#2775ca,#5bb4f5)',
    coingeckoId: 'usd-coin', logoText: 'USDC',
  },
  {
    symbol: 'USDT', name: 'Tether USD (Test)', decimals: 6,
    chain: 'arc-testnet', address: '0x0000000000000000000000000000000000000002',
    color: 'linear-gradient(135deg,#26a17b,#4ecba3)',
    coingeckoId: 'tether', logoText: 'USDT',
  },
  {
    symbol: 'EURC', name: 'Euro Coin (Test)', decimals: 6,
    chain: 'arc-testnet', address: '0x0000000000000000000000000000000000000003',
    color: 'linear-gradient(135deg,#003399,#0066cc)',
    coingeckoId: 'euro-coin', logoText: 'EURC',
  },
];

// ── Lookups ──
export function getTokensByChain(chain) {
  return TOKENS.filter(t => t.chain === chain);
}

export function getToken(symbol, chain) {
  return TOKENS.find(t => t.symbol === symbol && t.chain === chain) ?? null;
}

export function getTokenByAddress(address, chain) {
  if (!address) return null;
  return TOKENS.find(
    t => t.address.toLowerCase() === address.toLowerCase() && t.chain === chain
  ) ?? null;
}

export function searchTokens(query, chainFilter = 'all') {
  const q = query.toLowerCase().trim();
  return TOKENS.filter(t => {
    const matchChain = chainFilter === 'all' || t.chain === chainFilter;
    const matchQuery = !q ||
      t.symbol.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.address.toLowerCase() === q;
    return matchChain && matchQuery;
  });
}

// ERC-20 minimal ABI for balance / allowance
export const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];
