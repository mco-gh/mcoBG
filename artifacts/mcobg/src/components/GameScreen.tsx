import BackgammonBoard from "./BackgammonBoard";
import DiceTray from "./DiceTray";
import StatusBar from "./StatusBar";
import VideoFeed from "./VideoFeed";
import type { GameState, PlayerColor } from "@/lib/game-types";
import { Sun, Moon, HelpCircle, Settings, Share2, RotateCcw } from "lucide-react";
import { useState } from "react";

interface Props {
  gameState: GameState;
  myColor: PlayerColor;
  gameId: string;
  isMyTurn: boolean;
  hasDice: boolean;
  hasRemainingMoves: boolean;
  selectedPoint: number | null;
  highlightedPoints: Set<number>;
  selectablePoints: Set<number>;
  isRolling: boolean;
  opponentDisconnected: boolean;
  isDark: boolean;
  onToggleTheme: () => void;
  onSelectPoint: (index: number) => void;
  onSelectBar: () => void;
  onRoll: () => void;
  onRequestRematch: () => void;
  onAcceptRematch: () => void;
}

export default function GameScreen({
  gameState,
  myColor,
  gameId,
  isMyTurn,
  hasDice,
  hasRemainingMoves,
  selectedPoint,
  highlightedPoints,
  selectablePoints,
  isRolling,
  opponentDisconnected,
  isDark,
  onToggleTheme,
  onSelectPoint,
  onSelectBar,
  onRoll,
  onRequestRematch,
  onAcceptRematch,
}: Props) {
  const [showAbout, setShowAbout] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyGameId = () => {
    navigator.clipboard.writeText(gameId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f5f0e8] dark:bg-[#0a0a1a] transition-colors flex flex-col">
      <header className="flex items-center justify-between px-4 py-2 bg-[#e8ddd0] dark:bg-[#16213e] border-b border-[#c4b39a] dark:border-[#333]">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-[#2c1810] dark:text-[#e8e0d4]">
            mcoBG
          </h1>
          <span className="text-xs text-[#8b7355] dark:text-[#666] font-mono">
            #{gameId}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConnect(true)}
            className="p-2 rounded-lg hover:bg-[#d4c4a8] dark:hover:bg-[#1a1a2e] transition-colors text-[#6b5a4e] dark:text-[#888]"
            title="Share Game ID"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAbout(true)}
            className="p-2 rounded-lg hover:bg-[#d4c4a8] dark:hover:bg-[#1a1a2e] transition-colors text-[#6b5a4e] dark:text-[#888]"
            title="About"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg hover:bg-[#d4c4a8] dark:hover:bg-[#1a1a2e] transition-colors text-[#6b5a4e] dark:text-[#888]"
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
        {opponentDisconnected && (
          <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-4 py-2 rounded-lg text-sm font-medium">
            Opponent disconnected
          </div>
        )}

        <StatusBar gameState={gameState} myColor={myColor} isMyTurn={isMyTurn} />

        <BackgammonBoard
          board={gameState.board}
          myColor={myColor}
          selectedPoint={selectedPoint}
          highlightedPoints={highlightedPoints}
          selectablePoints={selectablePoints}
          isMyTurn={isMyTurn}
          hasDice={hasDice && hasRemainingMoves}
          onSelectPoint={onSelectPoint}
          onSelectBar={onSelectBar}
        />

        <div className="flex items-center gap-4">
          <DiceTray
            dice={gameState.dice}
            remainingMoves={gameState.remainingMoves}
            isRolling={isRolling}
            isMyTurn={isMyTurn}
            hasDice={hasDice}
            onRoll={onRoll}
          />
        </div>

        {gameState.gameOver && (
          <div className="flex gap-3 mt-2">
            <button
              onClick={onRequestRematch}
              className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Rematch
            </button>
          </div>
        )}
      </div>

      <VideoFeed gameId={gameId} myColor={myColor} />

      {showAbout && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAbout(false)}
        >
          <div
            className="bg-white dark:bg-[#1a1a2e] rounded-2xl p-8 max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-[#2c1810] dark:text-[#e8e0d4] mb-4">
              How to Play
            </h2>
            <div className="space-y-3 text-[#4a3728] dark:text-[#a89880] text-sm leading-relaxed">
              <p><strong>Goal:</strong> Bear off all 15 checkers before your opponent.</p>
              <p><strong>White</strong> moves from high to low points (toward point 1). <strong>Black</strong> moves from low to high (toward point 24).</p>
              <p><strong>Roll dice</strong> on your turn, then click a checker and click where to move it. Green-highlighted points are valid destinations.</p>
              <p><strong>Hitting:</strong> Landing on a single opponent checker sends it to the bar.</p>
              <p><strong>Bar:</strong> You must re-enter checkers from the bar before making other moves.</p>
              <p><strong>Bearing off:</strong> Once all checkers are in your home board, you can start removing them.</p>
            </div>
            <button
              onClick={() => setShowAbout(false)}
              className="mt-6 w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showConnect && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowConnect(false)}
        >
          <div
            className="bg-white dark:bg-[#1a1a2e] rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-[#2c1810] dark:text-[#e8e0d4] mb-4">
              Game ID
            </h2>
            <div className="px-6 py-4 bg-[#f5f0e8] dark:bg-[#0a0a1a] rounded-xl font-mono text-3xl tracking-[0.3em] text-amber-700 dark:text-amber-400 font-bold mb-4">
              {gameId}
            </div>
            <button
              onClick={copyGameId}
              className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
            >
              {copied ? "Copied!" : "Copy to Clipboard"}
            </button>
            <button
              onClick={() => setShowConnect(false)}
              className="mt-2 w-full py-2 text-[#8b7355] dark:text-[#666] hover:text-[#2c1810] dark:hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
