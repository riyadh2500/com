// ── Rio AI — app.js ──
// API — Morph LLM (morph-dsv4flash)
const CHAT_API_URL_DIRECT = 'https://api.morphllm.com/v1/chat/completions';
const CHAT_MODEL = 'morph-dsv4flash';
// Key loaded from config.js — falls back to empty
const CHAT_API_KEY = (typeof MORPH_API_KEY !== 'undefined' && MORPH_API_KEY) ? MORPH_API_KEY : '';

// Tavily optional - only used if config.js provides TAVILY_API_KEY
if (typeof TAVILY_API_KEY === 'undefined') { var TAVILY_API_KEY = ''; }
if (typeof GROQ_API_KEY === 'undefined') { var GROQ_API_KEY = ''; }
const TAVILY_URL   = 'https://api.tavily.com/search';
const COINBASE_API = 'https://api.coinbase.com/v2';

// ── Supabase ──
const SUPABASE_URL  = 'https://krqnzzhcxaroeffzqoox.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtycW56emhjeGFyb2VmZnpxb294Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0OTA2NDgsImV4cCI6MjA5OTA2NjY0OH0.O1XsHcYuYz3XG61vsBD8-HoF_NU7IbD-DKAwYKnJsqM';
const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);


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
- Never include URLs, links, or source citations in your replies.
- For code use a code block with a one-line explanation.
- Never use filler phrases. Just answer.`;

// ── State ──
let conversationHistory = [];
let isLoading          = false;
let currentSessionId   = null;
let currentUser        = null;
let authMode           = 'signin';

const $ = id => document.getElementById(id);

// ════════════════════════════════════════
// SUPABASE — AUTH
// ════════════════════════════════════════

async function sbSignUp(email, password) {
  const { data, error } = await _sb.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

async function sbSignIn(email, password) {
  const { data, error } = await _sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

async function sbSignOut() {
  await _sb.auth.signOut();
}

async function sbGetSession() {
  const { data } = await _sb.auth.getSession();
  return data?.session || null;
}

// ════════════════════════════════════════
// SUPABASE — DB (chat persistence)
// ════════════════════════════════════════

async function dbSaveSession(id, title) {
  const { data: { user } } = await _sb.auth.getUser();
  if (!user) return;
  await _sb.from('chat_sessions').upsert({ id, user_id: user.id, title });
}

async function dbSaveMessage(sessionId, role, content) {
  const { data: { user } } = await _sb.auth.getUser();
  if (!user) return;
  await _sb.from('messages').insert({ session_id: sessionId, user_id: user.id, role, content });
}

async function dbLoadSessions() {
  const { data: { user } } = await _sb.auth.getUser();
  if (!user) return [];
  const { data } = await _sb.from('chat_sessions')
    .select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30);
  return data || [];
}

async function dbLoadMessages(sessionId) {
  const { data } = await _sb.from('messages')
    .select('*').eq('session_id', sessionId).order('created_at', { ascending: true });
  return data || [];
}

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

function newChat() { startNewSession(); $('chatInput').focus(); }

function startNewSession() {
  conversationHistory = [];
  currentSessionId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
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
      <img src="logo.png" alt="Rio AI" width="52" height="52" style="border-radius:14px;object-fit:cover;display:block" />
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
  const isNew = titleEl.textContent === 'New conversation';
  if (isNew) {
    const title = text.length > 50 ? text.slice(0, 50) + '…' : text;
    titleEl.textContent = title;
    addToSidebar(title, currentSessionId);
    dbSaveSession(currentSessionId, title);
  }

  appendMessage('user', text);
  input.value = '';
  autoResize(input);
  conversationHistory.push({ role: 'user', content: text });
  dbSaveMessage(currentSessionId, 'user', text);

  const typingEl = showTyping();
  isLoading = true;
  $('chatSendBtn').disabled = true;

  try {
    const reply = await callGroqWithSearch(conversationHistory);
    typingEl.remove();
    appendMessage('ai', reply);
    conversationHistory.push({ role: 'assistant', content: reply });
    dbSaveMessage(currentSessionId, 'assistant', reply);
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
// GROQ + SEARCH + CRYPTO
// ════════════════════════════════════════

async function callGroqWithSearch(history) {
  const lastText = history[history.length - 1]?.content || '';
  const needsCrypto = CRYPTO_KEYWORDS.some(k => lastText.toLowerCase().includes(k));


  const [webResults, cryptoData] = await Promise.all([
    tavilySearch(lastText),
    needsCrypto ? getCryptoData(lastText) : null
  ]);

  let dataBlock = '';
  if (cryptoData) dataBlock += `[LIVE CRYPTO DATA]\n${cryptoData}\n\n`;
  if (webResults) dataBlock += `[WEB SEARCH RESULTS]\n${webResults}\n\n`;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(0, -1),
    { role: 'user', content: dataBlock ? `${lastText}\n\n${dataBlock}Use the data above to answer.` : lastText }
  ];

  const res = await fetch(CHAT_API_URL_DIRECT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CHAT_API_KEY}`
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages,
      max_tokens: 2048,
      temperature: 0.7
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'No response received.';
}

