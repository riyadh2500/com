'use strict';

// ── Config ───────────────────────────────────────────────────────────
const BG_COLOR      = '#F5C59F';
const PADDLE_COLOR  = '#3a2a1a';
const BALL_COLOR    = '#3a2a1a';
const BALL_SHINE    = 'rgba(255,255,255,.5)';

const BRICK_ROWS    = 6;
const BRICK_COLS    = 7;
const BRICK_PAD     = 6;
const BRICK_TOP     = 90;

const PADDLE_H      = 14;
const PADDLE_RADIUS = 7;
const BALL_R        = 9;
const BALL_SPEED    = 5.2;

// Row colours (dark → warm → accent)
const ROW_COLORS = [
  '#2e1e0e','#3a2a1a','#5a3e28',
  '#7a5a3a','#C4956A','#e0b484',
];

// ── State ────────────────────────────────────────────────────────────
let canvas, ctx, W, H;
let paddle, ball, bricks, particles;
let score, best = 0;
let keyLeft = false, keyRight = false;
let dragX = null;
let state = 'idle';
let raf;

// ── Boot ─────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  canvas = document.getElementById('canvas');
  ctx    = canvas.getContext('2d');

  document.getElementById('start-btn').addEventListener('click', startGame);
  document.getElementById('restart-btn').addEventListener('click', startGame);
  document.getElementById('next-btn').addEventListener('click', startGame);

  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft'  || e.key === 'a') keyLeft  = true;
    if (e.key === 'ArrowRight' || e.key === 'd') keyRight = true;
  });
  window.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft'  || e.key === 'a') keyLeft  = false;
    if (e.key === 'ArrowRight' || e.key === 'd') keyRight = false;
  });

  canvas.addEventListener('pointermove', e => {
    if (state !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    dragX = (e.clientX - rect.left) * scaleX;
  });
  canvas.addEventListener('pointerleave', () => { dragX = null; });

  window.addEventListener('resize', resize);
  resize();
  showScreen('start-screen');
});

function resize() {
  const wrap = document.getElementById('game-wrapper');
  W = wrap.clientWidth;
  H = wrap.clientHeight;
  const DPR = window.devicePixelRatio || 1;
  canvas.width  = W * DPR;
  canvas.height = H * DPR;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (state === 'playing') render();
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Init game objects ─────────────────────────────────────────────────
function startGame() {
  score     = 0;
  particles = [];
  keyLeft = keyRight = false;
  dragX = null;

  const bw = (W - BRICK_PAD * (BRICK_COLS + 1)) / BRICK_COLS;
  const bh = 26;

  bricks = [];
  for (let r = 0; r < BRICK_ROWS; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      bricks.push({
        x:      BRICK_PAD + c * (bw + BRICK_PAD),
        y:      BRICK_TOP + r * (bh + BRICK_PAD),
        w: bw, h: bh,
        color:  ROW_COLORS[r % ROW_COLORS.length],
        alive:  true,
      });
    }
  }

  const pw = Math.min(W * 0.28, 90);
  paddle = {
    x: W / 2 - pw / 2,
    y: H - 70,
    w: pw,
    h: PADDLE_H,
    speed: 7,
  };

  const angle = (-Math.PI / 2) + (Math.random() - 0.5) * 0.6;
  ball = {
    x:  W / 2,
    y:  paddle.y - BALL_R - 2,
    vx: Math.cos(angle) * BALL_SPEED,
    vy: Math.sin(angle) * BALL_SPEED,
  };

  updateHUD();
  showScreen('game-screen');
  state = 'playing';

  if (raf) cancelAnimationFrame(raf);
  raf = requestAnimationFrame(loop);
}

// ── Main loop ─────────────────────────────────────────────────────────
function loop() {
  update();
  render();
  if (state === 'playing') raf = requestAnimationFrame(loop);
}

