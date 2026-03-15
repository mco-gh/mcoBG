export type PlayerColor = 'white' | 'black';

export interface BoardState {
  points: number[];
  whiteBar: number;
  blackBar: number;
  whiteOff: number;
  blackOff: number;
}

export interface GameState {
  board: BoardState;
  currentPlayer: PlayerColor;
  dice: number[];
  remainingMoves: number[];
  gameOver: boolean;
  winner: PlayerColor | null;
  lastMove: string | null;
}

export function createInitialBoard(): BoardState {
  const points = new Array(24).fill(0);
  points[0] = 2;
  points[5] = -5;
  points[7] = -3;
  points[11] = 5;
  points[12] = -5;
  points[16] = 3;
  points[18] = 5;
  points[23] = -2;
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

function isWhite(val: number): boolean {
  return val > 0;
}

function isBlack(val: number): boolean {
  return val < 0;
}

function checkerCount(val: number): number {
  return Math.abs(val);
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

export function getValidMoves(
  board: BoardState,
  player: PlayerColor,
  remainingMoves: number[]
): { from: number; to: number; die: number }[] {
  const moves: { from: number; to: number; die: number }[] = [];
  const uniqueDice = [...new Set(remainingMoves)];

  for (const die of uniqueDice) {
    if (player === 'white' && board.whiteBar > 0) {
      const target = die - 1;
      const pointVal = board.points[target];
      if (pointVal >= -1) {
        moves.push({ from: -1, to: target, die });
      }
      continue;
    }
    if (player === 'black' && board.blackBar > 0) {
      const target = 24 - die;
      const pointVal = board.points[target];
      if (pointVal <= 1) {
        moves.push({ from: 24, to: target, die });
      }
      continue;
    }

    for (let i = 0; i < 24; i++) {
      const val = board.points[i];
      if (player === 'white' && !isWhite(val)) continue;
      if (player === 'black' && !isBlack(val)) continue;

      if (player === 'white') {
        const target = i - die;
        if (target >= 0) {
          if (board.points[target] >= -1) {
            moves.push({ from: i, to: target, die });
          }
        } else if (canBearOff(board, 'white')) {
          const highestPoint = findHighestCheckerPoint(board, 'white');
          if (i === highestPoint || target === -1) {
            moves.push({ from: i, to: -1, die });
          } else if (target < -1 && i === highestPoint) {
            moves.push({ from: i, to: -1, die });
          }
        }
      } else {
        const target = i + die;
        if (target <= 23) {
          if (board.points[target] <= 1) {
            moves.push({ from: i, to: target, die });
          }
        } else if (canBearOff(board, 'black')) {
          const highestPoint = findHighestCheckerPoint(board, 'black');
          if (i === highestPoint || target === 24) {
            moves.push({ from: i, to: 24, die });
          } else if (target > 24 && i === highestPoint) {
            moves.push({ from: i, to: 24, die });
          }
        }
      }
    }
  }

  return moves;
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
      if (isBlack(newBoard.points[to]) && checkerCount(newBoard.points[to]) === 1) {
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
      if (isWhite(newBoard.points[to]) && checkerCount(newBoard.points[to]) === 1) {
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
