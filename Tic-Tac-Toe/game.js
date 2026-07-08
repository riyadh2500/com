'use strict';

// ── Win patterns ──────────────────────────────────────────────────────
const WINS = [
  [0,1,2],[3,4,5],[6,7,8], // rows
  [0,3,6],[1,4,7],[2,5,8], // cols
  [0,4,8],[2,4,6],         // diags
];

// ── State ────────────────────────────────────────────────────────────
let board, cells, playerTurn, wins = 0, draws = 0, losses = 0;
let busy = false;
let state = 'idle';

// ── Boot ─────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  document.getElementById('start-btn').addEventListener('click', startGame);
  document.getElementById('restart-btn').addEventListener('click', startGame);

  cells = Array.from(document.querySelectorAll('.cell'));
  cells.forEach((cell, i) => cell.addEventListener('click', () => playerMove(i)));
});

// ── Screen management ─────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Game ──────────────────────────────────────────────────────────────
function startGame() {
  board = Array(9).fill(null);
  busy  = false;
  state = 'playing';

  cells.forEach(c => {
    c.textContent = '';
    c.className   = 'cell';
  });

  playerTurn = Math.random() < 0.5; // random first move
  setBanner(playerTurn ? "Your turn — X" : "CPU thinking…");
  showScreen('game-screen');

  if (!playerTurn) {
    busy = true;
    setTimeout(() => { cpuMove(); busy = false; }, 600);
  }
}

function setBanner(text) {
  document.getElementById('turn-banner').textContent = text;
}

// ── Player ────────────────────────────────────────────────────────────
function playerMove(i) {
  if (!playerTurn || busy || board[i] || state !== 'playing') return;

  place(i, 'X');
  const result = evaluate();
  if (result) return;

  playerTurn = false;
  setBanner("CPU thinking…");
  busy = true;
  setTimeout(() => { cpuMove(); busy = false; }, 500 + Math.random() * 300);
}

// ── CPU (minimax) ─────────────────────────────────────────────────────
function cpuMove() {
  if (state !== 'playing') return;

  let bestScore = -Infinity, bestIdx = -1;
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = 'O';
      const s = minimax(board, 0, false);
      board[i] = null;
      if (s > bestScore) { bestScore = s; bestIdx = i; }
    }
  }

  if (bestIdx !== -1) {
    place(bestIdx, 'O');
    const result = evaluate();
    if (!result) {
      playerTurn = true;
      setBanner("Your turn — X");
    }
  }
}

function minimax(b, depth, isMax) {
  const w = checkWinner(b);
  if (w === 'O') return 10 - depth;
  if (w === 'X') return depth - 10;
  if (b.every(c => c)) return 0;

  if (isMax) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!b[i]) { b[i] = 'O'; best = Math.max(best, minimax(b, depth + 1, false)); b[i] = null; }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!b[i]) { b[i] = 'X'; best = Math.min(best, minimax(b, depth + 1, true)); b[i] = null; }
    }
    return best;
  }
}

// ── Place mark ────────────────────────────────────────────────────────
function place(i, mark) {
  board[i] = mark;
  cells[i].textContent = mark;
  cells[i].classList.add('taken', mark === 'X' ? 'x-mark' : 'o-mark');
}

// ── Check result ──────────────────────────────────────────────────────
function evaluate() {
  const w = checkWinner(board);
  if (w) {
    const line = WINS.find(p => p.every(i => board[i] === w));
    if (line) line.forEach(i => cells[i].classList.add('winner'));

    state = 'done';
    setTimeout(() => {
      if (w === 'X') { wins++;   showResult('🎉', 'YOU WIN!'); }
      else           { losses++; showResult('😤', 'CPU WINS!'); }
    }, 600);
    return true;
  }
  if (board.every(c => c)) {
    draws++;
    state = 'done';
    setTimeout(() => showResult('🤝', 'DRAW!'), 400);
    return true;
  }
  return false;
}

function checkWinner(b) {
  for (const [a, bb, c] of WINS) {
    if (b[a] && b[a] === b[bb] && b[a] === b[c]) return b[a];
  }
  return null;
}

function showResult(emoji, title) {
  document.getElementById('result-emoji').textContent = emoji;
  document.getElementById('result-title').textContent  = title;
  document.getElementById('wins').textContent   = wins;
  document.getElementById('draws').textContent  = draws;
  document.getElementById('losses').textContent = losses;
  showScreen('result-screen');
}