function update() {
  // Paddle movement
  if (dragX !== null) {
    paddle.x = Math.max(0, Math.min(W - paddle.w, dragX - paddle.w / 2));
  } else {
    if (keyLeft)  paddle.x = Math.max(0, paddle.x - paddle.speed);
    if (keyRight) paddle.x = Math.min(W - paddle.w, paddle.x + paddle.speed);
  }

  // Ball movement
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Wall bounces
  if (ball.x - BALL_R < 0)  { ball.x = BALL_R;      ball.vx *= -1; }
  if (ball.x + BALL_R > W)  { ball.x = W - BALL_R;  ball.vx *= -1; }
  if (ball.y - BALL_R < 0)  { ball.y = BALL_R;       ball.vy *= -1; }

  // Ball fell off bottom
  if (ball.y - BALL_R > H) { die(); return; }

  // Paddle collision
  if (
    ball.vy > 0 &&
    ball.y + BALL_R >= paddle.y &&
    ball.y - BALL_R <= paddle.y + paddle.h &&
    ball.x >= paddle.x &&
    ball.x <= paddle.x + paddle.w
  ) {
    ball.vy = -Math.abs(ball.vy);
    // Add angle based on hit position
    const offset = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
    ball.vx = offset * BALL_SPEED * 1.2;
    // Normalise speed
    const spd = Math.hypot(ball.vx, ball.vy);
    ball.vx = ball.vx / spd * BALL_SPEED;
    ball.vy = ball.vy / spd * BALL_SPEED;
  }

  // Brick collisions
  let allGone = true;
  for (const brick of bricks) {
    if (!brick.alive) continue;
    allGone = false;

    const closestX = Math.max(brick.x, Math.min(ball.x, brick.x + brick.w));
    const closestY = Math.max(brick.y, Math.min(ball.y, brick.y + brick.h));
    const dx = ball.x - closestX;
    const dy = ball.y - closestY;

    if (dx * dx + dy * dy <= BALL_R * BALL_R) {
      brick.alive = false;
      score++;
      updateHUD();
      burst(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color);

      // Determine bounce direction
      const overlapX = (brick.w / 2) - Math.abs(ball.x - (brick.x + brick.w / 2));
      const overlapY = (brick.h / 2) - Math.abs(ball.y - (brick.y + brick.h / 2));
      if (overlapX < overlapY) ball.vx *= -1;
      else ball.vy *= -1;
      break; // one brick per frame
    }
  }

  // Win
  if (allGone) {
    state = 'won';
    cancelAnimationFrame(raf);
    document.getElementById('win-score').textContent = score;
    setTimeout(() => showScreen('win-screen'), 400);
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function die() {
  state = 'dead';
  cancelAnimationFrame(raf);
  if (score > best) best = score;
  document.getElementById('final-score').textContent = score;
  document.getElementById('best-score').textContent  = best;
  setTimeout(() => showScreen('gameover-screen'), 300);
}

function updateHUD() {
  document.getElementById('score').textContent = score;
}

// ── Render ────────────────────────────────────────────────────────────
function render() {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, W, H);

  // Bricks
  bricks.forEach(b => {
    if (!b.alive) return;
    ctx.fillStyle = b.color;
    roundRect(ctx, b.x, b.y, b.w, b.h, 6);
    ctx.fill();
    // shine
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    roundRect(ctx, b.x + 2, b.y + 2, b.w - 4, b.h * 0.45, 4);
    ctx.fill();
  });

  // Paddle
  const pg = ctx.createLinearGradient(0, paddle.y, 0, paddle.y + paddle.h);
  pg.addColorStop(0, '#5a3e28');
  pg.addColorStop(1, PADDLE_COLOR);
  ctx.fillStyle = pg;
  roundRect(ctx, paddle.x, paddle.y, paddle.w, paddle.h, PADDLE_RADIUS);
  ctx.fill();

  // Ball shadow
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.beginPath();
  ctx.ellipse(ball.x, ball.y + BALL_R * 0.6, BALL_R * 0.7, BALL_R * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ball
  const bg = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, BALL_R);
  bg.addColorStop(0, '#7a5a3a');
  bg.addColorStop(1, BALL_COLOR);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BALL_SHINE;
  ctx.beginPath();
  ctx.ellipse(ball.x - 3, ball.y - 3, 3, 2, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // Particles
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// ── Particles ─────────────────────────────────────────────────────────
function burst(x, y, color) {
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1.5 + Math.random() * 3.5;
    particles.push({
      x, y,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1,
      r: 2 + Math.random() * 3,
      color,
      life: 25 + Math.random() * 15 | 0,
      maxLife: 40,
    });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────
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
