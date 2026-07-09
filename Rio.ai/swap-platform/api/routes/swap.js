// ──────────────────────────────────────────────────────────────
// 1inch API Proxy — Mainnet swap quotes and transactions
// ──────────────────────────────────────────────────────────────
import axios from 'axios';

const ONEINCH_API_BASE = 'https://api.1inch.dev/swap/v6.0';

// Chain ID mapping for 1inch
const CHAIN_IDS = {
  1: 'ethereum',
  8453: 'base',
  42161: 'arbitrum',
  10: 'optimism',
  137: 'polygon'
};

/**
 * Get swap quote from 1inch aggregator
 * POST /api/quote
 * Body: { fromToken, toToken, amount, chainId, fromAddress? }
 */
export async function quoteHandler(req, res) {
  try {
    const { fromToken, toToken, amount, chainId, fromAddress } = req.body;

    if (!fromToken || !toToken || !amount || !chainId) {
      return res.status(400).json({ 
        error: 'Missing required fields: fromToken, toToken, amount, chainId' 
      });
    }

    console.log(`[1inch Quote] ${amount} ${fromToken} → ${toToken} on chain ${chainId}`);

    // Build 1inch quote request
    const params = new URLSearchParams({
      src: fromToken,
      dst: toToken,
      amount: amount,
      includeGas: 'true',
      includeProtocols: 'true'
    });

    if (fromAddress) {
      params.append('from', fromAddress);
    }

    const headers = {
      'Authorization': `Bearer ${process.env.ONEINCH_API_KEY || ''}`,
      'Accept': 'application/json'
    };

    const url = `${ONEINCH_API_BASE}/${chainId}/quote?${params.toString()}`;
    
    const response = await axios.get(url, { 
      headers,
      timeout: 10000
    });

    const data = response.data;

    // Format response
    const result = {
      fromToken: data.src.address || fromToken,
      fromTokenSymbol: data.src.symbol,
      fromAmount: data.srcAmount,
      toToken: data.dst.address || toToken,
      toTokenSymbol: data.dst.symbol,
      toAmount: data.dstAmount,
      estimatedGas: data.gas || '0',
      protocols: data.protocols?.flat()?.map(p => p[0]?.name).filter(Boolean) || [],
      route: formatRoute(data.protocols),
      priceImpact: calculatePriceImpact(data.srcAmount, data.dstAmount, data.src.decimals, data.dst.decimals)
    };

    console.log(`[1inch Quote] Success: ${result.toAmount} ${result.toTokenSymbol}`);
    res.json(result);

  } catch (error) {
    console.error('[1inch Quote] Error:', error.message);
    
    if (error.response?.status === 400) {
      return res.status(400).json({ 
        error: 'Invalid quote parameters',
        details: error.response.data?.description || error.message
      });
    }

    if (error.response?.status === 429) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please try again shortly.' 
      });
    }

    // Fallback to simulated quote if 1inch fails
    const fallbackQuote = simulateQuote(req.body);
    console.log(`[1inch Quote] Falling back to simulation`);
    res.json({ ...fallbackQuote, simulated: true });
  }
}

/**
 * Build swap transaction from 1inch aggregator
 * POST /api/swap
 * Body: { fromToken, toToken, amount, slippage, from, chainId, receiver? }
 */
