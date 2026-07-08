# ArcSwap — Multi-Chain Token Swap Platform

Supports **Ethereum**, **Base**, and **Arc Network** with live rate aggregation.

## Quick Start

```bash
cd swap-platform
npm install
npm run dev        # opens http://localhost:5173
```

## Architecture

```
swap-platform/
├── index.html                  # Single-page app shell
├── styles.css                  # Global dark theme styles
├── vite.config.js              # Dev server + CORS proxies
└── src/
    ├── main.js                 # Bootstrap & event wiring
    ├── config/
    │   ├── chains.js           # Chain configs (RPC, routers, IDs)
    │   └── tokens.js           # Token registry + ERC20 ABI
    ├── wallet/
    │   └── walletManager.js    # MetaMask connect, chain switch, balances
    ├── aggregator/
    │   └── rateAggregator.js   # Queries 1inch, 0x, Paraswap, Uniswap V3
    ├── swap/
    │   └── swapEngine.js       # Builds + executes swap transactions
    └── ui/
        ├── swapUI.js           # Main swap card logic
        └── tokenSelector.js    # Token picker modal
```

## Rate Aggregation

Queries in parallel, returns best output amount:

| Protocol    | Chains              | Method         |
|-------------|---------------------|----------------|
| 1inch v6    | ETH, Base, Arc      | REST API       |
| 0x v1       | ETH, Base           | REST API       |
| Paraswap v5 | ETH, Base           | REST API       |
| Uniswap V3  | ETH, Base (on-chain)| Quoter contract|
| Trisolaris  | Arc Network         | Simulated AMM  |
| ArcSwap/ArcBridge | Cross-chain   | Simulated      |

> API calls fall back to a simulated quote if the provider is unreachable,
> so the UI always shows a result.

## Supported Tokens

19 tokens across all chains: ETH, WETH, USDC, USDT, DAI, WBTC, UNI, LINK,
cbETH, AERO (Base), ARC (Arc Network).

## Wallet Support

Connects via **EIP-1193** (MetaMask, Coinbase Wallet, Rabby, etc.).
Auto-switches chains and requests approval if needed before swapping.
