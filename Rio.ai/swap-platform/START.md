# 🚀 Quick Start Guide

## Prerequisites
- Node.js v18+ installed
- MetaMask browser extension
- Groq API key (free at https://console.groq.com)

## Setup (5 minutes)

### Step 1: Install API Dependencies
```bash
cd Rio.ai/swap-platform/api
npm install
```

### Step 2: Add Groq API Key
Edit `api/.env` and add your key:
```env
GROQ_API_KEY=your_groq_key_here
```

### Step 3: Start Backend
```bash
npm start
```
Keep this terminal open. You should see:
```
✓ ArcSwap API running on http://localhost:3001
```

### Step 4: Install Frontend Dependencies
Open a NEW terminal:
```bash
cd Rio.ai/swap-platform
npm install
```

### Step 5: Start Frontend
```bash
npm run dev
```
Opens browser at `http://localhost:5173`

## Test It Out

### Test 1: AI Intent Parsing
In browser console:
```javascript
fetch('http://localhost:3001/api/parse-intent', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({query: 'swap 100 USDC to ETH on Sepolia'})
}).then(r => r.json()).then(console.log)
```

### Test 2: Connect Wallet & Swap
1. Click **Connect Wallet** button
2. Approve MetaMask connection
3. Select **Sepolia** testnet (or any chain)
4. Pick tokens: **USDC → ETH**
5. Enter amount: **10**
6. Review quote
7. Click **Swap**

## Supported Natural Language Commands

Try these queries with `/api/parse-intent`:
- "swap 100 USDC to ETH"
- "exchange 50 USDT for DAI on Base"
- "buy 1 ETH with USDC on Sepolia testnet"
- "trade 100 EURC to USDT on Base Sepolia"

## Need Help?

### Backend Issues
- Port already in use? Change `PORT=3002` in `.env`
- Groq API error? Check your API key at https://console.groq.com

### Frontend Issues
- Can't connect wallet? Install MetaMask: https://metamask.io
- No quotes? Check backend is running on port 3001
- CORS error? Restart backend

### Get Testnet Tokens
- **Sepolia ETH**: https://sepoliafaucet.com
- **Base Sepolia ETH**: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
- **Testnet USDC**: Use Uniswap faucet or bridge

## What's Next?

✅ Test AI parsing with different queries  
✅ Try swapping on different chains  
✅ Compare mainnet vs testnet routes  
✅ Add your own tokens to the registry  
✅ Deploy to production with your own API keys  

---

**Full documentation**: See `README.md`  
**API reference**: `api/routes/` folder  
**Frontend code**: `src/` folder
