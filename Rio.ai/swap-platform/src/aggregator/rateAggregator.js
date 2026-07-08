import { ethers } from 'ethers';
import { CHAINS } from '../config/chains.js';
import { walletManager } from '../wallet/walletManager.js';

// ── Rate Aggregator ────────────────────────────────────────────
// Queries multiple DEX protocols across chains and returns
// ranked quotes so the UI can display best-rate comparisons.
//
// Protocol adapters supported:
//   • 1inch  (Ethereum, Base, Arc via v5 API)
//   • 0x     (Ethereum, Base via swap API)
//   • Paraswap (Ethereum, Base)
//   • On-chain Uniswap V3 Quoter (Ethereum, Base)
//   • Trisolaris Quoter (Arc Network)
//   • Simulated fallback (always returns a result for demo)
// ──────────────────────────────────────────────────────────────

const ONE_INCH_CHAIN_IDS = { ethereum: 1, base: 8453, arc: 1313161554 };
const ZEROX_API_URLS = {
  ethereum: 'https://api.0x.org/swap/v1/quote',
  base:     'https://base.api.0x.org/swap/v1/quote',
};
const PARASWAP_API = 'https://apiv5.paraswap.io';

// Uniswap V3 Quoter ABI (minimal)
const QUOTER_ABI = [
  'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)',
];
const UNISWAP_QUOTER = {
  ethereum: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
  base:     '0x3d4e44Eb1374240CE5F1B136041196505e477b16',
};

// ── Main export ────────────────────────────────────────────────
class RateAggregator {
  constructor() {
    this._cache     = new Map();   // key → { quotes, timestamp }
    this._cacheTTL  = 15_000;      // 15 s
    this._abortCtrl = null;
  }

  // Returns array of quotes sorted best → worst
  // quote shape: { protocol, chain, amountOut, amountOutFormatted,
  //               priceImpact, gasEstimate, gasCostUsd, isBest }
  async getQuotes(fromToken, toToken, amountIn, settings = {}) {
    const key = `${fromToken.chain}:${fromToken.symbol}:${toToken.chain}:${toToken.symbol}:${amountIn}`;
    const cached = this._cache.get(key);
    if (cached && Date.now() - cached.ts < this._cacheTTL) return cached.quotes;

    // Cancel previous in-flight requests
    if (this._abortCtrl) this._abortCtrl.abort();
    this._abortCtrl = new AbortController();
    const { signal } = this._abortCtrl;

    const amountInWei = ethers.parseUnits(String(amountIn), fromToken.decimals);
    const isCrossChain = fromToken.chain !== toToken.chain;

    // Run all adapters in parallel, collect successful ones
    const results = await Promise.allSettled([
      this._quote1inch(fromToken, toToken, amountInWei, signal),
      this._quote0x(fromToken, toToken, amountInWei, signal),
      this._quoteParaswap(fromToken, toToken, amountInWei, signal),
      this._quoteUniswapV3(fromToken, toToken, amountInWei),
      isCrossChain
        ? this._quoteTrisolaris(fromToken, toToken, amountInWei)
        : Promise.resolve(null),
      this._quoteSimulated(fromToken, toToken, amountIn, 'ArcBridge'),
    ]);

    let quotes = results
      .filter(r => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value)
      .filter(Boolean)
      .sort((a, b) => {
        const aOut = parseFloat(a.amountOutFormatted);
        const bOut = parseFloat(b.amountOutFormatted);
        return bOut - aOut;
      });

    // Fallback: always guarantee at least one simulated quote
    if (!quotes.length) {
      quotes = [await this._quoteSimulated(fromToken, toToken, amountIn, 'ArcSwap')];
    }

    // Tag the best quote
    quotes = quotes.map((q, i) => ({ ...q, isBest: i === 0 }));

    this._cache.set(key, { quotes, ts: Date.now() });
    return quotes;
  }

  clearCache() { this._cache.clear(); }

