import { useState } from "react";
import { Dice5, Users, Info } from "lucide-react";

interface Props {
  onCreateGame: () => void;
  onJoinGame: (id: string) => void;
  error: string | null;
  onClearError: () => void;
}

export default function LandingPage({
  onCreateGame,
  onJoinGame,
  error,
  onClearError,
}: Props) {
  const [joinId, setJoinId] = useState("");
  const [showAbout, setShowAbout] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f0e8] dark:bg-[#0a0a1a] transition-colors p-4">
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Dice5 className="w-12 h-12 text-amber-700 dark:text-amber-400" />
          <h1 className="text-5xl font-bold text-[#2c1810] dark:text-[#e8e0d4] tracking-tight">
            mcoBG
          </h1>
        </div>
        <p className="text-lg text-[#6b5a4e] dark:text-[#a89880]">
          Real-Time Multiplayer Backgammon with Video Chat
        </p>
      </div>

      <div className="w-full max-w-md space-y-4">
        <button
          onClick={onCreateGame}
          className="w-full py-4 px-6 bg-amber-700 hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-700 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3"
        >
          <Dice5 className="w-6 h-6" />
          Create New Game
        </button>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter Game ID"
            value={joinId}
            onChange={(e) => {
              setJoinId(e.target.value.toUpperCase());
              if (error) onClearError();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && joinId.trim()) onJoinGame(joinId.trim());
            }}
            maxLength={6}
            className="flex-1 px-4 py-3 rounded-xl border-2 border-[#c4b39a] dark:border-[#333] bg-white dark:bg-[#1a1a2e] text-[#2c1810] dark:text-[#e8e0d4] text-center text-lg font-mono tracking-widest focus:outline-none focus:border-amber-600 dark:focus:border-amber-400 transition-colors"
          />
          <button
            onClick={() => joinId.trim() && onJoinGame(joinId.trim())}
            disabled={!joinId.trim()}
            className="px-6 py-3 bg-[#4a3728] hover:bg-[#3d2b1f] dark:bg-[#16213e] dark:hover:bg-[#0f3460] text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Users className="w-5 h-5" />
            Join
          </button>
        </div>

        {error && (
          <div className="text-center text-red-600 dark:text-red-400 text-sm font-medium bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
            {error}
          </div>
        )}
      </div>

      <button
        onClick={() => setShowAbout(true)}
        className="mt-8 flex items-center gap-2 text-[#8b7355] dark:text-[#8b7355] hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
      >
        <Info className="w-4 h-4" />
        How to Play
      </button>

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
              How to Play Backgammon
            </h2>
            <div className="space-y-3 text-[#4a3728] dark:text-[#a89880] text-sm leading-relaxed">
              <p>
                <strong>Goal:</strong> Move all 15 of your checkers into your
                home board and then bear them off. First player to bear off all
                checkers wins.
              </p>
              <p>
                <strong>Setup:</strong> White moves from point 24 toward point 1
                (home). Black moves from point 1 toward point 24 (home).
              </p>
              <p>
                <strong>Rolling:</strong> Roll two dice on your turn. If you roll
                doubles, you get 4 moves of that value.
              </p>
              <p>
                <strong>Moving:</strong> Click a checker to select it, then click
                a highlighted destination. You can move to any point that is open,
                occupied by your own checkers, or has exactly one opponent checker
                (a blot).
              </p>
              <p>
                <strong>Hitting:</strong> Landing on a blot sends the opponent's
                checker to the bar. They must re-enter from the bar before making
                other moves.
              </p>
              <p>
                <strong>Bearing Off:</strong> Once all your checkers are in your
                home board (points 1-6 for White, 19-24 for Black), you can begin
                bearing them off.
              </p>
              <p>
                <strong>Video Chat:</strong> You'll be prompted for camera/mic
                access. If you allow it, you can see and hear your opponent during
                the game.
              </p>
            </div>
            <button
              onClick={() => setShowAbout(false)}
              className="mt-6 w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
