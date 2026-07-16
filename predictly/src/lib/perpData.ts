// Live-ish crypto price data via CoinGecko public API (no key needed)
// Falls back to seeded mock data if fetch fails

export interface PerpAsset {
  id: string;
  symbol: string;
  name: string;
  icon: string;
  color: string;
  price: number;
  change24h: number;
  volume24h: number;
  funding: number;       // hourly funding rate %
  maxLeverage: number;
  sparkline: number[];   // last 24 data points (normalized 0-100)
  openInterest: number;
}

export const PERP_ASSETS: Omit<PerpAsset, 'price' | 'change24h' | 'volume24h' | 'sparkline'>[] = [
  { id: 'bitcoin',       symbol: 'BTC',  name: 'Bitcoin',        icon: '₿',  color: '#f7931a', funding: 0.0000,  maxLeverage: 6,   openInterest: 412_000_000 },
  { id: 'ethereum',      symbol: 'ETH',  name: 'Ethereum',       icon: 'Ξ',  color: '#627eea', funding: 0.0000,  maxLeverage: 5,   openInterest: 198_000_000 },
  { id: 'solana',        symbol: 'SOL',  name: 'Solana',         icon: '◎',  color: '#9945ff', funding: 0.0000,  maxLeverage: 4,   openInterest: 87_000_000  },
  { id: 'ripple',        symbol: 'XRP',  name: 'XRP',            icon: '✕',  color: '#00aae4', funding: 0.0000,  maxLeverage: 3,   openInterest: 54_000_000  },
  { id: 'sui',           symbol: 'SUI',  name: 'Sui',            icon: '💧', color: '#6fbcf0', funding: 0.0000,  maxLeverage: 3,   openInterest: 22_000_000  },
  { id: 'bitcoin-cash',  symbol: 'BCH',  name: 'Bitcoin Cash',   icon: '₿',  color: '#8dc351', funding: 0.0000,  maxLeverage: 3,   openInterest: 18_000_000  },
  { id: 'chainlink',     symbol: 'LINK', name: 'Chainlink',      icon: '⬡',  color: '#375bd2', funding: 0.0000,  maxLeverage: 4,   openInterest: 31_000_000  },
  { id: 'avalanche-2',   symbol: 'AVAX', name: 'Avalanche',      icon: '▲',  color: '#e84142', funding: 0.0000,  maxLeverage: 4,   openInterest: 29_000_000  },
  { id: 'dogecoin',      symbol: 'DOGE', name: 'Dogecoin',       icon: 'Ð',  color: '#c2a633', funding: 0.0000,  maxLeverage: 3,   openInterest: 41_000_000  },
  { id: 'polkadot',      symbol: 'DOT',  name: 'Polkadot',       icon: '●',  color: '#e6007a', funding: 0.0000,  maxLeverage: 3,   openInterest: 15_000_000  },
  { id: 'uniswap',       symbol: 'UNI',  name: 'Uniswap',        icon: '🦄', color: '#ff007a', funding: 0.0000,  maxLeverage: 3,   openInterest: 12_000_000  },
  { id: 'near',          symbol: 'NEAR', name: 'NEAR Protocol',  icon: 'Ⓝ',  color: '#00c08b', funding: 0.0000,  maxLeverage: 3,   openInterest: 9_000_000   },
];

// Seed deterministic sparkline from price (simulated 24 candles)
export function generateSparkline(seed: number, trend: number): number[] {
  const points: number[] = [];
  let val = 50;
  for (let i = 0; i < 24; i++) {
    const noise = ((seed * (i + 7) * 13.37) % 10) - 5;
    val = Math.min(95, Math.max(5, val + noise + trend * 0.3));
    points.push(val);
  }
  return points;
}

// Fetch live prices from CoinGecko (free tier, no key)
export async function fetchLivePrices(): Promise<Map<string, { price: number; change24h: number; volume24h: number }>> {
  const ids = PERP_ASSETS.map(a => a.id).join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error('CoinGecko fetch failed');
    const data = await res.json();

    const map = new Map<string, { price: number; change24h: number; volume24h: number }>();
    for (const asset of PERP_ASSETS) {
      const d = data[asset.id];
      if (d) {
        map.set(asset.id, {
          price:     d.usd,
          change24h: d.usd_24h_change ?? 0,
          volume24h: d.usd_24h_vol ?? 0,
        });
      }
    }
    return map;
  } catch {
    // Fallback mock prices
    const fallback = new Map<string, { price: number; change24h: number; volume24h: number }>();
    const mocks: Record<string, [number, number, number]> = {
      bitcoin:      [97_450,    0.34,  77_982_162],
      ethereum:     [3_280,     0.11,  84_016_070],
      solana:       [178.5,     0.36,   4_048_619],
      ripple:       [0.52,     -0.80,   1_786_235],
      sui:          [3.82,     -2.14,   7_089_452],
      'bitcoin-cash':[340.9,   -0.59,   1_971_280],
      chainlink:    [14.2,     -1.07,     593_020],
      'avalanche-2':[28.4,      1.23,   2_341_000],
      dogecoin:     [0.162,     2.10,   5_120_000],
      polkadot:     [6.8,      -0.44,     891_000],
      uniswap:      [7.4,       0.88,     441_000],
      near:         [4.1,      -0.30,     320_000],
    };
    for (const [id, [price, change24h, volume24h]] of Object.entries(mocks)) {
      fallback.set(id, { price, change24h, volume24h });
    }
    return fallback;
  }
}

export function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (price >= 1)    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return price.toFixed(6);
}

export function formatVolume(vol: number): string {
  if (vol >= 1_000_000_000) return `$${(vol / 1_000_000_000).toFixed(2)}B`;
  if (vol >= 1_000_000)     return `$${(vol / 1_000_000).toFixed(2)}M`;
  if (vol >= 1_000)         return `$${(vol / 1_000).toFixed(0)}K`;
  return `$${vol.toFixed(0)}`;
}
