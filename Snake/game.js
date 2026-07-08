'use strict';

// ── Config ───────────────────────────────────────────────────────────
const COLS        = 20;
const ROWS        = 20;
const TICK_MS     = 130;   // ms per step at start
const TICK_MIN    = 70;    // fastest tick
const SPEED_EVERY = 5;     // speed up every N apples

const BG_COLOR    = '#F5C59F';
const GRID_COLOR  = 'rgba(58,42,26,.06)';
const SNAKE_HEAD  = '#3a2a1a';
const SNAKE_BODY  = '#5a3e28';
const FOOD_COLOR  = '#C4956A';
const FOOD_GLOW   = 'rgba(196,149,106,.5)';

// ── State ────────────────────────────────────────────────────────────
let canvas, ctx, W, H, CELL;
let snake, dir, nextDir, food, score, best = 0;
let tickTimer, lastTick, tickMs;
let state = 'idle';
let raf;

// Swipe tracking
let swipeX0 = null, swipeY0 = null;

// ── Boot ─────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  canvas = document.getElementById('canvas');
  ctx    = canvas.getContext('2d');

  document.getElementById('start-btn').addEventListener('click', startGame);
  document.getElementById('restart-btn').addEventListener('click', startGame);

  // D-pad buttons
  const dirs = { 'btn-up': [0,-1], 'btn-down': [0,1], 'btn-left': [-1,0], 'btn-right': [1,0] };
  for (const [id, d] of Object.entries(dirs)) {
    document.getElementById(id).addEventListener('pointerdown', e => {
      e.preventDefault();
      queueDir(d[0], d[1]);
    });
  }

  // Keyboard
  window.addEventListener('keydown', e => {
    const map = {
      ArrowUp:    [0,-1], ArrowDown:  [0,1],
      ArrowLeft:  [-1,0], ArrowRight: [1,0],
      w: [0,-1], s: [0,1], a: [-1,0], d: [1,0],
    };
    if (map[e.key]) { e.preventDefault(); queueDir(...map[e.key]); }
  });

  // Swipe
  canvas.addEventListener('touchstart', e => {
    swipeX0 = e.touches[0].clientX;
    swipeY0 = e.touches[0].clientY;
  }, { passive: true });
  canvas.addEventListener('touchend', e => {
    if (swipeX0 === null) return;
    const dx = e.changedTouches[0].clientX - swipeX0;
    const dy = e.changedTouches[0].clientY - swipeY0;
    if (Math.abs(dx) > Math.abs(dy)) queueDir(dx > 0 ? 1 : -1, 0);
    else queueDir(0, dy > 0 ? 1 : -1);
    swipeX0 = swipeY0 = null;
  }, { passive: true });

  window.addEventListener('resize', resize);
  resize();
  showScreen('start-screen');
});

function resize() {
  const wrap = document.getElementById('game-wrapper');
  const size = Math.min(wrap.clientWidth, wrap.clientHeight - 200);
  CELL = Math.floor(size / COLS);

  const cw = CELL * COLS;
  const ch = CELL * ROWS;

  canvas.width  = cw;
  canvas.height = ch;
  canvas.style.width  = cw + 'px';
  canvas.style.height = ch + 'px';
  canvas.style.top    = Math.floor((wrap.clientHeight - ch) / 2 - 30) + 'px';
  canvas.style.left   = Math.floor((wrap.clientWidth  - cw) / 2) + 'px';

  W = cw; H = ch;
  if (state === 'playing') render();
}

// ── Screen management ─────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  if (id) document.getElementById(id).classList.add('active');
}

// ── Game logic ────────────────────────────────────────────────────────
function startGame() {
  const midX = Math.floor(COLS / 2);
  const midY = Math.floor(ROWS / 2);

  snake   = [{ x: midX, y: midY }, { x: midX - 1, y: midY }, { x: midX - 2, y: midY }];
  dir     = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  score   = 0;
  tickMs  = TICK_MS;
  lastTick = performance.now();
  tickTimer = 0;

  placeFood();
  updateHUD();
  showScreen('game-screen');
  state = 'playing';

  if (raf) cancelAnimationFrame(raf);
  raf = requestAnimationFrame(loop);
}

