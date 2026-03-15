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

const FRAME_COLOR = "#7a3418";
const FRAME_LIGHT = "#9b5a30";
const FRAME_DARK = "#5c2810";
const SURFACE_COLOR = "#d4b894";
const SURFACE_DARK = "#c8a87c";
const POINT_DARK = "#3d2010";
const POINT_RED = "#8b2a14";
const HIGHLIGHT_GREEN = "#4ade80";
const SELECTED_AMBER = "#f59e0b";

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

function CheckerDefs() {
  return (
    <defs>
      <radialGradient id="whiteCheckerGrad" cx="0.35" cy="0.3" r="0.65">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="40%" stopColor="#f0ebe3" />
        <stop offset="100%" stopColor="#d4c8b0" />
      </radialGradient>
      <radialGradient id="blackCheckerGrad" cx="0.35" cy="0.3" r="0.65">
        <stop offset="0%" stopColor="#555555" />
        <stop offset="40%" stopColor="#2a2a2a" />
        <stop offset="100%" stopColor="#0a0a0a" />
      </radialGradient>
      <linearGradient id="frameGradH" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={FRAME_LIGHT} />
        <stop offset="50%" stopColor={FRAME_COLOR} />
        <stop offset="100%" stopColor={FRAME_DARK} />
      </linearGradient>
      <linearGradient id="surfaceGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={SURFACE_COLOR} />
        <stop offset="100%" stopColor={SURFACE_DARK} />
      </linearGradient>
      <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={FRAME_DARK} />
        <stop offset="50%" stopColor={FRAME_COLOR} />
        <stop offset="100%" stopColor={FRAME_DARK} />
      </linearGradient>
      <filter id="checkerShadow">
        <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.35" />
      </filter>
    </defs>
  );
}

