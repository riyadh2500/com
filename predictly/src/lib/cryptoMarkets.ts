// ── Types ────────────────────────────────────────────────────────────

export type MarketType = 'updown' | 'abovebelow' | 'pricerange' | 'hitprice';

export interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  icon: string;
  color: string;
  binanceSymbol: string;
}

export interface PricePoint {
  time: number;   // unix ms
  price: number;
}

export interface CryptoMarket {
  id: string;
  type: MarketType;
  asset: CryptoAsset;
  title: string;
  // updown
  direction?: 'Up' | 'Down';
  upProb?: number;          // 0-100
  expiryMinutes?: number;   // 5 | 60 | 1440
  // abovebelow / pricerange / hitprice
  levels?: { price: number; prob: number }[];
  // shared
  volume24h?: number;
  isLive: boolean;
}

// ── Assets ───────────────────────────────────────────────────────────
export const CRYPTO_ASSETS: CryptoAsset[] = [
  { id: 'bitcoin',  symbol: 'BTC',  name: 'Bitcoin',  icon: '₿',  color: '#f7931a', binanceSymbol: 'btcusdt'  },
  { id: 'ethereum', symbol: 'ETH',  name: 'Ethereum', icon: 'Ξ',  color: '#627eea', binanceSymbol: 'ethusdt'  },
  { id: 'solana',   symbol: 'SOL',  name: 'Solana',   icon: '◎',  color: '#9945ff', binanceSymbol: 'solusdt'  },
  { id: 'ripple',   symbol: 'XRP',  name: 'XRP',      icon: '✕',  color: '#00aae4', binanceSymbol: 'xrpusdt'  },
];

// ── Generate markets dynamically from live prices ─────────────────────
export function generateMarkets(prices: Record<string, number>): CryptoMarket[] {
  const markets: CryptoMarket[] = [];

  for (const asset of CRYPTO_ASSETS) {
    const price = prices[asset.id] ?? 0;
    if (price === 0) continue;

    const round = (v: number, sig: number) =>
      parseFloat(v.toPrecision(sig));

    // ── Up/Down 5m ───────────────────────────────────────────────────
    const upProb5 = 45 + Math.round((Math.random() - 0.5) * 20);
    markets.push({
      id: `${asset.id}-updown-5m`,
      type: 'updown',
      asset,
      title: `${asset.symbol} Up or Down 5m`,
      direction: upProb5 >= 50 ? 'Up' : 'Down',
      upProb: upProb5,
      expiryMinutes: 5,
      volume24h: Math.round(price * 350),
      isLive: true,
    });

    // ── Up/Down Daily ────────────────────────────────────────────────
    const upProbD = 40 + Math.round((Math.random() - 0.5) * 30);
    markets.push({
      id: `${asset.id}-updown-daily`,
      type: 'updown',
      asset,
      title: `${asset.symbol} Up or Down Daily`,
      direction: upProbD >= 50 ? 'Up' : 'Down',
      upProb: upProbD,
      expiryMinutes: 1440,
      volume24h: Math.round(price * 1200),
      isLive: true,
    });

    // ── Above / Below ────────────────────────────────────────────────
    const step = price > 10000 ? 500 : price > 100 ? 5 : price > 1 ? 0.05 : 0.001;
    markets.push({
      id: `${asset.id}-above`,
      type: 'abovebelow',
      asset,
      title: `${asset.symbol} above ___ ?`,
      levels: [
        { price: round(price * 1.02, 5), prob: 100 - (30 + Math.round(Math.random() * 40)) },
        { price: round(price * 0.98, 5), prob: 100 - (5  + Math.round(Math.random() * 20)) },
      ],
      volume24h: Math.round(price * 200),
      isLive: true,
    });

    // ── Price Range ──────────────────────────────────────────────────
    markets.push({
      id: `${asset.id}-range`,
      type: 'pricerange',
      asset,
      title: `${asset.symbol} price range?`,
      levels: [
        { price: round(price * 1.05, 5), prob: 30 + Math.round(Math.random() * 40) },
        { price: round(price * 0.95, 5), prob: 20 + Math.round(Math.random() * 30) },
      ],
      volume24h: Math.round(price * 150),
      isLive: true,
    });

    // ── Hit Price ────────────────────────────────────────────────────
    markets.push({
      id: `${asset.id}-hitprice`,
      type: 'hitprice',
      asset,
      title: `What price will ${asset.symbol} hit?`,
      levels: [
        { price: round(price * 1.08, 5), prob: 20 + Math.round(Math.random() * 60) },
        { price: round(price * 0.92, 5), prob: 50 + Math.round(Math.random() * 40) },
      ],
      volume24h: Math.round(price * 100),
      isLive: true,
    });
  }

  return markets;
}

export function formatMarketPrice(price: number): string {
  if (price >= 10000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (price >= 100)   return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (price >= 1)     return price.toFixed(4);
  return price.toFixed(6);
}

export function formatVol(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}
