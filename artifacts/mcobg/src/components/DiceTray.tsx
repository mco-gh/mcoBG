interface Props {
  dice: number[];
  remainingMoves: number[];
  isRolling: boolean;
  isMyTurn: boolean;
  hasDice: boolean;
  onRoll: () => void;
}

const dotPositions: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
};

function DiceFace({ value, isUsed }: { value: number; isUsed: boolean }) {
  const dots = dotPositions[value] || [];
  return (
    <div
      className={`relative w-14 h-14 rounded-lg border-2 transition-opacity ${
        isUsed
          ? "opacity-30 border-gray-400 dark:border-gray-600"
          : "border-amber-700 dark:border-amber-500"
      } bg-[#fffbf0] dark:bg-[#1e1e2e]`}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {dots.map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={10}
            className={isUsed ? "fill-gray-400 dark:fill-gray-600" : "fill-[#2c1810] dark:fill-amber-400"}
          />
        ))}
      </svg>
    </div>
  );
}

export default function DiceTray({
  dice,
  remainingMoves,
  isRolling,
  isMyTurn,
  hasDice,
  onRoll,
}: Props) {
  const usedDice = dice.map((d) => {
    const idx = remainingMoves.indexOf(d);
    if (idx === -1) return true;
    remainingMoves = [...remainingMoves];
    remainingMoves.splice(idx, 1);
    return false;
  });

  return (
    <div className="flex items-center gap-4">
      {isMyTurn && !hasDice && (
        <button
          onClick={onRoll}
          disabled={isRolling}
          className={`px-6 py-3 rounded-lg font-bold text-lg transition-all ${
            isRolling
              ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed animate-pulse"
              : "bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white shadow-lg hover:shadow-xl active:scale-95"
          }`}
        >
          {isRolling ? "Rolling..." : "Roll Dice"}
        </button>
      )}
      {dice.length > 0 && (
        <div className="flex gap-3">
          {dice.map((d, i) => (
            <div
              key={i}
              className={isRolling ? "animate-bounce" : ""}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <DiceFace value={d} isUsed={usedDice[i]} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
