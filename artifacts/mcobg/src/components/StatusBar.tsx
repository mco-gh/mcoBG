import type { GameState, PlayerColor } from "@/lib/game-types";

interface Props {
  gameState: GameState;
  myColor: PlayerColor;
  isMyTurn: boolean;
}

export default function StatusBar({ gameState, myColor, isMyTurn }: Props) {
  const getStatusText = () => {
    if (gameState.gameOver) {
      return gameState.winner === myColor ? "You Win!" : "You Lose!";
    }
    if (isMyTurn) {
      if (gameState.dice.length === 0) return "Your Turn — Roll the Dice";
      if (gameState.remainingMoves.length > 0) return "Your Turn — Make a Move";
      return "Your Turn";
    }
    return "Waiting for Opponent...";
  };

  const statusColor = gameState.gameOver
    ? gameState.winner === myColor
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400"
    : isMyTurn
    ? "text-amber-700 dark:text-amber-400"
    : "text-[#6b5a4e] dark:text-[#888]";

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-[#e8ddd0] dark:bg-[#16213e] rounded-lg">
      <div className="flex items-center gap-3">
        <div
          className={`w-3 h-3 rounded-full ${
            isMyTurn && !gameState.gameOver ? "bg-green-500 animate-pulse" : "bg-gray-400"
          }`}
        />
        <span className={`font-semibold ${statusColor}`}>{getStatusText()}</span>
      </div>
      {gameState.lastMove && (
        <span className="text-sm text-[#8b7355] dark:text-[#666] italic">
          {gameState.lastMove}
        </span>
      )}
      <div className="flex items-center gap-4 text-sm text-[#6b5a4e] dark:text-[#888]">
        <span>
          You:{" "}
          <span className="font-bold">
            {myColor === "white" ? "White" : "Black"}
          </span>
        </span>
        <span>
          Off:{" "}
          <span className="font-bold">
            {myColor === "white"
              ? gameState.board.whiteOff
              : gameState.board.blackOff}
            /15
          </span>
        </span>
      </div>
    </div>
  );
}
