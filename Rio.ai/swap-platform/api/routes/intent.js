// ──────────────────────────────────────────────────────────────
// AI Intent Parsing — Groq LLM extracts swap parameters from text
// ──────────────────────────────────────────────────────────────
import axios from 'axios';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile'; // Fast and accurate for structured extraction

const SYSTEM_PROMPT = `You are a crypto swap intent parser. Extract structured swap parameters from natural language.

SUPPORTED CHAINS:
- ethereum, eth, mainnet → "ethereum"
- base, base-mainnet → "base"
- arc, arc-network → "arc"
- sepolia, eth-sepolia → "sepolia"
- base-sepolia → "base-sepolia"
- arc-testnet → "arc-testnet"

SUPPORTED TOKENS:
- ETH, WETH, USDC, USDT, DAI, WBTC, UNI, LINK, EURC, cbETH, AERO, ARC

OUTPUT RULES:
- Always return valid JSON with: { "fromToken": "SYMBOL", "toToken": "SYMBOL", "amount": number, "chain": "chain-key" }
- If no chain specified, use "ethereum"
- If amount is missing, return null
- Token symbols must be uppercase
- Chain keys must be lowercase
- If query is unclear or not a swap request, return { "error": "message" }

EXAMPLES:
Input: "swap 100 USDC to ETH"
Output: {"fromToken":"USDC","toToken":"ETH","amount":100,"chain":"ethereum"}

Input: "exchange 50 USDT for DAI on Base"
Output: {"fromToken":"USDT","toToken":"DAI","amount":50,"chain":"base"}

Input: "buy 1 ETH with USDC on Sepolia testnet"
Output: {"fromToken":"USDC","toToken":"ETH","amount":null,"chain":"sepolia"}

Input: "what's the weather"
Output: {"error":"Not a swap request"}`;

export async function parseIntentHandler(req, res) {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
    }

    console.log(`[Intent] Parsing: "${query}"`);

    // Call Groq API
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: query }
        ],
        temperature: 0.1,
        max_tokens: 256,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        timeout: 15000
      }
    );

    const content = response.data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No response from Groq');
    }

    const parsed = JSON.parse(content);
    console.log(`[Intent] Parsed:`, parsed);

    // Validate output
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    if (!parsed.fromToken || !parsed.toToken) {
      return res.status(400).json({ error: 'Could not extract tokens from query' });
    }

    // Return structured intent
    res.json({
      fromToken: parsed.fromToken.toUpperCase(),
      toToken: parsed.toToken.toUpperCase(),
      amount: parsed.amount,
      chain: parsed.chain || 'ethereum',
      originalQuery: query
    });

  } catch (error) {
    console.error('[Intent] Error:', error.message);
    
    if (error.response?.status === 401) {
      return res.status(500).json({ error: 'Invalid Groq API key' });
    }
    
    if (error.response?.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again in a moment.' });
    }

    res.status(500).json({ 
      error: 'Failed to parse intent', 
      details: error.message 
    });
  }
}
