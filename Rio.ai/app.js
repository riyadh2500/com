// ── Rio AI — app.js ──
// API keys loaded from config.js (not committed to git)
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = 'openai/gpt-oss-120b';
const TAVILY_URL   = 'https://api.tavily.com/search';
const COINBASE_API   = 'https://api.coinbase.com/v2';

const CRYPTO_KEYWORDS = [
  'bitcoin','btc','ethereum','eth','solana','sol','bnb','xrp','ripple',
  'cardano','ada','dogecoin','doge','shiba','usdc','usdt','tether',
  'polygon','matic','avalanche','avax','chainlink','link','uniswap','uni',
  'litecoin','ltc','polkadot','dot','tron','trx','near','atom','cosmos',
  'crypto','coin','token','price','market cap','trading','exchange'
];

const SYSTEM_PROMPT = `You are Rio AI, a friendly and brilliant AI assistant with real-time web search and live crypto data from Coinbase.
- Always respond in simple, plain-text sentences. No markdown tables.
- Keep answers concise, direct, and warm.
- For crypto questions use the live Coinbase data provided.
- For other facts use the web search results provided.
- Cite sources as plain links at the end.
- For code use a code block with a one-line explanation.
- Never use filler phrases. Just answer.`;

// ── State ──
let conversationHistory = [];
let isLoading = false;
let currentSessionId = null;
let currentUser = null;
let authMode = 'signin';

// ── DOM helper ──
const $ = id => document.getElementById(id);

// ════════════════════════════════════════
// CHAT CORE
// ════════════════════════════════════════

function handleHeroKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendHeroMessage(); }
}

function sendHeroMessage() {
  const input = $('heroInput');
  const text = input.value.trim();
  if (!text) return;
  openChat(text);
  input.value = '';
  autoResize(input);
}

