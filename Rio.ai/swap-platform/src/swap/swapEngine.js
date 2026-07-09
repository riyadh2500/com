import { ethers } from 'ethers';
import { CHAINS } from '../config/chains.js';
import { walletManager } from '../wallet/walletManager.js';
import { rateAggregator } from '../aggregator/rateAggregator.js';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

// ── Minimal router ABIs ────────────────────────────────────────
const SWAPROUTER02_ABI = [
  'function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput((bytes path,address recipient,uint256 amountIn,uint256 amountOutMinimum)) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory)',
  'function refundETH() external payable',
  'function unwrapWETH9(uint256 amountMinimum, address recipient) external payable'
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

    const chainInfo = CHAINS[fromToken.chain];
    const amountInWei   = ethers.parseUnits(String(amountIn), fromToken.decimals);
    const slippageFactor = 1 - parseFloat(slippagePct) / 100;
    const amountOutMin  = BigInt(
      Math.floor(Number(bestQuote.amountOut) * slippageFactor)
    );
    const deadlineTs = Math.floor(Date.now() / 1000) + parseInt(deadline) * 60;
    const recipient  = walletManager.address;

    // Check if approval is needed for ERC-20 tokens
    let approvalNeeded = false;
    let approvalRouter = null;
    if (fromToken.address !== 'NATIVE') {
      const router = this._getRouterAddress(fromToken.chain, bestQuote.protocol, chainInfo);
      const allowance = await walletManager.getTokenAllowance(fromToken, router);
      if (allowance < amountInWei) {
        approvalNeeded = true;
        approvalRouter = router;
      }
    }

    // Build calldata based on mainnet (1inch) or testnet (Uniswap V3)
    let txData;
    if (chainInfo.isTestnet) {
      txData = await this._buildTestnetSwap(
        fromToken, toToken, amountInWei, amountOutMin, deadlineTs, recipient, bestQuote
      );
    } else {
      txData = await this._buildMainnetSwap(
        fromToken, toToken, amountInWei, slippagePct, recipient, chainInfo.id
      );
    }

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

  // ── Build mainnet swap (1inch API) ────────────────────────────
  async _buildMainnetSwap(fromToken, toToken, amountInWei, slippagePct, fromAddress, chainId) {
    try {
      const src = fromToken.address === 'NATIVE' ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' : fromToken.address;
      const dst = toToken.address === 'NATIVE' ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' : toToken.address;

      const response = await axios.post(`${API_BASE_URL}/swap`, {
        fromToken: src,
        toToken: dst,
        amount: amountInWei.toString(),
        slippage: slippagePct,
        from: fromAddress,
        chainId: chainId
      }, { timeout: 15000 });

      const data = response.data;
      
      return {
        to: data.tx.to,
        data: data.tx.data,
        value: data.tx.value || '0',
        gasLimit: data.tx.gas ? BigInt(data.tx.gas) : undefined
      };
    } catch (error) {
      console.error('[SwapEngine] Mainnet swap build failed:', error.message);
      throw new Error(`Failed to build swap transaction: ${error.response?.data?.error || error.message}`);
    }
  }

  // ── Build testnet swap (Uniswap V3 SwapRouter02) ──────────────
  async _buildTestnetSwap(fromToken, toToken, amountIn, amountOutMin, deadline, recipient, quote) {
    const chainInfo = CHAINS[fromToken.chain];
    const routerAddr = chainInfo.routers.swapRouter02 || chainInfo.routers.uniswapV3;
    
    if (!routerAddr) {
      throw new Error(`No Uniswap V3 router found for ${chainInfo.name}`);
    }

    const isNativeIn = fromToken.address === 'NATIVE';
    const isNativeOut = toToken.address === 'NATIVE';
    
    // Get WETH address for the chain
    const wethAddr = this._getWETH(fromToken.chain);
    
    // Determine actual token addresses for the swap
    const tokenIn = isNativeIn ? wethAddr : fromToken.address;
    const tokenOut = isNativeOut ? wethAddr : toToken.address;
    
    // Extract fee tier from quote
    const fee = quote.feeTier ? this._feeFromTier(quote.feeTier) : 3000;

    const router = new ethers.Interface(SWAPROUTER02_ABI);

    // For native ETH in, we wrap automatically via the router
    // For native ETH out, we use multicall with unwrapWETH9
    if (isNativeOut) {
      // Swap to WETH then unwrap
      const swapData = router.encodeFunctionData('exactInputSingle', [{
        tokenIn,
        tokenOut: wethAddr,
        fee,
        recipient: ethers.ZeroAddress, // Router keeps WETH
        amountIn,
        amountOutMinimum: amountOutMin,
        sqrtPriceLimitX96: 0n
      }]);

      const unwrapData = router.encodeFunctionData('unwrapWETH9', [amountOutMin, recipient]);

      const multicallData = router.encodeFunctionData('multicall', [
        BigInt(deadline),
        [swapData, unwrapData]
      ]);

      return {
        to: routerAddr,
        data: multicallData,
        value: isNativeIn ? amountIn : 0n,
        gasLimit: BigInt(Math.ceil((quote.gasEstimate || 250000) * (chainInfo.gasMultiplier || 1.2)))
      };
    } else {
      // Standard token-to-token or ETH-to-token swap
      const data = router.encodeFunctionData('exactInputSingle', [{
        tokenIn,
        tokenOut,
        fee,
        recipient,
        amountIn,
        amountOutMinimum: amountOutMin,
        sqrtPriceLimitX96: 0n
      }]);

      return {
        to: routerAddr,
        data,
        value: isNativeIn ? amountIn : 0n,
        gasLimit: BigInt(Math.ceil((quote.gasEstimate || 200000) * (chainInfo.gasMultiplier || 1.2)))
      };
    }
  }

  _getRouterAddress(chain, protocol, chainInfo) {
    // For testnets, always use SwapRouter02
    if (chainInfo?.isTestnet) {
      return chainInfo.routers.swapRouter02 || chainInfo.routers.uniswapV3;
    }

    // For mainnet, use 1inch router (returned by API)
    const r = chainInfo?.routers ?? {};
    if (protocol?.includes('Uniswap V3'))   return r.uniswapV3 ?? r.swapRouter02;
    if (protocol === 'Aerodrome')            return r.aerodrome  ?? r.uniswapV3;
    if (protocol === 'Trisolaris')           return r.trisolaris ?? r.uniswapV2;
    if (protocol === '1inch')                return r.oneInch    ?? r.uniswapV2;
    return r.swapRouter02 ?? r.uniswapV3 ?? r.uniswapV2 ?? Object.values(r)[0];
  }

  _getWETH(chain) {
    const wethMap = {
      ethereum: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      base:     '0x4200000000000000000000000000000000000006',
      arc:      '0xC9BdeEd33CD01541e1eeD10f90519d2C06Fe3feB',
      sepolia:  '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
      'base-sepolia': '0x4200000000000000000000000000000000000006',
      'arc-testnet': '0x0000000000000000000000000000000000000000', // Placeholder
    };
    return wethMap[chain];
  }

  _feeFromTier(feeTier) {
    if (feeTier.includes('0.05')) return 500;
    if (feeTier.includes('1'))    return 10000;
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
