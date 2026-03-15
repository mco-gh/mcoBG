import { Server as SocketServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import {
  createInitialGameState,
  rollDice,
  getRemainingMoves,
  getValidMovesForFullTurn,
  applyMove,
  checkWinner,
  hasAnyValidMoves,
} from "./game-logic.js";
import type {
  GameState,
  PlayerColor,
  ValidMove,
  CreateGameResponse,
  JoinGameResponse,
  RollDiceResponse,
  MovePieceResponse,
  GenericResponse,
} from "@workspace/backgammon";

interface GameRoom {
  gameId: string;
  state: GameState;
  players: { white: string | null; black: string | null };
  peerIds: { white: string | null; black: string | null };
}

const games = new Map<string, GameRoom>();

function generateGameId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function getPlayerColor(gameRoom: GameRoom, socketId: string): PlayerColor | null {
  if (gameRoom.players.white === socketId) return 'white';
  if (gameRoom.players.black === socketId) return 'black';
  return null;
}

export function setupSocketIO(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/api/socket.io",
  });

  io.on("connection", (socket: Socket) => {
    console.log(`Player connected: ${socket.id}`);

    socket.on("create-game", (callback: (res: CreateGameResponse) => void) => {
      let gameId = generateGameId();
      while (games.has(gameId)) {
        gameId = generateGameId();
      }

      const room: GameRoom = {
        gameId,
        state: createInitialGameState(),
        players: { white: socket.id, black: null },
        peerIds: { white: null, black: null },
      };
      games.set(gameId, room);
      socket.join(gameId);

      callback({
        success: true,
        gameId,
        color: 'white',
        state: room.state,
      });
    });

    socket.on("join-game", (data: { gameId: string }, callback: (res: JoinGameResponse) => void) => {
      const gameId = data.gameId.toUpperCase();
      const room = games.get(gameId);

      if (!room) {
        callback({ success: false, error: "Game not found" });
        return;
      }
      if (room.players.black !== null) {
        callback({ success: false, error: "Game is full" });
        return;
      }

      room.players.black = socket.id;
      socket.join(gameId);

      callback({
        success: true,
        gameId,
        color: 'black',
        state: room.state,
      });

      io.to(gameId).emit("game-started", { state: room.state });
    });

    socket.on("roll-dice", (data: { gameId: string }, callback: (res: RollDiceResponse) => void) => {
      const room = games.get(data.gameId);
      if (!room) { callback({ success: false, error: "Game not found" }); return; }

      const color = getPlayerColor(room, socket.id);
      if (!color || color !== room.state.currentPlayer) {
        callback({ success: false, error: "Not your turn" });
        return;
      }

      if (room.state.dice.length > 0 && room.state.remainingMoves.length > 0) {
        callback({ success: false, error: "Already rolled" });
        return;
      }

      const dice = rollDice();
      room.state.dice = dice;
      room.state.remainingMoves = getRemainingMoves(dice);

      const validMoves = getValidMovesForFullTurn(room.state.board, color, room.state.remainingMoves);

      if (validMoves.length === 0) {
        room.state.lastMove = `${color === 'white' ? 'White' : 'Black'} rolled ${dice[0]}-${dice[1]} but has no valid moves`;
        room.state.currentPlayer = color === 'white' ? 'black' : 'white';
        room.state.dice = [];
        room.state.remainingMoves = [];

        io.to(data.gameId).emit("state-update", { state: room.state });
        callback({ success: true, dice, noMoves: true });
        return;
      }

      io.to(data.gameId).emit("state-update", { state: room.state });
      callback({ success: true, dice, noMoves: false, validMoves });
    });

    socket.on("move-piece", (data: { gameId: string; from: number; to: number }, callback: (res: MovePieceResponse) => void) => {
      const room = games.get(data.gameId);
      if (!room) { callback({ success: false, error: "Game not found" }); return; }

      const color = getPlayerColor(room, socket.id);
      if (!color || color !== room.state.currentPlayer) {
        callback({ success: false, error: "Not your turn" });
        return;
      }

      const constrainedMoves = getValidMovesForFullTurn(room.state.board, color, room.state.remainingMoves);
      const matchedMove = constrainedMoves.find(
        (m) => m.from === data.from && m.to === data.to
      );

      if (!matchedMove) {
        callback({ success: false, error: "Invalid move" });
        return;
      }

      const { newBoard, hitOpponent } = applyMove(room.state.board, color, data.from, data.to);
      room.state.board = newBoard;

      const dieIndex = room.state.remainingMoves.indexOf(matchedMove.die);
      if (dieIndex !== -1) {
        room.state.remainingMoves.splice(dieIndex, 1);
      }

      const colorName = color === 'white' ? 'White' : 'Black';
      const opponentName = color === 'white' ? 'Black' : 'White';
      if (hitOpponent) {
        room.state.lastMove = `${colorName} hit ${opponentName}!`;
      } else {
        room.state.lastMove = `${colorName} moved`;
      }

      const winner = checkWinner(room.state.board);
      if (winner) {
        room.state.gameOver = true;
        room.state.winner = winner;
        room.state.lastMove = `${winner === 'white' ? 'White' : 'Black'} wins!`;
        io.to(data.gameId).emit("state-update", { state: room.state });
        io.to(data.gameId).emit("game-over", { winner });
        callback({ success: true, hitOpponent });
        return;
      }

      let nextValidMoves: ValidMove[] = [];

      if (room.state.remainingMoves.length === 0) {
        room.state.currentPlayer = color === 'white' ? 'black' : 'white';
        room.state.dice = [];
      } else {
        const hasMore = hasAnyValidMoves(room.state.board, color, room.state.remainingMoves);
        if (!hasMore) {
          room.state.lastMove = `${colorName} has no more valid moves`;
          room.state.currentPlayer = color === 'white' ? 'black' : 'white';
          room.state.dice = [];
          room.state.remainingMoves = [];
        } else {
          nextValidMoves = getValidMovesForFullTurn(room.state.board, color, room.state.remainingMoves);
        }
      }

      io.to(data.gameId).emit("state-update", { state: room.state });
      callback({ success: true, hitOpponent, validMoves: nextValidMoves });
    });

    socket.on("end-turn", (data: { gameId: string }, callback: (res: GenericResponse) => void) => {
      const room = games.get(data.gameId);
      if (!room) { callback({ success: false, error: "Game not found" }); return; }

      const color = getPlayerColor(room, socket.id);
      if (!color || color !== room.state.currentPlayer) {
        callback({ success: false, error: "Not your turn" });
        return;
      }

      room.state.currentPlayer = color === 'white' ? 'black' : 'white';
      room.state.dice = [];
      room.state.remainingMoves = [];

      io.to(data.gameId).emit("state-update", { state: room.state });
      callback({ success: true });
    });

    socket.on("share-peer-id", (data: { gameId: string; peerId: string }) => {
      const room = games.get(data.gameId);
      if (!room) return;

      const color = getPlayerColor(room, socket.id);
      if (!color) return;

      room.peerIds[color] = data.peerId;
      socket.to(data.gameId).emit("peer-id-shared", { peerId: data.peerId, color });
    });

    socket.on("request-rematch", (data: { gameId: string }) => {
      const room = games.get(data.gameId);
      if (!room) return;
      socket.to(data.gameId).emit("rematch-requested");
    });

    socket.on("accept-rematch", (data: { gameId: string }) => {
      const room = games.get(data.gameId);
      if (!room) return;
      room.state = createInitialGameState();
      io.to(data.gameId).emit("rematch-accepted", { state: room.state });
    });

    socket.on("disconnect", () => {
      console.log(`Player disconnected: ${socket.id}`);
      for (const [gameId, room] of games.entries()) {
        const color = getPlayerColor(room, socket.id);
        if (color) {
          socket.to(gameId).emit("opponent-disconnected");
          games.delete(gameId);
          break;
        }
      }
    });
  });

  return io;
}
