import { walletManager } from '../wallet/walletManager.js';
import { rateAggregator } from '../aggregator/rateAggregator.js';
import { swapEngine }     from '../swap/swapEngine.js';
import { CHAINS }         from '../config/chains.js';
import { getToken }       from '../config/tokens.js';

// ── SwapUI ─────────────────────────────────────────────────────
class SwapUI {
  constructor() {
    this.fromToken  = getToken('ETH',  'ethereum');
    this.toToken    = getToken('USDC', 'ethereum');
    this.quotes     = [];
    this.bestQuote  = null;
    this.settings   = { slippage: '0.5', deadline: '20', priority: 'best_rate' };
    this._debounce  = null;
    this._pendingSwap = null;
    this._prices    = {};
  }

  init() {
    this._setupSettings();
    this._setupChainPills();
    this._renderTokenButtons();
    this._loadHistory();
    this._startChainStats();
    this._fetchPrices();
  }

  // ── Token button rendering ────────────────────────────────────
  _renderTokenButtons() {
    this._setTokenDisplay('from', this.fromToken);
    this._setTokenDisplay('to',   this.toToken);
  }

  _setTokenDisplay(side, token) {
    const icon   = document.getElementById(`${side}TokenIcon`);
    const symbol = document.getElementById(`${side}TokenSymbol`);
    if (icon)   { icon.style.background = token.color; icon.textContent = token.logoText; }
    if (symbol) symbol.textContent = token.symbol;
    if (side === 'from') this.fromToken = token;
    else                 this.toToken   = token;
    this._updateBalance(side);
  }

  onTokenSelected(mode, token) {
    if (mode === 'from') {
      if (token.symbol === this.toToken.symbol && token.chain === this.toToken.chain) {
        this._setTokenDisplay('to', this.fromToken);
      }
      this._setTokenDisplay('from', token);
    } else {
      if (token.symbol === this.fromToken.symbol && token.chain === this.fromToken.chain) {
        this._setTokenDisplay('from', this.toToken);
      }
      this._setTokenDisplay('to', token);
    }
    rateAggregator.clearCache();
    this.onFromAmountChange();
  }

  // ── Amount input ──────────────────────────────────────────────
  onFromAmountChange() {
    clearTimeout(this._debounce);
    const val = document.getElementById('fromAmount').value;
    this._updateFromUsd(val);
    document.getElementById('toAmount').value = '';
    document.getElementById('toAmountUsd').textContent = '≈ $0.00';
    document.getElementById('rateInfoBox').style.display = 'none';
    document.getElementById('slippageWarning').style.display = 'none';
    this._setSwapBtn(false, 'Fetching best rate...');
    if (!val || parseFloat(val) <= 0) { this._setSwapBtn(false, 'Enter an amount'); return; }
    this._debounce = setTimeout(() => this._fetchQuotes(val), 500);
  }

  async _fetchQuotes(amountIn) {
    this._setSwapBtn(false, 'Fetching best rate...');
    document.getElementById('btnSpinner').style.display = 'flex';
    try {
      this.quotes    = await rateAggregator.getQuotes(this.fromToken, this.toToken, amountIn, this.settings);
      this.bestQuote = this.quotes[0];
      if (!this.bestQuote) { this._setSwapBtn(false, 'No route found'); return; }
      this._renderQuoteResult(amountIn, this.bestQuote);
      this._renderRateComparison(this.quotes);
      if (!walletManager.connected) this._setSwapBtn(false, 'Connect Wallet');
      else this._setSwapBtn(true, 'Swap');
    } catch (err) {
      this._setSwapBtn(false, 'Error fetching rates');
      this.showToast(err.message, 'error');
    } finally {
      document.getElementById('btnSpinner').style.display = 'none';
    }
  }

