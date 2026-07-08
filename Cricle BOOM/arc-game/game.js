'use strict';

// ═══════════════════════════════════════════════════════════════════
// DESIGN
//   - A circular arc (like a curved paddle) sits in the middle
//     of the screen, centered on CX, CY.
//   - The WHITE BALL sits on one end-point of the arc, always
//     staying glued to the arc's leading tip.
//   - The player rotates the arc left/right by dragging or
//     holding either side of the screen.
//   - Obstacle RINGS expand outward from the center through the arc.
//     Each ring has one gap. The player must spin the arc so the
//     ball aligns with the gap before the ring reaches it.
//   - If the ball is NOT in the gap when the ring passes → DEAD.
// ═══════════════════════════════════════════════════════════════════

// ── Tuning knobs ────────────────────────────────────────────────────
const ARC_RADIUS   = 110;   // px — circle radius the arc sits on
const ARC_SPAN_RAD = 1.9;   // radians — how wide the arc is (~109°)
const ARC_THICK    = 13;    // stroke width
const BALL_R       = 17;    // ball radius
const BALL_OFFSET  = 0;     // extra px the ball is pushed out past arc tip

const GAP_RAD      = 1.30;  // gap width in radians (~74°) – generous for fun
const RING_THICK   = 16;    // ring stroke width
const RING_START_R = 22;    // rings expand FROM this radius
const RING_END_R   = 340;   // rings are removed past this radius

const SPEED_BASE   = 1.6;   // px/frame ring expansion speed at start
const SPEED_SCALE  = 0.05;  // added per point
const SPEED_MAX    = 4.2;

const SPAWN_MS     = 1800;  // ms between spawns (decreases)
const SPAWN_MIN_MS = 750;

const ROT_SPEED    = 0.052; // rad/frame for keyboard / tap-hold

const BG_COLOR     = '#F5C59F';
const ARC_COLOR    = '#2e1e0e';
const RING_COLOR   = '#2e1e0e';
const RING_ACCENT  = '#C4956A';
const X_COLOR      = '#2e1e0e';
const X_ACCENT     = '#C4956A';

// ── Runtime state ───────────────────────────────────────────────────
let canvas, ctx, W, H, CX, CY, DPR;
let raf, state = 'idle';

// Arc
let arcAngle;   // angle (rad) of the ball-end tip of the arc

// Obstacles: rings expand outward
// { r, gapCenter, xRot, hitTested }
let rings, particles;
let score, best = 0;
let spawnTimer, nextSpawnMs, spawnMs;
let lastTime;

// Input
let pDown = false, dragLastA = null;
let keyLeft = false, keyRight = false;
let holdSide = 0; // -1 / 0 / 1 for tap-hold buttons

// ── Boot ────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  canvas = document.getElementById('canvas');
  ctx    = canvas.getContext('2d');

  document.getElementById('start-btn').addEventListener('click',   startGame);
  document.getElementById('restart-btn').addEventListener('click', startGame);

  // Pointer (unified mouse + touch)
  canvas.addEventListener('pointerdown',   onDown,   { passive: true });
  canvas.addEventListener('pointermove',   onMove,   { passive: true });
  canvas.addEventListener('pointerup',     onUp,     { passive: true });
  canvas.addEventListener('pointercancel', onUp,     { passive: true });

  // Keyboard
  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft'  || e.key === 'a') keyLeft  = true;
    if (e.key === 'ArrowRight' || e.key === 'd') keyRight = true;
  });
  window.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft'  || e.key === 'a') keyLeft  = false;
    if (e.key === 'ArrowRight' || e.key === 'd') keyRight = false;
  });

  window.addEventListener('resize', () => { resize(); });
  resize();
  showScreen('start-screen');

  // Paint idle background so canvas isn't blank under the start screen
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, W, H);
});

function resize() {
  DPR = window.devicePixelRatio || 1;
  const wrap = document.getElementById('game-wrapper');
  const cw   = wrap.clientWidth;
  const ch   = wrap.clientHeight;

  // Logical size matches CSS size; internal buffer uses DPR
  canvas.style.width  = cw + 'px';
  canvas.style.height = ch + 'px';
  canvas.width  = cw * DPR;
  canvas.height = ch * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  W  = cw;
  H  = ch;
  CX = W / 2;
  CY = H / 2 + 20; // slightly below centre for visual balance
}

// ── Screen management ────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  if (id) document.getElementById(id).classList.add('active');
}

// ── Game start / reset ───────────────────────────────────────────────
function startGame() {
  score     = 0;
  rings     = [];
  particles = [];
  arcAngle  = -Math.PI / 2 - ARC_SPAN_RAD / 2; // ball starts at top
  spawnMs   = SPAWN_MS;
  spawnTimer = 0;
  lastTime   = null;
  keyLeft = keyRight = false;
  pDown = false; dragLastA = null; holdSide = 0;

  updateHUD();
  showScreen('game-screen');
  state = 'playing';

  if (raf) cancelAnimationFrame(raf);
  raf = requestAnimationFrame(tick);
}

