import {
  createInitialBoard,
  getValidMoves,
  applyMove,
  checkWinner,
  getRemainingMoves,
  getValidMovesForFullTurn,
} from "@workspace/backgammon";
import { assert, assertEqual, makeBoard } from "./types";
import type { TestCase } from "./types";

export const gameLogicTests: TestCase[] = [
  // ── Initial Board ─────────────────────────────────────────────────────
  {
    id: "board-1",
    name: "Board has exactly 24 points",
    category: "Initial Board",
    fn() {
      assertEqual(createInitialBoard().points.length, 24, "Expected 24 points");
    },
  },
  {
    id: "board-2",
    name: "White starts with 15 pieces",
    category: "Initial Board",
    fn() {
      const b = createInitialBoard();
      const count = b.points.reduce((s, p) => s + (p > 0 ? p : 0), 0);
      assertEqual(count, 15, `White piece count = ${count}, expected 15`);
    },
  },
  {
    id: "board-3",
    name: "Black starts with 15 pieces",
    category: "Initial Board",
    fn() {
      const b = createInitialBoard();
      const count = b.points.reduce((s, p) => s + (p < 0 ? -p : 0), 0);
      assertEqual(count, 15, `Black piece count = ${count}, expected 15`);
    },
  },
  {
    id: "board-4",
    name: "Bars start empty",
    category: "Initial Board",
    fn() {
      const b = createInitialBoard();
      assertEqual(b.whiteBar, 0, "whiteBar should be 0");
      assertEqual(b.blackBar, 0, "blackBar should be 0");
    },
  },
  {
    id: "board-5",
    name: "Bear-off counts start at zero",
    category: "Initial Board",
    fn() {
      const b = createInitialBoard();
      assertEqual(b.whiteOff, 0, "whiteOff should be 0");
      assertEqual(b.blackOff, 0, "blackOff should be 0");
    },
  },
  {
    id: "board-6",
    name: "Initial White positions: 2@23, 5@12, 3@7, 5@5",
    category: "Initial Board",
    fn() {
      const b = createInitialBoard();
      assertEqual(b.points[23], 2, "White: 2 at index 23");
      assertEqual(b.points[12], 5, "White: 5 at index 12");
      assertEqual(b.points[7], 3, "White: 3 at index 7");
      assertEqual(b.points[5], 5, "White: 5 at index 5");
    },
  },
  {
    id: "board-7",
    name: "Initial Black positions: -2@0, -5@11, -3@16, -5@18",
    category: "Initial Board",
    fn() {
      const b = createInitialBoard();
      assertEqual(b.points[0], -2, "Black: -2 at index 0");
      assertEqual(b.points[11], -5, "Black: -5 at index 11");
      assertEqual(b.points[16], -3, "Black: -3 at index 16");
      assertEqual(b.points[18], -5, "Black: -5 at index 18");
    },
  },

  // ── Movement Direction ────────────────────────────────────────────────
  {
    id: "move-1",
    name: "White moves high→low (index 10 → 7 with die 3)",
    category: "Movement Direction",
    fn() {
      const b = makeBoard();
      b.points[10] = 1;
      const moves = getValidMoves(b, "white", [3]);
      assert(moves.some((m) => m.from === 10 && m.to === 7), "Expected move 10→7");
    },
  },
  {
    id: "move-2",
    name: "Black moves low→high (index 10 → 13 with die 3)",
    category: "Movement Direction",
    fn() {
      const b = makeBoard();
      b.points[10] = -1;
      const moves = getValidMoves(b, "black", [3]);
      assert(moves.some((m) => m.from === 10 && m.to === 13), "Expected move 10→13");
    },
  },
  {
    id: "move-3",
    name: "White cannot move to a higher index",
    category: "Movement Direction",
    fn() {
      const b = makeBoard();
      b.points[10] = 1;
      const moves = getValidMoves(b, "white", [3]);
      assert(!moves.some((m) => m.from === 10 && m.to === 13), "White must not move to higher index");
    },
  },
  {
    id: "move-4",
    name: "Black cannot move to a lower index",
    category: "Movement Direction",
    fn() {
      const b = makeBoard();
      b.points[10] = -1;
      const moves = getValidMoves(b, "black", [3]);
      assert(!moves.some((m) => m.from === 10 && m.to === 7), "Black must not move to lower index");
    },
  },
  {
    id: "move-5",
    name: "White has valid moves from starting position",
    category: "Movement Direction",
    fn() {
      const b = createInitialBoard();
      assert(getValidMoves(b, "white", [3]).length > 0, "White should have moves");
    },
  },
  {
    id: "move-6",
    name: "Black has valid moves from starting position",
    category: "Movement Direction",
    fn() {
      const b = createInitialBoard();
      assert(getValidMoves(b, "black", [3]).length > 0, "Black should have moves");
    },
  },

  // ── Bar & Re-Entry ────────────────────────────────────────────────────
  {
    id: "bar-1",
    name: "White re-enters bar at 24-die (die=2 → index 22)",
    category: "Bar & Re-Entry",
    fn() {
      const b = makeBoard({ whiteBar: 1 });
      const moves = getValidMoves(b, "white", [2]);
      assert(moves.some((m) => m.from === -1 && m.to === 22), "White bar die=2 should go to index 22");
    },
  },
  {
    id: "bar-2",
    name: "Black re-enters bar at die-1 (die=3 → index 2)",
    category: "Bar & Re-Entry",
    fn() {
      const b = makeBoard({ blackBar: 1 });
      const moves = getValidMoves(b, "black", [3]);
      assert(moves.some((m) => m.from === 24 && m.to === 2), "Black bar die=3 should go to index 2");
    },
  },
  {
    id: "bar-3",
    name: "White bar blocks all other white moves",
    category: "Bar & Re-Entry",
    fn() {
      const b = makeBoard({ whiteBar: 1 });
      b.points[10] = 3;
      const moves = getValidMoves(b, "white", [3]);
      assert(moves.every((m) => m.from === -1), "All moves must come from bar");
    },
  },
  {
    id: "bar-4",
    name: "Black bar blocks all other black moves",
    category: "Bar & Re-Entry",
    fn() {
      const b = makeBoard({ blackBar: 1 });
      b.points[10] = -3;
      const moves = getValidMoves(b, "black", [3]);
      assert(moves.every((m) => m.from === 24), "All moves must come from bar");
    },
  },
  {
    id: "bar-5",
    name: "White cannot re-enter on a blocked point (2+ black pieces)",
    category: "Bar & Re-Entry",
    fn() {
      const b = makeBoard({ whiteBar: 1 });
      b.points[22] = -2;
      const moves = getValidMoves(b, "white", [2]);
      assert(!moves.some((m) => m.to === 22), "White should not enter at blocked point 22");
    },
  },
  {
    id: "bar-6",
    name: "White can re-enter by hitting a blot (1 black piece)",
    category: "Bar & Re-Entry",
    fn() {
      const b = makeBoard({ whiteBar: 1 });
      b.points[22] = -1;
      const moves = getValidMoves(b, "white", [2]);
      assert(moves.some((m) => m.from === -1 && m.to === 22), "White should hit blot at 22");
    },
  },

  // ── Bear-Off ──────────────────────────────────────────────────────────
  {
    id: "bearoff-1",
    name: "White can bear off when all pieces in home (indices 0–5)",
    category: "Bear-Off",
    fn() {
      const b = makeBoard();
      b.points[0] = 15;
      const moves = getValidMoves(b, "white", [1]);
      assert(moves.some((m) => m.to === -1), "White should be able to bear off");
    },
  },
  {
    id: "bearoff-2",
    name: "Black can bear off when all pieces in home (indices 18–23)",
    category: "Bear-Off",
    fn() {
      const b = makeBoard();
      b.points[23] = -15;
      const moves = getValidMoves(b, "black", [1]);
      assert(moves.some((m) => m.to === 24), "Black should be able to bear off");
    },
  },
  {
    id: "bearoff-3",
    name: "White cannot bear off with a piece outside home (index > 5)",
    category: "Bear-Off",
    fn() {
      const b = makeBoard();
      b.points[0] = 14;
      b.points[10] = 1;
      const moves = getValidMoves(b, "white", [1]);
      assert(!moves.some((m) => m.to === -1), "White cannot bear off with piece at index 10");
    },
  },
  {
    id: "bearoff-4",
    name: "Black cannot bear off with a piece outside home (index < 18)",
    category: "Bear-Off",
    fn() {
      const b = makeBoard();
      b.points[23] = -14;
      b.points[10] = -1;
      const moves = getValidMoves(b, "black", [1]);
      assert(!moves.some((m) => m.to === 24), "Black cannot bear off with piece at index 10");
    },
  },
  {
    id: "bearoff-5",
    name: "White exact bear-off: piece at index 2, die 3 → to=-1",
    category: "Bear-Off",
    fn() {
      const b = makeBoard();
      b.points[2] = 15;
      const moves = getValidMoves(b, "white", [3]);
      assert(moves.some((m) => m.from === 2 && m.to === -1), "Exact bear-off: 2 with die 3");
    },
  },
  {
    id: "bearoff-6",
    name: "White overshoot bear-off: only piece at index 1, die 4",
    category: "Bear-Off",
    fn() {
      const b = makeBoard();
      b.points[1] = 15;
      const moves = getValidMoves(b, "white", [4]);
      assert(
        moves.some((m) => m.from === 1 && m.to === -1),
        "Overshoot bear-off should be allowed (no pieces at 2-5)"
      );
    },
  },

  // ── Move Validation ───────────────────────────────────────────────────
  {
    id: "valid-1",
    name: "Cannot land on point occupied by 2+ opponent pieces",
    category: "Move Validation",
    fn() {
      const b = makeBoard();
      b.points[10] = 1;
      b.points[7] = -2;
      const moves = getValidMoves(b, "white", [3]);
      assert(!moves.some((m) => m.to === 7), "Should not land on 7 (2 black pieces)");
    },
  },
  {
    id: "valid-2",
    name: "Can hit a lone opponent piece (blot)",
    category: "Move Validation",
    fn() {
      const b = makeBoard();
      b.points[10] = 1;
      b.points[7] = -1;
      const moves = getValidMoves(b, "white", [3]);
      assert(moves.some((m) => m.from === 10 && m.to === 7), "Should hit blot at 7");
    },
  },
  {
    id: "valid-3",
    name: "Can land on a point with own pieces",
    category: "Move Validation",
    fn() {
      const b = makeBoard();
      b.points[10] = 2;
      b.points[7] = 3;
      const moves = getValidMoves(b, "white", [3]);
      assert(moves.some((m) => m.from === 10 && m.to === 7), "Should land on own pieces at 7");
    },
  },
  {
    id: "valid-4",
    name: "Doubles give 4 remaining moves",
    category: "Move Validation",
    fn() {
      const remaining = getRemainingMoves([3, 3]);
      assertEqual(remaining.length, 4, `Doubles should give 4 moves, got ${remaining.length}`);
    },
  },
  {
    id: "valid-5",
    name: "Non-doubles give 2 remaining moves",
    category: "Move Validation",
    fn() {
      const remaining = getRemainingMoves([2, 5]);
      assertEqual(remaining.length, 2, `Non-doubles should give 2 moves, got ${remaining.length}`);
    },
  },
  {
    id: "valid-6",
    name: "getValidMovesForFullTurn returns moves when moves exist",
    category: "Move Validation",
    fn() {
      const b = createInitialBoard();
      const moves = getValidMovesForFullTurn(b, "white", [3, 2]);
      assert(moves.length > 0, "Should have valid full-turn moves from start");
    },
  },

  // ── Apply Move ────────────────────────────────────────────────────────
  {
    id: "apply-1",
    name: "Apply move decreases source point count",
    category: "Apply Move",
    fn() {
      const b = makeBoard();
      b.points[10] = 2;
      const { newBoard } = applyMove(b, "white", 10, 7);
      assertEqual(newBoard.points[10], 1, "Source should decrease from 2 to 1");
    },
  },
  {
    id: "apply-2",
    name: "Apply move increases destination point count",
    category: "Apply Move",
    fn() {
      const b = makeBoard();
      b.points[10] = 1;
      const { newBoard } = applyMove(b, "white", 10, 7);
      assertEqual(newBoard.points[7], 1, "Destination should be 1");
    },
  },
  {
    id: "apply-3",
    name: "Apply move hits blot — sends opponent to bar",
    category: "Apply Move",
    fn() {
      const b = makeBoard();
      b.points[10] = 1;
      b.points[7] = -1;
      const { newBoard, hitOpponent } = applyMove(b, "white", 10, 7);
      assert(hitOpponent, "hitOpponent should be true");
      assertEqual(newBoard.points[7], 1, "Destination should be 1 (white)");
      assertEqual(newBoard.blackBar, 1, "Black bar should be 1");
    },
  },
  {
    id: "apply-4",
    name: "Apply move increments whiteOff for bear-off (to=-1)",
    category: "Apply Move",
    fn() {
      const b = makeBoard();
      b.points[1] = 1;
      const { newBoard } = applyMove(b, "white", 1, -1);
      assertEqual(newBoard.whiteOff, 1, "whiteOff should be 1");
    },
  },
  {
    id: "apply-5",
    name: "Apply move increments blackOff for bear-off (to=24)",
    category: "Apply Move",
    fn() {
      const b = makeBoard();
      b.points[22] = -1;
      const { newBoard } = applyMove(b, "black", 22, 24);
      assertEqual(newBoard.blackOff, 1, "blackOff should be 1");
    },
  },
  {
    id: "apply-6",
    name: "White enters from bar (from=-1) decrements whiteBar",
    category: "Apply Move",
    fn() {
      const b = makeBoard({ whiteBar: 2 });
      const { newBoard } = applyMove(b, "white", -1, 22);
      assertEqual(newBoard.whiteBar, 1, "whiteBar should decrease from 2 to 1");
    },
  },

  // ── Game State & Winner ───────────────────────────────────────────────
  {
    id: "state-1",
    name: "checkWinner returns null during an active game",
    category: "Game State",
    fn() {
      assertEqual(checkWinner(createInitialBoard()), null, "No winner during active game");
    },
  },
  {
    id: "state-2",
    name: 'checkWinner returns "white" when whiteOff = 15',
    category: "Game State",
    fn() {
      assertEqual(checkWinner(makeBoard({ whiteOff: 15 })), "white", "White wins");
    },
  },
  {
    id: "state-3",
    name: 'checkWinner returns "black" when blackOff = 15',
    category: "Game State",
    fn() {
      assertEqual(checkWinner(makeBoard({ blackOff: 15 })), "black", "Black wins");
    },
  },
  {
    id: "state-4",
    name: "checkWinner does not trigger prematurely (14 pieces off)",
    category: "Game State",
    fn() {
      assertEqual(checkWinner(makeBoard({ whiteOff: 14 })), null, "14 off is not a win");
    },
  },
];