function queueDir(dx, dy) {
  if (state !== 'playing') return;
  // Prevent 180° reversal
  if (dx !== 0 && dx === -dir.x) return;
  if (dy !== 0 && dy === -dir.y) return;
  nextDir = { x: dx, y: dy };
}

function placeFood() {
  const free = [];
  for (let x = 0; x < COLS; x++)
    for (let y = 0; y < ROWS; y++)
      if (!snake.some(s => s.x === x && s.y === y))
        free.push({ x, y });
  food = free[Math.floor(Math.random() * free.length)];
}

function loop(ts) {
  tickTimer += ts - (lastTick || ts);
  lastTick = ts;

  while (tickTimer >= tickMs) {
    tickTimer -= tickMs;
    step();
    if (state !== 'playing') return;
  }

  render();
  raf = requestAnimationFrame(loop);
}

function step() {
  dir = { ...nextDir };

  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  // Wall collision
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) { die(); return; }

  // Self collision (skip tail as it will move)
  for (let i = 0; i < snake.length - 1; i++) {
    if (snake[i].x === head.x && snake[i].y === head.y) { die(); return; }
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score++;
    updateHUD();
    if (score % SPEED_EVERY === 0) tickMs = Math.max(TICK_MIN, tickMs - 8);
    placeFood();
  } else {
    snake.pop();
  }
}

function die() {
  state = 'dead';
  cancelAnimationFrame(raf);
  if (score > best) best = score;
  document.getElementById('final-score').textContent = score;
  document.getElementById('best-score').textContent  = best;
  setTimeout(() => showScreen('gameover-screen'), 400);
}

function updateHUD() {
  document.getElementById('score').textContent = score;
}

// ── Render ────────────────────────────────────────────────────────────
function render() {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, H); ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(W, y * CELL); ctx.stroke();
  }

  // Food
  const fx = food.x * CELL + CELL / 2;
  const fy = food.y * CELL + CELL / 2;
  const fr = CELL * 0.38;

  ctx.save();
  ctx.shadowColor = FOOD_GLOW;
  ctx.shadowBlur  = 14;
  ctx.fillStyle   = FOOD_COLOR;
  ctx.beginPath();
  ctx.arc(fx, fy, fr, 0, Math.PI * 2);
  ctx.fill();
  // shine
  ctx.shadowBlur  = 0;
  ctx.fillStyle   = 'rgba(255,255,255,.4)';
  ctx.beginPath();
  ctx.arc(fx - fr * 0.28, fy - fr * 0.28, fr * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Snake body (back to front)
  const pad = CELL * 0.12;
  const r   = CELL * 0.3;

  for (let i = snake.length - 1; i >= 0; i--) {
    const s = snake[i];
    const x = s.x * CELL + pad;
    const y = s.y * CELL + pad;
    const sz = CELL - pad * 2;

    ctx.fillStyle = i === 0 ? SNAKE_HEAD : SNAKE_BODY;
    roundRect(ctx, x, y, sz, sz, r);
    ctx.fill();

    // Eyes on head
    if (i === 0) {
      const ex = s.x * CELL + CELL / 2;
      const ey = s.y * CELL + CELL / 2;
      const eyeOff = CELL * 0.22;
      const eyeR   = CELL * 0.1;
      // perpendicular to direction
      const perp = { x: -dir.y, y: dir.x };
      ctx.fillStyle = '#F5C59F';
      [1, -1].forEach(sign => {
        const epx = ex + dir.x * eyeOff * 0.5 + perp.x * eyeOff * sign;
        const epy = ey + dir.y * eyeOff * 0.5 + perp.y * eyeOff * sign;
        ctx.beginPath(); ctx.arc(epx, epy, eyeR, 0, Math.PI * 2); ctx.fill();
      });
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
