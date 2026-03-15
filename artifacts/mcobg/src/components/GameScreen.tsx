import BackgammonBoard from "./BackgammonBoard";
import DiceTray from "./DiceTray";
import StatusBar from "./StatusBar";
import VideoFeed from "./VideoFeed";
import type { GameState, PlayerColor } from "@/lib/game-types";
import { MOVEMENT_RULES } from "@/lib/game-types";
import { Sun, Moon, HelpCircle, Settings, Share2, RotateCcw, Copy, Check } from "lucide-react";
import { useState, useCallback } from "react";

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
  boardFlipped: boolean;
  onToggleTheme: () => void;
  onToggleBoardFlip: () => void;
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
  boardFlipped,
  onToggleTheme,
  onToggleBoardFlip,
  onSelectPoint,
  onSelectBar,
  onRoll,
  onRequestRematch,
  onAcceptRematch,
}: Props) {
  const [showAbout, setShowAbout] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [copiedGameId, setCopiedGameId] = useState(false);
  const [copiedPeerId, setCopiedPeerId] = useState(false);
  const [myPeerId, setMyPeerId] = useState<string | null>(null);

  const handlePeerIdReady = useCallback((peerId: string) => {
    setMyPeerId(peerId);
  }, []);

  const copyGameId = () => {
    navigator.clipboard.writeText(gameId);
    setCopiedGameId(true);
    setTimeout(() => setCopiedGameId(false), 2000);
  };

  const copyPeerId = () => {
    if (!myPeerId) return;
    navigator.clipboard.writeText(myPeerId);
    setCopiedPeerId(true);
    setTimeout(() => setCopiedPeerId(false), 2000);
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
            onClick={() => setShowConfig(true)}
            className="p-2 rounded-lg hover:bg-[#d4c4a8] dark:hover:bg-[#1a1a2e] transition-colors text-[#6b5a4e] dark:text-[#888]"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
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
          flipped={boardFlipped}
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

      <VideoFeed gameId={gameId} myColor={myColor} onPeerIdReady={handlePeerIdReady} />

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
              <p><strong>White</strong> moves from point 1 toward point 24 (home board: points 19-24). <strong>Black</strong> moves from point 24 toward point 1 (home board: points 1-6).</p>
              <p><strong>Roll dice</strong> on your turn, then click a checker and click where to move it. Green-highlighted points are valid destinations.</p>
              <p><strong>Doubles:</strong> Rolling doubles gives you 4 moves of that value instead of 2.</p>
              <p><strong>Hitting:</strong> Landing on a single opponent checker sends it to the bar.</p>
              <p><strong>Bar:</strong> You must re-enter checkers from the bar before making other moves.</p>
              <p><strong>Bearing off:</strong> Once all checkers are in your home board, you can start removing them.</p>
              <p><strong>Video Chat:</strong> Grant camera/mic access to see and hear your opponent.</p>
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

      {showConfig && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowConfig(false)}
        >
          <div
            className="bg-white dark:bg-[#1a1a2e] rounded-2xl p-8 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-[#2c1810] dark:text-[#e8e0d4] mb-6">
              Settings
            </h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-[#2c1810] dark:text-[#e8e0d4]">Theme</div>
                  <div className="text-sm text-[#8b7355] dark:text-[#666]">
                    {isDark ? "Dark Mode" : "Light Mode"}
                  </div>
                </div>
                <button
                  onClick={onToggleTheme}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    isDark ? "bg-amber-500" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                      isDark ? "translate-x-7" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-[#2c1810] dark:text-[#e8e0d4]">Board Direction</div>
                  <div className="text-sm text-[#8b7355] dark:text-[#666]">
                    {boardFlipped ? "Flipped" : "Default"}
                  </div>
                </div>
                <button
                  onClick={onToggleBoardFlip}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    boardFlipped ? "bg-amber-500" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                      boardFlipped ? "translate-x-7" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              <div>
                <div className="font-medium text-[#2c1810] dark:text-[#e8e0d4] mb-1">Movement Direction</div>
                <div className="text-sm text-[#8b7355] dark:text-[#666] space-y-1">
                  <p>{MOVEMENT_RULES.white.description} (home: 19-24)</p>
                  <p>{MOVEMENT_RULES.black.description} (home: 1-6)</p>
                </div>
              </div>
              <div>
                <div className="font-medium text-[#2c1810] dark:text-[#e8e0d4] mb-1">Your Color</div>
                <div className="text-sm text-[#8b7355] dark:text-[#666]">
                  Playing as <span className="font-bold text-amber-600 dark:text-amber-400">{myColor === "white" ? "White" : "Black"}</span>
                </div>
              </div>
              <div>
                <div className="font-medium text-[#2c1810] dark:text-[#e8e0d4] mb-1">Game ID</div>
                <div className="text-sm font-mono text-amber-600 dark:text-amber-400">
                  {gameId}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowConfig(false)}
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
              Connection Info
            </h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-[#8b7355] dark:text-[#666] mb-2">Game ID</div>
                <div className="px-6 py-4 bg-[#f5f0e8] dark:bg-[#0a0a1a] rounded-xl font-mono text-3xl tracking-[0.3em] text-amber-700 dark:text-amber-400 font-bold">
                  {gameId}
                </div>
                <button
                  onClick={copyGameId}
                  className="mt-2 w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {copiedGameId ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Game ID</>}
                </button>
              </div>
              <div>
                <div className="text-sm text-[#8b7355] dark:text-[#666] mb-2">Peer ID (Video Chat)</div>
                <div className="px-4 py-3 bg-[#f5f0e8] dark:bg-[#0a0a1a] rounded-xl font-mono text-xs text-[#6b5a4e] dark:text-[#888] break-all">
                  {myPeerId ?? "Connecting..."}
                </div>
                {myPeerId && (
                  <button
                    onClick={copyPeerId}
                    className="mt-2 w-full py-2 bg-[#4a3728] hover:bg-[#3d2b1f] dark:bg-[#16213e] dark:hover:bg-[#0f3460] text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {copiedPeerId ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Peer ID</>}
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-[#8b7355] dark:text-[#666] mt-4">
              Share the Game ID with your friend so they can join.
            </p>
            <button
              onClick={() => setShowConnect(false)}
              className="mt-4 w-full py-2 text-[#8b7355] dark:text-[#666] hover:text-[#2c1810] dark:hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
