'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import {
  TrendingUp, Wallet, ShieldCheck, LogOut,
  Menu, X, BarChart2, Zap, ChevronDown, User,
} from 'lucide-react';
import { useState } from 'react';
import WalletConnectButton from './WalletConnectButton';
import USDCBalance from './USDCBalance';
import DepositModal from './DepositModal';
import { useAccount, useReadContract } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { ARC_USDC_ADDRESS, ERC20_ABI } from '@/lib/arcChain';

export default function Navbar() {
  const { user, logout }              = useAuthStore();
  const pathname                      = usePathname();
  const router                        = useRouter();
  const { address, isConnected }      = useAccount();
  const [menuOpen, setMenuOpen]       = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);

  const { data: usdcRaw } = useReadContract({
    address:      ARC_USDC_ADDRESS,
    abi:          ERC20_ABI,
    functionName: 'balanceOf',
    args:         address ? [address] : undefined,
    chainId:      sepolia.id,
    query:        { enabled: !!address, refetchInterval: 10_000 },
  });
  const onChainUsdc = usdcRaw ? Number(usdcRaw as bigint) / 1_000_000 : null;

  const displayBalance = isConnected && onChainUsdc !== null
    ? `${onChainUsdc.toFixed(2)} USDC`
    : user ? `${(user.balance ?? 0).toFixed(2)} USDC` : null;

  const handleLogout = () => {
    logout();
    setProfileOpen(false);
    router.push('/');
  };

  const navLinks = [
    { href: '/crypto', label: 'Crypto',     icon: Zap,       badge: 'LIVE' },
    { href: '/perps',  label: 'Perpetuals', icon: BarChart2, badge: 'NEW'  },
    ...(user?.isAdmin ? [{ href: '/admin', label: 'Admin', icon: ShieldCheck }] : []),
  ];

  return (
    <>
      <nav className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 font-bold text-xl flex-shrink-0">
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
                <TrendingUp size={18} className="text-white" />
              </div>
              <span className="text-white">Predictly</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(({ href, label, icon: Icon, badge }) => (
                <Link key={href} href={href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname.startsWith(href)
                      ? 'bg-brand-500/20 text-brand-400'
                      : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
                  }`}>
                  <Icon size={16} />
                  {label}
                  {badge && (
                    <span className="px-1.5 py-0.5 bg-brand-500 text-white text-[9px] font-bold rounded-full leading-none">
                      {badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>

            {/* Right side */}
            <div className="hidden md:flex items-center gap-3">
              <USDCBalance compact />

              <WalletConnectButton />
              <div className="w-px h-5 bg-gray-700" />

              {/* Profile */}
              {user && (
                <div className="relative">
                  <button onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl transition-colors">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-[11px] font-black text-white">
                      {(user.username ?? 'U')[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-200 font-medium">@{user.username}</span>
                    <ChevronDown size={13} className={`text-gray-500 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {profileOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-64 z-50 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-4 py-4 border-b border-gray-800 bg-gray-800/40">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-lg font-black text-white">
                              {(user.username ?? 'U')[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">@{user.username}</p>
                              <p className="text-xs text-gray-500 truncate max-w-[140px]">
                                {user.email?.startsWith('wallet:') ? 'Wallet user' : user.email}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between bg-gray-900 rounded-xl px-3 py-2">
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                              <Wallet size={12} className="text-brand-400" />
                              {isConnected && onChainUsdc !== null ? 'Sepolia USDC' : 'Balance'}
                            </div>
                            <span className="text-sm font-bold text-white">{displayBalance ?? '—'}</span>
                          </div>
                        </div>
                        <div className="p-2">
                          <Link href="/portfolio" onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-xl transition-colors">
                            <User size={15} className="text-brand-400"/> My Portfolio
                          </Link>
                          {user.isAdmin && (
                            <Link href="/admin" onClick={() => setProfileOpen(false)}
                              className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-xl transition-colors">
                              <ShieldCheck size={15} className="text-purple-400" /> Admin Panel
                            </Link>
                          )}
                          <div className="border-t border-gray-800 mt-1 pt-1">
                            <button onClick={handleLogout}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">
                              <LogOut size={15} /> Sign out
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Mobile toggle */}
            <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-800 bg-gray-950 px-4 py-4 space-y-2">
            {navLinks.map(({ href, label, icon: Icon, badge }) => (
              <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white">
                <Icon size={16} /> {label}
                {badge && (
                  <span className="px-1.5 py-0.5 bg-brand-500 text-white text-[9px] font-bold rounded-full leading-none ml-1">{badge}</span>
                )}
              </Link>
            ))}
            <div className="border-t border-gray-800 pt-3 space-y-3">
              <WalletConnectButton />
              <USDCBalance compact />
            </div>
            {user && (
              <div className="border-t border-gray-800 pt-3 space-y-1">
                <div className="flex items-center gap-3 px-3 py-2 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center font-black text-white">
                    {(user.username ?? 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">@{user.username}</p>
                    <p className="text-xs text-gray-500">{displayBalance ?? '—'}</p>
                  </div>
                </div>
                <button onClick={() => { handleLogout(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-red-400 hover:bg-gray-800 rounded-lg">
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Deposit modal */}
      {showDeposit && <DepositModal onClose={() => setShowDeposit(false)} />}
    </>
  );
}
