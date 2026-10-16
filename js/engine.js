"use strict";

// Pure game logic: does not touch the UI or browser storage.
const KiralyLogika = (() => {
  const UNKNOWN = 0;
  const WALL = 1;
  const LAND = 2;
  const HOUSE = 3;
  const initialBoard = level => level.grid.map(row => row.map(value => value > 0 ? HOUSE : UNKNOWN));

  function validBoard(level, board) {
    return Array.isArray(board) && board.length === level.grid.length &&
      board.every((row, r) => Array.isArray(row) && row.length === level.grid[r].length &&
        row.every((state, c) => level.grid[r][c] > 0
          ? state === HOUSE
          : [UNKNOWN, WALL, LAND].includes(state)));
  }

  function neighbours(board, r, c) {
    return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
      .filter(([row, col]) => row >= 0 && row < board.length && col >= 0 && col < board[0].length);
  }

  // Breadth-first search: only joins cells that share a side.
  function components(board, allowed) {
    const seen = new Set();
    const result = [];
    board.forEach((row, r) => row.forEach((state, c) => {
      const key = r * board[0].length + c;
      if (seen.has(key) || !allowed(state)) return;
      const queue = [[r, c]];
      seen.add(key);
      for (let head = 0; head < queue.length; head += 1) {
        const [currentR, currentC] = queue[head];
        neighbours(board, currentR, currentC).forEach(([nr, nc]) => {
          const nextKey = nr * board[0].length + nc;
          if (!seen.has(nextKey) && allowed(board[nr][nc])) {
            seen.add(nextKey);
            queue.push([nr, nc]);
          }
        });
      }
      result.push(queue);
    }));
    return result;
  }

  function setCell(level, board, r, c, state) {
    if (!Number.isInteger(r) || !Number.isInteger(c) || !board[r] || board[r][c] === undefined ||
      level.grid[r][c] > 0 || ![UNKNOWN, WALL, LAND].includes(state) || board[r][c] === state) return false;
    board[r][c] = state;
    return true;
  }

  function analyse(level, board) {
    if (!validBoard(level, board)) throw new Error("Invalid board.");
    const issues = [];
    const cellErrors = new Map();
    const housesIn = cells => cells.filter(([r, c]) => level.grid[r][c] > 0);
    const addIssue = (type, message, cells) => {
      issues.push({type, message, cells});
      cells.forEach(([r, c]) => {
        const key = `${r},${c}`;
        if (!cellErrors.has(key)) cellErrors.set(key, new Set());
        cellErrors.get(key).add(message);
      });
    };
    const lands = components(board, state => state === LAND || state === HOUSE);
    const available = components(board, state => state !== WALL);
    const walls = components(board, state => state === WALL);
    const unknownCount = board.flat().filter(state => state === UNKNOWN).length;
    let correctEstates = 0;

    lands.forEach(cells => {
      const houses = housesIn(cells);
      if (houses.length > 1) {
        addIssue("merged", "Several houses are connected to one estate. Separate them with a wall!", cells);
      } else if (houses.length === 1) {
        const [r, c] = houses[0];
        const size = level.grid[r][c];
        if (cells.length > size) {
          addIssue("large", `Estate too big: ${cells.length} cells belong to the house of ${size}.`, cells);
        } else if (cells.length === size) {
          correctEstates += 1;
        }
      }
    });

    // Undecided cells could still become land. The space is only too small
    // if the estate would not fit even with all the reachable free cells.
    available.forEach(cells => {
      const houses = housesIn(cells);
      houses.forEach(([r, c]) => {
        const size = level.grid[r][c];
        if (cells.length < size) {
          addIssue("small", `Estate too small: at most ${cells.length} cells are reachable for the house of ${size}.`, cells);
        }
      });
      if (houses.length === 0) {
        const marked = cells.filter(([r, c]) => board[r][c] === LAND);
        if (marked.length > 0) addIssue("orphan", "This marked estate cannot be connected to a house.", cells);
      }
    });

    for (let r = 0; r < board.length - 1; r += 1) {
      for (let c = 0; c < board[0].length - 1; c += 1) {
        const square = [[r, c], [r + 1, c], [r, c + 1], [r + 1, c + 1]];
        if (square.every(([sr, sc]) => board[sr][sc] === WALL)) {
          addIssue("square", "A solid 2 × 2 block of walls has formed.", square);
        }
      }
    }
    if (unknownCount === 0 && walls.length !== 1) {
      addIssue("walls", walls.length === 0
        ? "There is no wall network on the board."
        : "The walls form several separate parts. Connect them!", walls.flat());
    }
    const validLands = lands.every(cells => {
      const houses = housesIn(cells);
      return houses.length === 1 && cells.length === level.grid[houses[0][0]][houses[0][1]];
    });
    const won = unknownCount === 0 && validLands && walls.length === 1 &&
      !issues.some(issue => issue.type === "square");
    return {issues, cellErrors, unknownCount, correctEstates, won,
      houseCount: level.grid.flat().filter(value => value > 0).length,
      total: board.length * board[0].length};
  }

  return {UNKNOWN, WALL, LAND, HOUSE, initialBoard, setCell, analyse};
})();
