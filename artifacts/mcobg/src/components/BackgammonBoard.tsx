import type { BoardState, PlayerColor } from "@/lib/game-types";

interface Props {
  board: BoardState;
  myColor: PlayerColor;
  selectedPoint: number | null;
  highlightedPoints: Set<number>;
  selectablePoints: Set<number>;
  isMyTurn: boolean;
  hasDice: boolean;
  flipped?: boolean;
  onSelectPoint: (index: number) => void;
  onSelectBar: () => void;
}

const BOARD_W = 740;
const BOARD_H = 480;
const POINT_W = 48;
const POINT_H = 190;
const BAR_W = 40;
const CHECKER_R = 20;
const MARGIN_X = 30;
const MARGIN_Y = 20;

function getCheckerPositions(
  count: number,
  isTop: boolean,
  cx: number
): { cx: number; cy: number }[] {
  const positions: { cx: number; cy: number }[] = [];
  const maxVisible = 5;
  const absCount = Math.abs(count);
  const shown = Math.min(absCount, maxVisible);
  const spacing = Math.min(CHECKER_R * 2, POINT_H / maxVisible);

  for (let i = 0; i < shown; i++) {
    const cy = isTop
      ? MARGIN_Y + CHECKER_R + i * spacing
      : BOARD_H - MARGIN_Y - CHECKER_R - i * spacing;
    positions.push({ cx, cy });
  }
  return positions;
}

