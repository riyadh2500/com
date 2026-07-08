// ── ArcSwap — main.js ─────────────────────────────────────────
// Entry point: wires together wallet, aggregator, swap engine,
// and UI. All modules are exposed on window for HTML onclick
// handlers to reach.
// ──────────────────────────────────────────────────────────────

import { walletManager } from './wallet/walletManager.js';
import { rateAggregator } from './aggregator/rateAggregator.js';
import { swapEngine }     from './swap/swapEngine.js';
import { swapUI }         from './ui/swapUI.js';
import { tokenSelector }  from './ui/tokenSelector.js';

// Expose to window so inline HTML handlers (onclick="...") work
window.walletManager  = walletManager;
window.rateAggregator = rateAggregator;
window.swapEngine     = swapEngine;
window.swapUI         = swapUI;
window.tokenSelector  = tokenSelector;

// ── Bootstrap ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

  // 1. Init token selector — passes callback to swapUI
  tokenSelector.init((mode, token) => swapUI.onTokenSelected(mode, token));

  // 2. Init swap UI (settings, chain pills, history, polling)
  swapUI.init();

  // 3. Wire wallet events → UI reactions
  walletManager.on('connected', ({ address, chainKey }) => {
    swapUI.showToast(`Wallet connected: ${walletManager.shortAddress()}`, 'success');
    // Refresh balances
    swapUI._updateBalance('from');
    swapUI._updateBalance('to');
    // If the user is on a chain we support, reflect it in pills
    if (chainKey) {
      document.querySelectorAll('.chain-pill').forEach(p => {
        p.classList.toggle('active', p.dataset.chain === chainKey);
      });
    }
    // Enable swap button if amount already entered
    const val = document.getElementById('fromAmount').value;
    if (val && parseFloat(val) > 0 && swapUI.bestQuote) {
      swapUI._setSwapBtn(true, 'Swap');
    } else {
      swapUI._setSwapBtn(false, 'Enter an amount');
    }
  });

  walletManager.on('disconnected', () => {
    swapUI.showToast('Wallet disconnected', 'info');
    swapUI._setSwapBtn(false, 'Connect Wallet');
    document.getElementById('fromBalance').textContent = '--';
    document.getElementById('toBalance').textContent   = '--';
  });

  walletManager.on('chainChanged', ({ chainKey }) => {
    const chainName = chainKey ? (walletManager.constructor.name, CHAINS[chainKey]?.name ?? chainKey) : 'Unknown';
    swapUI.showToast(`Switched to ${chainKey ?? 'unknown chain'}`, 'info');
    swapUI._updateBalance('from');
    swapUI._updateBalance('to');
    rateAggregator.clearCache();
  });

  walletManager.on('accountChanged', (address) => {
    swapUI.showToast(`Account: ${walletManager.shortAddress(address)}`, 'info');
    swapUI._updateBalance('from');
    swapUI._updateBalance('to');
  });

  walletManager.on('error', (msg) => {
    swapUI.showToast(msg, 'error');
  });

  // 4. Listen for swap status updates (fired by swapEngine after confirmation)
  window.addEventListener('swapStatusUpdate', (e) => {
    const { id, status } = e.detail;
    swapUI._loadHistory();
    if (status === 'success') swapUI.showToast('Swap confirmed!', 'success');
    if (status === 'failed')  swapUI.showToast('Swap failed on-chain', 'error');
  });

  // 5. Keyboard: Escape closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    tokenSelector.close();
    swapUI.closeTxModal();
    swapUI.closeSettings();
  });

  // 6. Try auto-reconnect (no prompt — only works if previously approved)
  await walletManager.tryAutoConnect();
});
