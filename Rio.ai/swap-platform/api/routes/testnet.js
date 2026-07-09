// ──────────────────────────────────────────────────────────────
// Testnet Swap Routing — Uniswap V3 quotes for Sepolia testnets
// ──────────────────────────────────────────────────────────────
import { ethers } from 'ethers';

// Uniswap V3 Quoter V2 contract (same address on all chains)
const QUOTER_V2_ADDRESS = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e';

// Uniswap V3 SwapRouter02 (for building swap transactions)
const SWAPROUTER_V2_ADDRESS = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45';

// Fee tiers (in hundredths of a bip, i.e. 1e-6)
const FEE_TIERS = [500, 3000, 10000]; // 0.05%, 0.3%, 1%

// Quoter V2 ABI (minimal - just quoteExactInputSingle)
const QUOTER_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'fee', type: 'uint24' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ],
        name: 'params',
        type: 'tuple'
      }
    ],
    name: 'quoteExactInputSingle',
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'sqrtPriceX96After', type: 'uint160' },
      { name: 'initializedTicksCrossed', type: 'uint32' },
      { name: 'gasEstimate', type: 'uint256' }
    ],
    stateMutability: 'nonpayable',
    type: 'function'
  }
];

// ERC20 ABI (for decimals)
const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

/**
 * Get testnet swap quote using Uniswap V3 Quoter
 * POST /api/quote-testnet
 * Body: { fromToken, toToken, amount, chainId }
 */
export async function quoteTestnetHandler(req, res) {
  try {
    const { fromToken, toToken, amount, chainId } = req.body;

    if (!fromToken || !toToken || !amount || !chainId) {
      return res.status(400).json({ 
        error: 'Missing required fields: fromToken, toToken, amount, chainId' 
      });
    }

    // Get RPC provider for the testnet
    const provider = getProvider(chainId);
    if (!provider) {
      return res.status(400).json({ error: `Unsupported testnet chain ID: ${chainId}` });
    }

    console.log(`[Testnet Quote] ${amount} ${fromToken} → ${toToken} on chain ${chainId}`);

    // Create contract instances
    const quoter = new ethers.Contract(QUOTER_V2_ADDRESS, QUOTER_ABI, provider);
    const tokenInContract = new ethers.Contract(fromToken, ERC20_ABI, provider);
    const tokenOutContract = new ethers.Contract(toToken, ERC20_ABI, provider);

    // Get token decimals
    const [decimalsIn, decimalsOut, symbolIn, symbolOut] = await Promise.all([
      tokenInContract.decimals(),
      tokenOutContract.decimals(),
      tokenInContract.symbol().catch(() => 'UNKNOWN'),
      tokenOutContract.symbol().catch(() => 'UNKNOWN')
    ]);

    // Convert amount to wei
    const amountInWei = ethers.parseUnits(amount.toString(), decimalsIn);

    // Try all fee tiers in parallel and pick the best
    const quotePromises = FEE_TIERS.map(async (fee) => {
      try {
        const params = {
          tokenIn: fromToken,
          tokenOut: toToken,
          amountIn: amountInWei,
          fee: fee,
          sqrtPriceLimitX96: 0
        };

        const result = await quoter.quoteExactInputSingle.staticCall(params);
        
        return {
          fee,
          amountOut: result[0],
          gasEstimate: result[3],
          success: true
        };
      } catch (error) {
        // Pool doesn't exist for this fee tier
        return { fee, success: false };
      }
    });

    const quotes = await Promise.all(quotePromises);
    const validQuotes = quotes.filter(q => q.success);

    if (validQuotes.length === 0) {
      // No Uniswap pool exists - return simulated quote
      console.log(`[Testnet Quote] No Uniswap pools found, returning simulated quote`);
      const simulated = simulateTestnetQuote(fromToken, toToken, amount, symbolIn, symbolOut, decimalsOut);
      return res.json(simulated);
    }

    // Pick quote with highest output
    const bestQuote = validQuotes.reduce((best, current) => 
      current.amountOut > best.amountOut ? current : best
    );

    const amountOutFormatted = ethers.formatUnits(bestQuote.amountOut, decimalsOut);

    const result = {
      fromToken,
      fromTokenSymbol: symbolIn,
      fromAmount: amount.toString(),
      toToken,
      toTokenSymbol: symbolOut,
      toAmount: bestQuote.amountOut.toString(),
      toAmountFormatted: amountOutFormatted,
      fee: bestQuote.fee,
      feeTier: `${bestQuote.fee / 10000}%`,
      estimatedGas: bestQuote.gasEstimate.toString(),
      route: `Uniswap V3 (${bestQuote.fee / 10000}%)`,
      protocols: ['Uniswap V3'],
      priceImpact: '< 1%', // Simplified - would need pool reserves for accurate calc
      chainId
    };

    console.log(`[Testnet Quote] Success: ${amountOutFormatted} ${symbolOut} via ${result.feeTier} pool`);
    res.json(result);

  } catch (error) {
    console.error('[Testnet Quote] Error:', error.message);
    
    // Fallback to simulated quote
    try {
      const { fromToken, toToken, amount } = req.body;
      const simulated = simulateTestnetQuote(fromToken, toToken, amount);
      console.log(`[Testnet Quote] Falling back to simulation`);
      return res.json({ ...simulated, simulated: true });
    } catch {
      res.status(500).json({ 
        error: 'Failed to get testnet quote', 
        details: error.message 
      });
    }
  }
}