export default function BackgammonBoard({
  board,
  myColor,
  selectedPoint,
  highlightedPoints,
  selectablePoints,
  isMyTurn,
  hasDice,
  flipped = false,
  onSelectPoint,
  onSelectBar,
}: Props) {
  function getSlotPosition(slot: number): { x: number; isTop: boolean } {
    let x: number;
    let isTop: boolean;
    if (slot < 6) {
      x = MARGIN_X + (5 - slot) * POINT_W + POINT_W / 2 + BAR_W + 6 * POINT_W;
      isTop = false;
    } else if (slot < 12) {
      x = MARGIN_X + (11 - slot) * POINT_W + POINT_W / 2;
      isTop = false;
    } else if (slot < 18) {
      x = MARGIN_X + (slot - 12) * POINT_W + POINT_W / 2;
      isTop = true;
    } else {
      x = MARGIN_X + (slot - 12) * POINT_W + POINT_W / 2 + BAR_W;
      isTop = true;
    }
    return { x, isTop };
  }

  const pointPositions: { x: number; isTop: boolean; pointIndex: number }[] = [];
  for (let pointIndex = 0; pointIndex < 24; pointIndex++) {
    const visualSlot = flipped ? 23 - pointIndex : pointIndex;
    const { x, isTop } = getSlotPosition(visualSlot);
    pointPositions.push({ x, isTop, pointIndex });
  }

  const barX = MARGIN_X + 6 * POINT_W + BAR_W / 2;

  const whiteBarClickable =
    isMyTurn && hasDice && myColor === "white" && board.whiteBar > 0;
  const blackBarClickable =
    isMyTurn && hasDice && myColor === "black" && board.blackBar > 0;

  return (
    <svg
      viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
      className="w-full max-w-[800px] mx-auto"
      style={{ aspectRatio: `${BOARD_W}/${BOARD_H}` }}
    >
      <rect
        x={0}
        y={0}
        width={BOARD_W}
        height={BOARD_H}
        rx={8}
        className="fill-[#2d1810] dark:fill-[#1a1a2e]"
      />

      <rect
        x={MARGIN_X - 4}
        y={MARGIN_Y - 4}
        width={BOARD_W - 2 * MARGIN_X + 8}
        height={BOARD_H - 2 * MARGIN_Y + 8}
        rx={4}
        className="fill-[#4a3728] dark:fill-[#16213e]"
      />

      <rect
        x={barX - BAR_W / 2}
        y={MARGIN_Y}
        width={BAR_W}
        height={BOARD_H - 2 * MARGIN_Y}
        className="fill-[#3d2b1f] dark:fill-[#0f3460]"
      />

      {pointPositions.map(({ x, isTop, pointIndex }) => {
        const isSelected = selectedPoint === pointIndex;
        const isHighlighted = highlightedPoints.has(pointIndex);
        const isSelectable = selectablePoints.has(pointIndex) && isMyTurn && hasDice;
        const isEven = pointIndex % 2 === 0;

        const tipY = isTop ? MARGIN_Y : BOARD_H - MARGIN_Y;
        const baseY = isTop ? MARGIN_Y + POINT_H : BOARD_H - MARGIN_Y - POINT_H;

        let fillClass = isEven
          ? "fill-[#c4956a] dark:fill-[#e94560]"
          : "fill-[#8b5e3c] dark:fill-[#533483]";

        if (isHighlighted) {
          fillClass = "fill-[#4ade80] dark:fill-[#22c55e]";
        } else if (isSelected) {
          fillClass = "fill-[#fbbf24] dark:fill-[#f59e0b]";
        }

        return (
          <g key={pointIndex}>
            <polygon
              points={`${x - POINT_W / 2},${baseY} ${x},${tipY} ${x + POINT_W / 2},${baseY}`}
              className={`${fillClass} ${isSelectable || isHighlighted ? "cursor-pointer" : ""} transition-colors`}
              style={{ opacity: isHighlighted ? 0.8 : 1 }}
              onClick={() => onSelectPoint(pointIndex)}
            />
            <text
              x={x}
              y={isTop ? MARGIN_Y - 6 : BOARD_H - MARGIN_Y + 14}
              textAnchor="middle"
              className="text-[8px] fill-[#8b7355] dark:fill-[#555] select-none"
            >
              {pointIndex + 1}
            </text>
            {board.points[pointIndex] !== 0 && renderCheckers(board.points[pointIndex], x, isTop, pointIndex)}
          </g>
        );
      })}

      {renderBarCheckers(board.whiteBar, "white", barX, true)}
      {renderBarCheckers(board.blackBar, "black", barX, false)}

      {board.whiteOff > 0 && renderOffBoard(board.whiteOff, "white")}
      {board.blackOff > 0 && renderOffBoard(board.blackOff, "black")}

      {selectedPoint === -1 && (
        <rect
          x={barX - BAR_W / 2 - 2}
          y={BOARD_H / 2 + 20}
          width={BAR_W + 4}
          height={BOARD_H / 2 - MARGIN_Y - 20}
          rx={4}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={3}
        />
      )}
      {selectedPoint === 24 && (
        <rect
          x={barX - BAR_W / 2 - 2}
          y={MARGIN_Y}
          width={BAR_W + 4}
          height={BOARD_H / 2 - MARGIN_Y - 20}
          rx={4}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={3}
        />
      )}

      {(highlightedPoints.has(24) || highlightedPoints.has(-1)) && (
        <rect
          x={BOARD_W - MARGIN_X + 4}
          y={highlightedPoints.has(24) ? MARGIN_Y : BOARD_H - MARGIN_Y - 80}
          width={20}
          height={80}
          rx={4}
          className="fill-[#4ade80] dark:fill-[#22c55e] cursor-pointer"
          style={{ opacity: 0.7 }}
          onClick={() => onSelectPoint(highlightedPoints.has(24) ? 24 : -1)}
        />
      )}
    </svg>
  );

  function renderCheckers(count: number, cx: number, isTop: boolean, pointIndex: number) {
    const absCount = Math.abs(count);
    const color = count > 0 ? "white" : "black";
    const positions = getCheckerPositions(count, isTop, cx);
    const isSelectable = selectablePoints.has(pointIndex) && isMyTurn && hasDice;

    return (
      <g onClick={() => onSelectPoint(pointIndex)} className={isSelectable ? "cursor-pointer" : ""}>
        {positions.map((pos, i) => (
          <g key={i}>
            <circle
              cx={pos.cx}
              cy={pos.cy}
              r={CHECKER_R - 1}
              className={
                color === "white"
                  ? "fill-[#f5f0e8] dark:fill-[#e8e0d4] stroke-[#c4b39a] dark:stroke-[#a89880]"
                  : "fill-[#2c2c2c] dark:fill-[#1a1a1a] stroke-[#555] dark:stroke-[#444]"
              }
              strokeWidth={2}
            />
            <circle
              cx={pos.cx}
              cy={pos.cy}
              r={CHECKER_R - 6}
              fill="none"
              className={
                color === "white"
                  ? "stroke-[#d4c4a8] dark:stroke-[#c4b498]"
                  : "stroke-[#444] dark:stroke-[#333]"
              }
              strokeWidth={1}
            />
          </g>
        ))}
        {absCount > 5 && (
          <text
            x={cx}
            y={positions[positions.length - 1]?.cy ?? 0}
            textAnchor="middle"
            dominantBaseline="central"
            className={`text-xs font-bold ${color === "white" ? "fill-[#2c2c2c]" : "fill-white"}`}
          >
            {absCount}
          </text>
        )}
      </g>
    );
  }

  function renderBarCheckers(count: number, color: "white" | "black", bx: number, isBottom: boolean) {
    if (count === 0) return null;
    const isClickable = color === "white" ? whiteBarClickable : blackBarClickable;

    return (
      <g onClick={isClickable ? onSelectBar : undefined} className={isClickable ? "cursor-pointer" : ""}>
        {Array.from({ length: Math.min(count, 4) }).map((_, i) => {
          const cy = isBottom
            ? BOARD_H / 2 + 30 + i * (CHECKER_R * 2 + 2)
            : BOARD_H / 2 - 30 - i * (CHECKER_R * 2 + 2);
          return (
            <circle
              key={i}
              cx={bx}
              cy={cy}
              r={CHECKER_R - 2}
              className={
                color === "white"
                  ? "fill-[#f5f0e8] dark:fill-[#e8e0d4] stroke-[#c4b39a] dark:stroke-[#a89880]"
                  : "fill-[#2c2c2c] dark:fill-[#1a1a1a] stroke-[#555] dark:stroke-[#444]"
              }
              strokeWidth={2}
            />
          );
        })}
        {count > 4 && (
          <text
            x={bx}
            y={isBottom ? BOARD_H / 2 + 30 + 3 * (CHECKER_R * 2 + 2) : BOARD_H / 2 - 30 - 3 * (CHECKER_R * 2 + 2)}
            textAnchor="middle"
            dominantBaseline="central"
            className={`text-xs font-bold ${color === "white" ? "fill-[#2c2c2c]" : "fill-white"}`}
          >
            {count}
          </text>
        )}
      </g>
    );
  }

  function renderOffBoard(count: number, color: "white" | "black") {
    const x = BOARD_W - 18;
    const isTop = color === "white";
    return (
      <g>
        {Array.from({ length: Math.min(count, 5) }).map((_, i) => {
          const y = isTop
            ? MARGIN_Y + 8 + i * 14
            : BOARD_H - MARGIN_Y - 8 - i * 14;
          return (
            <rect
              key={i}
              x={x - 8}
              y={y - 5}
              width={16}
              height={10}
              rx={2}
              className={
                color === "white"
                  ? "fill-[#f5f0e8] dark:fill-[#e8e0d4] stroke-[#c4b39a]"
                  : "fill-[#2c2c2c] dark:fill-[#1a1a1a] stroke-[#555]"
              }
              strokeWidth={1}
            />
          );
        })}
        {count > 5 && (
          <text
            x={x}
            y={isTop ? MARGIN_Y + 8 + 4 * 14 : BOARD_H - MARGIN_Y - 8 - 4 * 14}
            textAnchor="middle"
            dominantBaseline="central"
            className="text-[10px] font-bold fill-white"
          >
            {count}
          </text>
        )}
      </g>
    );
  }
}
