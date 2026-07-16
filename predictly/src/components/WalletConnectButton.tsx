'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain, useReadContract } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/lib/api';
import { ARC_USDC_ADDRESS, ERC20_ABI } from '@/lib/arcChain';
import { Wallet, ChevronDown, Unplug, Copy, CheckCircle, X, ExternalLink } from 'lucide-react';

function shortAddr(addr: string) { return `${addr.slice(0, 6)}…${addr.slice(-4)}`; }

function MetaMaskIcon() {
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#1A1A1A' }}>
      <svg width="22" height="20" viewBox="0 0 318 318" fill="none">
        <path d="M274.1 35.5L174.6 109l19.1-45.3 80.4-28.2z" fill="#E17726"/>
        <path d="M44.4 35.5L143 109.4l-17.2-45.7-81.4-28.2z" fill="#E27625"/>
        <path d="M236.7 206.2l-27.3 41.7 58.4 16.1 16.8-56.6-47.9-1.2z" fill="#E27625"/>
        <path d="M33.5 207.4l16.7 56.6 58.2-16.1-27.2-41.7-47.7 1.2z" fill="#E27625"/>
        <path d="M105.4 138.2l-15.7 23.7 56.2 2.5-2-62.1-38.5 35.9z" fill="#E27625"/>
        <path d="M213.1 138.2l-39.3-36.5-1.4 62.7 56.1-2.5-15.4-23.7z" fill="#E27625"/>
        <path d="M108.3 247.9l33.8-16.3-29.2-22.7-4.6 39z" fill="#E27625"/>
        <path d="M176.5 231.6l33.6 16.3-4.4-39-29.2 22.7z" fill="#E27625"/>
      </svg>
    </div>
  );
}
function CoinbaseIcon() {
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#0052FF' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#0052FF"/>
        <circle cx="12" cy="12" r="6.5" fill="white"/>
        <rect x="9" y="10.5" width="6" height="3" rx="1" fill="#0052FF"/>
      </svg>
    </div>
  );
}
function GenericIcon({ name }: { name: string }) {
  return (
    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-black text-sm">
      {name[0].toUpperCase()}
    </div>
  );
}
function getIcon(id: string, name: string) {
  const l = id.toLowerCase();
  if (l.includes('metamask') || l === 'injected') return <MetaMaskIcon />;
  if (l.includes('coinbase')) return <CoinbaseIcon />;
  return <GenericIcon name={name} />;
}

