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

export const MOVEMENT_RULES = {
  white: {
    direction: 'ascending' as const,
    homeBoard: { start: 19, end: 24 },
    barFrom: -1,
    bearOffTo: 24,
    description: 'White moves from point 1 toward point 24',
  },
  black: {
    direction: 'descending' as const,
    homeBoard: { start: 1, end: 6 },
    barFrom: 24,
    bearOffTo: -1,
    description: 'Black moves from point 24 toward point 1',
  },
} as const;