export async function swapHandler(req, res) {
  try {
    const { fromToken, toToken, amount, slippage, from, chainId, receiver } = req.body;

    if (!fromToken || !toToken || !amount || !from || !chainId) {
      return res.status(400).json({ 
        error: 'Missing required fields: fromToken, toToken, amount, from, chainId' 
      });
    }

    console.log(`[1inch Swap] Building tx: ${amount} ${fromToken} → ${toToken} for ${from}`);

    // Build 1inch swap request
    const params = new URLSearchParams({
      src: fromToken,
      dst: toToken,
      amount: amount,
      from: from,
      slippage: slippage || '1',
      disableEstimate: 'false',
      allowPartialFill: 'false'
    });

    if (receiver && receiver !== from) {
      params.append('receiver', receiver);
    }

    const headers = {
      'Authorization': `Bearer ${process.env.ONEINCH_API_KEY || ''}`,
      'Accept': 'application/json'
    };

    const url = `${ONEINCH_API_BASE}/${chainId}/swap?${params.toString()}`;
    
    const response = await axios.get(url, { 
      headers,
      timeout: 15000
    });

    const data = response.data;

    // Format transaction
    const tx = {
      to: data.tx.to,
      data: data.tx.data,
      value: data.tx.value || '0',
      gas: data.tx.gas || '300000',
      gasPrice: data.tx.gasPrice,
      from: from
    };

    const result = {
      tx,
      toAmount: data.dstAmount,
      fromAmount: data.srcAmount,
      protocols: data.protocols?.flat()?.map(p => p[0]?.name).filter(Boolean) || [],
      estimatedGas: tx.gas
    };

    console.log(`[1inch Swap] Success: tx to ${tx.to.slice(0, 10)}...`);
    res.json(result);

  } catch (error) {
    console.error('[1inch Swap] Error:', error.message);
    
    if (error.response?.status === 400) {
      return res.status(400).json({ 
        error: 'Invalid swap parameters',
        details: error.response.data?.description || error.message
      });
    }

    if (error.response?.status === 500) {
      return res.status(500).json({ 
        error: 'Swap route not available',
        details: 'No liquidity or route found for this pair'
      });
    }

    res.status(500).json({ 
      error: 'Failed to build swap transaction', 
      details: error.message 
    });
  }
}

// ── Helper functions ──

function formatRoute(protocols) {
  if (!protocols || !Array.isArray(protocols)) return '1inch Aggregator';
  
  const names = protocols.flat().map(p => p[0]?.name).filter(Boolean);
  if (names.length === 0) return '1inch Aggregator';
  if (names.length === 1) return names[0];
  return `${names[0]} + ${names.length - 1} more`;
}

function calculatePriceImpact(srcAmount, dstAmount, srcDecimals, dstDecimals) {
  try {
    // Simplified price impact calculation
    // Real calculation would need USD prices
    const srcNormalized = Number(srcAmount) / Math.pow(10, srcDecimals);
    const dstNormalized = Number(dstAmount) / Math.pow(10, dstDecimals);
    
    // If we can't calculate properly, return low impact
    if (!srcNormalized || !dstNormalized) return '< 0.01%';
    
    // This is a placeholder - real price impact needs market prices
    return '< 0.5%';
  } catch {
    return '< 0.01%';
  }
}

function simulateQuote({ fromToken, toToken, amount, chainId }) {
  // Fallback simulated quote when 1inch API is unavailable
  // Uses rough estimates for major pairs
  
  const mockRates = {
    'ETH-USDC': 3500,
    'ETH-USDT': 3500,
    'ETH-DAI': 3500,
    'WETH-USDC': 3500,
    'USDC-USDT': 1,
    'USDC-DAI': 1,
    'USDT-USDC': 1,
    'USDT-DAI': 1
  };

  const pair = `${fromToken}-${toToken}`.toUpperCase();
  const reversePair = `${toToken}-${fromToken}`.toUpperCase();
  
  let rate = mockRates[pair];
  if (!rate && mockRates[reversePair]) {
    rate = 1 / mockRates[reversePair];
  }
  if (!rate) rate = 1; // Default 1:1 for unknown pairs

  const estimatedOut = (Number(amount) * rate * 0.997).toFixed(0); // 0.3% fee

  return {
    fromToken,
    toToken,
    fromAmount: amount,
    toAmount: estimatedOut,
    estimatedGas: '150000',
    protocols: ['Simulated'],
    route: 'Simulated Quote',
    priceImpact: '< 0.5%'
  };
}