async function tavilySearch(query) {
  // Tavily search disabled if no API key
  if (typeof TAVILY_API_KEY === 'undefined' || !TAVILY_API_KEY || TAVILY_API_KEY.includes('REPLACE')) return null;
  try {
    const res = await fetch(TAVILY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: TAVILY_API_KEY, query, search_depth: 'basic', include_answer: true, max_results: 4 })
    });
    if (!res.ok) return null;
    const data = await res.json();
    let out = '';
    if (data.answer) out += `Summary: ${data.answer}\n\n`;
    if (data.results?.length) out += data.results.map((r,i) => `[${i+1}] ${r.title}\n${r.content?.slice(0,250)}...`).join('\n\n');
    return out || null;
  } catch { return null; }
}

async function getCryptoData(query) {
  const coinMap = {
    'bitcoin':'BTC','btc':'BTC','ethereum':'ETH','eth':'ETH','solana':'SOL','sol':'SOL',
    'dogecoin':'DOGE','doge':'DOGE','cardano':'ADA','ada':'ADA','xrp':'XRP','ripple':'XRP',
    'bnb':'BNB','polygon':'MATIC','matic':'MATIC','avalanche':'AVAX','avax':'AVAX',
    'chainlink':'LINK','link':'LINK','litecoin':'LTC','ltc':'LTC','shiba':'SHIB',
    'uniswap':'UNI','uni':'UNI','polkadot':'DOT','dot':'DOT','near':'NEAR',
    'atom':'ATOM','cosmos':'ATOM','tron':'TRX','trx':'TRX','usdc':'USDC','usdt':'USDT','tether':'USDT',
  };
  const lower = query.toLowerCase();
  let coins = [];
  for (const [k,v] of Object.entries(coinMap)) if (lower.includes(k) && !coins.includes(v)) coins.push(v);
  if (!coins.length) coins = ['BTC','ETH','SOL','BNB','XRP'];

  const results = await Promise.allSettled(coins.map(async symbol => {
    try {
      const [s, st] = await Promise.all([
        fetch(`${COINBASE_API}/prices/${symbol}-USD/spot`),
        fetch(`https://api.exchange.coinbase.com/products/${symbol}-USD/stats`)
      ]);
      const spot  = s.ok  ? await s.json()  : null;
      const stats = st.ok ? await st.json() : null;
      const price = spot?.data?.amount ? parseFloat(spot.data.amount) : null;
      if (!price) return null;
      const open = stats?.open ? parseFloat(stats.open) : null;
      const chg  = open ? ((price-open)/open*100).toFixed(2) : null;
      return [
        `${symbol}/USD: $${price.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`,
        chg ? `  24h Change: ${chg>0?'+':''}${chg}%` : '',
        stats?.high ? `  24h High: $${parseFloat(stats.high).toLocaleString('en-US',{minimumFractionDigits:2})}` : '',
        stats?.low  ? `  24h Low:  $${parseFloat(stats.low).toLocaleString('en-US',{minimumFractionDigits:2})}` : '',
      ].filter(Boolean).join('\n');
    } catch { return null; }
  }));
  return results.filter(r=>r.status==='fulfilled'&&r.value).map(r=>r.value).join('\n\n') || null;
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
  avatar.textContent = role === 'user' ? (currentUser?.avatar || 'U') : 'R';
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
      <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
    </div>`;
  area.appendChild(wrapper);
  scrollToBottom(area);
  return wrapper;
}

function formatMessage(text) {
  if(!window._codeStore) window._codeStore = {};
  let html = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_,lang,code) => {
    const raw = code.trim();
    const escaped = raw.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const ext = {'js':'js','javascript':'js','html':'html','css':'css','python':'py','py':'py','ts':'ts','typescript':'ts','json':'json','jsx':'jsx','tsx':'tsx','bash':'sh','sh':'sh','sql':'sql'}[(lang||'').toLowerCase()]||'txt';
    const id = 'cb'+ Math.random().toString(36).slice(2,10);
    window._codeStore[id] = {code: raw, ext: ext};
    return `<div class="code-block-wrap">
      <div class="code-block-header">
        <span class="code-lang">${lang||'code'}</span>
        <div class="code-actions">
          <button class="code-btn" onclick="(function(btn){navigator.clipboard.writeText(window._codeStore['${id}'].code).then(()=>{btn.textContent='Copied!';setTimeout(()=>btn.textContent='Copy',1500)});})(this)">Copy</button>
          <button class="code-btn code-dl-btn" onclick="downloadCode('${id}')">⬇ Download</button>
        </div>
      </div>
      <pre><code id="${id}" class="language-${lang||'text'}">${escaped}</code></pre>
    </div>`;
  });
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/^### (.+)$/gm, '<h4 style="margin:12px 0 6px;font-size:.95rem">$1</h4>');
  html = html.replace(/^## (.+)$/gm,  '<h3 style="margin:12px 0 6px;font-size:1rem">$1</h3>');
  html = html.replace(/^# (.+)$/gm,   '<h2 style="margin:12px 0 6px;font-size:1.1rem">$1</h2>');
  html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  return html.split('\n\n').map(block => block.startsWith('<') ? block : `<p>${block.replace(/\n/g,'<br>')}</p>`).join('');
}

function downloadCode(id) {
  var store = window._codeStore && window._codeStore[id];
  if (!store) return;
  var blob = new Blob([store.code], {type: 'text/plain'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'code.' + store.ext;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
}

function scrollToBottom(el) { el.scrollTop = el.scrollHeight; }
function getTime() { return new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); }
function autoResize(el) { el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,200)+'px'; }

// ════════════════════════════════════════
// SIDEBAR HISTORY
// ════════════════════════════════════════

function addToSidebar(title, sessionId) {
  const sidebar = $('sidebarHistory');
  sidebar.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
  const item = document.createElement('div');
  item.className = 'history-item active';
  item.textContent = title.length > 38 ? title.slice(0,38)+'…' : title;
  item.dataset.sessionId = sessionId;
  item.addEventListener('click', () => loadSession(sessionId, title, item));
  const label = sidebar.querySelector('.history-label');
  label ? label.insertAdjacentElement('afterend', item) : sidebar.appendChild(item);
}

async function loadSession(sessionId, title, itemEl) {
  currentSessionId = sessionId;
  conversationHistory = [];
  const area = $('messagesArea');
  area.innerHTML = '';
  $('chatTitle').textContent = title;
  document.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
  if (itemEl) itemEl.classList.add('active');
  const msgs = await dbLoadMessages(sessionId);
  if (!msgs.length) { area.appendChild(createWelcomeMsg()); return; }
  msgs.forEach(m => {
    appendMessage(m.role === 'assistant' ? 'ai' : 'user', m.content);
    conversationHistory.push({ role: m.role, content: m.content });
  });
}

async function renderSidebarHistory() {
  const sessions = await dbLoadSessions();
  const sidebar = $('sidebarHistory');
  sidebar.querySelectorAll('.history-item').forEach(el => el.remove());
  sessions.forEach(s => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.textContent = s.title.length > 38 ? s.title.slice(0,38)+'…' : s.title;
    item.dataset.sessionId = s.id;
    item.addEventListener('click', () => loadSession(s.id, s.title, item));
    $('sidebarHistory').appendChild(item);
  });
}

// ════════════════════════════════════════
// AUTH UI
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

function toggleAuthMode() { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); }

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

  try {
    let session;
    if (authMode === 'signup') {
      const data = await sbSignUp(email, password);
      session = data.session;
      if (!session) {
        showAuthError('Check your email to confirm your account, then sign in.');
        btn.disabled = false;
        btn.textContent = 'Create Account';
        return;
      }
    } else {
      const data = await sbSignIn(email, password);
      session = data.session;
    }
    const user = session.user;
    const name = user.user_metadata?.name || email.split('@')[0];
    applyLoggedIn({ name, email: user.email, avatar: name[0].toUpperCase(), id: user.id });
  } catch (err) {
    showAuthError(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = authMode === 'signup' ? 'Create Account' : 'Sign In';
  }
}

async function applyLoggedIn(user) {
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
  const sb = $('sidebarSignInBtn'); if (sb) sb.classList.add('hidden');
  showToast(`Signed in as ${user.name}`);
  await renderSidebarHistory();
}

async function openProfileMenu() {
  if (!confirm(`Signed in as ${currentUser?.email}\n\nSign out?`)) return;
  await sbSignOut();
  currentUser = null;
  const btn = $('signInBtn');
  if (btn) {
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/></svg> Sign In`;
    btn.onclick = openLoginModal;
    btn.style.padding = '';
  }
  const av = $('sidebarAvatar'); if (av) av.textContent = 'U';
  const nm = $('sidebarName');   if (nm) nm.textContent = 'Guest';
  const sb = $('sidebarSignInBtn'); if (sb) sb.classList.remove('hidden');
  $('sidebarHistory').querySelectorAll('.history-item').forEach(el => el.remove());
  showToast('Signed out');
}

