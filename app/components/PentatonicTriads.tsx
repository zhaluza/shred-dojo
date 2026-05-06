import { useState, useMemo, useEffect } from "react";
import { DARK_THEME, LIGHT_THEME, STRING_LINE } from "./scalePositions.theme";
import { Nav } from "./Nav";
import type { StringName } from "./scalePositions.types";
import {
  buildAllBoxes,
  bluesNotesForBox,
  adjustAdjacentFrets,
  TRIAD_DEGREES,
  THIRD_DEG,
  THIRD_LABEL,
  INTRO,
  SHAPE_NOTES,
  type BoxNote,
  type PentaDegree,
  type PentaScaleMode,
} from "./pentatonicTriads.utils";

// ─── Dot color helpers ────────────────────────────────────────────────────────

type DotColors = { bg: string; fg: string };

function triadColors(
  deg: PentaDegree,
  thirdDeg: PentaDegree,
  isDark: boolean
): DotColors | null {
  if (deg === "R") return { bg: "#c0392b", fg: "#fff" };
  if (deg === thirdDeg)
    return isDark ? { bg: "#5a9a5a", fg: "#fff" } : { bg: "#3a6a3a", fg: "#fff" };
  if (deg === "5")
    return isDark ? { bg: "#5a7aaa", fg: "#fff" } : { bg: "#3a5a8a", fg: "#fff" };
  if (deg === "b5")
    return isDark ? { bg: "#7a6ad8", fg: "#fff" } : { bg: "#4a3aa8", fg: "#fff" };
  return null;
}

// ─── CtrlBtn ──────────────────────────────────────────────────────────────────