function openChat(initialMessage = '') {
  $('chatOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
  if (!currentSessionId) startNewSession();
  if (initialMessage) {
    $('chatInput').value = initialMessage;
    autoResize($('chatInput'));
    setTimeout(() => sendChatMessage(), 100);
  } else {
    setTimeout(() => $('chatInput').focus(), 50);
  }
}

function closeChat() {
  $('chatOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

function newChat() {
  startNewSession();
  $('chatInput').focus();
}

function startNewSession() {
  conversationHistory = [];
  currentSessionId = Date.now().toString();
  const area = $('messagesArea');
  area.innerHTML = '';
  area.appendChild(createWelcomeMsg());
  $('chatTitle').textContent = 'New conversation';
  $('chatInput').value = '';
  autoResize($('chatInput'));
}

function createWelcomeMsg() {
  const div = document.createElement('div');
  div.id = 'welcomeMsg';
  div.className = 'welcome-msg';
  div.innerHTML = `
    <div class="welcome-icon">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="url(#wGrad2)"/>
        <path d="M8 12.5l3 3 5-6" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <defs>
          <linearGradient id="wGrad2" x1="0" y1="0" x2="24" y2="24">
            <stop offset="0%" stop-color="#a78bfa"/>
            <stop offset="100%" stop-color="#f472b6"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
    <h2>Hi, I'm Rio AI</h2>
    <p>Ask me anything — I can help you build apps, write code, answer questions, and more.</p>`;
  return div;
}

function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
}

async function sendChatMessage() {
  const input = $('chatInput');
  const text = input.value.trim();
  if (!text || isLoading) return;

  const welcome = $('welcomeMsg');
  if (welcome) welcome.remove();

  const titleEl = $('chatTitle');
  if (titleEl.textContent === 'New conversation') {
    titleEl.textContent = text.length > 50 ? text.slice(0, 50) + '…' : text;
    addToHistory(text);
  }

  appendMessage('user', text);
  input.value = '';
  autoResize(input);
  conversationHistory.push({ role: 'user', content: text });

  const typingEl = showTyping();
  isLoading = true;
  $('chatSendBtn').disabled = true;

  try {
    const reply = await callGroqWithSearch(conversationHistory);
    typingEl.remove();
    appendMessage('ai', reply);
    conversationHistory.push({ role: 'assistant', content: reply });
  } catch (err) {
    typingEl.remove();
    appendMessage('ai', `Sorry, I ran into an error: ${err.message}\n\nPlease try again.`);
    console.error('Rio AI error:', err);
  } finally {
    isLoading = false;
    $('chatSendBtn').disabled = false;
    input.focus();
  }
}

// ════════════════════════════════════════
// SEARCH + CRYPTO PIPELINE
// ════════════════════════════════════════

async function callGroqWithSearch(history) {
  const lastMsg = history[history.length - 1]?.content ?? '';
  const needsCrypto = CRYPTO_KEYWORDS.some(k => lastMsg.toLowerCase().includes(k));

  // Update typing bubble
  const bubble = document.querySelector('.typing-bubble');
  if (bubble) {
    bubble.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;color:#a78bfa">
        <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
        <path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <span style="font-size:.8rem;color:#a1a1aa;margin-left:6px">
        ${needsCrypto ? 'Fetching live crypto data...' : 'Searching the web...'}
      </span>`;
  }

  const [webResults, cryptoData] = await Promise.all([
    tavilySearch(lastMsg),
    needsCrypto ? getCryptoData(lastMsg) : null
  ]);

  let dataBlock = '';
  if (cryptoData) dataBlock += `[LIVE CRYPTO DATA - ${new Date().toUTCString()}]\n${cryptoData}\n[END CRYPTO DATA]\n\n`;
  if (webResults) dataBlock += `[WEB SEARCH RESULTS - ${new Date().toUTCString()}]\n${webResults}\n[END SEARCH RESULTS]\n\n`;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
    {
      role: 'user',
      content: dataBlock
        ? `${lastMsg}\n\n${dataBlock}Use the data above to answer. Cite sources as plain links.`
        : lastMsg
    }
  ];

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({ model: GROQ_MODEL, messages, max_tokens: 2048, temperature: 0.7 })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'No response received.';
}

async function tavilySearch(query) {
  if (!TAVILY_API_KEY || TAVILY_API_KEY.includes('REPLACE')) return null;
  try {
    const res = await fetch(TAVILY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: 'basic',
        include_answer: true,
        include_raw_content: false,
        max_results: 4
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    let out = '';
    if (data.answer) out += `Summary: ${data.answer}\n\n`;
    if (data.results?.length) {
      out += data.results.map((r, i) =>
        `[${i+1}] ${r.title}\nURL: ${r.url}\n${r.content?.slice(0, 250)}...`
      ).join('\n\n');
    }
    return out || null;
  } catch { return null; }
}

async function getCryptoData(query) {
  const coinMap = {
    'bitcoin':'BTC','btc':'BTC','ethereum':'ETH','eth':'ETH',
    'solana':'SOL','sol':'SOL','dogecoin':'DOGE','doge':'DOGE',
    'cardano':'ADA','ada':'ADA','xrp':'XRP','ripple':'XRP',
    'bnb':'BNB','polygon':'MATIC','matic':'MATIC',
    'avalanche':'AVAX','avax':'AVAX','chainlink':'LINK','link':'LINK',
    'litecoin':'LTC','ltc':'LTC','shiba':'SHIB',
    'uniswap':'UNI','uni':'UNI','polkadot':'DOT','dot':'DOT',
    'near':'NEAR','atom':'ATOM','cosmos':'ATOM','tron':'TRX','trx':'TRX',
    'usdc':'USDC','usdt':'USDT','tether':'USDT',
  };
  const lower = query.toLowerCase();
  let coins = [];
  for (const [k, v] of Object.entries(coinMap)) {
    if (lower.includes(k) && !coins.includes(v)) coins.push(v);
  }
  if (!coins.length) coins = ['BTC','ETH','SOL','BNB','XRP'];

  const results = await Promise.allSettled(coins.map(async symbol => {
    try {
      const [spotRes, statsRes] = await Promise.all([
        fetch(`${COINBASE_API}/prices/${symbol}-USD/spot`),
        fetch(`https://api.exchange.coinbase.com/products/${symbol}-USD/stats`)
      ]);
      const spot  = spotRes.ok  ? await spotRes.json()  : null;
      const stats = statsRes.ok ? await statsRes.json() : null;
      const price = spot?.data?.amount ? parseFloat(spot.data.amount) : null;
      if (!price) return null;
      const open = stats?.open ? parseFloat(stats.open) : null;
      const chg  = open ? ((price - open) / open * 100).toFixed(2) : null;
      return [
        `${symbol}/USD: $${price.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`,
        chg  ? `  24h Change: ${chg > 0 ? '+' : ''}${chg}%` : '',
        stats?.high ? `  24h High: $${parseFloat(stats.high).toLocaleString('en-US',{minimumFractionDigits:2})}` : '',
        stats?.low  ? `  24h Low:  $${parseFloat(stats.low).toLocaleString('en-US',{minimumFractionDigits:2})}` : '',
        `  Source: coinbase.com`,
      ].filter(Boolean).join('\n');
    } catch { return null; }
  }));

  const lines = results.filter(r => r.status==='fulfilled' && r.value).map(r => r.value).join('\n\n');
  return lines || null;
}

