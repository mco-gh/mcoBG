import { io } from "socket.io-client";
import { assert } from "./types";
import type { TestCase } from "./types";

type Sock = ReturnType<typeof io>;

interface CreateRes { success: boolean; gameId?: string; color?: string; state?: unknown; error?: string; }
interface JoinRes   { success: boolean; gameId?: string; color?: string; state?: unknown; error?: string; }

function makeSocket(): Sock {
  return io("/", { path: "/api/socket.io", transports: ["websocket", "polling"] });
}

function withSocket<T>(fn: (socket: Sock) => Promise<T>, timeoutMs = 8000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const socket = makeSocket();
    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error(`Test timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    socket.on("connect", () => {
      fn(socket)
        .then((result) => { clearTimeout(timer); socket.disconnect(); resolve(result); })
        .catch((err)   => { clearTimeout(timer); socket.disconnect(); reject(err); });
    });

    socket.on("connect_error", (err: Error) => {
      clearTimeout(timer);
      socket.disconnect();
      reject(new Error(`Connect error: ${err.message}`));
    });
  });
}

// Returns { gameId, socket } — caller MUST disconnect the socket when done.
// Using withSocket() here would disconnect the creator immediately, triggering
// the server's disconnect handler which deletes the game room.
function createGameKeepAlive(): Promise<{ gameId: string; socket: Sock }> {
  return new Promise((resolve, reject) => {
    const socket = makeSocket();
    const timer = setTimeout(() => { socket.disconnect(); reject(new Error("createGame timeout")); }, 8000);
    socket.on("connect_error", (e: Error) => { clearTimeout(timer); reject(e); });
    socket.on("connect", () => {
      socket.emit("create-game", (res: CreateRes) => {
        clearTimeout(timer);
        if (!res.success || !res.gameId) { socket.disconnect(); reject(new Error(res.error ?? "create-game failed")); }
        else resolve({ gameId: res.gameId, socket });
      });
    });
  });
}

export const socketTests: TestCase[] = [
  {
    id: "socket-1",
    name: "Connects to the Socket.io server",
    category: "Network",
    async fn() {
      await withSocket(async (socket) => {
        assert(socket.connected, "Socket should be connected after connect event");
      });
    },
  },
  {
    id: "socket-2",
    name: "Creates a game room and receives a 6-character game ID",
    category: "Network",
    async fn() {
      await withSocket((socket) =>
        new Promise<void>((resolve, reject) => {
          socket.emit("create-game", (res: CreateRes) => {
            try {
              assert(res.success === true, `create-game failed: ${res.error}`);
              assert(typeof res.gameId === "string", "gameId should be a string");
              assert(res.gameId!.length === 6, `gameId should be 6 chars, got "${res.gameId}"`);
              assert(res.color === "white", `Creator should be assigned white, got "${res.color}"`);
              assert(res.state !== undefined, "state should be present in response");
              resolve();
            } catch (e) { reject(e); }
          });
        })
      );
    },
  },
  {
    id: "socket-3",
    name: "Second player joins a created game and receives color + state",
    category: "Network",
    async fn() {
      const { gameId, socket: s1 } = await createGameKeepAlive();
      try {
        await withSocket((s2) =>
          new Promise<void>((resolve, reject) => {
            s2.emit("join-game", { gameId }, (res: JoinRes) => {
              try {
                assert(res.success === true, `join-game failed: ${res.error}`);
                assert(res.gameId === gameId, `gameId mismatch: got "${res.gameId}"`);
                assert(res.color === "black", `Second player should be black, got "${res.color}"`);
                assert(res.state !== undefined, "state should be present");
                resolve();
              } catch (e) { reject(e); }
            });
          })
        );
      } finally {
        s1.disconnect();
      }
    },
  },
  {
    id: "socket-4",
    name: "Joining a non-existent game returns success:false with an error",
    category: "Network",
    async fn() {
      await withSocket((socket) =>
        new Promise<void>((resolve, reject) => {
          socket.emit("join-game", { gameId: "XXXXXX" }, (res: JoinRes) => {
            try {
              assert(res.success === false, "Expected failure for non-existent game");
              assert(typeof res.error === "string" && res.error.length > 0, "Expected an error string");
              resolve();
            } catch (e) { reject(e); }
          });
        })
      );
    },
  },
  {
    id: "socket-5",
    name: "game-started is broadcast to both players when the room fills",
    category: "Network",
    async fn() {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          s1.disconnect(); s2.disconnect();
          reject(new Error("Timeout: game-started event never fired"));
        }, 8000);

        const s1 = makeSocket();
        const s2 = makeSocket();

        s1.on("connect_error", (e: Error) => { clearTimeout(timer); reject(e); });
        s2.on("connect_error", (e: Error) => { clearTimeout(timer); reject(e); });

        s1.on("connect", () => {
          s1.emit("create-game", (res: CreateRes) => {
            if (!res.success || !res.gameId) {
              clearTimeout(timer); s1.disconnect(); s2.disconnect();
              reject(new Error(res.error ?? "create failed"));
              return;
            }
            const gid = res.gameId;

            s1.on("game-started", (data: { state: unknown }) => {
              clearTimeout(timer);
              s1.disconnect(); s2.disconnect();
              try {
                assert(data.state !== undefined, "game-started should include state");
                resolve();
              } catch (e) { reject(e); }
            });

            s2.on("connect", () => {
              s2.emit("join-game", { gameId: gid }, (r: JoinRes) => {
                if (!r.success) {
                  clearTimeout(timer); s1.disconnect(); s2.disconnect();
                  reject(new Error(r.error ?? "join failed"));
                }
              });
            });
          });
        });
      });
    },
  },
  {
    id: "socket-6",
    name: "A room can only hold two players — third join is rejected",
    category: "Network",
    async fn() {
      const { gameId, socket: s1 } = await createGameKeepAlive();
      try {
        // Second player joins successfully (keep alive so room stays open)
        const { socket: s2 } = await new Promise<{ socket: Sock }>((resolve, reject) => {
          const s = makeSocket();
          const timer = setTimeout(() => { s.disconnect(); reject(new Error("s2 connect timeout")); }, 8000);
          s.on("connect_error", (e: Error) => { clearTimeout(timer); reject(e); });
          s.on("connect", () => {
            s.emit("join-game", { gameId }, (res: JoinRes) => {
              clearTimeout(timer);
              if (res.success) resolve({ socket: s });
              else { s.disconnect(); reject(new Error(`Second join failed: ${res.error}`)); }
            });
          });
        });

        try {
          // Third player must be rejected
          await withSocket((s3) =>
            new Promise<void>((resolve, reject) => {
              s3.emit("join-game", { gameId }, (res: JoinRes) => {
                try {
                  assert(res.success === false, "Third player should be rejected");
                  assert(typeof res.error === "string" && res.error.length > 0, "Expected rejection error");
                  resolve();
                } catch (e) { reject(e); }
              });
            })
          );
        } finally {
          s2.disconnect();
        }
      } finally {
        s1.disconnect();
      }
    },
  },
];
