import { io } from "socket.io-client";
import { assert } from "./types";
import type { TestCase } from "./types";

function withSocket<T>(
  fn: (socket: ReturnType<typeof io>) => Promise<T>,
  timeoutMs = 6000
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const socket = io({ path: "/api/socket.io", transports: ["websocket", "polling"] });
    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error(`Test timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    fn(socket)
      .then((result) => {
        clearTimeout(timer);
        socket.disconnect();
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        socket.disconnect();
        reject(err);
      });
  });
}

function waitForConnect(socket: ReturnType<typeof io>): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (socket.connected) return resolve();
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
  });
}

function waitForEvent<T>(
  socket: ReturnType<typeof io>,
  event: string,
  timeoutMs = 4000
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for '${event}'`)),
      timeoutMs
    );
    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

function createGame(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const s = io({ path: "/api/socket.io", transports: ["websocket", "polling"] });
    const timer = setTimeout(() => { s.disconnect(); reject(new Error("Create game timeout")); }, 6000);
    s.on("connect", () => s.emit("create-game"));
    s.on("game-created", (d: { gameId: string }) => {
      clearTimeout(timer);
      s.disconnect();
      resolve(d.gameId);
    });
    s.on("connect_error", (e: Error) => { clearTimeout(timer); reject(e); });
  });
}

export const socketTests: TestCase[] = [
  {
    id: "socket-1",
    name: "Connects to the Socket.io server",
    category: "Network",
    async fn() {
      await withSocket(async (socket) => {
        await waitForConnect(socket);
        assert(socket.connected, "Socket should be connected");
      });
    },
  },
  {
    id: "socket-2",
    name: "Creates a game room and receives a 6-character game ID",
    category: "Network",
    async fn() {
      await withSocket(async (socket) => {
        await waitForConnect(socket);
        socket.emit("create-game");
        const data = await waitForEvent<{ gameId: string; state: unknown }>(socket, "game-created");
        assert(typeof data.gameId === "string", "gameId should be a string");
        assert(data.gameId.length === 6, `gameId should be 6 chars, got: "${data.gameId}"`);
        assert(data.state !== null && data.state !== undefined, "state should be present");
      });
    },
  },
  {
    id: "socket-3",
    name: "Second player can join a created game and receives a color",
    category: "Network",
    async fn() {
      const gameId = await createGame();

      await withSocket(async (socket) => {
        await waitForConnect(socket);
        socket.emit("join-game", { gameId });
        const data = await waitForEvent<{ gameId: string; color: string }>(socket, "game-joined");
        assert(data.gameId === gameId, `gameId mismatch: ${data.gameId}`);
        assert(data.color === "white" || data.color === "black", `Invalid color: ${data.color}`);
      });
    },
  },
  {
    id: "socket-4",
    name: "Joining a non-existent game returns a game-error event",
    category: "Network",
    async fn() {
      await withSocket(async (socket) => {
        await waitForConnect(socket);
        socket.emit("join-game", { gameId: "XXXXXX" });
        const data = await waitForEvent<{ message: string }>(socket, "game-error");
        assert(typeof data.message === "string" && data.message.length > 0, "Expected an error message");
      });
    },
  },
  {
    id: "socket-5",
    name: "Game state is broadcast when both players join",
    category: "Network",
    async fn() {
      const gameId = await createGame();

      await withSocket(async (socket) => {
        await waitForConnect(socket);

        const waitForState = waitForEvent<{ state: { board: unknown } }>(socket, "game-state", 4000);
        socket.emit("join-game", { gameId });
        const data = await waitForState;
        assert(data.state !== undefined, "game-state event should include state");
      });
    },
  },
  {
    id: "socket-6",
    name: "A room can only hold two players — third join fails",
    category: "Network",
    async fn() {
      const gameId = await createGame();
      await new Promise<void>((resolve, reject) => {
        const s = io({ path: "/api/socket.io", transports: ["websocket", "polling"] });
        const timer = setTimeout(() => { s.disconnect(); reject(new Error("Join timeout")); }, 6000);
        s.on("connect", () => s.emit("join-game", { gameId }));
        s.on("game-joined", () => { clearTimeout(timer); s.disconnect(); resolve(); });
        s.on("game-error", (e: { message: string }) => { clearTimeout(timer); s.disconnect(); reject(new Error(e.message)); });
        s.on("connect_error", (e: Error) => { clearTimeout(timer); reject(e); });
      });

      await withSocket(async (socket) => {
        await waitForConnect(socket);
        socket.emit("join-game", { gameId });
        const data = await waitForEvent<{ message: string }>(socket, "game-error", 4000);
        assert(typeof data.message === "string", "Third player should receive an error");
      });
    },
  },
];
