import { useState } from "react";
import { DARK_THEME, LIGHT_THEME, STRING_LINE } from "./scalePositions.theme";
import type { StringName } from "./scalePositions.types";
import {
  DEG_COLOR,
  DEG_NAMES,
  SCALE_DEGREES,
  SHAPES,
  type IntervalShape,
  type PentaDegree,
  type PentaScaleMode,
} from "./intervalShapes.utils";

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

// ─── IntervalDot ──────────────────────────────────────────────────────────────

function IntervalDot({
  deg,
  revealed,
}: {
  deg: PentaDegree;
  revealed: boolean;
}) {
  const isRoot = deg === "R";
  const show = isRoot || revealed;

  if (show) {
    return (
      <div
        className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[0.46rem] font-display tracking-[0.02em] relative z-[2] shrink-0"
        style={{ backgroundColor: DEG_COLOR[deg], color: "#fff" }}
      >
        {deg}
      </div>
    );
  }

  return (
    <div
      className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[0.46rem] font-display tracking-[0.02em] relative z-[2] shrink-0"
      style={{
        backgroundColor: "var(--border)",
        color: "var(--muted)",
      }}
    >
      ?
    </div>
  );
}

// ─── MiniStringRow ────────────────────────────────────────────────────────────

function MiniStringRow({
  strName,
  notes,
  W,
  revealed,
}: {
  strName: string;
  notes: Array<{ rel: number; deg: PentaDegree }>;
  W: number;
  revealed: boolean;
}) {
  const sl = STRING_LINE[strName as StringName] ?? {
    height: "1px",
    colorVar: "var(--border)",
  };

  return (
    <div className="flex items-center h-[36px]">
      <div className="w-[1.6rem] text-right pr-[0.5rem] text-[0.5rem] text-[var(--muted)] shrink-0 leading-none">
        {strName}
      </div>
      <div
        className="flex-1 flex items-center h-full relative"
        style={{
          backgroundImage: `repeating-linear-gradient(to right, transparent 0%, transparent calc(${100 / W}% - 1px), var(--fret-bar) calc(${100 / W}% - 1px), var(--fret-bar) ${100 / W}%)`,
        }}
      >
        {/* String line */}
        <div
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ height: sl.height, backgroundColor: sl.colorVar }}
        />
        {/* Fret cells */}
        {Array.from({ length: W }, (_, f) => {
          const note = notes.find((n) => n.rel === f);
          return (
            <div
              key={f}
              className="flex-1 h-full flex items-center justify-center relative z-[1]"
            >
              {note && <IntervalDot deg={note.deg} revealed={revealed} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MiniShape ────────────────────────────────────────────────────────────────
// Renders the two-string mini fretboard for a shape.
// Guitar convention: high-pitched string on top, low-pitched string on bottom.

function MiniShape({
  shape,
  revealed,
}: {
  shape: IntervalShape;
  revealed: boolean;
}) {
  const loNotes = [
    { rel: shape.loOff, deg: shape.loDegs[0] },
    { rel: shape.loOff + shape.loSpan, deg: shape.loDegs[1] },
  ];
  const hiNotes = [
    { rel: shape.hiOff, deg: shape.hiDegs[0] },
    { rel: shape.hiOff + shape.hiSpan, deg: shape.hiDegs[1] },
  ];

  const maxRel = Math.max(...loNotes.map((n) => n.rel), ...hiNotes.map((n) => n.rel));
  const W = maxRel + 2;

  // pair is "lo–hi" (lower-pitched–higher-pitched)
  const [loStr, hiStr] = shape.occurrences[0].pair.split("–");

  return (
    <div>
      {/* Fret number row */}
      <div className="flex pl-[1.6rem] mb-[0.15rem]">
        {Array.from({ length: W }, (_, i) => (
          <div
            key={i}
            className="flex-1 text-center text-[0.42rem] text-[var(--faint)]"
          >
            {i}
          </div>
        ))}
      </div>
      {/* Hi string on top (guitar convention) */}
      <MiniStringRow
        strName={hiStr}
        notes={hiNotes}
        W={W}
        revealed={revealed}
      />
      {/* Lo string on bottom */}
      <MiniStringRow
        strName={loStr}
        notes={loNotes}
        W={W}
        revealed={revealed}
      />
    </div>
  );
}

// ─── OccurrenceTags ───────────────────────────────────────────────────────────

function OccurrenceTags({ shape }: { shape: IntervalShape }) {
  const hasRoot = shape.loDegs.includes("R") || shape.hiDegs.includes("R");
  return (
    <div className="flex gap-[0.4rem] flex-wrap">
      {shape.occurrences.map((occ) => (
        <span
          key={`${occ.box}-${occ.pair}`}
          className="text-[0.5rem] px-[0.4rem] py-[0.12rem] border tracking-[0.05em]"
          style={
            hasRoot
              ? { borderColor: DEG_COLOR["R"], color: DEG_COLOR["R"] }
              : { borderColor: "var(--border)", color: "var(--muted)" }
          }
        >
          Box {occ.box} · {occ.pair}
        </span>
      ))}
    </div>
  );
}

// ─── ShapeCard ────────────────────────────────────────────────────────────────

function ShapeCard({ shape }: { shape: IntervalShape }) {
  return (
    <div
      className="border border-[var(--border)] -mt-px -ml-px"
      style={{ background: "var(--surface)" }}
    >
      <div className="px-4 pt-[0.8rem] pb-[0.6rem] border-b border-[var(--border)]">
        <div className="font-display text-[0.9rem] font-semibold tracking-[0.04em] leading-tight">
          {shape.title}
        </div>
        <div className="text-[0.58rem] text-[var(--muted)] tracking-[0.08em] uppercase mt-[0.2rem]">
          {shape.subtitle}
        </div>
      </div>

      <div className="px-5 pt-4 pb-3">
        <MiniShape shape={shape} revealed={true} />

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-[0.55rem] tracking-[0.08em] uppercase text-[var(--muted)] min-w-[3.5rem]">
            Appears in
          </span>
          <OccurrenceTags shape={shape} />
        </div>
      </div>

      <div
        className="px-4 pb-3 pt-2 border-t border-[var(--border)] text-[0.62rem] text-[var(--muted)] leading-[1.7]"
      >
        {shape.description}
      </div>
    </div>
  );
}

// ─── DiagramPanel ─────────────────────────────────────────────────────────────

function DiagramPanel({ scale }: { scale: PentaScaleMode }) {
  const shapes = SHAPES[scale];
  const degrees = SCALE_DEGREES[scale];

  const standardShapes = shapes.filter((s) => !s.id.includes("GB"));
  const gbShapes = shapes.filter((s) => s.id.includes("GB"));

  return (
    <div>
      {/* Intro */}
      <p className="mb-5 text-[0.72rem] text-[var(--muted)] leading-[1.85] max-w-[680px]">
        The {scale} pentatonic scale has {degrees.length} intervals. On each
        adjacent string pair, exactly{" "}
        <strong className="text-[var(--text)] font-normal">
          two notes appear on each string
        </strong>{" "}
        — forming a recurring two-string shape. There are only{" "}
        <strong className="text-[var(--text)] font-normal">
          {standardShapes.length} standard shapes
        </strong>{" "}
        across the P4-tuned pairs, plus{" "}
        <strong className="text-[var(--text)] font-normal">
          {gbShapes.length} G–B variants
        </strong>{" "}
        where the minor-3rd tuning gap shifts the upper string. Once you know
        these shapes, you can read any position instantly.
      </p>

      {/* P4 shapes */}
      <div className="text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)] mb-2">
        Perfect 4th string pairs
      </div>
      <div className="grid grid-cols-2 max-[560px]:grid-cols-1 mb-8">
        {standardShapes.map((shape) => (
          <ShapeCard key={shape.id} shape={shape} />
        ))}
      </div>

      {/* G–B shapes */}
      <div className="text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)] mb-2">
        G–B string pair (minor-3rd gap)
      </div>
      <div className="grid grid-cols-2 max-[560px]:grid-cols-1">
        {gbShapes.map((shape) => (
          <ShapeCard key={shape.id} shape={shape} />
        ))}
      </div>
    </div>
  );
}

// ─── FlashcardPanel ───────────────────────────────────────────────────────────

function FlashcardPanel({ scale }: { scale: PentaScaleMode }) {
  const shapes = SHAPES[scale];
  const [fcIdx, setFcIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const safeIdx = fcIdx % shapes.length;
  const shape = shapes[safeIdx];

  const next = () => {
    setRevealed(false);
    setFcIdx((i) => (i + 1) % shapes.length);
  };

  const prev = () => {
    setRevealed(false);
    setFcIdx((i) => (i - 1 + shapes.length) % shapes.length);
  };

  return (
    <div>
      {/* Progress */}
      <div className="max-w-[480px] mx-auto mb-3 flex items-center justify-between">
        <span className="text-[0.55rem] tracking-[0.12em] uppercase text-[var(--muted)]">
          {safeIdx + 1} / {shapes.length}
        </span>
        <div className="flex gap-[5px]">
          {shapes.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-colors duration-200"
              style={{
                width: 7,
                height: 7,
                backgroundColor:
                  i < safeIdx
                    ? "#c8a060"
                    : i === safeIdx
                      ? "var(--text)"
                      : "var(--border)",
              }}
            />
          ))}
        </div>
        <span className="text-[0.55rem] tracking-[0.12em] uppercase text-[var(--muted)]">
          {shape.subtitle}
        </span>
      </div>

      {/* Card */}
      <div
        className="max-w-[480px] mx-auto border border-[var(--border)] cursor-pointer select-none hover:border-[var(--text)] transition-colors duration-150"
        style={{ background: "var(--surface)" }}
        onClick={() => setRevealed((r) => !r)}
      >
        <div className="px-5 pt-4 pb-3 border-b border-[var(--border)] flex items-baseline justify-between gap-4 flex-wrap">
          <div className="font-display text-[0.75rem] tracking-[0.06em] uppercase text-[var(--text)]">
            Strings {shape.occurrences[0].pair}
          </div>
          <div
            className="text-[0.58rem] tracking-[0.1em] uppercase"
            style={{ color: "var(--accent)" }}
          >
            {revealed ? "revealed" : "name the intervals"}
          </div>
        </div>

        <div className="px-5 pt-5 pb-4">
          <MiniShape shape={shape} revealed={revealed} />
        </div>

        <div
          className="px-5 py-[0.65rem] border-t border-[var(--border)] text-[0.52rem] tracking-[0.18em] uppercase text-center transition-colors duration-150"
          style={{ color: revealed ? "#c8a060" : "var(--muted)" }}
        >
          {revealed ? "Tap to reset" : "Tap to reveal"}
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-[480px] mx-auto mt-3 flex gap-3">
        <CtrlBtn label="← Prev" active={false} onClick={prev} />
        <CtrlBtn label="Next →" active={false} onClick={next} />
      </div>

      {/* Description (shown when revealed) */}
      {revealed && (
        <div
          className="max-w-[480px] mx-auto mt-3 px-5 py-4 border border-[var(--border)] text-[0.65rem] text-[var(--muted)] leading-[1.75]"
          style={{ background: "var(--surface)", borderTopColor: "var(--accent)", borderTopWidth: 2 }}
        >
          {shape.description}
        </div>
      )}
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function DegreeLegend({ scale }: { scale: PentaScaleMode }) {
  const degrees = SCALE_DEGREES[scale];
  return (
    <div className="mb-5 flex flex-wrap gap-x-5 gap-y-2 items-center px-4 py-3 border border-[var(--border)]"
      style={{ background: "var(--surface)" }}>
      {degrees.map((deg) => (
        <div
          key={deg}
          className="flex items-center gap-[0.4rem] text-[0.55rem] text-[var(--muted)] tracking-[0.07em] uppercase"
        >
          <div
            className="w-[18px] h-[18px] rounded-full shrink-0 flex items-center justify-center text-[0.42rem] font-display"
            style={{ backgroundColor: DEG_COLOR[deg], color: "#fff" }}
          >
            {deg}
          </div>
          {DEG_NAMES[deg]}
        </div>
      ))}
    </div>
  );
}

// ─── IntervalShapes ───────────────────────────────────────────────────────────

export function IntervalShapes() {
  const [scale, setScale] = useState<PentaScaleMode>("minor");
  const [mode, setMode] = useState<"diagram" | "flashcard">("diagram");
  const [isDark, setIsDark] = useState(false);

  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  const handleScaleChange = (s: PentaScaleMode) => {
    setScale(s);
  };

  return (
    <div
      className="min-h-screen font-mono bg-[var(--bg)] text-[var(--text)]"
      style={theme}
    >
      <div className="max-w-[900px] mx-auto px-5 pt-8 pb-20">
        {/* Header */}
        <header className="mb-6 flex items-end justify-between flex-wrap gap-4 border-b-2 border-[var(--text)] pb-5">
          <h1 className="font-display font-semibold text-[clamp(1.8rem,4vw,2.8rem)] tracking-[0.04em] uppercase leading-none">
            Interval{" "}
            <span style={{ color: "var(--accent)" }}>Shapes</span>
          </h1>
          <div className="flex flex-col items-end gap-2">
            <CtrlBtn
              label={isDark ? "◑ Light" : "◐ Dark"}
              active={false}
              onClick={() => setIsDark((d) => !d)}
              small
            />
            <div className="text-[0.58rem] text-[var(--muted)] tracking-[0.1em] uppercase text-right leading-[1.7]">
              G root · two-string shapes
              <br />
              diagram &amp; flashcard mode
            </div>
          </div>
        </header>

        {/* Controls */}
        <div className="mb-5 flex gap-3 flex-wrap items-center border-b border-[var(--border)] pb-4">
          <span className="text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)]">
            Scale
          </span>
          <CtrlBtn
            label="Minor"
            active={scale === "minor"}
            onClick={() => handleScaleChange("minor")}
          />
          <CtrlBtn
            label="Major"
            active={scale === "major"}
            onClick={() => handleScaleChange("major")}
          />
          <div className="flex-1" />
          <span className="text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)]">
            Mode
          </span>
          <CtrlBtn
            label="Diagram"
            active={mode === "diagram"}
            onClick={() => setMode("diagram")}
          />
          <CtrlBtn
            label="Flashcard"
            active={mode === "flashcard"}
            onClick={() => setMode("flashcard")}
          />
        </div>

        {/* Legend */}
        <DegreeLegend scale={scale} />

        {/* Panels */}
        {mode === "diagram" ? (
          <DiagramPanel scale={scale} />
        ) : (
          <FlashcardPanel key={scale} scale={scale} />
        )}
      </div>
    </div>
  );
}