// ── Helper functions ──

function getProvider(chainId) {
  const rpcUrls = {
    11155111: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
    84532: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
    // Arc testnet doesn't have standard Uniswap - will use simulation
    12345: process.env.ARC_TESTNET_RPC_URL || null
  };

  const rpcUrl = rpcUrls[chainId];
  if (!rpcUrl) return null;

  return new ethers.JsonRpcProvider(rpcUrl);
}

function simulateTestnetQuote(fromToken, toToken, amount, symbolIn = 'TOKEN', symbolOut = 'TOKEN', decimals = 18) {
  // Simulate quote with mock rates for testnet tokens
  const mockRates = {
    'ETH': { 'USDC': 3500, 'USDT': 3500, 'DAI': 3500, 'EURC': 3200 },
    'WETH': { 'USDC': 3500, 'USDT': 3500, 'DAI': 3500, 'EURC': 3200 },
    'USDC': { 'USDT': 1, 'DAI': 1, 'EURC': 0.92, 'ETH': 1/3500, 'WETH': 1/3500 },
    'USDT': { 'USDC': 1, 'DAI': 1, 'EURC': 0.92, 'ETH': 1/3500, 'WETH': 1/3500 },
    'DAI': { 'USDC': 1, 'USDT': 1, 'EURC': 0.92, 'ETH': 1/3500, 'WETH': 1/3500 },
    'EURC': { 'USDC': 1.09, 'USDT': 1.09, 'DAI': 1.09, 'ETH': 1/3200, 'WETH': 1/3200 }
  };

  // Try to find rate
  let rate = mockRates[symbolIn]?.[symbolOut];
  if (!rate) rate = 1; // Default 1:1

  // Calculate output with 0.3% fee
  const estimatedOut = (Number(amount) * rate * 0.997);
  const amountOutWei = ethers.parseUnits(estimatedOut.toFixed(decimals), decimals);

  return {
    fromToken,
    fromTokenSymbol: symbolIn,
    fromAmount: amount.toString(),
    toToken,
    toTokenSymbol: symbolOut,
    toAmount: amountOutWei.toString(),
    toAmountFormatted: estimatedOut.toFixed(6),
    fee: 3000,
    feeTier: '0.3%',
    estimatedGas: '180000',
    route: 'Simulated (No Pool)',
    protocols: ['Simulated'],
    priceImpact: '< 1%',
    simulated: true
  };
}
