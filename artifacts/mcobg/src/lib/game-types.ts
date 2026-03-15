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

export interface CreateGameResponse {
  success: boolean;
  gameId?: string;
  color?: PlayerColor;
  state?: GameState;
  error?: string;
}

export interface JoinGameResponse {
  success: boolean;
  gameId?: string;
  color?: PlayerColor;
  state?: GameState;
  error?: string;
}

export interface RollDiceResponse {
  success: boolean;
  dice?: number[];
  noMoves?: boolean;
  validMoves?: ValidMove[];
  error?: string;
}

export interface MovePieceResponse {
  success: boolean;
  hitOpponent?: boolean;
  validMoves?: ValidMove[];
  error?: string;
}

export interface GenericResponse {
  success: boolean;
  error?: string;
}