  _renderQuoteResult(amountIn, quote) {
    document.getElementById('toAmount').value = parseFloat(quote.amountOutFormatted).toFixed(6);
    this._updateToUsd(quote.amountOutFormatted);
    const rate = (parseFloat(quote.amountOutFormatted) / parseFloat(amountIn)).toFixed(6);
    document.getElementById('rateDisplay').textContent   = `1 ${this.fromToken.symbol} = ${rate} ${this.toToken.symbol}`;
    document.getElementById('routeDisplay').textContent  = quote.protocol;
    document.getElementById('priceImpact').textContent   = quote.priceImpact ? `${quote.priceImpact}%` : '< 0.01%';
    document.getElementById('minReceived').textContent   = `${swapEngine.calcMinReceived(quote.amountOutFormatted, this.settings.slippage)} ${this.toToken.symbol}`;
    document.getElementById('networkFee').textContent    = quote.gasCostUsd ? `~$${quote.gasCostUsd}` : (quote.gasEstimate ? `~${quote.gasEstimate.toLocaleString()} gas` : '--');
    document.getElementById('rateInfoBox').style.display = 'flex';
    // Show warning if price impact > 3%
    const impact = parseFloat(quote.priceImpact ?? 0);
    const warnEl = document.getElementById('slippageWarning');
    if (impact > 3) {
      warnEl.style.display = 'flex';
      document.getElementById('slippageWarningText').textContent = `High price impact: ${impact}%`;
    }
    // Color code price impact
    const impactEl = document.getElementById('priceImpact');
    impactEl.style.color = impact > 5 ? 'var(--red)' : impact > 1 ? 'var(--yellow)' : 'var(--green)';
  }

  _renderRateComparison(quotes) {
    const list = document.getElementById('rateComparisonList');
    if (!quotes.length) { list.innerHTML = '<div class="rate-comparison-empty">No routes found</div>'; return; }
    list.innerHTML = quotes.map((q, i) => `
      <div class="rate-comparison-row ${q.isBest ? 'best' : ''}">
        <div class="rate-row-left">
          <div>
            <div class="rate-row-protocol">${q.protocol}${q.isBest ? '<span class="best-label">BEST</span>' : ''}</div>
            <div class="rate-row-chain">${CHAINS[q.chain]?.name ?? q.chain}</div>
          </div>
        </div>
        <div class="rate-row-amount">${parseFloat(q.amountOutFormatted).toFixed(4)} ${this.toToken.symbol}</div>
      </div>`
    ).join('');
  }

  // ── Flip tokens ───────────────────────────────────────────────
  flipTokens() {
    const tmp = this.fromToken;
    this._setTokenDisplay('from', this.toToken);
    this._setTokenDisplay('to',   tmp);
    document.getElementById('fromAmount').value = '';
    document.getElementById('toAmount').value   = '';
    rateAggregator.clearCache();
    this.onFromAmountChange();
  }

  // ── Set % of balance ──────────────────────────────────────────
  async setPercentage(pct) {
    if (!walletManager.connected) { this.showToast('Connect wallet first', 'info'); return; }
    const bal = await walletManager.getTokenBalance(this.fromToken);
    const amt = (parseFloat(bal) * pct / 100).toFixed(6);
    document.getElementById('fromAmount').value = amt;
    this.onFromAmountChange();
  }

  // ── Refresh rates ─────────────────────────────────────────────
  refreshRates() {
    rateAggregator.clearCache();
    const val = document.getElementById('fromAmount').value;
    if (val && parseFloat(val) > 0) this._fetchQuotes(val);
  }

  // ── Settings panel ────────────────────────────────────────────
  openSettings()  { document.getElementById('settingsPanel').style.display = 'block'; }
  closeSettings() { document.getElementById('settingsPanel').style.display = 'none'; }

