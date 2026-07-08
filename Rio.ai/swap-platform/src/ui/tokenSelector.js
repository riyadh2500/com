import { searchTokens, getTokensByChain } from '../config/tokens.js';
import { walletManager } from '../wallet/walletManager.js';

// ── TokenSelector ──────────────────────────────────────────────
// Manages the token picker modal. Notifies SwapUI via callback
// when a token is selected.
// ──────────────────────────────────────────────────────────────

class TokenSelector {
  constructor() {
    this._mode         = 'from';   // 'from' | 'to'
    this._chainFilter  = 'all';
    this._onSelect     = null;     // callback(mode, token)
    this._initialized  = false;
  }

  init(onSelectCallback) {
    this._onSelect = onSelectCallback;
    this._setupChainFilter();
    this._initialized = true;
  }

  open(mode) {
    this._mode = mode;
    this.filter('');
    document.getElementById('tokenSearchInput').value = '';
    document.getElementById('tokenModal').classList.add('active');
    document.getElementById('tokenModalBackdrop').classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('tokenSearchInput').focus(), 50);
  }

  close() {
    document.getElementById('tokenModal').classList.remove('active');
    document.getElementById('tokenModalBackdrop').classList.remove('active');
    document.body.style.overflow = '';
  }

  filter(query) {
    const tokens = searchTokens(query, this._chainFilter);
    this._renderList(tokens);
  }

  // ── Private ──────────────────────────────────────────────────
  _setupChainFilter() {
    document.getElementById('tokenChainFilter').addEventListener('click', (e) => {
      const btn = e.target.closest('.chain-filter-btn');
      if (!btn) return;
      document.querySelectorAll('.chain-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this._chainFilter = btn.dataset.chain;
      this.filter(document.getElementById('tokenSearchInput').value);
    });
  }

  _renderList(tokens) {
    const list = document.getElementById('tokenList');
    if (!tokens.length) {
      list.innerHTML = '<div style="padding:20px;text-align:center;font-size:.8rem;color:var(--text-muted)">No tokens found</div>';
      return;
    }
    list.innerHTML = tokens.map(t => this._tokenItemHTML(t)).join('');
    list.querySelectorAll('.token-list-item').forEach(el => {
      el.addEventListener('click', () => {
        const symbol = el.dataset.symbol;
        const chain  = el.dataset.chain;
        const token  = tokens.find(t => t.symbol === symbol && t.chain === chain);
        if (!token) return;
        if (this._onSelect) this._onSelect(this._mode, token);
        this.close();
      });
    });
  }

  _tokenItemHTML(token) {
    const chainBadgeClass = { ethereum: 'eth', base: 'base', arc: 'arc' }[token.chain] ?? 'eth';
    const chainLabel      = { ethereum: 'ETH', base: 'Base', arc: 'Arc' }[token.chain] ?? token.chain;
    return `
      <div class="token-list-item" data-symbol="${token.symbol}" data-chain="${token.chain}">
        <div class="token-list-icon" style="background:${token.color}">${token.logoText}</div>
        <div class="token-list-info">
          <div class="token-list-symbol">${token.symbol}
            <span class="token-list-chain-badge ${chainBadgeClass}">${chainLabel}</span>
          </div>
          <div class="token-list-name">${token.name}</div>
        </div>
        <div class="token-list-balance" id="bal-${token.chain}-${token.symbol}">--</div>
      </div>`;
  }

  // Async-fill balances after render
  async fillBalances(tokens) {
    if (!walletManager.connected) return;
    for (const t of tokens) {
      try {
        const bal = await walletManager.getTokenBalance(t);
        const el  = document.getElementById(`bal-${t.chain}-${t.symbol}`);
        if (el) el.textContent = parseFloat(bal).toFixed(4);
      } catch { /* skip */ }
    }
  }
}

export const tokenSelector = new TokenSelector();