function CtrlBtn({
  label,
  active,
  onClick,
  small,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "font-display border transition-all duration-100 cursor-pointer uppercase",
        small
          ? "text-[0.65rem] tracking-[0.1em] px-[0.7rem] py-[0.28rem]"
          : "text-[0.75rem] tracking-[0.08em] px-[0.85rem] py-[0.35rem]",
        active
          ? "bg-[var(--text)] text-[var(--bg)] border-[var(--text)]"
          : "bg-transparent text-[var(--text)] border-[var(--border)] hover:border-[var(--text)]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

// ─── TriadDot ─────────────────────────────────────────────────────────────────

type DotVariant = "solid" | "cross" | "connector";

function TriadDot({
  deg,
  thirdDeg,
  isDark,
  variant,
  isScale,
}: {
  deg: PentaDegree;
  thirdDeg: PentaDegree;
  isDark: boolean;
  variant: DotVariant;
  isScale: boolean;
}) {
  const cols = triadColors(deg, thirdDeg, isDark);

  let style: React.CSSProperties;
  let textColor: string;

  if (isScale) {
    style = { background: "var(--text)" };
    textColor = "var(--bg)";
  } else if (!cols) {
    return null;
  } else if (variant === "solid") {
    style = { background: cols.bg };
    textColor = cols.fg;
  } else if (variant === "cross") {
    style = {
      background: "transparent",
      border: `2px dashed ${cols.bg}`,
      opacity: 0.72,
    };
    textColor = cols.bg;
  } else {
    // connector: full color + accent ring
    style = {
      background: cols.bg,
      boxShadow: `0 0 0 2.5px var(--bg), 0 0 0 4px var(--accent)`,
    };
    textColor = cols.fg;
  }

  return (
    <div
      className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[0.46rem] font-display tracking-[0.02em] relative z-[2] shrink-0"
      style={{ color: textColor, ...style }}
    >
      {deg}
    </div>
  );
}

// ─── Shared constants ─────────────────────────────────────────────────────────

const VISUAL_ORDER: StringName[] = ["e", "B", "G", "D", "A", "E"];

interface RenderNote {
  string: StringName;
  fret: number;
  deg: PentaDegree;
  variant: DotVariant;
  isScale: boolean;
}

// ─── TriadFretboard ───────────────────────────────────────────────────────────
// Used for the main per-shape fretboard view.

function TriadFretboard({
  notes,
  fretMin,
  fretMax,
  thirdDeg,
  isDark,
}: {
  notes: RenderNote[];
  fretMin: number;
  fretMax: number;
  thirdDeg: PentaDegree;
  isDark: boolean;
}) {
  const fretCount = fretMax - fretMin + 1;

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex pl-[1.9rem] mb-[0.15rem]">
        {Array.from({ length: fretCount }, (_, idx) => (
          <div key={idx} className="flex-1 text-center text-[0.44rem] text-[var(--faint)]">
            {fretMin + idx}
          </div>
        ))}
      </div>

      {VISUAL_ORDER.map((sname) => {
        const stringNotes = notes.filter((n) => n.string === sname);
        const line = STRING_LINE[sname];
        return (
          <div key={sname} className="flex items-center h-[29px]" data-string={sname}>
            <div className="w-[1.9rem] text-right pr-[0.4rem] shrink-0 text-[0.5rem] text-[var(--muted)]">
              {sname}
            </div>
            <div
              className="flex-1 flex relative items-center h-full"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  to right,
                  transparent 0%,
                  transparent calc(100% / ${fretCount} - 1px),
                  var(--fret-bar) calc(100% / ${fretCount} - 1px),
                  var(--fret-bar) calc(100% / ${fretCount})
                )`,
              }}
            >
              <div
                className="absolute top-1/2 left-0 right-0 -translate-y-1/2 pointer-events-none"
                style={{ height: line.height, backgroundColor: line.colorVar }}
              />
              {Array.from({ length: fretCount }, (_, idx) => {
                const absFret = fretMin + idx;
                const note = stringNotes.find((n) => n.fret === absFret);
                return (
                  <div key={idx} className="flex-1 h-[29px] flex items-center justify-center relative z-[1]">
                    {note && (
                      <TriadDot
                        deg={note.deg}
                        thirdDeg={thirdDeg}
                        isDark={isDark}
                        variant={note.variant}
                        isScale={note.isScale}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── CombinedFretboard ────────────────────────────────────────────────────────
// Panoramic view: prev shape + current shape + next shape on one continuous neck.
// Outer-zone notes dimmed; cross-boundary triad tones highlighted with a ring.

function CombinedFretboard({
  prevNotes,
  mainNotes,
  nextNotes,
  leftCross,
  rightCross,
  mainMinF,
  mainMaxF,
  prevShapeNum,
  currentShapeNum,
  nextShapeNum,
  thirdDeg,
  isDark,
  scale,
  showMode,
}: {
  prevNotes: BoxNote[];
  mainNotes: BoxNote[];
  nextNotes: BoxNote[];
  leftCross: BoxNote[];
  rightCross: BoxNote[];
  mainMinF: number;
  mainMaxF: number;
  prevShapeNum: number;
  currentShapeNum: number;
  nextShapeNum: number;
  thirdDeg: PentaDegree;
  isDark: boolean;
  scale: PentaScaleMode;
  showMode: "all" | "triad";
}) {
  const triad = TRIAD_DEGREES[scale];

  const prevMinF = prevNotes.length > 0 ? Math.min(...prevNotes.map((n) => n.fret)) : mainMinF;
  const nextMaxF = nextNotes.length > 0 ? Math.max(...nextNotes.map((n) => n.fret)) : mainMaxF;

  const fretMin = prevMinF;
  const fretMax = nextMaxF + 1;
  const fretCount = fretMax - fretMin + 1;

  // Number of fret columns in each zone
  const leftFrets = Math.max(0, mainMinF - fretMin);
  const centerFrets = mainMaxF - mainMinF + 1;
  const rightFrets = Math.max(0, fretMax - mainMaxF);

  // Zone separator positions as percentage of the fret area
  const leftSepPct = (leftFrets / fretCount) * 100;
  const rightSepPct = ((leftFrets + centerFrets) / fretCount) * 100;

  // Fast lookup sets for cross notes
  const leftCrossKey = new Set(leftCross.map((n) => `${n.string}:${n.fret}`));
  const rightCrossKey = new Set(rightCross.map((n) => `${n.string}:${n.fret}`));

  return (
    <div className="w-full overflow-x-auto">
      {/* Zone label row — aligns with fret cells using flex proportions */}
      <div className="flex mb-[0.3rem]">
        <div className="w-[1.9rem] shrink-0" />
        {leftFrets > 0 && (
          <div
            style={{ flex: leftFrets }}
            className="flex items-end justify-end pr-[0.3rem] pb-[0.15rem]"
          >
            <span className="font-display text-[0.46rem] tracking-[0.14em] uppercase text-[var(--muted)] whitespace-nowrap">
              ← Shape {prevShapeNum}
            </span>
          </div>
        )}
        <div
          style={{ flex: centerFrets }}
          className="flex items-end justify-center pb-[0.15rem]"
        >
          <span
            className="font-display text-[0.52rem] tracking-[0.1em] uppercase font-semibold whitespace-nowrap"
            style={{ color: "var(--accent)" }}
          >
            Shape {currentShapeNum}
          </span>
        </div>
        {rightFrets > 0 && (
          <div
            style={{ flex: rightFrets }}
            className="flex items-end justify-start pl-[0.3rem] pb-[0.15rem]"
          >
            <span className="font-display text-[0.46rem] tracking-[0.14em] uppercase text-[var(--muted)] whitespace-nowrap">
              Shape {nextShapeNum} →
            </span>
          </div>
        )}
      </div>

      {/* Fret numbers — current zone in text, outer in faint */}
      <div className="flex pl-[1.9rem] mb-[0.15rem]">
        {Array.from({ length: fretCount }, (_, idx) => {
          const absFret = fretMin + idx;
          const inMain = absFret >= mainMinF && absFret <= mainMaxF;
          return (
            <div
              key={idx}
              className={`flex-1 text-center text-[0.44rem] ${
                inMain ? "text-[var(--text)]" : "text-[var(--faint)]"
              }`}
            >
              {absFret}
            </div>
          );
        })}
      </div>

      {/* String rows */}
      {VISUAL_ORDER.map((sname) => {
        const line = STRING_LINE[sname];
        const prevStr = prevNotes.filter((n) => n.string === sname);
        const mainStr = mainNotes.filter((n) => n.string === sname);
        const nextStr = nextNotes.filter((n) => n.string === sname);

        return (
          <div key={sname} className="flex items-center h-[29px]" data-string={sname}>
            <div className="w-[1.9rem] text-right pr-[0.4rem] shrink-0 text-[0.5rem] text-[var(--muted)]">
              {sname}
            </div>
            <div
              className="flex-1 flex relative items-center h-full"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  to right,
                  transparent 0%,
                  transparent calc(100% / ${fretCount} - 1px),
                  var(--fret-bar) calc(100% / ${fretCount} - 1px),
                  var(--fret-bar) calc(100% / ${fretCount})
                )`,
              }}
            >
              {/* String line */}
              <div
                className="absolute top-1/2 left-0 right-0 -translate-y-1/2 pointer-events-none"
                style={{ height: line.height, backgroundColor: line.colorVar }}
              />

              {/* Current zone warm background band */}
              <div
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{
                  left: `${leftSepPct}%`,
                  width: `${rightSepPct - leftSepPct}%`,
                  background: "var(--accent)",
                  opacity: 0.1,
                }}
              />

              {/* Zone separator lines */}
              {leftFrets > 0 && (
                <div
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{
                    left: `${leftSepPct}%`,
                    width: "1px",
                    background: "var(--accent)",
                    opacity: 0.35,
                  }}
                />
              )}
              {rightFrets > 0 && (
                <div
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{
                    left: `${rightSepPct}%`,
                    width: "1px",
                    background: "var(--accent)",
                    opacity: 0.35,
                  }}
                />
              )}

              {/* Fret cells */}
              {Array.from({ length: fretCount }, (_, idx) => {
                const absFret = fretMin + idx;
                const noteKey = `${sname}:${absFret}`;
                const inMain = absFret >= mainMinF && absFret <= mainMaxF;

                // Priority: main > prev (left zone) > next (right zone)
                const mainNote = mainStr.find((n) => n.fret === absFret);
                const prevNote = !inMain && absFret < mainMinF
                  ? prevStr.find((n) => n.fret === absFret)
                  : undefined;
                const nextNote = !inMain && absFret > mainMaxF
                  ? nextStr.find((n) => n.fret === absFret)
                  : undefined;

                let note: BoxNote | undefined = mainNote ?? prevNote ?? nextNote;
                if (!note) {
                  return (
                    <div key={idx} className="flex-1 h-[29px] flex items-center justify-center relative z-[1]" />
                  );
                }

                const isTriadNote = triad.has(note.deg);
                const isBluesNote = note.deg === "b5";
                if (showMode === "triad" && !isTriadNote && !isBluesNote) {
                  return (
                    <div key={idx} className="flex-1 h-[29px] flex items-center justify-center relative z-[1]" />
                  );
                }

                // Determine presentation
                let dimmed = false;
                let variant: DotVariant = "solid";
                // b5 gets its own color (isScale=false), not the generic text-color treatment
                const isScale = !isTriadNote && !isBluesNote;

                if (mainNote) {
                  // Current shape: full opacity, solid
                  variant = "solid";
                } else if (prevNote) {
                  const isCross = leftCrossKey.has(noteKey);
                  if (isCross) {
                    variant = "connector"; // boundary-crossing triad: full opacity + ring
                  } else {
                    dimmed = true; // outer prev zone: dimmed
                  }
                } else if (nextNote) {
                  const isCross = rightCrossKey.has(noteKey);
                  if (isCross) {
                    variant = "connector";
                  } else {
                    dimmed = true;
                  }
                }

                return (
                  <div
                    key={idx}
                    className="flex-1 h-[29px] flex items-center justify-center relative z-[1]"
                    style={{ opacity: dimmed ? 0.32 : 1 }}
                  >
                    <TriadDot
                      deg={note.deg}
                      thirdDeg={thirdDeg}
                      isDark={isDark}
                      variant={variant}
                      isScale={isScale}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend({
  thirdDeg,
  thirdLabel,
  isDark,
  bluesMode,
}: {
  thirdDeg: PentaDegree;
  thirdLabel: string;
  isDark: boolean;
  bluesMode: boolean;
}) {
  const cols3rd = triadColors(thirdDeg, thirdDeg, isDark)!;
  const cols5th = triadColors("5", thirdDeg, isDark)!;
  const colsB5 = triadColors("b5", thirdDeg, isDark)!;

  const items: Array<{
    style: React.CSSProperties;
    textStyle?: React.CSSProperties;
    label: string;
    deg: string;
  }> = [
    {
      style: { background: "#c0392b" },
      textStyle: { color: "#fff" },
      label: "Root",
      deg: "R",
    },
    {
      style: { background: cols3rd.bg },
      textStyle: { color: "#fff" },
      label: thirdLabel,
      deg: thirdDeg,
    },
    {
      style: { background: cols5th.bg },
      textStyle: { color: "#fff" },
      label: "Perfect 5th",
      deg: "5",
    },
    ...(bluesMode
      ? [
          {
            style: { background: colsB5.bg } as React.CSSProperties,
            textStyle: { color: "#fff" } as React.CSSProperties,
            label: "Flat 5th (blue note)",
            deg: "b5",
          },
        ]
      : []),
    {
      style: { background: "var(--text)" },
      textStyle: { color: "var(--bg)" },
      label: "Scale tone",
      deg: "·",
    },
    {
      style: {
        background: "transparent",
        border: "2px dashed #c0392b",
        opacity: 0.7,
      },
      textStyle: { color: "#c0392b" },
      label: "Triad from adjacent shape",
      deg: "R",
    },
    {
      style: {
        background: cols3rd.bg,
        boxShadow: `0 0 0 2px var(--bg), 0 0 0 3.5px var(--accent)`,
      },
      textStyle: { color: "#fff" },
      label: "Crosses shape boundary",
      deg: thirdDeg,
    },
  ];

  return (
    <div
      className="mb-6 flex flex-wrap gap-x-5 gap-y-2 items-center px-4 py-3 border border-[var(--border)]"
      style={{ background: "var(--surface)" }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-[0.45rem] text-[0.55rem] text-[var(--muted)] tracking-[0.07em] uppercase"
        >
          <div
            className="w-[18px] h-[18px] rounded-full shrink-0 flex items-center justify-center text-[0.42rem]"
            style={{ ...item.style, ...item.textStyle }}
          >
            {item.deg}
          </div>
          {item.label}
        </div>
      ))}
    </div>
  );
}

// ─── ShapeCard ────────────────────────────────────────────────────────────────

interface ShapeCardProps {
  idx: number;
  scale: PentaScaleMode;
  thirdDeg: PentaDegree;
  isDark: boolean;
  showMode: "all" | "triad";
  mainNotes: BoxNote[];
  leftCross: BoxNote[];
  rightCross: BoxNote[];
  prevFull: BoxNote[];
  nextFull: BoxNote[];
  expanded: boolean;
  onToggleExpand: () => void;
}

function buildRenderNotes(
  mainNotes: BoxNote[],
  leftCross: BoxNote[],
  rightCross: BoxNote[],
  scale: PentaScaleMode,
  showMode: "all" | "triad"
): RenderNote[] {
  const triad = TRIAD_DEGREES[scale];
  const out: RenderNote[] = [];

  for (const n of mainNotes) {
    const isTriad = triad.has(n.deg);
    const isBlues = n.deg === "b5";
    // b5 always shows when present (blues mode added it); other non-triad notes filtered in triad mode
    if (showMode === "triad" && !isTriad && !isBlues) continue;
    // b5 gets its own color (isScale=false), not the generic text-color treatment
    out.push({ ...n, variant: "solid", isScale: !isTriad && !isBlues });
  }
  for (const n of leftCross) {
    out.push({ ...n, variant: "cross", isScale: false });
  }
  for (const n of rightCross) {
    out.push({ ...n, variant: "cross", isScale: false });
  }

  return out;
}

function ShapeCard({
  idx,
  scale,
  thirdDeg,
  isDark,
  showMode,
  mainNotes,
  leftCross,
  rightCross,
  prevFull,
  nextFull,
  expanded,
  onToggleExpand,
}: ShapeCardProps) {
  const triad = TRIAD_DEGREES[scale];

  const mainMinF = Math.min(...mainNotes.map((n) => n.fret));
  const mainMaxF = Math.max(...mainNotes.map((n) => n.fret));

  const windowMin =
    leftCross.length > 0
      ? Math.min(mainMinF, ...leftCross.map((n) => n.fret))
      : mainMinF;
  const windowMax =
    rightCross.length > 0
      ? Math.max(mainMaxF, ...rightCross.map((n) => n.fret))
      : mainMaxF + 1;

  const mainRenderNotes = buildRenderNotes(
    mainNotes,
    leftCross,
    rightCross,
    scale,
    showMode
  );

  const inShapeTriadCount = mainNotes.filter((n) => triad.has(n.deg)).length;
  const crossCount = leftCross.length + rightCross.length;
  const startDeg = mainNotes.find((n) => n.string === "E")?.deg ?? "?";

  const prevIdx = ((idx - 1) + 5) % 5;
  const nextIdx = (idx + 1) % 5;

  return (
    <div
      className="mb-6 border border-[var(--border)]"
      style={{ background: "var(--surface)" }}
    >
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-[0.65rem] border-b border-[var(--border)] flex-wrap gap-2">
        <div className="font-display text-[0.9rem] tracking-[0.06em]">
          <strong className="font-semibold">Shape {idx + 1}</strong>{" "}
          <span className="text-[var(--muted)]">· starts on {startDeg}</span>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-[0.5rem] px-[0.5rem] py-[0.15rem] border border-[var(--border)] text-[var(--muted)] tracking-[0.08em] uppercase">
            frets {mainMinF}–{mainMaxF}
          </span>
          <span
            className="text-[0.5rem] px-[0.5rem] py-[0.15rem] border tracking-[0.08em] uppercase"
            style={{
              borderColor: isDark ? "#5a9a5a" : "#3a6a3a",
              color: isDark ? "#5a9a5a" : "#3a6a3a",
            }}
          >
            {inShapeTriadCount} triad tones
          </span>
          {crossCount > 0 && (
            <span className="text-[0.5rem] px-[0.5rem] py-[0.15rem] border border-[var(--muted)] text-[var(--muted)] tracking-[0.08em] uppercase">
              {crossCount} cross boundary
            </span>
          )}
        </div>
      </div>

      {/* Main fretboard */}
      <div className="px-4 py-3 overflow-x-auto">
        <TriadFretboard
          notes={mainRenderNotes}
          fretMin={windowMin}
          fretMax={windowMax}
          thirdDeg={thirdDeg}
          isDark={isDark}
        />
      </div>

      {/* Shape note */}
      <div className="px-4 py-[0.65rem] border-t border-[var(--border)] text-[0.62rem] text-[var(--muted)] leading-[1.75]">
        {SHAPE_NOTES[scale][idx]}
      </div>

      {/* Neck context toggle */}
      <div className="px-4 pb-3 pt-2 flex items-center gap-3">
        <button
          onClick={onToggleExpand}
          className={[
            "font-display text-[0.62rem] tracking-[0.1em] uppercase border px-3 py-[0.25rem] transition-all duration-100 cursor-pointer",
            expanded
              ? "bg-[var(--text)] text-[var(--bg)] border-[var(--text)]"
              : "bg-transparent text-[var(--muted)] border-[var(--border)] hover:border-[var(--text)] hover:text-[var(--text)]",
          ].join(" ")}
        >
          {expanded ? "▲ Close" : "▼ Neck context"}
        </button>
        {!expanded && (
          <span className="text-[0.52rem] text-[var(--muted)] tracking-[0.06em]">
            See how this shape connects to adjacent ones
          </span>
        )}
      </div>

      {/* Combined panoramic fretboard */}
      {expanded && (
        <div className="border-t border-[var(--border)] px-4 py-4">
          <CombinedFretboard
            prevNotes={prevFull}
            mainNotes={mainNotes}
            nextNotes={nextFull}
            leftCross={leftCross}
            rightCross={rightCross}
            mainMinF={mainMinF}
            mainMaxF={mainMaxF}
            prevShapeNum={prevIdx + 1}
            currentShapeNum={idx + 1}
            nextShapeNum={nextIdx + 1}
            thirdDeg={thirdDeg}
            isDark={isDark}
            scale={scale}
            showMode={showMode}
          />
          {crossCount > 0 && (
            <p className="mt-3 text-[0.55rem] text-[var(--muted)] leading-[1.7]">
              <span style={{ color: "var(--accent)" }}>●</span>{" "}
              Ringed notes cross the shape boundary — triad tones reachable from both sides without a full position shift.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── PentatonicTriads ─────────────────────────────────────────────────────────

export function PentatonicTriads() {
  const [scale, setScale] = useState<PentaScaleMode>("minor");
  const [showMode, setShowMode] = useState<"all" | "triad">("all");
  const [bluesMode, setBluesMode] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [expandedShapes, setExpandedShapes] = useState<Set<number>>(new Set());

  useEffect(() => {
    const stored = localStorage.getItem("shred-dojo-dark");
    if (stored !== null) setIsDark(stored === "true");
  }, []);

  const toggleDark = () =>
    setIsDark((prev) => {
      localStorage.setItem("shred-dojo-dark", String(!prev));
      return !prev;
    });

  const thirdDeg = THIRD_DEG[scale];
  const thirdLabel = THIRD_LABEL[scale];
  const triad = TRIAD_DEGREES[scale];

  const boxes = useMemo(() => {
    const raw = buildAllBoxes(scale);
    if (bluesMode && scale === "minor") {
      return raw.map((box) => [...box, ...bluesNotesForBox(box)]);
    }
    return raw;
  }, [scale, bluesMode]);

  const handleScaleChange = (s: PentaScaleMode) => {
    setScale(s);
    setExpandedShapes(new Set());
    if (s === "major") setBluesMode(false);
  };

  const toggleExpand = (idx: number) => {
    setExpandedShapes((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const shapeData = useMemo(() => {
    return boxes.map((mainNotes, i) => {
      const mainMinF = Math.min(...mainNotes.map((n) => n.fret));
      const mainMaxF = Math.max(...mainNotes.map((n) => n.fret));

      const prevRaw = boxes[(i + 4) % 5];
      const nextRaw = boxes[(i + 1) % 5];

      const prevAdjusted = adjustAdjacentFrets(prevRaw, mainMinF, mainMaxF, "prev");
      const nextAdjusted = adjustAdjacentFrets(nextRaw, mainMinF, mainMaxF, "next");

      const leftCross = prevAdjusted.filter(
        (n) => triad.has(n.deg) && n.fret < mainMinF
      );
      const rightCross = nextAdjusted.filter(
        (n) => triad.has(n.deg) && n.fret > mainMaxF
      );

      return { mainNotes, leftCross, rightCross, prevFull: prevAdjusted, nextFull: nextAdjusted };
    });
  }, [boxes, triad]);

  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  return (
    <div
      className="min-h-screen font-mono bg-[var(--bg)] text-[var(--text)]"
      style={theme}
    >
      <Nav isDark={isDark} toggleDark={toggleDark} />
      <div className="max-w-[900px] mx-auto px-5 pt-8 pb-20">
        {/* Header */}
        <header className="mb-6 flex items-end justify-between flex-wrap gap-4 border-b-2 border-[var(--text)] pb-5">
          <h1 className="font-display font-semibold text-[clamp(1.8rem,4vw,2.8rem)] tracking-[0.04em] uppercase leading-none">
            Pentatonic{" "}
            <span style={{ color: "var(--accent)" }}>Triads</span>
          </h1>
          <div className="text-[0.58rem] text-[var(--muted)] tracking-[0.1em] uppercase text-right leading-[1.7]">
            G root · 5 shapes<br />
            triads within &amp; across shapes
          </div>
        </header>

        {/* Controls */}
        <div className="mb-5 flex gap-3 flex-wrap items-center border-b border-[var(--border)] pb-4">
          <span className="text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)]">Scale</span>
          <CtrlBtn label="Minor" active={scale === "minor"} onClick={() => handleScaleChange("minor")} />
          <CtrlBtn label="Major" active={scale === "major"} onClick={() => handleScaleChange("major")} />
          {scale === "minor" && (
            <>
              <div className="w-px h-4 bg-[var(--border)]" />
              <button
                onClick={() => setBluesMode((v) => !v)}
                className={[
                  "font-display text-[0.75rem] tracking-[0.08em] px-[0.85rem] py-[0.35rem] border transition-all duration-100 cursor-pointer uppercase",
                  bluesMode
                    ? "border-transparent text-[#fff]"
                    : "bg-transparent text-[var(--text)] border-[var(--border)] hover:border-[var(--text)]",
                ].join(" ")}
                style={bluesMode ? { background: isDark ? "#7a6ad8" : "#4a3aa8" } : {}}
              >
                Blues Scale
              </button>
            </>
          )}
          <div className="flex-1" />
          <span className="text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)]">Show</span>
          <CtrlBtn label="All notes" active={showMode === "all"} onClick={() => setShowMode("all")} />
          <CtrlBtn label="Triad only" active={showMode === "triad"} onClick={() => setShowMode("triad")} />
        </div>

        {/* Intro */}
        <p className="mb-5 text-[0.72rem] text-[var(--muted)] leading-[1.85] max-w-[680px]">
          {INTRO[scale]}
        </p>

        {/* Legend */}
        <Legend thirdDeg={thirdDeg} thirdLabel={thirdLabel} isDark={isDark} bluesMode={bluesMode} />

        {/* Shape cards */}
        {shapeData.map((data, i) => (
          <ShapeCard
            key={i}
            idx={i}
            scale={scale}
            thirdDeg={thirdDeg}
            isDark={isDark}
            showMode={showMode}
            mainNotes={data.mainNotes}
            leftCross={data.leftCross}
            rightCross={data.rightCross}
            prevFull={data.prevFull}
            nextFull={data.nextFull}
            expanded={expandedShapes.has(i)}
            onToggleExpand={() => toggleExpand(i)}
          />
        ))}
      </div>
    </div>
  );
}