function showAuthError(msg) {
  const el = $('authError'); if (!el) return;
  el.textContent = msg; el.style.display = 'block';
  setTimeout(hideAuthError, 5000);
}
function hideAuthError() { const el = $('authError'); if (el) el.style.display = 'none'; }

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
// INIT
// ════════════════════════════════════════

async function init() {
  // Restore session from Supabase (persisted in localStorage automatically by SDK)
  const session = await sbGetSession();
  if (session?.user) {
    const u    = session.user;
    const name = u.user_metadata?.name || u.email.split('@')[0];
    currentUser = { name, email: u.email, avatar: name[0].toUpperCase(), id: u.id };
    const btn = $('signInBtn');
    if (btn) {
      btn.innerHTML = `
        <div style="width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#a78bfa,#34d399);display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;color:#fff;flex-shrink:0">${currentUser.avatar}</div>
        <span style="margin-left:7px">${currentUser.name}</span>`;
      btn.onclick = openProfileMenu;
      btn.style.padding = '5px 14px 5px 7px';
    }
    const av = $('sidebarAvatar'); if (av) av.textContent = currentUser.avatar;
    const nm = $('sidebarName');   if (nm) nm.textContent = currentUser.name;
    const sb = $('sidebarSignInBtn'); if (sb) sb.classList.add('hidden');
    await renderSidebarHistory();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  init();
  const ci = $('chatInput');
  if (ci) ci.addEventListener('input', function() {
    const cc = $('charCount');
    if (cc) cc.textContent = this.value.length > 0 ? this.value.length : '';
  });
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if ($('chatOverlay')?.classList.contains('active')) closeChat();
  if ($('loginModal')?.classList.contains('active'))  closeLoginModal();
});