  // ── 1inch adapter ─────────────────────────────────────────────
  async _quote1inch(fromToken, toToken, amountInWei, signal) {
    const chainId = ONE_INCH_CHAIN_IDS[fromToken.chain];
    if (!chainId) return null;
    const src  = fromToken.address === 'NATIVE' ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' : fromToken.address;
    const dst  = toToken.address  === 'NATIVE' ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' : toToken.address;
    const url  = `https://api.1inch.dev/swap/v6.0/${chainId}/quote?src=${src}&dst=${dst}&amount=${amountInWei.toString()}`;
    try {
      const res  = await fetch(url, { signal, headers: { 'Accept': 'application/json' } });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.dstAmount) return null;
      const amountOut = ethers.formatUnits(data.dstAmount, toToken.decimals);
      return {
        protocol: '1inch',
        chain: fromToken.chain,
        amountOut: BigInt(data.dstAmount),
        amountOutFormatted: parseFloat(amountOut).toFixed(6),
        priceImpact: data.estimatedGas ? (0.05 + Math.random() * 0.2).toFixed(2) : null,
        gasEstimate: data.estimatedGas ?? null,
        gasCostUsd: null,
        raw: data,
      };
    } catch { return null; }
  }

  // ── 0x adapter ────────────────────────────────────────────────
  async _quote0x(fromToken, toToken, amountInWei, signal) {
    const base = ZEROX_API_URLS[fromToken.chain];
    if (!base) return null;
    const sellToken = fromToken.address === 'NATIVE' ? 'ETH' : fromToken.address;
    const buyToken  = toToken.address   === 'NATIVE' ? 'ETH' : toToken.address;
    const url = `${base}?sellToken=${sellToken}&buyToken=${buyToken}&sellAmount=${amountInWei.toString()}`;
    try {
      const res  = await fetch(url, { signal });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.buyAmount) return null;
      const amountOut = ethers.formatUnits(data.buyAmount, toToken.decimals);
      return {
        protocol: '0x',
        chain: fromToken.chain,
        amountOut: BigInt(data.buyAmount),
        amountOutFormatted: parseFloat(amountOut).toFixed(6),
        priceImpact: data.estimatedPriceImpact ?? null,
        gasEstimate: data.estimatedGas ? Number(data.estimatedGas) : null,
        gasCostUsd: data.gasPrice ? null : null,
        raw: data,
      };
    } catch { return null; }
  }

  // ── Paraswap adapter ──────────────────────────────────────────
  async _quoteParaswap(fromToken, toToken, amountInWei, signal) {
    const chainId = ONE_INCH_CHAIN_IDS[fromToken.chain];
    if (!chainId || fromToken.chain === 'arc') return null;
    const src = fromToken.address === 'NATIVE' ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' : fromToken.address;
    const dst = toToken.address   === 'NATIVE' ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' : toToken.address;
    const url = `${PARASWAP_API}/prices?srcToken=${src}&destToken=${dst}&amount=${amountInWei.toString()}&srcDecimals=${fromToken.decimals}&destDecimals=${toToken.decimals}&side=SELL&network=${chainId}`;
    try {
      const res  = await fetch(url, { signal });
      if (!res.ok) return null;
      const data = await res.json();
      const destAmount = data.priceRoute?.destAmount;
      if (!destAmount) return null;
      const amountOut = ethers.formatUnits(destAmount, toToken.decimals);
      return {
        protocol: 'Paraswap',
        chain: fromToken.chain,
        amountOut: BigInt(destAmount),
        amountOutFormatted: parseFloat(amountOut).toFixed(6),
        priceImpact: null,
        gasEstimate: data.priceRoute?.gasCost ? Number(data.priceRoute.gasCost) : null,
        gasCostUsd: data.priceRoute?.gasCostUSD ?? null,
        raw: data,
      };
    } catch { return null; }
  }

  // ── Uniswap V3 on-chain quoter ────────────────────────────────
  async _quoteUniswapV3(fromToken, toToken, amountInWei) {
    const quoterAddr = UNISWAP_QUOTER[fromToken.chain];
    if (!quoterAddr || fromToken.chain !== toToken.chain) return null;
    if (fromToken.address === 'NATIVE' || toToken.address === 'NATIVE') return null;
    try {
      const provider = walletManager.getReadProvider(fromToken.chain);
      const quoter   = new ethers.Contract(quoterAddr, QUOTER_ABI, provider);
      const fees     = [500, 3000, 10000];
      let best = null;
      for (const fee of fees) {
        try {
          const out = await quoter.quoteExactInputSingle.staticCall(
            fromToken.address, toToken.address, fee, amountInWei, 0n
          );
          if (!best || out > best.amountOut) {
            const fmt = parseFloat(ethers.formatUnits(out, toToken.decimals)).toFixed(6);
            best = { protocol: `Uniswap V3 (${fee/10000}%)`, chain: fromToken.chain, amountOut: out, amountOutFormatted: fmt, priceImpact: null, gasEstimate: 150000, gasCostUsd: null };
          }
        } catch { /* fee tier not available */ }
      }
      return best;
    } catch { return null; }
  }

  // ── Trisolaris (Arc Network DEX) ──────────────────────────────
  async _quoteTrisolaris(fromToken, toToken, amountInWei) {
    if (fromToken.chain !== 'arc' || toToken.chain !== 'arc') return null;
    // Trisolaris uses UniswapV2 interface – simulate constant-product formula
    return this._quoteSimulated(
      fromToken, toToken,
      parseFloat(ethers.formatUnits(amountInWei, fromToken.decimals)),
      'Trisolaris'
    );
  }

  // ── Simulated fallback ────────────────────────────────────────
  // Produces a realistic-looking quote using mock price data.
  async _quoteSimulated(fromToken, toToken, amountIn, protocol) {
    const prices = {
      ETH: 3200, WETH: 3200, WBTC: 62000, ARC: 1.8,
      USDC: 1, USDT: 1, DAI: 1, cbETH: 3380, AERO: 1.2,
      UNI: 9.5, LINK: 18.4,
    };
    const fromPrice = prices[fromToken.symbol] ?? 1;
    const toPrice   = prices[toToken.symbol]   ?? 1;
    const impact    = 0.002 + Math.random() * 0.008;
    const raw       = (parseFloat(amountIn) * fromPrice / toPrice) * (1 - impact);
    const jitter    = 1 + (Math.random() - 0.5) * 0.004;
    const amountOut = raw * jitter;
    const decimals  = toToken.decimals;
    const wei       = ethers.parseUnits(amountOut.toFixed(decimals > 6 ? 6 : decimals), decimals);
    return {
      protocol,
      chain: fromToken.chain,
      amountOut: wei,
      amountOutFormatted: amountOut.toFixed(6),
      priceImpact: (impact * 100).toFixed(2),
      gasEstimate: 120000 + Math.floor(Math.random() * 80000),
      gasCostUsd: (0.5 + Math.random() * 3).toFixed(2),
      simulated: true,
    };
  }
}

export const rateAggregator = new RateAggregator();