function ConnectModal({ onClose }: { onClose: () => void }) {
  const { connect, connectors, isPending } = useConnect();
  const [connecting, setConnecting] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div>
            <h3 className="font-semibold text-white">Connect Wallet</h3>
            <p className="text-xs text-gray-500 mt-0.5">Choose your wallet to continue</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>

        {/* Sepolia USDC badge */}
        <div className="mx-4 mt-4 mb-3 flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2.5">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-blue-300">Sepolia Testnet · USDC</p>
            <p className="text-xs text-gray-500">Trade with Circle USDC on Sepolia</p>
          </div>
          <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer"
            className="ml-auto text-gray-600 hover:text-blue-400 text-xs whitespace-nowrap">Faucet ↗</a>
        </div>

        <div className="px-4 pb-4 space-y-2">
          {connectors.map(connector => {
            const isLoading = connecting === connector.id && isPending;
            return (
              <button key={connector.uid}
                onClick={() => { setConnecting(connector.id); connect({ connector }, { onSettled: () => { setConnecting(null); onClose(); } }); }}
                disabled={!!connecting}
                className="w-full flex items-center gap-3 px-3 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-brand-500/50 rounded-xl transition-all disabled:opacity-50 text-left">
                {getIcon(connector.id, connector.name)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{connector.name}</p>
                  <p className="text-xs text-gray-500">{connector.id === 'injected' ? 'MetaMask, Rabby & more' : `Connect with ${connector.name}`}</p>
                </div>
                {isLoading && (
                  <svg className="animate-spin h-4 w-4 text-brand-400 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>
        <p className="pb-4 text-xs text-gray-600 text-center">By connecting you agree to use this platform at your own risk.</p>
      </div>
    </div>
  );
}

export default function WalletConnectButton() {
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { setWallet, clearWallet, logout, user, setAuth } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [showMenu, setShowMenu]   = useState(false);
  const [copied, setCopied]       = useState(false);

  const isSepolia = chainId === sepolia.id;
  const isWalletUser = user?.email?.startsWith('wallet:') ?? false;

  // Read USDC ERC-20 balance on Sepolia
  const { data: usdcRaw } = useReadContract({
    address:      ARC_USDC_ADDRESS,
    abi:          ERC20_ABI,
    functionName: 'balanceOf',
    args:         address ? [address] : undefined,
    chainId:      sepolia.id,
    query:        { enabled: !!address, refetchInterval: 10_000 },
  });
  const usdcBalance = usdcRaw ? Number(usdcRaw as bigint) / 1_000_000 : 0;

  useEffect(() => {
    if (isConnected && address) {
      setWallet(address);
      const expectedEmail = `wallet:${address.toLowerCase()}`;
      if (!user || user.email !== expectedEmail) {
        // Try backend login; if it fails, set a minimal wallet-only user so the UI unblocks
        authApi.walletLogin(address)
          .then(res => { setAuth(res.data.user, res.data.token); setWallet(address); })
          .catch(() => {
            // Backend offline — create a local wallet user so trades can proceed
            setAuth(
              {
                id: address,
                email: expectedEmail,
                username: `${address.slice(0, 6)}…${address.slice(-4)}`,
                balance: 0,
                isAdmin: false,
              },
              'wallet-only'
            );
          });
      }
    } else {
      if (isWalletUser) logout();
      else clearWallet();
    }
  }, [isConnected, address]);

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isConnected) {
    return (
      <>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-brand-500/50 text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-all">
          <Wallet size={14} className="text-brand-400" /> Connect Wallet
        </button>
        {showModal && <ConnectModal onClose={() => setShowModal(false)} />}
      </>
    );
  }

  return (
    <>
      <div className="relative">
        <button onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/30 text-brand-300 rounded-lg text-sm font-medium transition-all">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <Wallet size={14} />
          <span className="font-mono">{shortAddr(address!)}</span>
          <ChevronDown size={12} className={`transition-transform ${showMenu ? 'rotate-180' : ''}`} />
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-full mt-2 w-64 z-50 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-800/60 border-b border-gray-700">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Connected</span>
                  <div className="flex items-center gap-2">
                    {!isSepolia && (
                      <button onClick={() => { switchChain({ chainId: sepolia.id }); setShowMenu(false); }}
                        className="text-xs text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded hover:text-yellow-300">
                        Switch to Sepolia
                      </button>
                    )}
                    <span className={`flex items-center gap-1 text-xs ${isSepolia ? 'text-blue-400' : 'text-gray-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isSepolia ? 'bg-blue-400' : 'bg-gray-500'}`} />
                      {chain?.name ?? 'Unknown'}
                    </span>
                  </div>
                </div>
                <p className="font-mono text-xs text-white break-all">{address}</p>
              </div>

              {/* USDC balance */}
              <div className="px-4 py-2.5 border-b border-gray-700/50 bg-blue-500/5">
                <p className="text-xs text-gray-500 mb-0.5">USDC Balance (Sepolia)</p>
                <p className="text-sm font-bold text-blue-300">
                  {usdcBalance.toFixed(4)}
                  <span className="text-gray-500 font-normal ml-1">USDC</span>
                </p>
              </div>

              <div className="p-2 space-y-1">
                <button onClick={copyAddress}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors">
                  {copied ? <><CheckCircle size={14} className="text-green-400" />Copied!</> : <><Copy size={14} />Copy address</>}
                </button>
                <a href={`https://sepolia.etherscan.io/address/${address}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors">
                  <ExternalLink size={14} /> View on Etherscan
                </a>
                <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                  <ExternalLink size={14} /> Get Sepolia USDC (Faucet)
                </a>
                <div className="border-t border-gray-700/50 pt-1 mt-1">
                  <button onClick={() => { disconnect(); if (isWalletUser) logout(); setShowMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                    <Unplug size={14} /> Disconnect
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      {showModal && <ConnectModal onClose={() => setShowModal(false)} />}
    </>
  );
}
