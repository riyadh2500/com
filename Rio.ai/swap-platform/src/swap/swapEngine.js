import { ethers } from 'ethers';
import { CHAINS } from '../config/chains.js';
import { walletManager } from '../wallet/walletManager.js';
import { rateAggregator } from '../aggregator/rateAggregator.js';

// ── Minimal router ABIs ────────────────────────────────────────
const ROUTER_V2_ABI = [
  'function swapExactTokensForTokens(uint amountIn,uint amountOutMin,address[] calldata path,address to,uint deadline) external returns (uint[] memory amounts)',
  'function swapExactETHForTokens(uint amountOutMin,address[] calldata path,address to,uint deadline) external payable returns (uint[] memory amounts)',
  'function swapExactTokensForETH(uint amountIn,uint amountOutMin,address[] calldata path,address to,uint deadline) external returns (uint[] memory amounts)',
];
const ROUTER_V3_ABI = [
  'function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
];
const ONE_INCH_ABI = [
  'function swap(address caller,(address srcToken,address dstToken,address srcReceiver,address dstReceiver,uint256 amount,uint256 minReturnAmount,uint256 flags) desc, bytes permit, bytes data) external payable returns (uint256 returnAmount, uint256 spentAmount)',
];

// ── SwapEngine ─────────────────────────────────────────────────
class SwapEngine {
  constructor() {
    this._history = JSON.parse(localStorage.getItem('arcswap_history') ?? '[]');
  }

  // ── Build a swap transaction ──────────────────────────────────
  // Returns { tx, quote, approvalNeeded }
  async buildSwap(fromToken, toToken, amountIn, slippagePct, deadline, bestQuote) {
    if (!walletManager.connected) throw new Error('Wallet not connected.');

    const amountInWei   = ethers.parseUnits(String(amountIn), fromToken.decimals);
    const slippageFactor = 1 - parseFloat(slippagePct) / 100;
    const amountOutMin  = BigInt(
      Math.floor(Number(bestQuote.amountOut) * slippageFactor).toString()
    );
    const deadlineTs = Math.floor(Date.now() / 1000) + parseInt(deadline) * 60;
    const recipient  = walletManager.address;

    // Check if approval is needed for ERC-20 tokens
    let approvalNeeded = false;
    let approvalRouter = null;
    if (fromToken.address !== 'NATIVE') {
      const router = this._getRouterAddress(fromToken.chain, bestQuote.protocol);
      const allowance = await walletManager.getTokenAllowance(fromToken, router);
      if (allowance < amountInWei) {
        approvalNeeded = true;
        approvalRouter = router;
      }
    }

    // Build calldata based on protocol
    const txData = await this._buildCalldata(
      fromToken, toToken, amountInWei, amountOutMin, deadlineTs, recipient, bestQuote
    );

    return { txData, quote: bestQuote, approvalNeeded, approvalRouter, amountOutMin };
  }

  // ── Execute the swap ──────────────────────────────────────────
  async executeSwap(fromToken, toToken, amountIn, swapBuild) {
    const { txData, quote, approvalNeeded, approvalRouter } = swapBuild;

    // 1. Ensure correct chain
    if (walletManager.chainKey !== fromToken.chain) {
      const ok = await walletManager.switchToChain(fromToken.chain);
      if (!ok) throw new Error(`Please switch to ${CHAINS[fromToken.chain].name} in your wallet.`);
    }

    // 2. Approve if needed
    if (approvalNeeded) {
      const amountInWei = ethers.parseUnits(String(amountIn), fromToken.decimals);
      await walletManager.approveToken(fromToken, approvalRouter, amountInWei);
    }

    // 3. Send transaction
    const signer = walletManager.signer;
    const tx = await signer.sendTransaction(txData);

    // 4. Record pending swap
    const record = this._recordSwap({
      hash: tx.hash,
      fromToken, toToken, amountIn,
      amountOut: quote.amountOutFormatted,
      protocol: quote.protocol,
      chain: fromToken.chain,
      status: 'pending',
      timestamp: Date.now(),
    });

    // 5. Wait for confirmation in background
    tx.wait(CHAINS[fromToken.chain]?.confirmations ?? 1).then(receipt => {
      this._updateSwapStatus(record.id, receipt?.status === 1 ? 'success' : 'failed');
    }).catch(() => {
      this._updateSwapStatus(record.id, 'failed');
    });

    return { tx, record };
  }