function die() {
  state = 'dead';
  cancelAnimationFrame(raf);
  if (score > best) best = score;
  document.getElementById('final-score').textContent = score;
  document.getElementById('best-score').textContent  = best;

  const bp = ballPos();
  burst(bp.x, bp.y, 22, '#fff');
  burst(bp.x, bp.y, 12, '#C4956A');
  render(0); // flush particles

  setTimeout(() => showScreen('gameover-screen'), 750);
}

// ── Main loop ────────────────────────────────────────────────────────
function tick(ts) {
  if (!lastTime) lastTime = ts;
  const dt = Math.min(ts - lastTime, 50); // cap at 50ms to avoid spiral
  lastTime = ts;

  update(dt);
  render(dt);
  raf = requestAnimationFrame(tick);
}

// ── Update ───────────────────────────────────────────────────────────
function update(dt) {
  // ── Rotate arc ──────────────────────────────────────────────────
  const dr = ROT_SPEED;
  if (keyLeft  || holdSide === -1) arcAngle -= dr;
  if (keyRight || holdSide ===  1) arcAngle += dr;
  if (dragLastA !== null) {
    // drag rotation is applied inside onMove; nothing here
  }

  // ── Spawn rings ──────────────────────────────────────────────────
  spawnTimer += dt;
  if (spawnTimer >= spawnMs) {
    spawnTimer = 0;
    spawnMs    = Math.max(SPAWN_MIN_MS, spawnMs - 25);
    spawnRing();
  }

  // ── Move rings ───────────────────────────────────────────────────
  const speed = Math.min(SPEED_MAX, SPEED_BASE + score * SPEED_SCALE);

  for (let i = rings.length - 1; i >= 0; i--) {
    const ring = rings[i];
    ring.r += speed;

    // ── Hit test: ring overlaps the arc radius ──────────────────
    if (!ring.hit && ring.r >= ARC_RADIUS - ARC_THICK - BALL_R
                  && ring.r <= ARC_RADIUS + ARC_THICK + BALL_R) {
      ring.hit = true;

      const ballA = normalizeAngle(arcAngle); // tip of arc = ball position angle
      const safe  = angleInGap(ballA, ring.gapCenter, GAP_RAD);

      if (!safe) {
        die();
        return;
      }

      // Survived — award point + flash
      score++;
      updateHUD();
      const bp = ballPos();
      burst(bp.x, bp.y, 9, '#ffd580');
    }

    if (ring.r > RING_END_R) rings.splice(i, 1);
  }

  // ── Particles ───────────────────────────────────────────────────
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.2;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

// ── Render ───────────────────────────────────────────────────────────
function render() {
  // Background
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, W, H);

  // Soft center glow
  const grd = ctx.createRadialGradient(CX, CY, 0, CX, CY, ARC_RADIUS * 2.2);
  grd.addColorStop(0, 'rgba(255,190,110,.22)');
  grd.addColorStop(1, 'rgba(255,190,110,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  // Rings (drawn back-to-front)
  rings.forEach(drawRing);

  // Arc paddle
  drawArc();

  // Ball
  const bp = ballPos();
  drawBall(bp.x, bp.y);

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

// ── Draw helpers ─────────────────────────────────────────────────────

function drawArc() {
  // Arc spans from arcAngle to arcAngle + ARC_SPAN_RAD
  // Ball lives at arcAngle (the starting tip)
  const a0 = arcAngle;
  const a1 = arcAngle + ARC_SPAN_RAD;

  ctx.save();
  ctx.strokeStyle = ARC_COLOR;
  ctx.lineWidth   = ARC_THICK;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.arc(CX, CY, ARC_RADIUS, a0, a1);
  ctx.stroke();

  // End caps (small filled circles so the tips look rounded/polished)
  [a0, a1].forEach(a => {
    const ex = CX + Math.cos(a) * ARC_RADIUS;
    const ey = CY + Math.sin(a) * ARC_RADIUS;
    ctx.fillStyle = ARC_COLOR;
    ctx.beginPath();
    ctx.arc(ex, ey, ARC_THICK / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawBall(x, y) {
  ctx.save();

  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.beginPath();
  ctx.ellipse(x, y + BALL_R * 0.7, BALL_R * 0.72, BALL_R * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body gradient
  const g = ctx.createRadialGradient(x - 5, y - 5, 1, x, y, BALL_R);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#c8c8c8');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
  ctx.fill();

  // Specular highlight
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ctx.beginPath();
  ctx.ellipse(x - 5, y - 5, 5, 3.5, -0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawRing(ring) {
  ctx.save();

  // Draw the ring as a nearly-complete arc (full circle minus the gap)
  const half     = GAP_RAD / 2 + deg2rad(4); // visual extra clearance
  const ringFrom = ring.gapCenter + half;
  const ringTo   = ring.gapCenter - half;     // canvas arc direction is clockwise

  // Dark outline
  ctx.strokeStyle = RING_COLOR;
  ctx.lineWidth   = RING_THICK;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.arc(CX, CY, ring.r, ringFrom, ringTo);
  ctx.stroke();

  // Warm tan overlay
  ctx.strokeStyle = RING_ACCENT;
  ctx.lineWidth   = RING_THICK - 5;
  ctx.beginPath();
  ctx.arc(CX, CY, ring.r, ringFrom, ringTo);
  ctx.stroke();

  // X marks positioned around the solid part of the ring
  const xCount = 3;
  for (let i = 0; i < xCount; i++) {
    // Spread them in the solid section (opposite side to gap)
    const spread = Math.PI * 1.3;
    const a = ring.gapCenter + Math.PI - spread / 2 + (spread / (xCount - 1)) * i;
    const xc = CX + Math.cos(a) * ring.r;
    const yc = CY + Math.sin(a) * ring.r;
    drawXMark(xc, yc, ring.xRot + a + i * 0.8);
  }

  ctx.restore();
}

function drawXMark(cx, cy, rot) {
  const s = 22;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot + Math.PI / 4); // +45° so lines become X not +

  ctx.strokeStyle = X_COLOR;
  ctx.lineWidth   = 8;
  ctx.lineCap     = 'round';
  ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(0, s); ctx.stroke();

  ctx.strokeStyle = X_ACCENT;
  ctx.lineWidth   = 4;
  ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(0, s); ctx.stroke();

  ctx.restore();
}

// ── Ball position ────────────────────────────────────────────────────
// Ball lives at the STARTING tip of the arc (arcAngle)
function ballPos() {
  const r = ARC_RADIUS + BALL_OFFSET;
  return {
    x: CX + Math.cos(arcAngle) * r,
    y: CY + Math.sin(arcAngle) * r,
  };
}

// ── Spawn ────────────────────────────────────────────────────────────
function spawnRing() {
  rings.push({
    r:         RING_START_R,
    gapCenter: Math.random() * Math.PI * 2,
    xRot:      Math.random() * Math.PI,
    hit:       false,
  });
}

// ── Particles ────────────────────────────────────────────────────────
function burst(x, y, count, color) {
  for (let i = 0; i < count; i++) {
    const a   = (Math.PI * 2 / count) * i + Math.random() * 0.5;
    const spd = 1.5 + Math.random() * 4;
    particles.push({
      x, y,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd - 1,
      r:  1.5 + Math.random() * 3,
      color,
      life: 30 + Math.random() * 20 | 0,
      maxLife: 50,
    });
  }
}

// ── Input ────────────────────────────────────────────────────────────
function onDown(e) {
  if (state !== 'playing') return;
  pDown = true;
  canvas.setPointerCapture(e.pointerId);

  const rect = canvas.getBoundingClientRect();
  const px   = e.clientX - rect.left;
  const py   = e.clientY - rect.top;
  dragLastA  = Math.atan2(py - CY, px - CX);

  // Also record which side for tap-hold fallback
  holdSide   = px < W / 2 ? -1 : 1;
}

function onMove(e) {
  if (!pDown || state !== 'playing') return;

  const rect  = canvas.getBoundingClientRect();
  const px    = e.clientX - rect.left;
  const py    = e.clientY - rect.top;
  const angle = Math.atan2(py - CY, px - CX);

  if (dragLastA !== null) {
    let delta = angle - dragLastA;
    if (delta >  Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    arcAngle += delta;
  }
  dragLastA = angle;
  holdSide  = 0; // once dragging, disable tap-hold side
}

function onUp() {
  pDown     = false;
  dragLastA = null;
  holdSide  = 0;
}

// ── HUD ──────────────────────────────────────────────────────────────
function updateHUD() {
  document.getElementById('score').textContent = score;
}

// ── Math helpers ─────────────────────────────────────────────────────
function deg2rad(d) { return d * Math.PI / 180; }

function normalizeAngle(a) {
  a = a % (Math.PI * 2);
  return a < 0 ? a + Math.PI * 2 : a;
}

/**
 * Is angle `a` within `halfSpan` radians either side of `center`?
 * Works correctly across the 0/2π boundary.
 */
function angleInGap(a, center, gapSpan) {
  const half  = gapSpan / 2;
  let   delta = a - center;
  // Normalise delta to [-π, π]
  delta = ((delta + Math.PI) % (Math.PI * 2)) - Math.PI;
  return Math.abs(delta) <= half;
}
