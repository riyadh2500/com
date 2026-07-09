// ──────────────────────────────────────────────────────────────
// ArcSwap API — Express server with Groq AI + swap routing
// ──────────────────────────────────────────────────────────────
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { parseIntentHandler } from './routes/intent.js';
import { quoteHandler, swapHandler } from './routes/swap.js';
import { quoteTestnetHandler } from './routes/testnet.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──
app.use(cors());
app.use(express.json());

// ── Health check ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── AI Intent Parsing ──
// POST /api/parse-intent
// Body: { query: "swap 100 USDC to ETH on Base" }
// Returns: { fromToken, toToken, amount, chain }
app.post('/api/parse-intent', parseIntentHandler);

// ── Mainnet Swap (1inch) ──
// POST /api/quote
// Body: { fromToken, toToken, amount, chainId }
// Returns: { toAmount, route, priceImpact, estimatedGas }
app.post('/api/quote', quoteHandler);

// POST /api/swap
// Body: { fromToken, toToken, amount, slippage, from, chainId }
// Returns: { tx: { to, data, value, gas } }
app.post('/api/swap', swapHandler);

// ── Testnet Swap (Uniswap V3) ──
// POST /api/quote-testnet
// Body: { fromToken, toToken, amount, chainId }
// Returns: { toAmount, route, priceImpact }
app.post('/api/quote-testnet', quoteTestnetHandler);

// ── Error handler ──
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start ──
app.listen(PORT, () => {
  console.log(`✓ ArcSwap API running on http://localhost:${PORT}`);
  console.log(`✓ Groq API Key: ${process.env.GROQ_API_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`✓ 1inch API Key: ${process.env.ONEINCH_API_KEY ? '✓ Set' : '○ Optional'}`);
});
