// Vercel serverless function — proxies browser requests to Morph API
// Fixes CORS: browser calls /api/chat (same origin), this calls morphllm.com server-side

const MORPH_API_KEY = 'sk-CIYHR9-_COO4ZpHsCBAODo4q0mhZW-RXFjR8S_XDQxf0ZEVK';
const MORPH_URL     = 'https://api.morphllm.com/v1/chat/completions';

export default async function handler(req, res) {
  // CORS headers so any origin can call this
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    const upstream = await fetch(MORPH_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${MORPH_API_KEY}`,
      },
      body,
    });

    const data = await upstream.json();
    return res.status(upstream.status).json(data);

  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
}
