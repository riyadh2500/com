# Rio AI Swap Platform

A complete multi-chain token swap platform with AI-powered natural language intent parsing.

## Features

✅ **AI Intent Parsing** — Natural language swap commands via Groq LLM  
✅ **Multi-Chain Support** — Ethereum, Base, Sepolia, Base Sepolia, Arc Testnet  
✅ **1inch Aggregation** — Best rates on mainnet via 1inch v6 API  
✅ **Uniswap V3** — Direct on-chain quotes and swaps for testnets  
✅ **Token Support** — ETH, WETH, USDC, USDT, DAI, EURC, WBTC, and more  
✅ **MetaMask Integration** — Connect wallet, auto-switch chains, approve tokens  

## Architecture

```
Rio.ai/swap-platform/
├── api/                          # Express backend
│   ├── server.js                 # Main server
│   ├── routes/
│   │   ├── intent.js            # Groq AI intent parsing
│   │   ├── swap.js              # 1inch mainnet proxy
│   │   └── testnet.js           # Uniswap V3 testnet quotes
│   └── .env                     # API keys
├── src/                          # Frontend
│   ├── main.js                  # Entry point
│   ├── config/
│   │   ├── chains.js            # Chain configs (6 chains)
│   │   └── tokens.js            # Token registry (40+ tokens)
│   ├── wallet/
│   │   └── walletManager.js     # MetaMask connection
│   ├── aggregator/
│   │   └── rateAggregator.js    # Quote fetching
│   ├── swap/
│   │   └── swapEngine.js        # Transaction building
│   └── ui/
│       ├── swapUI.js            # Main swap interface
│       └── tokenSelector.js     # Token picker modal
└── index.html                    # Single-page app
```

## Quick Start

### 1. Install Backend Dependencies

```bash
cd api
npm install
```

### 2. Configure API Keys

Create `api/.env` file:

```env
# Groq API Key (required) — Get from https://console.groq.com
GROQ_API_KEY=your_groq_api_key_here

# 1inch API Key (optional) — Get from https://portal.1inch.dev
ONEINCH_API_KEY=

# RPC URLs (defaults provided, customize if needed)
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network

PORT=3001
```

### 3. Start Backend API

```bash
cd api
npm start
```

Expected output:
```
✓ ArcSwap API running on http://localhost:3001
✓ Groq API Key: ✓ Set
✓ 1inch API Key: ○ Optional
```

### 4. Install Frontend Dependencies

```bash
cd ..  # Back to swap-platform root
npm install
```

### 5. Start Frontend

```bash
npm run dev
```

Opens: `http://localhost:5173`

## Testing the Platform

### Test 1: AI Intent Parsing

```bash
curl -X POST http://localhost:3001/api/parse-intent \
  -H "Content-Type: application/json" \
  -d '{"query": "swap 100 USDC to ETH on Sepolia"}'
```

Expected response:
```json
{
  "fromToken": "USDC",
  "toToken": "ETH",
  "amount": 100,
  "chain": "sepolia",
  "originalQuery": "swap 100 USDC to ETH on Sepolia"
}
```

### Test 2: Testnet Quote (Uniswap V3)

```bash
curl -X POST http://localhost:3001/api/quote-testnet \
  -H "Content-Type: application/json" \
  -d '{
    "fromToken": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "toToken": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "amount": "100",
    "chainId": 11155111
  }'
```

### Test 3: Mainnet Quote (1inch)

```bash
curl -X POST http://localhost:3001/api/quote \
  -H "Content-Type: application/json" \
  -d '{
    "fromToken": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "toToken": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    "amount": "1000000",
    "chainId": 1
  }'
```

### Test 4: Frontend Swap Flow

1. Open `http://localhost:5173`
2. Click **"Connect Wallet"** (MetaMask required)
3. Select tokens (e.g., ETH → USDC)
4. Enter amount (e.g., 0.01)
5. Review quote and route
6. Click **"Swap"**
7. Approve token if needed
8. Confirm transaction in MetaMask

## Supported Chains

