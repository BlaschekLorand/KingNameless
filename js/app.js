"use strict";

const {UNKNOWN, WALL, LAND, HOUSE, initialBoard, setCell, analyse} = KiralyLogika;
const menu = document.querySelector("#menu");
const game = document.querySelector("#game");
const boardElement = document.querySelector("#board");
const win = document.querySelector("#win");
let level = KiralyPalyak[0];
let board;

KiralyPalyak.forEach((item, index) => {
  const card = document.createElement("button");
  card.className = "card";
  card.style.animationDelay = `${index * 120}ms`;
  card.innerHTML = `<span class="roof"></span><b>${item.difficulty}</b><span>${item.name}</span><small>${item.grid.length} × ${item.grid[0].length}</small>`;
  card.addEventListener("click", () => {
    level = item;
    startGame();
  });
  document.querySelector("#cards").append(card);
});

function startGame() {
  board = initialBoard(level);
  menu.hidden = true;
  game.hidden = false;
  document.querySelector("#title").textContent = level.name;
  boardElement.style.gridTemplateColumns = `repeat(${board[0].length}, 1fr)`;
  drawBoard();
}

function drawBoard() {
  boardElement.replaceChildren();

  board.forEach((row, r) => row.forEach((state, c) => {
    const cell = document.createElement("button");
    cell.dataset.row = r;
    cell.dataset.col = c;
    cell.textContent = state === HOUSE ? level.grid[r][c] : state === UNKNOWN ? "·" : "";
    boardElement.append(cell);
  }));

  updateGame();
}

function updateGame() {
  const result = analyse(level, board);
  const names = ["empty", "wall", "land", "house"];
  const issues = [...new Set(result.issues.map(issue => issue.message))];

  board.forEach((row, r) => row.forEach((state, c) => {
    const cell = boardElement.children[r * row.length + c];
    const errors = result.cellErrors.get(`${r},${c}`);
    cell.className = `cell ${["empty", "wall", "land", "house"][state]}${errors ? " error" : ""}`;
    cell.setAttribute("aria-label", `Row ${r + 1}, column ${c + 1}: ${names[state]}`);
    cell.title = errors ? [...errors].join(" ") : cell.getAttribute("aria-label");
    cell.disabled = state === HOUSE || result.won;
  }));

  document.querySelector("#progress").textContent =
    `${result.total - result.unknownCount} / ${result.total} cells decided · ${result.correctEstates} / ${result.houseCount} estates done`;
  document.querySelector("#status").textContent = result.won
        ? "You divided the land!"
        : issues.length ? issues.join(" ") : "You're on the right track.";

  document.querySelector("#win-text").textContent = `${level.name} (${level.difficulty}) solved.`;
  win.hidden = !result.won;
}

document.querySelector("#fullscreen").addEventListener("click", () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen();
});
document.querySelector("#reset").addEventListener("click", startGame);
document.querySelector("#win-again").addEventListener("click", startGame);
document.querySelector("#win-menu").addEventListener("click", () => {
  win.hidden = true;
  game.hidden = true;
  menu.hidden = false;
});
document.querySelector("#back").addEventListener("click", () => {
  game.hidden = true;
  menu.hidden = false;
});
document.querySelector("#home-link").addEventListener("click", event => {
  event.preventDefault();
  game.hidden = true;
  menu.hidden = false;
});

function paint(event, clicked) {
  event.preventDefault();
  const cell = event.target.closest(".cell");
  if (!cell || cell.disabled) return;

  const r = Number(cell.dataset.row);
  const c = Number(cell.dataset.col);
  const next = board[r][c] === clicked ? UNKNOWN : clicked;

  if (setCell(level, board, r, c, next)) {
    drawBoard();
    const updatedCell = boardElement.children[r * board[r].length + c];
    if (!updatedCell.disabled) updatedCell.focus();
  }
}

boardElement.addEventListener("click", event => paint(event, LAND));
boardElement.addEventListener("contextmenu", event => paint(event, WALL));
