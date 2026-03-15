import type { PlayerColor, BoardState, GameState, ValidMove } from "./types.js";

export function createInitialBoard(): BoardState {
  const points = new Array(24).fill(0);
  points[0] = -2;
  points[5] = 5;
  points[7] = 3;
  points[11] = -5;
  points[12] = 5;
  points[16] = -3;
  points[18] = -5;
  points[23] = 2;
  return {
    points,
    whiteBar: 0,
    blackBar: 0,
    whiteOff: 0,
    blackOff: 0,
  };
}

export function createInitialGameState(): GameState {
  return {
    board: createInitialBoard(),
    currentPlayer: 'white',
    dice: [],
    remainingMoves: [],
    gameOver: false,
    winner: null,
    lastMove: null,
  };
}

export function rollDice(): number[] {
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  return [d1, d2];
}

export function getRemainingMoves(dice: number[]): number[] {
  if (dice.length === 2 && dice[0] === dice[1]) {
    return [dice[0], dice[0], dice[0], dice[0]];
  }
  return [...dice];
}

function allCheckersInHome(board: BoardState, player: PlayerColor): boolean {
  if (player === 'white') {
    if (board.whiteBar > 0) return false;
    for (let i = 6; i < 24; i++) {
      if (board.points[i] > 0) return false;
    }
    return true;
  } else {
    if (board.blackBar > 0) return false;
    for (let i = 0; i < 18; i++) {
      if (board.points[i] < 0) return false;
    }
    return true;
  }
}

function canBearOff(board: BoardState, player: PlayerColor): boolean {
  return allCheckersInHome(board, player);
}

function findHighestCheckerPoint(board: BoardState, player: PlayerColor): number {
  if (player === 'white') {
    for (let i = 5; i >= 0; i--) {
      if (board.points[i] > 0) return i;
    }
  } else {
    for (let i = 18; i <= 23; i++) {
      if (board.points[i] < 0) return i;
    }
  }
  return -1;
}

export function getValidMoves(
  board: BoardState,
  player: PlayerColor,
  remainingMoves: number[]
): ValidMove[] {
  const moves: ValidMove[] = [];
  const uniqueDice = [...new Set(remainingMoves)];

  for (const die of uniqueDice) {
    if (player === 'white' && board.whiteBar > 0) {
      const target = 24 - die;
      const pointVal = board.points[target];
      if (pointVal >= -1) {
        moves.push({ from: -1, to: target, die });
      }
      continue;
    }
    if (player === 'black' && board.blackBar > 0) {
      const target = die - 1;
      const pointVal = board.points[target];
      if (pointVal <= 1) {
        moves.push({ from: 24, to: target, die });
      }
      continue;
    }

    for (let i = 0; i < 24; i++) {
      const val = board.points[i];
      if (player === 'white' && val <= 0) continue;
      if (player === 'black' && val >= 0) continue;

      if (player === 'white') {
        const target = i - die;
        if (target >= 0) {
          if (board.points[target] >= -1) {
            moves.push({ from: i, to: target, die });
          }
        } else if (canBearOff(board, 'white')) {
          if (target === -1) {
            moves.push({ from: i, to: -1, die });
          } else {
            const highest = findHighestCheckerPoint(board, 'white');
            if (i === highest) {
              moves.push({ from: i, to: -1, die });
            }
          }
        }
      } else {
        const target = i + die;
        if (target <= 23) {
          if (board.points[target] <= 1) {
            moves.push({ from: i, to: target, die });
          }
        } else if (canBearOff(board, 'black')) {
          if (target === 24) {
            moves.push({ from: i, to: 24, die });
          } else {
            const highest = findHighestCheckerPoint(board, 'black');
            if (i === highest) {
              moves.push({ from: i, to: 24, die });
            }
          }
        }
      }
    }
  }

  return moves;
}

export function applyMove(
  board: BoardState,
  player: PlayerColor,
  from: number,
  to: number
): { newBoard: BoardState; hitOpponent: boolean } {
  const newBoard: BoardState = {
    points: [...board.points],
    whiteBar: board.whiteBar,
    blackBar: board.blackBar,
    whiteOff: board.whiteOff,
    blackOff: board.blackOff,
  };

  let hitOpponent = false;

  if (player === 'white') {
    if (from === -1) {
      newBoard.whiteBar--;
    } else {
      newBoard.points[from]--;
    }

    if (to === -1) {
      newBoard.whiteOff++;
    } else {
      if (newBoard.points[to] === -1) {
        newBoard.points[to] = 0;
        newBoard.blackBar++;
        hitOpponent = true;
      }
      newBoard.points[to]++;
    }
  } else {
    if (from === 24) {
      newBoard.blackBar--;
    } else {
      newBoard.points[from]++;
    }

    if (to === 24) {
      newBoard.blackOff++;
    } else {
      if (newBoard.points[to] === 1) {
        newBoard.points[to] = 0;
        newBoard.whiteBar++;
        hitOpponent = true;
      }
      newBoard.points[to]--;
    }
  }

  return { newBoard, hitOpponent };
}

export function checkWinner(board: BoardState): PlayerColor | null {
  if (board.whiteOff === 15) return 'white';
  if (board.blackOff === 15) return 'black';
  return null;
}

export function isValidMove(
  board: BoardState,
  player: PlayerColor,
  from: number,
  to: number,
  remainingMoves: number[]
): { valid: boolean; die: number } {
  const validMoves = getValidMoves(board, player, remainingMoves);
  const match = validMoves.find(m => m.from === from && m.to === to);
  if (match) return { valid: true, die: match.die };
  return { valid: false, die: 0 };
}

export function hasAnyValidMoves(
  board: BoardState,
  player: PlayerColor,
  remainingMoves: number[]
): boolean {
  return getValidMoves(board, player, remainingMoves).length > 0;
}

export function getValidMovesForFullTurn(
  board: BoardState,
  player: PlayerColor,
  remainingMoves: number[]
): ValidMove[] {
  const directMoves = getValidMoves(board, player, remainingMoves);
  if (directMoves.length === 0) return [];

  if (remainingMoves.length <= 1) return directMoves;

  const uniqueDice = [...new Set(remainingMoves)];
  const isDoubles = uniqueDice.length === 1;

  if (isDoubles) return directMoves;

  const movesUsingBothDice: ValidMove[] = [];

  for (const move of directMoves) {
    const { newBoard } = applyMove(board, player, move.from, move.to);
    const newRemaining = [...remainingMoves];
    const dieIdx = newRemaining.indexOf(move.die);
    if (dieIdx !== -1) newRemaining.splice(dieIdx, 1);

    const followUpMoves = getValidMoves(newBoard, player, newRemaining);
    if (followUpMoves.length > 0) {
      movesUsingBothDice.push(move);
    }
  }

  if (movesUsingBothDice.length > 0) {
    return movesUsingBothDice;
  }

  const higherDie = Math.max(...uniqueDice);
  const higherDieMoves = directMoves.filter(m => m.die === higherDie);
  if (higherDieMoves.length > 0) return higherDieMoves;

  return directMoves;
}