// ════════════════════════════════════════
// MESSAGE RENDERING
// ════════════════════════════════════════

function appendMessage(role, text) {
  const area = $('messagesArea');
  const wrapper = document.createElement('div');
  wrapper.className = `message ${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = role === 'user' ? 'U' : 'R';

  const content = document.createElement('div');
  content.className = 'msg-content';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.innerHTML = formatMessage(text);

  const time = document.createElement('div');
  time.className = 'msg-time';
  time.textContent = getTime();

  content.appendChild(bubble);
  content.appendChild(time);
  wrapper.appendChild(avatar);
  wrapper.appendChild(content);
  area.appendChild(wrapper);
  scrollToBottom(area);
}

function showTyping() {
  const area = $('messagesArea');
  const wrapper = document.createElement('div');
  wrapper.className = 'typing-indicator';
  wrapper.innerHTML = `
    <div class="msg-avatar" style="background:linear-gradient(135deg,rgba(167,139,250,.2),rgba(244,114,182,.2));border:1px solid rgba(167,139,250,.3);color:#a78bfa;font-size:.8rem">R</div>
    <div class="typing-bubble">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>`;
  area.appendChild(wrapper);
  scrollToBottom(area);
  return wrapper;
}

function formatMessage(text) {
  let html = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code class="language-${lang||'text'}">${code.trim()}</code></pre>`);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/^### (.+)$/gm, '<h4 style="margin:12px 0 6px;font-size:.95rem">$1</h4>');
  html = html.replace(/^## (.+)$/gm,  '<h3 style="margin:12px 0 6px;font-size:1rem">$1</h3>');
  html = html.replace(/^# (.+)$/gm,   '<h2 style="margin:12px 0 6px;font-size:1.1rem">$1</h2>');
  html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  return html.split('\n\n').map(block => {
    if (block.startsWith('<')) return block;
    return `<p>${block.replace(/\n/g,'<br>')}</p>`;
  }).join('');
}

function addToHistory(text) {
  const sidebar = $('sidebarHistory');
  const existing = sidebar.querySelectorAll('.history-item');
  const item = document.createElement('div');
  item.className = 'history-item active';
  item.textContent = text.length > 38 ? text.slice(0,38) + '…' : text;
  item.dataset.sessionId = currentSessionId;
  existing.forEach(el => el.classList.remove('active'));
  const label = sidebar.querySelector('.history-label');
  label ? label.insertAdjacentElement('afterend', item) : sidebar.appendChild(item);
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}

function scrollToBottom(el) { el.scrollTop = el.scrollHeight; }

function getTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ════════════════════════════════════════
// AUTH / LOGIN
// ════════════════════════════════════════

function openLoginModal() {
  $('loginModal').classList.add('active');
  $('loginBackdrop').classList.add('active');
  document.body.style.overflow = 'hidden';
  setAuthMode('signin');
}

function closeLoginModal() {
  $('loginModal').classList.remove('active');
  $('loginBackdrop').classList.remove('active');
  document.body.style.overflow = '';
  hideAuthError();
}

function toggleAuthMode() {
  setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
}

function setAuthMode(mode) {
  authMode = mode;
  const s = mode === 'signup';
  $('loginTitle').textContent     = s ? 'Create account'       : 'Welcome back';
  $('loginSubtitle').textContent  = s ? 'Join Rio AI for free' : 'Sign in to save your chats';
  $('authSubmitBtn').textContent  = s ? 'Create Account'       : 'Sign In';
  $('confirmField').style.display = s ? 'block' : 'none';
  $('toggleText').textContent     = s ? 'Already have an account?' : "Don't have an account?";
  $('toggleBtn').textContent      = s ? 'Sign In' : 'Sign Up';
  $('authConfirm').required       = s;
  hideAuthError();
}

async function submitAuthForm(e) {
  e.preventDefault();
  const email    = $('authEmail').value.trim();
  const password = $('authPassword').value;
  const confirm  = $('authConfirm').value;

  if (password.length < 6) { showAuthError('Password must be at least 6 characters.'); return; }
  if (authMode === 'signup' && password !== confirm) { showAuthError('Passwords do not match.'); return; }

  const btn = $('authSubmitBtn');
  btn.disabled = true;
  btn.textContent = authMode === 'signup' ? 'Creating account...' : 'Signing in...';

  setTimeout(() => {
    setLoggedIn({ name: email.split('@')[0], email, avatar: email[0].toUpperCase() });
    btn.disabled = false;
    btn.textContent = authMode === 'signup' ? 'Create Account' : 'Sign In';
  }, 700);
}

function showAuthError(msg) {
  const el = $('authError');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(hideAuthError, 4000);
}

function hideAuthError() {
  const el = $('authError');
  if (el) el.style.display = 'none';
}

function setLoggedIn(user) {
  currentUser = user;
  closeLoginModal();
  const btn = $('signInBtn');
  if (btn) {
    btn.innerHTML = `
      <div style="width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#a78bfa,#34d399);display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;color:#fff;flex-shrink:0">${user.avatar}</div>
      <span style="margin-left:7px">${user.name}</span>`;
    btn.onclick = openProfileMenu;
    btn.style.padding = '5px 14px 5px 7px';
  }
  const av = $('sidebarAvatar'); if (av) av.textContent = user.avatar;
  const nm = $('sidebarName');   if (nm) nm.textContent = user.name;
  showToast(`Signed in as ${user.name}`);
}

function openProfileMenu() {
  if (confirm(`Signed in as ${currentUser?.email}\n\nSign out?`)) {
    currentUser = null;
    const btn = $('signInBtn');
    if (btn) {
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/></svg> Sign In`;
      btn.onclick = openLoginModal;
      btn.style.padding = '';
    }
    const av = $('sidebarAvatar'); if (av) av.textContent = 'U';
    const nm = $('sidebarName');   if (nm) nm.textContent = 'Guest';
    showToast('Signed out');
  }
}

// ════════════════════════════════════════
// TOAST
// ════════════════════════════════════════

function showToast(message, isError = false) {
  const toast = $('appToast');
  const text  = $('appToastText');
  if (!toast || !text) return;
  text.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}

// ════════════════════════════════════════
// GLOBAL EVENTS
// ════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  const ci = $('chatInput');
  if (ci) ci.addEventListener('input', function() {
    const cc = $('charCount');
    if (cc) cc.textContent = this.value.length > 0 ? this.value.length : '';
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if ($('chatOverlay')?.classList.contains('active')) closeChat();
  if ($('loginModal')?.classList.contains('active'))  closeLoginModal();
});