  // ── Build calldata per protocol ───────────────────────────────
  async _buildCalldata(fromToken, toToken, amountIn, amountOutMin, deadline, recipient, quote) {
    const chain       = fromToken.chain;
    const chainConfig = CHAINS[chain];
    const isNativeIn  = fromToken.address === 'NATIVE';
    const isNativeOut = toToken.address   === 'NATIVE';

    // For simulated / 1inch / 0x — use Uniswap V2 router as fallback
    const routerAddr  = this._getRouterAddress(chain, quote.protocol);
    const value       = isNativeIn ? amountIn : 0n;

    let data;
    if (quote.protocol.startsWith('Uniswap V3')) {
      const router   = new ethers.Interface(ROUTER_V3_ABI);
      const fee      = this._feeFromProtocol(quote.protocol);
      const tokenIn  = isNativeIn  ? chainConfig.routers.uniswapV3 : fromToken.address;
      const tokenOut = isNativeOut ? chainConfig.routers.uniswapV3 : toToken.address;
      data = router.encodeFunctionData('exactInputSingle', [{
        tokenIn, tokenOut, fee, recipient, deadline,
        amountIn, amountOutMinimum: amountOutMin, sqrtPriceLimitX96: 0n,
      }]);
    } else if (isNativeIn) {
      const iface = new ethers.Interface(ROUTER_V2_ABI);
      const weth  = this._getWETH(chain);
      data = iface.encodeFunctionData('swapExactETHForTokens', [
        amountOutMin, [weth, toToken.address], recipient, deadline,
      ]);
    } else if (isNativeOut) {
      const iface = new ethers.Interface(ROUTER_V2_ABI);
      const weth  = this._getWETH(chain);
      data = iface.encodeFunctionData('swapExactTokensForETH', [
        amountIn, amountOutMin, [fromToken.address, weth], recipient, deadline,
      ]);
    } else {
      const iface = new ethers.Interface(ROUTER_V2_ABI);
      data = iface.encodeFunctionData('swapExactTokensForTokens', [
        amountIn, amountOutMin, [fromToken.address, toToken.address], recipient, deadline,
      ]);
    }

    const gasEstimate = quote.gasEstimate
      ? BigInt(Math.ceil(quote.gasEstimate * (chainConfig.gasMultiplier ?? 1.2)))
      : undefined;

    return { to: routerAddr, data, value, gasLimit: gasEstimate };
  }

  _getRouterAddress(chain, protocol) {
    const r = CHAINS[chain]?.routers ?? {};
    if (protocol?.includes('Uniswap V3'))   return r.uniswapV3 ?? r.uniswapV2;
    if (protocol === 'Aerodrome')            return r.aerodrome  ?? r.uniswapV3;
    if (protocol === 'Trisolaris')           return r.trisolaris ?? r.uniswapV2;
    if (protocol === '1inch')                return r.oneInch    ?? r.uniswapV2;
    return r.uniswapV2 ?? r.uniswapV3 ?? Object.values(r)[0];
  }

  _getWETH(chain) {
    const wethMap = {
      ethereum: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      base:     '0x4200000000000000000000000000000000000006',
      arc:      '0xC9BdeEd33CD01541e1eeD10f90519d2C06Fe3feB',
    };
    return wethMap[chain];
  }

  _feeFromProtocol(protocol) {
    if (protocol.includes('0.05%'))  return 500;
    if (protocol.includes('1%'))     return 10000;
    return 3000;
  }

  // ── Swap History ──────────────────────────────────────────────
  _recordSwap(swap) {
    const record = { id: Date.now().toString(), ...swap };
    this._history.unshift(record);
    if (this._history.length > 50) this._history = this._history.slice(0, 50);
    this._saveHistory();
    return record;
  }

  _updateSwapStatus(id, status) {
    const item = this._history.find(s => s.id === id);
    if (item) { item.status = status; this._saveHistory(); }
    // Notify UI
    window.dispatchEvent(new CustomEvent('swapStatusUpdate', { detail: { id, status } }));
  }

  _saveHistory() {
    try { localStorage.setItem('arcswap_history', JSON.stringify(this._history)); } catch { /* quota */ }
  }

  getHistory()    { return [...this._history]; }
  clearHistory()  { this._history = []; this._saveHistory(); }

  // ── Price impact calculation ──────────────────────────────────
  calcPriceImpact(amountIn, amountOut, fromPrice, toPrice) {
    if (!fromPrice || !toPrice || !amountIn || !amountOut) return null;
    const expectedOut = (parseFloat(amountIn) * fromPrice) / toPrice;
    const impact = ((expectedOut - parseFloat(amountOut)) / expectedOut) * 100;
    return Math.max(0, impact).toFixed(2);
  }

  // ── Min received with slippage ────────────────────────────────
  calcMinReceived(amountOut, slippagePct) {
    const slippage = parseFloat(slippagePct) / 100;
    return (parseFloat(amountOut) * (1 - slippage)).toFixed(6);
  }
}

export const swapEngine = new SwapEngine();
