import { useRef, useState, useCallback, useEffect } from "react";
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
const DRAG_THRESHOLD = 4;

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

interface PendingDrag {
  fromPoint: number;
  color: "white" | "black";
  pointerId: number;
  startClientX: number;
  startClientY: number;
}

interface ActiveDrag {
  fromPoint: number;
  color: "white" | "black";
  pointerId: number;
  svgX: number;
  svgY: number;
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
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const pendingRef = useRef<PendingDrag | null>(null);
  const dragFromRef = useRef<number | null>(null);

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

  const screenToSvg = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const inv = ctm.inverse();
      return {
        x: inv.a * clientX + inv.c * clientY + inv.e,
        y: inv.b * clientX + inv.d * clientY + inv.f,
      };
    },
    []
  );

  const hitTestPoint = useCallback(
    (svgX: number, svgY: number): number | null => {
      const bearOffX = BOARD_W - MARGIN_X + 4;
      if (svgX >= bearOffX && svgX <= bearOffX + 20) {
        if (svgY >= MARGIN_Y && svgY <= MARGIN_Y + 80 && highlightedPoints.has(24)) {
          return 24;
        }
        if (
          svgY >= BOARD_H - MARGIN_Y - 80 &&
          svgY <= BOARD_H - MARGIN_Y &&
          highlightedPoints.has(-1)
        ) {
          return -1;
        }
      }

      for (const { x, isTop, pointIndex } of pointPositions) {
        if (!highlightedPoints.has(pointIndex)) continue;
        const left = x - POINT_W / 2;
        const right = x + POINT_W / 2;
        if (svgX < left || svgX > right) continue;

        if (isTop && svgY >= MARGIN_Y && svgY <= MARGIN_Y + POINT_H + CHECKER_R) {
          return pointIndex;
        }
        if (
          !isTop &&
          svgY >= BOARD_H - MARGIN_Y - POINT_H - CHECKER_R &&
          svgY <= BOARD_H - MARGIN_Y
        ) {
          return pointIndex;
        }
      }

      return null;
    },
    [pointPositions, highlightedPoints]
  );

  const cancelDrag = useCallback(() => {
    const pid = activeDrag?.pointerId ?? pendingRef.current?.pointerId;
    const svg = svgRef.current;
    if (svg && pid != null) {
      try {
        svg.releasePointerCapture(pid);
      } catch (_) {}
    }
    setActiveDrag(null);
    pendingRef.current = null;
    const from = dragFromRef.current;
    dragFromRef.current = null;
    return from;
  }, [activeDrag]);

  const beginPendingDrag = useCallback(
    (
      e: React.PointerEvent,
      fromPoint: number,
      checkerColor: "white" | "black"
    ) => {
      if (!isMyTurn || !hasDice) return;

      e.preventDefault();
      e.stopPropagation();

      if (fromPoint === -1 || fromPoint === 24) {
        onSelectBar();
      } else {
        onSelectPoint(fromPoint);
      }

      dragFromRef.current = fromPoint;
      pendingRef.current = {
        fromPoint,
        color: checkerColor,
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
      };

      const svg = svgRef.current;
      if (svg) {
        svg.setPointerCapture(e.pointerId);
      }
    },
    [isMyTurn, hasDice, onSelectPoint, onSelectBar]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (pendingRef.current && !activeDrag) {
        const dx = e.clientX - pendingRef.current.startClientX;
        const dy = e.clientY - pendingRef.current.startClientY;
        if (Math.abs(dx) + Math.abs(dy) >= DRAG_THRESHOLD) {
          const pos = screenToSvg(e.clientX, e.clientY);
          if (pos) {
            setActiveDrag({
              fromPoint: pendingRef.current.fromPoint,
              color: pendingRef.current.color,
              pointerId: pendingRef.current.pointerId,
              svgX: pos.x,
              svgY: pos.y,
            });
          }
          pendingRef.current = null;
        }
        return;
      }

      if (!activeDrag) return;
      const pos = screenToSvg(e.clientX, e.clientY);
      if (!pos) return;
      setActiveDrag((prev) =>
        prev ? { ...prev, svgX: pos.x, svgY: pos.y } : null
      );
    },
    [activeDrag, screenToSvg]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (pendingRef.current) {
        const svg = svgRef.current;
        if (svg) {
          try {
            svg.releasePointerCapture(e.pointerId);
          } catch (_) {}
        }
        pendingRef.current = null;
        dragFromRef.current = null;
        return;
      }

      if (!activeDrag) return;

      const from = dragFromRef.current;
      const svg = svgRef.current;
      if (svg) {
        try {
          svg.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }

      const pos = screenToSvg(e.clientX, e.clientY);
      if (pos) {
        const target = hitTestPoint(pos.x, pos.y);
        if (target !== null) {
          onSelectPoint(target);
        } else if (from !== null) {
          onSelectPoint(from);
        }
      }

      setActiveDrag(null);
      dragFromRef.current = null;
    },
    [activeDrag, screenToSvg, hitTestPoint, onSelectPoint]
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent) => {
      const from = cancelDrag();
      if (from !== null) {
        onSelectPoint(from);
      }
    },
    [cancelDrag, onSelectPoint]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (activeDrag || pendingRef.current)) {
        const from = cancelDrag();
        if (from !== null) {
          onSelectPoint(from);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeDrag, cancelDrag, onSelectPoint]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
      className="w-full max-w-[800px] mx-auto select-none"
      style={{ aspectRatio: `${BOARD_W}/${BOARD_H}`, touchAction: "none" }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
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
            {board.points[pointIndex] !== 0 &&
              renderCheckers(board.points[pointIndex], x, isTop, pointIndex)}
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

      {activeDrag && (
        <g style={{ pointerEvents: "none" }}>
          <circle
            cx={activeDrag.svgX}
            cy={activeDrag.svgY}
            r={CHECKER_R}
            className={
              activeDrag.color === "white"
                ? "fill-[#f5f0e8] dark:fill-[#e8e0d4] stroke-[#c4b39a] dark:stroke-[#a89880]"
                : "fill-[#2c2c2c] dark:fill-[#1a1a1a] stroke-[#555] dark:stroke-[#444]"
            }
            strokeWidth={2}
            opacity={0.75}
          />
          <circle
            cx={activeDrag.svgX}
            cy={activeDrag.svgY}
            r={CHECKER_R - 5}
            fill="none"
            className={
              activeDrag.color === "white"
                ? "stroke-[#d4c4a8] dark:stroke-[#c4b498]"
                : "stroke-[#444] dark:stroke-[#333]"
            }
            strokeWidth={1}
            opacity={0.75}
          />
        </g>
      )}
    </svg>
  );

  function renderCheckers(
    count: number,
    cx: number,
    isTop: boolean,
    pointIndex: number
  ) {
    const absCount = Math.abs(count);
    const color: "white" | "black" = count > 0 ? "white" : "black";
    const positions = getCheckerPositions(count, isTop, cx);
    const isSelectable =
      selectablePoints.has(pointIndex) && isMyTurn && hasDice;
    const isDragSource = activeDrag?.fromPoint === pointIndex;

    return (
      <g
        onClick={() => onSelectPoint(pointIndex)}
        className={isSelectable ? "cursor-pointer" : ""}
      >
        {positions.map((pos, i) => {
          const isTopChecker = i === positions.length - 1;
          return (
            <g
              key={i}
              onPointerDown={
                isSelectable && isTopChecker
                  ? (e) => beginPendingDrag(e, pointIndex, color)
                  : undefined
              }
              style={
                isSelectable && isTopChecker
                  ? { cursor: "grab" }
                  : undefined
              }
              opacity={isDragSource && isTopChecker ? 0.3 : 1}
            >
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
          );
        })}
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

  function renderBarCheckers(
    count: number,
    color: "white" | "black",
    bx: number,
    isBottom: boolean
  ) {
    if (count === 0) return null;
    const isClickable =
      color === "white" ? whiteBarClickable : blackBarClickable;
    const barFrom = color === "white" ? -1 : 24;
    const isDragSource = activeDrag?.fromPoint === barFrom;

    return (
      <g
        onClick={isClickable ? onSelectBar : undefined}
        className={isClickable ? "cursor-pointer" : ""}
      >
        {Array.from({ length: Math.min(count, 4) }).map((_, i) => {
          const cy = isBottom
            ? BOARD_H / 2 + 30 + i * (CHECKER_R * 2 + 2)
            : BOARD_H / 2 - 30 - i * (CHECKER_R * 2 + 2);
          const isTopChecker = i === Math.min(count, 4) - 1;
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
              style={isClickable && isTopChecker ? { cursor: "grab" } : undefined}
              opacity={isDragSource && isTopChecker ? 0.3 : 1}
              onPointerDown={
                isClickable && isTopChecker
                  ? (e) => beginPendingDrag(e, barFrom, color)
                  : undefined
              }
            />
          );
        })}
        {count > 4 && (
          <text
            x={bx}
            y={
              isBottom
                ? BOARD_H / 2 + 30 + 3 * (CHECKER_R * 2 + 2)
                : BOARD_H / 2 - 30 - 3 * (CHECKER_R * 2 + 2)
            }
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