  _setupSettings() {
    // Slippage preset buttons
    document.querySelectorAll('.slippage-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.slippage-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.slippage = btn.dataset.value;
        document.getElementById('customSlippage').value = '';
      });
    });
    document.getElementById('customSlippage').addEventListener('input', (e) => {
      if (e.target.value) {
        document.querySelectorAll('.slippage-btn').forEach(b => b.classList.remove('active'));
        this.settings.slippage = e.target.value;
      }
    });
    document.getElementById('txDeadline').addEventListener('change', (e) => {
      this.settings.deadline = e.target.value;
    });
    document.querySelectorAll('.priority-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.priority = btn.dataset.value;
        this.refreshRates();
      });
    });
  }

  _setupChainPills() {
    document.querySelectorAll('.chain-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.chain-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const chain = pill.dataset.chain;
        // Switch default token pair for the selected chain
        const defaults = {
          ethereum: ['ETH',  'USDC'],
          base:     ['ETH',  'USDC'],
          arc:      ['ARC',  'USDC'],
        };
        const [from, to] = defaults[chain];
        this._setTokenDisplay('from', getToken(from, chain) ?? this.fromToken);
        this._setTokenDisplay('to',   getToken(to,   chain) ?? this.toToken);
        document.getElementById('fromAmount').value = '';
        document.getElementById('toAmount').value   = '';
        rateAggregator.clearCache();
        this._setSwapBtn(false, 'Enter an amount');
        document.getElementById('rateInfoBox').style.display = 'none';
      });
    });
  }

  // ── Submit → show confirm modal ───────────────────────────────
  async submitSwap() {
    if (!walletManager.connected) { await walletManager.connect(); return; }
    const amountIn = document.getElementById('fromAmount').value;
    if (!amountIn || !this.bestQuote) return;
    try {
      this._pendingSwap = await swapEngine.buildSwap(
        this.fromToken, this.toToken, amountIn,
        this.settings.slippage, this.settings.deadline, this.bestQuote
      );
      this._showTxModal(amountIn);
    } catch (err) { this.showToast(err.message, 'error'); }
  }

  _showTxModal(amountIn) {
    const q = this.bestQuote;
    const minOut = swapEngine.calcMinReceived(q.amountOutFormatted, this.settings.slippage);
    document.getElementById('txModalBody').innerHTML = `
      <div class="tx-confirm-row">
        <span class="tx-confirm-label">You Pay</span>
        <span class="tx-confirm-value">${amountIn} ${this.fromToken.symbol}</span>
      </div>
      <div class="tx-confirm-row">
        <span class="tx-confirm-label">You Receive (est.)</span>
        <span class="tx-confirm-value">${parseFloat(q.amountOutFormatted).toFixed(6)} ${this.toToken.symbol}</span>
      </div>
      <div class="tx-confirm-row">
        <span class="tx-confirm-label">Min. Received</span>
        <span class="tx-confirm-value">${minOut} ${this.toToken.symbol}</span>
      </div>
      <div class="tx-confirm-row">
        <span class="tx-confirm-label">Slippage</span>
        <span class="tx-confirm-value">${this.settings.slippage}%</span>
      </div>
      <div class="tx-confirm-row">
        <span class="tx-confirm-label">Route</span>
        <span class="tx-confirm-value">${q.protocol}</span>
      </div>
      <div class="tx-confirm-row">
        <span class="tx-confirm-label">Network</span>
        <span class="tx-confirm-value">${CHAINS[this.fromToken.chain]?.name}</span>
      </div>
      ${this._pendingSwap.approvalNeeded ? `
      <div style="margin-top:10px;padding:10px;border-radius:8px;background:rgba(251,191,36,0.07);border:1px solid rgba(251,191,36,0.2);font-size:.78rem;color:var(--yellow)">
        ⚠ An approval transaction will be sent first.
      </div>` : ''}
    `;
    document.getElementById('txModal').classList.add('active');
    document.getElementById('txModalBackdrop').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeTxModal() {
    document.getElementById('txModal').classList.remove('active');
    document.getElementById('txModalBackdrop').classList.remove('active');
    document.body.style.overflow = '';
  }

  async confirmSwap() {
    if (!this._pendingSwap) return;
    const amountIn = document.getElementById('fromAmount').value;
    this.closeTxModal();
    this._setSwapBtn(false, 'Swapping...');
    document.getElementById('btnSpinner').style.display = 'flex';
    try {
      const { tx, record } = await swapEngine.executeSwap(
        this.fromToken, this.toToken, amountIn, this._pendingSwap
      );
      document.getElementById('fromAmount').value = '';
      document.getElementById('toAmount').value   = '';
      document.getElementById('rateInfoBox').style.display = 'none';
      this._setSwapBtn(false, 'Enter an amount');
      this.showToast(`Swap submitted! TX: ${tx.hash.slice(0,10)}…`, 'success');
      this._loadHistory();
    } catch (err) {
      this._setSwapBtn(true, 'Swap');
      this.showToast(err.message ?? 'Swap failed', 'error');
    } finally {
      document.getElementById('btnSpinner').style.display = 'none';
      this._pendingSwap = null;
    }
  }

  // ── History ───────────────────────────────────────────────────
  _loadHistory() {
    const list    = document.getElementById('recentSwapsList');
    const history = swapEngine.getHistory();
    if (!history.length) { list.innerHTML = '<div class="recent-swaps-empty">No swaps yet</div>'; return; }
    list.innerHTML = history.slice(0, 8).map(s => `
      <div class="recent-swap-item">
        <div>
          <div class="recent-swap-pair">${s.fromToken?.symbol ?? '?'} → ${s.toToken?.symbol ?? '?'}</div>
          <div class="recent-swap-meta">${s.amountIn} → ${s.amountOut} · ${CHAINS[s.chain]?.name ?? s.chain}</div>
        </div>
        <span class="recent-swap-status ${s.status}">${s.status}</span>
      </div>`).join('');
  }

  clearHistory() {
    swapEngine.clearHistory();
    this._loadHistory();
  }

  // ── Chain stats polling ───────────────────────────────────────
  _startChainStats() {
    this._pollChainStats();
    setInterval(() => this._pollChainStats(), 15_000);
  }

  async _pollChainStats() {
    for (const chainKey of ['ethereum', 'base', 'arc']) {
      Promise.all([
        walletManager.getGasPrice(chainKey),
        walletManager.getBlockNumber(chainKey),
      ]).then(([gas, block]) => {
        const gasEl   = document.getElementById(`${chainKey === 'ethereum' ? 'eth' : chainKey}-gas`);
        const blockEl = document.getElementById(`${chainKey === 'ethereum' ? 'eth' : chainKey}-block`);
        if (gasEl  && gas)   gasEl.textContent   = `${gas} gwei`;
        if (blockEl && block) blockEl.textContent = `#${block.toLocaleString()}`;
        // Update main gas tracker with current chain
        const activeChain = document.querySelector('.chain-pill.active')?.dataset?.chain ?? 'ethereum';
        if (chainKey === activeChain && gas) {
          document.getElementById('gasPrice').textContent = `${gas} gwei`;
        }
      }).catch(() => {});
    }
  }

  // ── USD display helpers ───────────────────────────────────────
  async _fetchPrices() {
    const ids = ['ethereum','usd-coin','tether','dai','wrapped-bitcoin','arc-token','uniswap','chainlink'];
    try {
      const res  = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`);
      const data = await res.json();
      this._prices = {
        ETH: data.ethereum?.usd,  WETH: data.ethereum?.usd,
        USDC: data['usd-coin']?.usd, USDT: data.tether?.usd,
        DAI: data.dai?.usd, WBTC: data['wrapped-bitcoin']?.usd,
        ARC: data['arc-token']?.usd ?? 1.8,
        UNI: data.uniswap?.usd, LINK: data.chainlink?.usd,
      };
    } catch { /* use defaults */ }
  }

  _toUsd(amount, symbol) {
    const p = this._prices[symbol];
    if (!p || !amount) return '≈ $0.00';
    return `≈ $${(parseFloat(amount) * p).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  _updateFromUsd(val) {
    document.getElementById('fromAmountUsd').textContent = this._toUsd(val, this.fromToken.symbol);
  }
  _updateToUsd(val) {
    document.getElementById('toAmountUsd').textContent = this._toUsd(val, this.toToken.symbol);
  }

  async _updateBalance(side) {
    const token  = side === 'from' ? this.fromToken : this.toToken;
    const elId   = side === 'from' ? 'fromBalance' : 'toBalance';
    const el     = document.getElementById(elId);
    if (!el) return;
    if (!walletManager.connected) { el.textContent = '--'; return; }
    const bal = await walletManager.getTokenBalance(token);
    el.textContent = parseFloat(bal).toFixed(4) + ' ' + token.symbol;
  }

  // ── Swap button helper ────────────────────────────────────────
  _setSwapBtn(enabled, text) {
    const btn = document.getElementById('swapSubmitBtn');
    const txt = document.getElementById('swapBtnText');
    btn.disabled = !enabled;
    txt.textContent = text;
  }

  // ── Toast ─────────────────────────────────────────────────────
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast     = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div class="toast-icon-dot"></div><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }
}

export const swapUI = new SwapUI();
