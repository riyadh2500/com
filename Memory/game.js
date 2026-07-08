'use strict';

// ── Config ───────────────────────────────────────────────────────────
const EMOJIS = ['🍕','🎸','🚀','🦁','🌊','🎯','🍉','🦋'];
// 8 pairs = 16 cards

// ── State ────────────────────────────────────────────────────────────
let cards, flipped, matched, moves, best = null, lockBoard;
let state = 'idle';

// ── Boot ─────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  document.getElementById('start-btn').addEventListener('click', startGame);
  document.getElementById('restart-btn').addEventListener('click', startGame);
});

// ── Screen management ─────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Game ──────────────────────────────────────────────────────────────
function startGame() {
  flipped   = [];
  matched   = 0;
  moves     = 0;
  lockBoard = false;
  state     = 'playing';

  updateHUD();
  buildBoard();
  showScreen('game-screen');
}

function buildBoard() {
  const board = document.getElementById('board');
  board.innerHTML = '';
  cards = [];

  // Duplicate and shuffle
  const deck = [...EMOJIS, ...EMOJIS];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  deck.forEach((emoji, idx) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('aria-label', 'card');
    card.dataset.emoji = emoji;
    card.dataset.idx   = idx;

    const back  = document.createElement('div');
    back.className = 'card-back';
    back.textContent = '?';

    const front = document.createElement('div');
    front.className = 'card-front';
    front.textContent = emoji;

    card.appendChild(back);
    card.appendChild(front);

    card.addEventListener('click', () => flipCard(card));
    board.appendChild(card);
    cards.push(card);
  });
}

function flipCard(card) {
  if (lockBoard) return;
  if (card.classList.contains('flipped')) return;
  if (card.classList.contains('matched')) return;

  card.classList.add('flipped');
  flipped.push(card);

  if (flipped.length === 2) {
    moves++;
    updateHUD();
    lockBoard = true;
    checkMatch();
  }
}

function checkMatch() {
  const [a, b] = flipped;
  if (a.dataset.emoji === b.dataset.emoji) {
    // Match!
    setTimeout(() => {
      a.classList.add('matched');
      b.classList.add('matched');
      flipped   = [];
      matched++;
      lockBoard = false;
      updateHUD();
      if (matched === EMOJIS.length) win();
    }, 400);
  } else {
    // No match — flip back
    setTimeout(() => {
      a.classList.remove('flipped');
      b.classList.remove('flipped');
      flipped   = [];
      lockBoard = false;
    }, 900);
  }
}

function win() {
  state = 'won';
  const isBest = best === null || moves < best;
  if (isBest) best = moves;

  document.getElementById('final-moves').textContent = moves;
  document.getElementById('best-moves').textContent  = best !== null ? best : '—';

  setTimeout(() => showScreen('win-screen'), 500);
}

function updateHUD() {
  document.getElementById('moves').textContent = moves;
  document.getElementById('pairs').textContent = `${matched} / ${EMOJIS.length}`;
}