function Checker({
  cx,
  cy,
  color,
  r = CHECKER_R - 1,
  opacity = 1,
  shadow = true,
}: {
  cx: number;
  cy: number;
  color: "white" | "black";
  r?: number;
  opacity?: number;
  shadow?: boolean;
}) {
  const fill = color === "white" ? "url(#whiteCheckerGrad)" : "url(#blackCheckerGrad)";
  const strokeColor = color === "white" ? "#4a4038" : "#222";
  const ringColor = color === "white" ? "#c4b498" : "#444";

  return (
    <g opacity={opacity} filter={shadow ? "url(#checkerShadow)" : undefined}>
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke={strokeColor} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={r * 0.65} fill="none" stroke={ringColor} strokeWidth={1.2} opacity={0.6} />
    </g>
  );
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
  const suppressClickRef = useRef(false);

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

  const selectSource = useCallback(
    (fromPoint: number) => {
      if (fromPoint === -1 || fromPoint === 24) {
        onSelectBar();
      } else {
        onSelectPoint(fromPoint);
      }
    },
    [onSelectPoint, onSelectBar]
  );

  const beginPendingDrag = useCallback(
    (
      e: React.PointerEvent,
      fromPoint: number,
      checkerColor: "white" | "black"
    ) => {
      if (!isMyTurn || !hasDice) return;

      e.preventDefault();
      e.stopPropagation();

      selectSource(fromPoint);
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
    [isMyTurn, hasDice, selectSource]
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
    [activeDrag, screenToSvg, selectSource]
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
        suppressClickRef.current = true;
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
      } else if (from !== null) {
        onSelectPoint(from);
      }

      setActiveDrag(null);
      dragFromRef.current = null;
      suppressClickRef.current = true;
    },
    [activeDrag, screenToSvg, hitTestPoint, onSelectPoint, selectSource]
  );

  const onPointerCancel = useCallback(
    (_e: React.PointerEvent) => {
      const from = cancelDrag();
      if (from !== null) {
        onSelectPoint(from);
      }
    },
    [cancelDrag, onSelectPoint]
  );

  const onLostPointerCapture = useCallback(
    (_e: React.PointerEvent) => {
      if (!activeDrag && !pendingRef.current) return;
      const from = cancelDrag();
      if (from !== null) {
        onSelectPoint(from);
      }
    },
    [activeDrag, cancelDrag, onSelectPoint]
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
      onLostPointerCapture={onLostPointerCapture}
    >
      <CheckerDefs />

      <rect
        x={0}
        y={0}
        width={BOARD_W}
        height={BOARD_H}
        rx={12}
        fill="url(#frameGradH)"
      />

      <rect
        x={4}
        y={4}
        width={BOARD_W - 8}
        height={BOARD_H - 8}
        rx={8}
        fill="none"
        stroke={FRAME_DARK}
        strokeWidth={2}
        opacity={0.3}
      />

      <rect
        x={MARGIN_X - 2}
        y={MARGIN_Y - 2}
        width={6 * POINT_W + 4}
        height={BOARD_H - 2 * MARGIN_Y + 4}
        rx={3}
        fill="url(#surfaceGrad)"
      />
      <rect
        x={MARGIN_X + 6 * POINT_W + BAR_W - 2}
        y={MARGIN_Y - 2}
        width={6 * POINT_W + 4}
        height={BOARD_H - 2 * MARGIN_Y + 4}
        rx={3}
        fill="url(#surfaceGrad)"
      />

      <rect
        x={barX - BAR_W / 2}
        y={MARGIN_Y - 2}
        width={BAR_W}
        height={BOARD_H - 2 * MARGIN_Y + 4}
        fill="url(#barGrad)"
      />
      <line
        x1={barX - BAR_W / 2}
        y1={MARGIN_Y - 2}
        x2={barX - BAR_W / 2}
        y2={BOARD_H - MARGIN_Y + 2}
        stroke={FRAME_DARK}
        strokeWidth={1}
        opacity={0.4}
      />
      <line
        x1={barX + BAR_W / 2}
        y1={MARGIN_Y - 2}
        x2={barX + BAR_W / 2}
        y2={BOARD_H - MARGIN_Y + 2}
        stroke={FRAME_DARK}
        strokeWidth={1}
        opacity={0.4}
      />

      {pointPositions.map(({ x, isTop, pointIndex }) => {
        const isSelected = selectedPoint === pointIndex;
        const isHighlighted = highlightedPoints.has(pointIndex);
        const isSelectable = selectablePoints.has(pointIndex) && isMyTurn && hasDice;
        const isEven = pointIndex % 2 === 0;

        const tipY = isTop ? MARGIN_Y : BOARD_H - MARGIN_Y;
        const baseY = isTop ? MARGIN_Y + POINT_H : BOARD_H - MARGIN_Y - POINT_H;

        let fill: string;
        if (isHighlighted) {
          fill = HIGHLIGHT_GREEN;
        } else if (isSelected) {
          fill = SELECTED_AMBER;
        } else {
          fill = isEven ? POINT_RED : POINT_DARK;
        }

        return (
          <g key={pointIndex}>
            <polygon
              points={`${x - POINT_W / 2},${baseY} ${x},${tipY} ${x + POINT_W / 2},${baseY}`}
              fill={fill}
              className={`${isSelectable || isHighlighted ? "cursor-pointer" : ""} transition-colors`}
              style={{ opacity: isHighlighted ? 0.8 : 1 }}
              onClick={() => onSelectPoint(pointIndex)}
            />
            {board.points[pointIndex] !== 0 &&
              renderCheckers(board.points[pointIndex], x, isTop, pointIndex)}
          </g>
        );
      })}

      {renderBarCheckers(board.whiteBar, "white", barX, true)}
      {renderBarCheckers(board.blackBar, "black", barX, false)}

      <rect
        x={BOARD_W - MARGIN_X + 2}
        y={MARGIN_Y - 2}
        width={24}
        height={BOARD_H - 2 * MARGIN_Y + 4}
        rx={3}
        fill={FRAME_DARK}
        opacity={0.5}
      />

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
          stroke={SELECTED_AMBER}
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
          stroke={SELECTED_AMBER}
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
          fill={HIGHLIGHT_GREEN}
          className="cursor-pointer"
          style={{ opacity: 0.7 }}
          onClick={() => onSelectPoint(highlightedPoints.has(24) ? 24 : -1)}
        />
      )}

      {activeDrag && (
        <g style={{ pointerEvents: "none" }}>
          <Checker
            cx={activeDrag.svgX}
            cy={activeDrag.svgY}
            color={activeDrag.color}
            r={CHECKER_R}
            opacity={0.8}
            shadow={false}
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

    const handleCheckerClick = () => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }
      onSelectPoint(pointIndex);
    };

    return (
      <g
        onClick={handleCheckerClick}
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
            >
              <Checker
                cx={pos.cx}
                cy={pos.cy}
                color={color}
                opacity={isDragSource && isTopChecker ? 0.3 : 1}
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

    const handleBarClick = () => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }
      onSelectBar();
    };

    return (
      <g
        onClick={isClickable ? handleBarClick : undefined}
        className={isClickable ? "cursor-pointer" : ""}
      >
        {Array.from({ length: Math.min(count, 4) }).map((_, i) => {
          const cy = isBottom
            ? BOARD_H / 2 + 30 + i * (CHECKER_R * 2 + 2)
            : BOARD_H / 2 - 30 - i * (CHECKER_R * 2 + 2);
          const isTopChecker = i === Math.min(count, 4) - 1;
          return (
            <g
              key={i}
              onPointerDown={
                isClickable && isTopChecker
                  ? (e) => beginPendingDrag(e, barFrom, color)
                  : undefined
              }
              style={isClickable && isTopChecker ? { cursor: "grab" } : undefined}
            >
              <Checker
                cx={bx}
                cy={cy}
                color={color}
                r={CHECKER_R - 2}
                opacity={isDragSource && isTopChecker ? 0.3 : 1}
              />
            </g>
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
              fill={color === "white" ? "#e8dcc8" : "#1a1a1a"}
              stroke={color === "white" ? "#a89878" : "#444"}
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
