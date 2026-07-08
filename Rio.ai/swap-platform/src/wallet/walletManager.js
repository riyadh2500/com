import { ethers } from 'ethers';
import { CHAINS, CHAIN_BY_ID, switchChain } from '../config/chains.js';
import { ERC20_ABI } from '../config/tokens.js';

// ── WalletManager ──────────────────────────────────────────────
// Handles MetaMask / EIP-1193 connection, chain switching,
// balance fetching, and event subscriptions.
// ──────────────────────────────────────────────────────────────

class WalletManager {
  constructor() {
    this.provider   = null;   // ethers BrowserProvider
    this.signer     = null;
    this.address    = null;
    this.chainId    = null;
    this.chainKey   = null;
    this.connected  = false;
    this._listeners = {};     // event → [callbacks]
    this._readProviders = {}; // chainKey → JsonRpcProvider (read-only)
  }

  // ── Public API ────────────────────────────────────────────────

  async connect() {
    if (!window.ethereum) {
      this._emit('error', 'No wallet detected. Please install MetaMask.');
      return false;
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts.length) throw new Error('No accounts returned.');

      this.provider  = new ethers.BrowserProvider(window.ethereum);
      this.signer    = await this.provider.getSigner();
      this.address   = await this.signer.getAddress();
      const network  = await this.provider.getNetwork();
      this.chainId   = Number(network.chainId);
      this.chainKey  = CHAIN_BY_ID[this.chainId] ?? null;
      this.connected = true;

      this._setupEventListeners();
      this._emit('connected', { address: this.address, chainId: this.chainId, chainKey: this.chainKey });
      this._updateNavbar();
      return true;
    } catch (err) {
      const msg = err.code === 4001 ? 'Connection rejected by user.' : err.message;
      this._emit('error', msg);
      return false;
    }
  }

  disconnect() {
    this.provider   = null;
    this.signer     = null;
    this.address    = null;
    this.chainId    = null;
    this.chainKey   = null;
    this.connected  = false;
    this._removeEventListeners();
    this._emit('disconnected');
    this._updateNavbar();
  }

  async switchToChain(chainKey) {
    if (!this.connected) { this._emit('error', 'Wallet not connected.'); return false; }
    const ok = await switchChain(chainKey);
    if (ok) {
      const network = await this.provider.getNetwork();
      this.chainId  = Number(network.chainId);
      this.chainKey = chainKey;
      this.signer   = await this.provider.getSigner();
      this._emit('chainChanged', { chainId: this.chainId, chainKey });
    }
    return ok;
  }

  // Returns ethers.JsonRpcProvider for read-only RPC (no wallet needed)
  getReadProvider(chainKey) {
    if (!this._readProviders[chainKey]) {
      const chain = CHAINS[chainKey];
      this._readProviders[chainKey] = new ethers.JsonRpcProvider(chain.rpcUrl);
    }
    return this._readProviders[chainKey];
  }

  // Returns signer-backed provider if connected to that chain, else read-only
  getProvider(chainKey) {
    if (this.connected && this.chainKey === chainKey) return this.provider;
    return this.getReadProvider(chainKey);
  }

  async getNativeBalance(chainKey, address = this.address) {
    if (!address) return '0';
    try {
      const prov = this.getReadProvider(chainKey);
      const raw  = await prov.getBalance(address);
      const chain = CHAINS[chainKey];
      return ethers.formatUnits(raw, chain.nativeCurrency.decimals);
    } catch { return '0'; }
  }

  async getTokenBalance(token, address = this.address) {
    if (!address) return '0';
    if (token.address === 'NATIVE') return this.getNativeBalance(token.chain, address);
    try {
      const prov    = this.getReadProvider(token.chain);
      const contract = new ethers.Contract(token.address, ERC20_ABI, prov);
      const raw     = await contract.balanceOf(address);
      return ethers.formatUnits(raw, token.decimals);
    } catch { return '0'; }
  }

  async getTokenAllowance(token, spender, owner = this.address) {
    if (!owner || token.address === 'NATIVE') return ethers.MaxUint256;
    try {
      const prov     = this.getReadProvider(token.chain);
      const contract = new ethers.Contract(token.address, ERC20_ABI, prov);
      return await contract.allowance(owner, spender);
    } catch { return 0n; }
  }

  async approveToken(token, spender, amount) {
    if (!this.connected) throw new Error('Wallet not connected.');
    if (this.chainKey !== token.chain) {
      const ok = await this.switchToChain(token.chain);
      if (!ok) throw new Error(`Could not switch to ${token.chain}`);
    }
    const contract = new ethers.Contract(token.address, ERC20_ABI, this.signer);
    const tx = await contract.approve(spender, amount);
    return tx.wait();
  }

  async getGasPrice(chainKey) {
    try {
      const prov    = this.getReadProvider(chainKey);
      const feeData = await prov.getFeeData();
      const gwei    = ethers.formatUnits(feeData.gasPrice ?? feeData.maxFeePerGas ?? 0n, 'gwei');
      return parseFloat(gwei).toFixed(1);
    } catch { return null; }
  }

  async getBlockNumber(chainKey) {
    try {
      const prov = this.getReadProvider(chainKey);
      return await prov.getBlockNumber();
    } catch { return null; }
  }

  shortAddress(addr = this.address) {
    if (!addr) return '';
    return addr.slice(0, 6) + '...' + addr.slice(-4);
  }

  // ── Event bus ────────────────────────────────────────────────
  on(event, cb) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(cb);
  }
  off(event, cb) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(fn => fn !== cb);
  }
  _emit(event, data) {
    (this._listeners[event] ?? []).forEach(fn => fn(data));
  }

  // ── MetaMask event listeners ─────────────────────────────────
  _setupEventListeners() {
    if (!window.ethereum) return;
    this._onAccountsChanged = (accounts) => {
      if (!accounts.length) { this.disconnect(); return; }
      this.address = accounts[0];
      this._emit('accountChanged', this.address);
      this._updateNavbar();
    };
    this._onChainChanged = async (chainIdHex) => {
      this.chainId  = parseInt(chainIdHex, 16);
      this.chainKey = CHAIN_BY_ID[this.chainId] ?? null;
      this.signer   = await this.provider.getSigner();
      this._emit('chainChanged', { chainId: this.chainId, chainKey: this.chainKey });
      this._updateNavbar();
    };
    window.ethereum.on('accountsChanged', this._onAccountsChanged);
    window.ethereum.on('chainChanged',    this._onChainChanged);
  }

  _removeEventListeners() {
    if (!window.ethereum) return;
    if (this._onAccountsChanged) window.ethereum.removeListener('accountsChanged', this._onAccountsChanged);
    if (this._onChainChanged)    window.ethereum.removeListener('chainChanged',    this._onChainChanged);
  }

  // ── Update connect button in navbar ──────────────────────────
  _updateNavbar() {
    const btn = document.getElementById('connectWalletBtn');
    if (!btn) return;
    if (this.connected) {
      btn.classList.add('connected');
      const chainInfo = CHAINS[this.chainKey];
      const dot = chainInfo ? `<span class="chain-dot ${chainInfo.dotClass}" style="display:inline-block"></span>` : '';
      btn.innerHTML = `${dot} ${this.shortAddress()}`;
    } else {
      btn.classList.remove('connected');
      btn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
          <circle cx="16" cy="13" r="1.5" fill="currentColor"/>
          <path d="M2 10h20" stroke="currentColor" stroke-width="2"/>
        </svg>
        Connect Wallet`;
    }
  }

  // Auto-reconnect if previously connected
  async tryAutoConnect() {
    if (!window.ethereum) return false;
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) return this.connect();
    } catch { /* silent */ }
    return false;
  }
}

export const walletManager = new WalletManager();
