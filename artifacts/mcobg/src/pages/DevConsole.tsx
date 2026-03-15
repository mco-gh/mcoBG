import { useState, useEffect, useRef, useCallback } from "react";
import { getSocket } from "@/lib/socket";

interface LogEntry {
  id: number;
  timestamp: string;
  direction: "sent" | "received" | "error" | "system";
  event: string;
  payload: unknown;
}

let logIdCounter = 0;

export default function DevConsole() {
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [gameId, setGameId] = useState("");
  const [gameState, setGameState] = useState<unknown>(null);
  const [joinId, setJoinId] = useState("");
  const [moveFrom, setMoveFrom] = useState("");
  const [moveTo, setMoveTo] = useState("");
  const [peerId, setPeerId] = useState("");
  const [rawEvent, setRawEvent] = useState("");
  const [rawPayload, setRawPayload] = useState("");
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());
  const logEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef(getSocket());

  const addLog = useCallback(
    (direction: LogEntry["direction"], event: string, payload: unknown) => {
      setLogs((prev) => [
        ...prev,
        {
          id: ++logIdCounter,
          timestamp: new Date().toISOString().slice(11, 23),
          direction,
          event,
          payload,
        },
      ]);
    },
    []
  );

  useEffect(() => {
    const socket = socketRef.current;
    setConnected(socket.connected);

    const onConnect = () => {
      setConnected(true);
      addLog("system", "connect", { id: socket.id });
    };
    const onDisconnect = (reason: string) => {
      setConnected(false);
      addLog("system", "disconnect", { reason });
    };
    const onAny = (event: string, ...args: unknown[]) => {
      addLog("received", event, args.length === 1 ? args[0] : args);
      if (event === "state-update" && args[0] && typeof args[0] === "object") {
        setGameState((args[0] as Record<string, unknown>).state ?? args[0]);
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.onAny(onAny);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.offAny(onAny);
    };
  }, [addLog]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const emit = useCallback(
    (event: string, data?: unknown) => {
      const socket = socketRef.current;
      addLog("sent", event, data ?? null);
      const handleAck = (response: unknown) => {
        addLog("received", `${event}:ack`, response);
        if (response && typeof response === "object") {
          const res = response as Record<string, unknown>;
          if ("gameId" in res) setGameId(res.gameId as string);
          if ("state" in res) setGameState(res.state);
        }
      };
      if (data !== undefined) {
        socket.emit(event, data, handleAck);
      } else {
        socket.emit(event, handleAck);
      }
    },
    [addLog]
  );

  const toggleExpand = useCallback((id: number) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const directionStyle = (d: LogEntry["direction"]) => {
    switch (d) {
      case "sent":
        return "text-blue-400";
      case "received":
        return "text-green-400";
      case "error":
        return "text-red-400";
      case "system":
        return "text-yellow-400";
    }
  };

  const directionArrow = (d: LogEntry["direction"]) => {
    switch (d) {
      case "sent":
        return "\u2191";
      case "received":
        return "\u2193";
      case "error":
        return "\u2717";
      case "system":
        return "\u2022";
    }
  };

  const inputClass =
    "bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-blue-500 font-mono";
  const btnClass =
    "px-3 py-1.5 rounded text-sm font-medium transition-colors cursor-pointer";
  const btnPrimary = `${btnClass} bg-blue-600 hover:bg-blue-700 text-white`;
  const btnSecondary = `${btnClass} bg-gray-700 hover:bg-gray-600 text-gray-200`;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 font-mono">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">mcoBG Dev Console</h1>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 text-sm ${connected ? "text-green-400" : "text-red-400"}`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`}
              />
              {connected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <label className="text-sm text-gray-400 shrink-0">Game ID:</label>
          <input
            className={`${inputClass} w-40`}
            placeholder="Auto-populated"
            value={gameId}
            onChange={(e) => setGameId(e.target.value.toUpperCase())}
          />
          <span className="text-xs text-gray-500">
            Auto-filled on create/join. Edit to target a different game.
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-3">
            <Section title="Game Actions">
              <div className="space-y-2">
                <button
                  className={`${btnPrimary} w-full`}
                  onClick={() => emit("create-game")}
                >
                  create-game
                </button>

                <div className="flex gap-2">
                  <input
                    className={`${inputClass} flex-1`}
                    placeholder="Game ID (or uses above)"
                    value={joinId}
                    onChange={(e) => setJoinId(e.target.value)}
                  />
                  <button
                    className={btnPrimary}
                    onClick={() =>
                      emit("join-game", { gameId: joinId || gameId })
                    }
                  >
                    join-game
                  </button>
                </div>

                <div className="flex gap-2 items-center">
                  <span className="text-xs text-gray-500 shrink-0">Game ID: {gameId || "---"}</span>
                  <button
                    className={`${btnSecondary} flex-1`}
                    onClick={() => emit("roll-dice", { gameId })}
                    disabled={!gameId}
                  >
                    roll-dice
                  </button>
                </div>

                <div className="flex gap-2">
                  <span className="text-xs text-gray-500 shrink-0 self-center">Game ID: {gameId || "---"}</span>
                  <input
                    className={`${inputClass} w-16`}
                    placeholder="from"
                    type="number"
                    value={moveFrom}
                    onChange={(e) => setMoveFrom(e.target.value)}
                  />
                  <input
                    className={`${inputClass} w-16`}
                    placeholder="to"
                    type="number"
                    value={moveTo}
                    onChange={(e) => setMoveTo(e.target.value)}
                  />
                  <button
                    className={btnPrimary}
                    onClick={() =>
                      emit("move-piece", {
                        gameId,
                        from: Number(moveFrom),
                        to: Number(moveTo),
                      })
                    }
                    disabled={!gameId}
                  >
                    move-piece
                  </button>
                </div>

                <div className="flex gap-2 items-center">
                  <span className="text-xs text-gray-500 shrink-0">Game ID: {gameId || "---"}</span>
                  <button
                    className={`${btnSecondary} flex-1`}
                    onClick={() => emit("end-turn", { gameId })}
                    disabled={!gameId}
                  >
                    end-turn
                  </button>
                </div>
              </div>
            </Section>

            <Section title="Peer / Rematch">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <span className="text-xs text-gray-500 shrink-0 self-center">Game ID: {gameId || "---"}</span>
                  <input
                    className={`${inputClass} flex-1`}
                    placeholder="Peer ID"
                    value={peerId}
                    onChange={(e) => setPeerId(e.target.value)}
                  />
                  <button
                    className={btnSecondary}
                    onClick={() =>
                      emit("share-peer-id", { gameId, peerId })
                    }
                    disabled={!gameId}
                  >
                    share-peer-id
                  </button>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-gray-500 shrink-0">Game ID: {gameId || "---"}</span>
                  <button
                    className={`${btnSecondary} flex-1`}
                    onClick={() =>
                      emit("request-rematch", { gameId })
                    }
                    disabled={!gameId}
                  >
                    request-rematch
                  </button>
                  <button
                    className={`${btnSecondary} flex-1`}
                    onClick={() =>
                      emit("accept-rematch", { gameId })
                    }
                    disabled={!gameId}
                  >
                    accept-rematch
                  </button>
                </div>
              </div>
            </Section>

            <Section title="Raw Event">
              <div className="space-y-2">
                <input
                  className={`${inputClass} w-full`}
                  placeholder="Event name"
                  value={rawEvent}
                  onChange={(e) => setRawEvent(e.target.value)}
                />
                <textarea
                  className={`${inputClass} w-full h-20 resize-y`}
                  placeholder='JSON payload (optional)'
                  value={rawPayload}
                  onChange={(e) => setRawPayload(e.target.value)}
                />
                <button
                  className={`${btnPrimary} w-full`}
                  onClick={() => {
                    if (!rawEvent) return;
                    let parsed: unknown;
                    try {
                      parsed = rawPayload ? JSON.parse(rawPayload) : undefined;
                    } catch {
                      addLog("error", "parse-error", {
                        message: "Invalid JSON payload",
                      });
                      return;
                    }
                    emit(rawEvent, parsed);
                  }}
                >
                  Send
                </button>
              </div>
            </Section>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-4">
            <Section title="Event Log" className="flex-1 min-h-0">
              <div className="flex justify-end mb-2">
                <button
                  className={`${btnSecondary} text-xs`}
                  onClick={() => setLogs([])}
                >
                  Clear
                </button>
              </div>
              <div className="h-[400px] overflow-y-auto bg-gray-900 rounded p-2 text-xs space-y-1">
                {logs.length === 0 && (
                  <p className="text-gray-500 italic">
                    No events yet. Use the forms on the left to send events.
                  </p>
                )}
                {logs.map((entry) => {
                  const isExpanded = expandedLogs.has(entry.id);
                  const payloadStr = JSON.stringify(entry.payload, null, 2);
                  const isMultiLine = payloadStr.includes("\n");
                  return (
                    <div key={entry.id} className="leading-5">
                      <div className="flex gap-2">
                        <span className="text-gray-500 shrink-0">
                          {entry.timestamp}
                        </span>
                        <span
                          className={`shrink-0 w-4 text-center ${directionStyle(entry.direction)}`}
                        >
                          {directionArrow(entry.direction)}
                        </span>
                        <span
                          className={`shrink-0 font-semibold ${directionStyle(entry.direction)}`}
                        >
                          {entry.event}
                        </span>
                        {isMultiLine ? (
                          <button
                            className="text-gray-500 hover:text-gray-300 cursor-pointer"
                            onClick={() => toggleExpand(entry.id)}
                          >
                            {isExpanded ? "\u25BC collapse" : "\u25B6 expand"}
                          </button>
                        ) : null}
                      </div>
                      {isMultiLine ? (
                        isExpanded && (
                          <pre className={`ml-6 mt-1 p-2 rounded bg-gray-800 whitespace-pre-wrap break-all ${directionStyle(entry.direction)}`}>
                            {payloadStr}
                          </pre>
                        )
                      ) : (
                        <pre className={`ml-6 whitespace-pre-wrap break-all ${directionStyle(entry.direction)}`}>
                          {payloadStr}
                        </pre>
                      )}
                    </div>
                  );
                })}
                <div ref={logEndRef} />
              </div>
            </Section>

            <Section title="Game State">
              <div className="h-[300px] overflow-y-auto bg-gray-900 rounded p-2 text-xs">
                {gameState ? (
                  <pre className="text-green-300 whitespace-pre-wrap">
                    {JSON.stringify(gameState, null, 2)}
                  </pre>
                ) : (
                  <p className="text-gray-500 italic">
                    No game state yet. Create or join a game to see state
                    here.
                  </p>
                )}
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border border-gray-700 rounded-lg p-3 ${className}`}
    >
      <h2 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">
        {title}
      </h2>
      {children}
    </div>
  );
}
