import { sepolia } from 'wagmi/chains';

// Use Sepolia as the trading chain (replaces Arc Testnet)
// USDC on Sepolia: Circle's official testnet USDC
export const arcTestnet = sepolia; // alias kept for backwards compatibility

// ── USDC on Sepolia ─────────────────────────────────────────────────
// Official Circle USDC token on Ethereum Sepolia Testnet
// Get testnet USDC: https://faucet.circle.com
export const ARC_USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as `0x${string}`;

// Platform treasury — USDC transfers go here on trade
export const PLATFORM_TREASURY = '0x0000000000000000000000000000000000000001' as `0x${string}`;

// Standard ERC-20 ABI
export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to',     type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount',  type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner',   type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// USDC has 6 decimals
export function usdcToUnits(amount: number): bigint {
  return BigInt(Math.round(amount * 1_000_000));
}
export function unitsToUsdc(units: bigint): number {
  return Number(units) / 1_000_000;
}
export function formatUsdc(val: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(val);
}
