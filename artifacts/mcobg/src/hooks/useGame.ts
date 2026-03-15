import { useState, useCallback, useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";
import type { GameState, PlayerColor, ValidMove } from "@/lib/game-types";

export type GamePhase = "landing" | "waiting" | "playing" | "gameover";

export function useGame() {
  const [phase, setPhase] = useState<GamePhase>("landing");
  const [gameId, setGameId] = useState<string>("");
  const [myColor, setMyColor] = useState<PlayerColor | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [validMoves, setValidMoves] = useState<ValidMove[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const socketRef = useRef(getSocket());

  const isMyTurn = gameState?.currentPlayer === myColor;
  const hasDice = (gameState?.dice.length ?? 0) > 0;
  const hasRemainingMoves = (gameState?.remainingMoves.length ?? 0) > 0;

  useEffect(() => {
    const socket = socketRef.current;

    socket.on("game-started", (data: { state: GameState }) => {
      setGameState(data.state);
      setPhase("playing");
    });

    socket.on("state-update", (data: { state: GameState }) => {
      setGameState(data.state);
      setValidMoves([]);
      setSelectedPoint(null);
    });

    socket.on("game-over", () => {
      setPhase("gameover");
    });

    socket.on("opponent-disconnected", () => {
      setOpponentDisconnected(true);
    });

    socket.on("rematch-requested", () => {
      setError("Opponent wants a rematch!");
    });

    socket.on("rematch-accepted", (data: { state: GameState }) => {
      setGameState(data.state);
      setPhase("playing");
      setError(null);
      setValidMoves([]);
      setSelectedPoint(null);
    });

    return () => {
      socket.off("game-started");
      socket.off("state-update");
      socket.off("game-over");
      socket.off("opponent-disconnected");
      socket.off("rematch-requested");
      socket.off("rematch-accepted");
    };
  }, []);

  const createGame = useCallback(() => {
    socketRef.current.emit("create-game", (response: any) => {
      if (response.success) {
        setGameId(response.gameId);
        setMyColor(response.color);
        setGameState(response.state);
        setPhase("waiting");
      } else {
        setError(response.error);
      }
    });
  }, []);

  const joinGame = useCallback((id: string) => {
    socketRef.current.emit("join-game", { gameId: id }, (response: any) => {
      if (response.success) {
        setGameId(response.gameId);
        setMyColor(response.color);
        setGameState(response.state);
        setPhase("playing");
      } else {
        setError(response.error);
      }
    });
  }, []);

  const rollTheDice = useCallback(() => {
    if (!gameId || !isMyTurn) return;
    setIsRolling(true);
    setTimeout(() => {
      socketRef.current.emit("roll-dice", { gameId }, (response: any) => {
        setIsRolling(false);
        if (response.success) {
          if (!response.noMoves) {
            setValidMoves(response.validMoves || []);
          }
        } else {
          setError(response.error);
        }
      });
    }, 600);
  }, [gameId, isMyTurn]);

  const selectPoint = useCallback(
    (pointIndex: number) => {
      if (!isMyTurn || !hasDice || !hasRemainingMoves) return;

      if (selectedPoint === null) {
        const movesFromHere = validMoves.filter((m) => m.from === pointIndex);
        if (movesFromHere.length > 0) {
          setSelectedPoint(pointIndex);
        }
      } else if (selectedPoint === pointIndex) {
        setSelectedPoint(null);
      } else {
        const move = validMoves.find(
          (m) => m.from === selectedPoint && m.to === pointIndex
        );
        if (move) {
          makeMove(selectedPoint, pointIndex);
        } else {
          const movesFromHere = validMoves.filter(
            (m) => m.from === pointIndex
          );
          if (movesFromHere.length > 0) {
            setSelectedPoint(pointIndex);
          } else {
            setSelectedPoint(null);
          }
        }
      }
    },
    [selectedPoint, validMoves, isMyTurn, hasDice, hasRemainingMoves]
  );

  const makeMove = useCallback(
    (from: number, to: number) => {
      if (!gameId) return;
      socketRef.current.emit(
        "move-piece",
        { gameId, from, to },
        (response: any) => {
          if (response.success) {
            setSelectedPoint(null);
            if (gameState) {
              const die = validMoves.find(
                (m) => m.from === from && m.to === to
              )?.die;
              if (die !== undefined) {
                const newRemaining = [...gameState.remainingMoves];
                const idx = newRemaining.indexOf(die);
                if (idx !== -1) newRemaining.splice(idx, 1);
              }
            }
          } else {
            setError(response.error);
          }
        }
      );
    },
    [gameId, gameState, validMoves]
  );

  const selectBarChecker = useCallback(() => {
    if (!isMyTurn || !hasDice || !hasRemainingMoves) return;
    const barFrom = myColor === "white" ? -1 : 24;
    const movesFromBar = validMoves.filter((m) => m.from === barFrom);
    if (movesFromBar.length > 0) {
      setSelectedPoint(barFrom);
    }
  }, [isMyTurn, hasDice, hasRemainingMoves, myColor, validMoves]);

  const requestRematch = useCallback(() => {
    if (!gameId) return;
    socketRef.current.emit("request-rematch", { gameId });
    setError("Rematch requested...");
  }, [gameId]);

  const acceptRematch = useCallback(() => {
    if (!gameId) return;
    socketRef.current.emit("accept-rematch", { gameId });
  }, [gameId]);

  const getHighlightedPoints = useCallback((): Set<number> => {
    if (selectedPoint === null) return new Set();
    return new Set(
      validMoves.filter((m) => m.from === selectedPoint).map((m) => m.to)
    );
  }, [selectedPoint, validMoves]);

  const getSelectablePoints = useCallback((): Set<number> => {
    return new Set(validMoves.map((m) => m.from));
  }, [validMoves]);

  const clearError = useCallback(() => setError(null), []);

  return {
    phase,
    gameId,
    myColor,
    gameState,
    validMoves,
    selectedPoint,
    isRolling,
    error,
    isMyTurn,
    hasDice,
    hasRemainingMoves,
    opponentDisconnected,
    createGame,
    joinGame,
    rollTheDice,
    selectPoint,
    selectBarChecker,
    requestRematch,
    acceptRematch,
    getHighlightedPoints,
    getSelectablePoints,
    clearError,
  };
}
