import { ethers } from 'ethers';
import { CHAINS } from '../config/chains.js';
import { walletManager } from '../wallet/walletManager.js';
import axios from 'axios';

// ── Rate Aggregator ────────────────────────────────────────────
// Queries backend API for swap quotes across chains.
// Backend handles:
//   • 1inch v6 (mainnet: Ethereum, Base)
//   • Uniswap V3 on-chain (testnets: Sepolia, Base Sepolia)
//   • Simulated fallback (Arc testnet)
// ──────────────────────────────────────────────────────────────

const API_BASE_URL = 'http://localhost:3001/api';

// ── Main export ────────────────────────────────────────────────
class RateAggregator {
  constructor() {
    this._cache     = new Map();   // key → { quotes, timestamp }
    this._cacheTTL  = 15_000;      // 15 s
    this._abortCtrl = null;
  }

  // Returns array of quotes sorted best → worst
  // quote shape: { protocol, chain, amountOut, amountOutFormatted,
  //               priceImpact, gasEstimate, route, isBest }
  async getQuotes(fromToken, toToken, amountIn, settings = {}) {
    const key = `${fromToken.chain}:${fromToken.symbol}:${toToken.chain}:${toToken.symbol}:${amountIn}`;
    const cached = this._cache.get(key);
    if (cached && Date.now() - cached.ts < this._cacheTTL) return cached.quotes;

    // Cancel previous in-flight requests
    if (this._abortCtrl) this._abortCtrl.abort();
    this._abortCtrl = new AbortController();
    const { signal } = this._abortCtrl;

    const chainInfo = CHAINS[fromToken.chain];
    if (!chainInfo) return [];

    const amountInWei = ethers.parseUnits(String(amountIn), fromToken.decimals);

    let quotes = [];

    try {
      // Check if testnet
      if (chainInfo.isTestnet) {
        // Use testnet endpoint (Uniswap V3)
        const quote = await this._quoteTestnet(fromToken, toToken, amountIn, chainInfo.id, signal);
        if (quote) quotes.push(quote);
      } else {
        // Use mainnet endpoint (1inch)
        const quote = await this._quoteMainnet(fromToken, toToken, amountInWei, chainInfo.id, signal);
        if (quote) quotes.push(quote);
      }
    } catch (error) {
      console.warn('[RateAggregator] API error:', error.message);
    }

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

  // ── Mainnet quote (1inch) ─────────────────────────────────────
  async _quoteMainnet(fromToken, toToken, amountInWei, chainId, signal) {
    try {
      const src = fromToken.address === 'NATIVE' ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' : fromToken.address;
      const dst = toToken.address === 'NATIVE' ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' : toToken.address;

      const response = await axios.post(
        `${API_BASE_URL}/quote`,
        {
          fromToken: src,
          toToken: dst,
          amount: amountInWei.toString(),
          chainId: chainId
        },
        { signal, timeout: 10000 }
      );

      const data = response.data;

      if (!data.toAmount) return null;

      const amountOut = ethers.formatUnits(data.toAmount, toToken.decimals);

      return {
        protocol: data.route || '1inch',
        chain: fromToken.chain,
        amountOut: BigInt(data.toAmount),
        amountOutFormatted: parseFloat(amountOut).toFixed(6),
        priceImpact: data.priceImpact || '< 0.5%',
        gasEstimate: data.estimatedGas || '150000',
        route: data.route || '1inch Aggregator',
        protocols: data.protocols || ['1inch'],
        simulated: data.simulated || false
      };
    } catch (error) {
      console.warn('[RateAggregator] Mainnet quote failed:', error.message);
      return null;
    }
  }

  // ── Testnet quote (Uniswap V3) ────────────────────────────────
  async _quoteTestnet(fromToken, toToken, amountIn, chainId, signal) {
    try {
      const src = fromToken.address === 'NATIVE' ? ethers.ZeroAddress : fromToken.address;
      const dst = toToken.address === 'NATIVE' ? ethers.ZeroAddress : toToken.address;

      const response = await axios.post(
        `${API_BASE_URL}/quote-testnet`,
        {
          fromToken: src,
          toToken: dst,
          amount: String(amountIn),
          chainId: chainId
        },
        { signal, timeout: 10000 }
      );

      const data = response.data;

      if (!data.toAmount) return null;

      return {
        protocol: data.route || 'Uniswap V3',
        chain: fromToken.chain,
        amountOut: BigInt(data.toAmount),
        amountOutFormatted: data.toAmountFormatted || parseFloat(ethers.formatUnits(data.toAmount, toToken.decimals)).toFixed(6),
        priceImpact: data.priceImpact || '< 1%',
        gasEstimate: data.estimatedGas || '180000',
        route: data.route || `Uniswap V3 (${data.feeTier || '0.3%'})`,
        protocols: data.protocols || ['Uniswap V3'],
        feeTier: data.feeTier,
        simulated: data.simulated || false
      };
    } catch (error) {
      console.warn('[RateAggregator] Testnet quote failed:', error.message);
      return null;
    }
  }

  // ── Simulated fallback ────────────────────────────────────────
  // Produces a realistic-looking quote using mock price data.
  async _quoteSimulated(fromToken, toToken, amountIn, protocol) {
    const prices = {
      ETH: 3200, WETH: 3200, WBTC: 62000, ARC: 1.8,
      USDC: 1, USDT: 1, DAI: 1, EURC: 1.09, cbETH: 3380, AERO: 1.2,
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
      priceImpact: (impact * 100).toFixed(2) + '%',
      gasEstimate: String(120000 + Math.floor(Math.random() * 80000)),
      route: 'Simulated',
      protocols: ['Simulated'],
      simulated: true,
    };
  }
}

export const rateAggregator = new RateAggregator();
