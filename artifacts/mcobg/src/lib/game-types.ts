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

export interface ValidMove {
  from: number;
  to: number;
  die: number;
}