| Chain | Chain ID | Network | RPC |
|-------|----------|---------|-----|
| Ethereum | 1 | Mainnet | `https://eth.llamarpc.com` |
| Base | 8453 | Mainnet | `https://mainnet.base.org` |
| Sepolia | 11155111 | Testnet | `https://ethereum-sepolia-rpc.publicnode.com` |
| Base Sepolia | 84532 | Testnet | `https://sepolia.base.org` |
| Arc Network | 1313161554 | Mainnet | `https://mainnet.aurora.dev` |
| Arc Testnet | 12345* | Testnet | `https://rpc.testnet.arc.network` |

*Arc Testnet chain ID is a placeholder — update when official testnet launches.

## Supported Tokens

### Ethereum Mainnet
- ETH, WETH, USDC, USDT, DAI, WBTC, UNI, LINK

### Base Mainnet
- ETH, WETH, USDC, DAI, cbETH, AERO

### Sepolia Testnet
- ETH, WETH, USDC, USDT, DAI, EURC

### Base Sepolia Testnet
- ETH, WETH, USDC, USDT, DAI, EURC

### Arc Testnet
- ARC, USDC, USDT, EURC

## API Endpoints

### POST `/api/parse-intent`
Parse natural language swap intent using Groq AI.

**Request:**
```json
{
  "query": "swap 100 USDC to ETH on Base"
}
```

**Response:**
```json
{
  "fromToken": "USDC",
  "toToken": "ETH",
  "amount": 100,
  "chain": "base",
  "originalQuery": "swap 100 USDC to ETH on Base"
}
```

### POST `/api/quote`
Get swap quote from 1inch (mainnet).

**Request:**
```json
{
  "fromToken": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "toToken": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  "amount": "1000000",
  "chainId": 1
}
```

### POST `/api/quote-testnet`
Get swap quote from Uniswap V3 (testnets).

**Request:**
```json
{
  "fromToken": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  "toToken": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
  "amount": "100",
  "chainId": 11155111
}
```

### POST `/api/swap`
Build swap transaction for 1inch (mainnet).

**Request:**
```json
{
  "fromToken": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "toToken": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  "amount": "1000000",
  "slippage": "1",
  "from": "0xYourAddress",
  "chainId": 1
}
```

## Troubleshooting

### Backend won't start
- Check Node.js version: `node --version` (requires v18+)
- Verify Groq API key in `.env`
- Check port 3001 is available

### Frontend can't fetch quotes
- Ensure backend is running on `http://localhost:3001`
- Check browser console for CORS errors
- Verify API endpoints return 200 status

### MetaMask not connecting
- Install MetaMask extension
- Unlock MetaMask
- Refresh page and try again

### No quotes returned
- For testnets: Uniswap pools may not exist for all pairs
- For mainnet: 1inch API rate limits may apply
- Fallback simulated quotes will always be shown

### Transaction fails
- Ensure sufficient token balance
- Check token approval was confirmed
- Verify correct chain is selected
- Increase slippage tolerance (Settings → Slippage)

## Development

### Project Structure
- **Backend** (`api/`): Express + Groq + 1inch + Uniswap V3
- **Frontend** (`src/`): Vanilla JS + ethers.js + Vite
- **No frameworks**: Pure JavaScript for simplicity

### Adding a New Chain

1. Add chain config to `src/config/chains.js`
2. Add tokens to `src/config/tokens.js`
3. Update backend RPC in `api/routes/testnet.js` (if testnet)
4. Test quote and swap flows

### Adding a New Token

1. Add token to `src/config/tokens.js`:
```javascript
{
  symbol: 'TOKEN',
  name: 'Token Name',
  decimals: 18,
  chain: 'ethereum',
  address: '0x...',
  color: 'linear-gradient(135deg,#...,#...)',
  coingeckoId: 'token-id',
  logoText: 'TOKEN'
}
```

2. Restart frontend: `npm run dev`

## License

MIT

## Credits

- **1inch** — DEX aggregation
- **Uniswap** — V3 protocol and testnet routing
- **Groq** — AI intent parsing via llama-3.3-70b
- **Circle** — USDC/EURC contracts
- **Vite** — Frontend tooling
- **ethers.js** — Ethereum interactions
