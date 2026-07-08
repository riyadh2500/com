'use strict';

// ── Config ───────────────────────────────────────────────────────────
const HOLES       = 9;
const GAME_TIME   = 30;   // seconds
const MOLES_LIST  = ['🦔', '🐭', '🐹', '🐰', '🦫'];

// Difficulty ramps: each stage lasts N seconds, then gets harder
const STAGES = [
  { upMs: 900,  downMs: 1100 },   // 0-8s  easy
  { upMs: 720,  downMs: 900  },   // 8-18s medium
  { upMs: 560,  downMs: 700  },   // 18-28s hard
  { upMs: 420,  downMs: 540  },   // 28+ very hard
];

// ── State ────────────────────────────────────────────────────────────
let score, best = 0, timeLeft;
let holes, timers, countdownId, stageIndex;
let state = 'idle';
let activeMoles = 0;

// ── Boot ─────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  document.getElementById('start-btn').addEventListener('click', startGame);
  document.getElementById('restart-btn').addEventListener('click', startGame);
  buildGrid();
});

function buildGrid() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  holes = [];
  for (let i = 0; i < HOLES; i++) {
    const hole = document.createElement('div');
    hole.className = 'hole';
    hole.setAttribute('aria-label', 'hole');

    const mole = document.createElement('div');
    mole.className = 'mole';
    mole.textContent = randomMole();
    hole.appendChild(mole);

    hole.addEventListener('pointerdown', () => whack(i));
    grid.appendChild(hole);
    holes.push({ el: hole, moleEl: mole, up: false, timer: null });
  }
}

function randomMole() {
  return MOLES_LIST[Math.floor(Math.random() * MOLES_LIST.length)];
}

// ── Screen management ─────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Game ──────────────────────────────────────────────────────────────
function startGame() {
  // Clear any old timers
  holes.forEach(h => { clearTimeout(h.timer); h.timer = null; h.up = false; h.el.classList.remove('up', 'whacked', 'flash'); });
  clearInterval(countdownId);
  activeMoles = 0;

  score     = 0;
  timeLeft  = GAME_TIME;
  stageIndex = 0;
  state     = 'playing';

  updateHUD();
  showScreen('game-screen');

  // Stagger first moles
  for (let i = 0; i < 3; i++) {
    setTimeout(() => scheduleRise(i * 3), i * 300);
  }

  // Countdown
  countdownId = setInterval(() => {
    timeLeft--;
    document.getElementById('timer').textContent = timeLeft;
    const tv = document.getElementById('timer');
    if (timeLeft <= 5) tv.classList.add('urgent');
    else tv.classList.remove('urgent');

    // Stage progression
    if (timeLeft <= GAME_TIME - 18) stageIndex = 3;
    else if (timeLeft <= GAME_TIME - 18) stageIndex = 3;
    else if (timeLeft <= GAME_TIME - 10) stageIndex = 2;
    else if (timeLeft <= GAME_TIME - 8)  stageIndex = 1;

    if (timeLeft <= 0) endGame();
  }, 1000);
}

function endGame() {
  clearInterval(countdownId);
  holes.forEach(h => {
    clearTimeout(h.timer);
    h.el.classList.remove('up', 'whacked', 'flash');
  });
  state = 'over';

  if (score > best) best = score;
  document.getElementById('final-score').textContent = score;
  document.getElementById('best-score').textContent  = best;
  setTimeout(() => showScreen('gameover-screen'), 300);
}

// ── Mole scheduling ───────────────────────────────────────────────────
function scheduleRise(holeIdx) {
  if (state !== 'playing') return;
  const h = holes[holeIdx];
  if (h.up) return;

  const stage = STAGES[Math.min(stageIndex, STAGES.length - 1)];
  const delay = 100 + Math.random() * 400;

  h.timer = setTimeout(() => {
    if (state !== 'playing') return;
    riseUp(holeIdx);
    h.timer = setTimeout(() => {
      if (state !== 'playing') return;
      if (h.up) sinkDown(holeIdx, false);
    }, stage.upMs + Math.random() * 200);
  }, delay);
}

function riseUp(idx) {
  const h = holes[idx];
  h.moleEl.textContent = randomMole();
  h.up = true;
  activeMoles++;
  h.el.classList.add('up');
  h.el.classList.remove('whacked');
}

function sinkDown(idx, wasWhacked) {
  const h = holes[idx];
  if (!h.up) return;
  h.up = false;
  activeMoles = Math.max(0, activeMoles - 1);

  if (wasWhacked) {
    h.el.classList.add('whacked');
    setTimeout(() => {
      h.el.classList.remove('up', 'whacked');
      scheduleLater(idx);
    }, 300);
  } else {
    h.el.classList.remove('up', 'whacked');
    scheduleLater(idx);
  }
}

function scheduleLater(idx) {
  if (state !== 'playing') return;
  const stage = STAGES[Math.min(stageIndex, STAGES.length - 1)];
  const wait  = stage.downMs + Math.random() * 500;
  holes[idx].timer = setTimeout(() => scheduleRise(idx), wait);
}

// ── Whack ─────────────────────────────────────────────────────────────
function whack(idx) {
  if (state !== 'playing') return;
  const h = holes[idx];
  if (!h.up) return;

  score++;
  updateHUD();
  showPop(h.el, '+1');

  // flash
  h.el.classList.add('flash');
  setTimeout(() => h.el.classList.remove('flash'), 120);

  clearTimeout(h.timer);
  sinkDown(idx, true);
}

function updateHUD() {
  document.getElementById('score').textContent = score;
}

// ── Score pop ─────────────────────────────────────────────────────────
function showPop(parentEl, text) {
  const pop = document.createElement('div');
  pop.className = 'score-pop';
  pop.textContent = text;
  const r = parentEl.getBoundingClientRect();
  const pr = parentEl.offsetParent.getBoundingClientRect();
  pop.style.left = (r.left - pr.left + r.width / 2 - 20) + 'px';
  pop.style.top  = (r.top  - pr.top)  + 'px';
  parentEl.offsetParent.appendChild(pop);
  pop.addEventListener('animationend', () => pop.remove());
}
