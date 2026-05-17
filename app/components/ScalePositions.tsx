import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  DARK_THEME,
  LIGHT_THEME,
  STRING_LINE,
} from "./scalePositions.theme";
import { CtrlButton } from "./CtrlButton";
import { Nav } from "./Nav";
import type {
  NoteFilter,
  ScaleMode,
  ScaleNote,
  ScalePosition,
  ScaleString,
  System,
  UnifiedNote,
  UnifiedString,
} from "./scalePositions.types";
import {
  buildAllPositions,
  buildCagedPositions,
  FRET_DOUBLE,
  FRET_INLAYS,
  mergePositions,
  ROOT_FRET,
  SCALES,
} from "./scalePositions.utils";
import { HARMONIC_MINOR_CFG } from "./yngwieScales.utils";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"] as const;

const NOTE_NAMES = [
  "E", "F", "F#", "G", "Ab", "A", "Bb", "B", "C", "Db", "D", "Eb",
] as const;

const KEYS = NOTE_NAMES.map((name, fret) => ({ name, fret }));

const MODES: Record<ScaleMode, string[]> = {
  major: ["Ionian", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Aeolian", "Locrian"],
  minor: ["Aeolian", "Locrian", "Ionian", "Dorian", "Phrygian", "Lydian", "Mixolydian"],
};

const MODE_ROMAN: Record<ScaleMode, string[]> = {
  major: ["I", "ii", "iii", "IV", "V", "vi", "vii°"],
  minor: ["i", "ii°", "bIII", "iv", "v", "bVI", "bVII"],
};


// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend({
  diaLabel,
}: {
  diaLabel: string;
}) {
  return (
    <div className="max-w-[980px] mx-auto mb-6 flex flex-wrap gap-6 items-center">
      <div className="flex items-center gap-[0.45rem] text-[0.58rem] text-[var(--muted)] tracking-[0.08em] uppercase">
        <div className="w-[14px] h-[14px] rounded-full shrink-0 bg-[var(--root-col)]" />
        Root
      </div>
      <div className="flex items-center gap-[0.45rem] text-[0.58rem] text-[var(--muted)] tracking-[0.08em] uppercase">
        <div className="w-[14px] h-[14px] rounded-full shrink-0 bg-[var(--text)]" />
        Pentatonic
      </div>
      <div className="flex items-center gap-[0.45rem] text-[0.58rem] text-[var(--muted)] tracking-[0.08em] uppercase">
        <div
          className="w-[14px] h-[14px] rounded-full shrink-0 bg-[var(--bg)]"
          style={{ border: "1.5px solid var(--text)" }}
        />
        {diaLabel}
      </div>
    </div>
  );
}

// ─── Dot ──────────────────────────────────────────────────────────────────────

function Dot({
  note,
  visible,
  large = false,
}: {
  note: ScaleNote;
  visible: boolean;
  large?: boolean;
}) {
  let colorClasses: string;
  if (note.deg === "R") {
    colorClasses = "bg-[var(--root-col)] text-white";
  } else if (note.penta) {
    colorClasses = "bg-[var(--text)] text-[var(--bg)]";
  } else {
    colorClasses = "bg-[var(--bg)] text-[var(--text)]";
  }

  const borderStyle =
    note.deg !== "R" && !note.penta
      ? { border: "1.5px solid var(--text)" }
      : undefined;

  return (
    <div
      className={[
        large ? "w-7 h-7 text-[0.62rem]" : "w-5 h-5 text-[0.47rem]",
        "rounded-full flex items-center justify-center relative z-[2]",
        "transition-[opacity,transform] duration-[120ms]",
        colorClasses,
        visible ? "" : "opacity-0 scale-[0.2] pointer-events-none",
      ]
        .filter(Boolean)
        .join(" ")}
      style={borderStyle}
    >
      {note.deg}
    </div>
  );
}

// ─── StringRow ────────────────────────────────────────────────────────────────

function StringRow({
  str,
  fretCount,
  noteFilter,
  chordTones,
  large = false,
  fretOffset = 0,
}: {
  str: ScaleString;
  fretCount: number;
  noteFilter: NoteFilter;
  chordTones: Set<string>;
  large?: boolean;
  fretOffset?: number;
}) {
  const line = STRING_LINE[str.name];
  const rowH = large ? "h-[42px]" : "h-[29px]";

  function isVisible(note: ScaleNote): boolean {
    if (noteFilter === "all") return true;
    if (noteFilter === "penta") return note.deg === "R" || note.penta;
    if (noteFilter === "chord") return chordTones.has(note.deg);
    return true;
  }

  return (
    <div className={`flex items-center ${rowH}`} data-string={str.name}>
      {/* String name */}
      <div
        className={[
          large ? "w-[2.4rem] text-[0.65rem]" : "w-[1.9rem] text-[0.5rem]",
          "text-right pr-[0.4rem] shrink-0",
          "text-[var(--muted)]",
        ].join(" ")}
      >
        {str.name}
      </div>

      {/* Frets container */}
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

        {/* Fret cells */}
        {Array.from({ length: fretCount }, (_, f) => {
          const note = str.notes.find((n) => n.fret === f - fretOffset);
          return (
            <div
              key={f}
              className={`flex-1 ${rowH} flex items-center justify-center relative z-[1]`}
            >
              {note && (
                <Dot note={note} visible={isVisible(note)} large={large} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Fretboard ────────────────────────────────────────────────────────────────

function Fretboard({
  strings,
  noteFilter,
  chordTones,
  large = false,
  fretOffset = 0,
  fretCount: fretCountProp,
  displayStartFret,
}: {
  strings: ScaleString[];
  noteFilter: NoteFilter;
  chordTones: Set<string>;
  large?: boolean;
  fretOffset?: number;
  fretCount?: number;
  displayStartFret?: number;
}) {
  const maxFret = Math.max(
    ...strings.flatMap((s) => s.notes.map((n) => n.fret)),
  );
  const fretCount = fretCountProp ?? maxFret + 2 + fretOffset;
  const pl = large ? "pl-[2.4rem]" : "pl-[1.9rem]";

  return (
    <div className="w-full">
      {/* Fret inlay markers — only when key is selected */}
      {displayStartFret !== undefined && (
        <div className={`flex ${pl} h-[14px] mb-[0.1rem]`}>
          {Array.from({ length: fretCount }, (_, f) => {
            const abs = f + displayStartFret;
            return (
              <div key={f} className="flex-1 flex items-center justify-center flex-col gap-[3px]">
                {FRET_DOUBLE.has(abs) ? (
                  <>
                    <div className="w-[4px] h-[4px] rounded-full" style={{ backgroundColor: "var(--faint)" }} />
                    <div className="w-[4px] h-[4px] rounded-full" style={{ backgroundColor: "var(--faint)" }} />
                  </>
                ) : FRET_INLAYS.has(abs) ? (
                  <div className="w-[4px] h-[4px] rounded-full" style={{ backgroundColor: "var(--faint)" }} />
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* Fret numbers */}
      <div className={`flex ${pl} mb-[0.15rem]`}>
        {Array.from({ length: fretCount }, (_, f) => (
          <div
            key={f}
            className={`flex-1 text-center ${large ? "text-[0.6rem]" : "text-[0.45rem]"} text-[var(--faint)]`}
          >
            {displayStartFret !== undefined ? f + displayStartFret : f}
          </div>
        ))}
      </div>

      {/* Strings — high e first */}
      {[...strings].reverse().map((str) => (
        <StringRow
          key={str.name}
          str={str}
          fretCount={fretCount}
          noteFilter={noteFilter}
          chordTones={chordTones}
          large={large}
          fretOffset={fretOffset}
        />
      ))}
    </div>
  );
}

// ─── UnifiedDot ──────────────────────────────────────────────────────────────

function UnifiedDot({
  note,
  visible,
  orderedSystems,
}: {
  note: UnifiedNote;
  visible: boolean;
  orderedSystems: [System, System];
}) {
  const isShared = note.systems.length === 2;
  const sys = note.systems[0];

  // Ring background: split gradient for shared, solid for single-system
  const ringBg = isShared
    ? `linear-gradient(90deg, var(--sys-${orderedSystems[0]}) 50%, var(--sys-${orderedSystems[1]}) 50%)`
    : `var(--sys-${sys})`;

  // Inner dot fill (same logic as regular Dot)
  let innerClasses: string;
  let innerBorder: React.CSSProperties | undefined;
  if (note.deg === "R") {
    innerClasses = "bg-[var(--root-col)] text-white";
    innerBorder = undefined;
  } else if (note.penta) {
    innerClasses = "bg-[var(--text)] text-[var(--bg)]";
    innerBorder = undefined;
  } else {
    innerClasses = "bg-[var(--bg)] text-[var(--text)]";
    innerBorder = { border: "1.5px solid var(--text)" };
  }

  return (
    <div
      className={[
        "w-6 h-6 rounded-full flex items-center justify-center",
        "transition-[opacity,transform] duration-[120ms]",
        visible ? "" : "opacity-0 scale-[0.2] pointer-events-none",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ background: ringBg }}
    >
      <div
        className={[
          "w-[18px] h-[18px] rounded-full flex items-center justify-center text-[0.42rem] relative z-[2]",
          innerClasses,
        ].join(" ")}
        style={innerBorder}
      >
        {note.deg}
      </div>
    </div>
  );
}

// ─── UnifiedStringRow ────────────────────────────────────────────────────────

function UnifiedStringRow({
  str,
  fretCount,
  noteFilter,
  chordTones,
  orderedSystems,
}: {
  str: UnifiedString;
  fretCount: number;
  noteFilter: NoteFilter;
  chordTones: Set<string>;
  orderedSystems: [System, System];
}) {
  const line = STRING_LINE[str.name];
  const rowH = "h-[29px]";

  function isVisible(note: UnifiedNote): boolean {
    if (noteFilter === "all") return true;
    if (noteFilter === "penta") return note.deg === "R" || note.penta;
    if (noteFilter === "chord") return chordTones.has(note.deg);
    return true;
  }

  return (
    <div className={`flex items-center ${rowH}`} data-string={str.name}>
      <div className="w-[1.9rem] text-[0.5rem] text-right pr-[0.4rem] shrink-0 text-[var(--muted)]">
        {str.name}
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
        {Array.from({ length: fretCount }, (_, f) => {
          const note = str.notes.find((n) => n.fret === f);
          return (
            <div
              key={f}
              className={`flex-1 ${rowH} flex items-center justify-center relative z-[1]`}
            >
              {note && (
                <UnifiedDot
                  note={note}
                  visible={isVisible(note)}
                  orderedSystems={orderedSystems}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── UnifiedFretboard ────────────────────────────────────────────────────────

function UnifiedFretboard({
  strings,
  noteFilter,
  chordTones,
  orderedSystems,
  displayStartFret,
}: {
  strings: UnifiedString[];
  noteFilter: NoteFilter;
  chordTones: Set<string>;
  orderedSystems: [System, System];
  displayStartFret?: number;
}) {
  const maxFret = Math.max(
    ...strings.flatMap((s) => s.notes.map((n) => n.fret)),
  );
  const fretCount = maxFret + 2;

  return (
    <div className="w-full">
      {/* Fret inlay markers — only when key is selected */}
      {displayStartFret !== undefined && (
        <div className="flex pl-[1.9rem] h-[14px] mb-[0.1rem]">
          {Array.from({ length: fretCount }, (_, f) => {
            const abs = f + displayStartFret;
            return (
              <div key={f} className="flex-1 flex items-center justify-center flex-col gap-[3px]">
                {FRET_DOUBLE.has(abs) ? (
                  <>
                    <div className="w-[4px] h-[4px] rounded-full" style={{ backgroundColor: "var(--faint)" }} />
                    <div className="w-[4px] h-[4px] rounded-full" style={{ backgroundColor: "var(--faint)" }} />
                  </>
                ) : FRET_INLAYS.has(abs) ? (
                  <div className="w-[4px] h-[4px] rounded-full" style={{ backgroundColor: "var(--faint)" }} />
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex pl-[1.9rem] mb-[0.15rem]">
        {Array.from({ length: fretCount }, (_, f) => (
          <div
            key={f}
            className="flex-1 text-center text-[0.45rem] text-[var(--faint)]"
          >
            {displayStartFret !== undefined ? f + displayStartFret : f}
          </div>
        ))}
      </div>
      {[...strings].reverse().map((str) => (
        <UnifiedStringRow
          key={str.name}
          str={str}
          fretCount={fretCount}
          noteFilter={noteFilter}
          chordTones={chordTones}
          orderedSystems={orderedSystems}
        />
      ))}
    </div>
  );
}

// ─── UnifiedCell ─────────────────────────────────────────────────────────────

function UnifiedCell({
  posA,
  posB,
  fretOffsetA,
  fretOffsetB,
  noteFilter,
  chordTones,
  orderedSystems,
  showModes,
  scaleMode,
  keyOffset,
}: {
  posA: ScalePosition;
  posB: ScalePosition;
  fretOffsetA: number;
  fretOffsetB: number;
  noteFilter: NoteFilter;
  chordTones: Set<string>;
  orderedSystems: [System, System];
  showModes?: boolean;
  scaleMode?: ScaleMode;
  keyOffset?: number;
}) {
  const mergedStrings = useMemo(
    () => mergePositions(posA, posB, fretOffsetA, fretOffsetB),
    [posA, posB, fretOffsetA, fretOffsetB],
  );

  // Compute fret range for label
  const allFrets = mergedStrings.flatMap((s) => s.notes.map((n) => n.fret));
  const minFret = Math.min(...allFrets);
  const maxFret = Math.max(...allFrets);

  const sysA = orderedSystems[0];
  const sysB = orderedSystems[1];

  return (
    <div className="col-span-2 max-[560px]:col-span-1 border -mt-px -ml-px border-[var(--border)] bg-[var(--surface)] relative">
      {/* Top accent bar — split gradient for both systems */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{
          background: `linear-gradient(90deg, var(--sys-${sysA}) 50%, var(--sys-${sysB}) 50%)`,
        }}
      />

      {/* Header */}
      <div className="px-3 pt-3 pb-1 flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2 flex-wrap">
          {/* Position info from system A */}
          <span className="font-display text-[0.68rem] tracking-[0.13em] uppercase text-[var(--muted)]">
            {posA.shapeName
              ? `${posA.shapeName} shape`
              : `Start on ${posA.startDeg}`}
          </span>
          <span className="text-[0.45rem] text-[var(--muted)]">/</span>
          {/* Position info from system B */}
          <span className="font-display text-[0.68rem] tracking-[0.13em] uppercase text-[var(--muted)]">
            {posB.shapeName
              ? `${posB.shapeName} shape`
              : `Start on ${posB.startDeg}`}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[0.45rem] text-[var(--faint)] tracking-[0.08em]">
            frets {minFret}–{maxFret}
          </span>
          {/* System badges */}
          <span
            className="font-display text-[0.42rem] tracking-[0.12em] uppercase px-[0.35rem] py-[0.1rem] rounded-sm"
            style={{
              backgroundColor: `var(--sys-${sysA})`,
              color: "white",
            }}
          >
            {SYSTEM_LABELS[sysA]}
          </span>
          <span
            className="font-display text-[0.42rem] tracking-[0.12em] uppercase px-[0.35rem] py-[0.1rem] rounded-sm"
            style={{
              backgroundColor: `var(--sys-${sysB})`,
              color: "white",
            }}
          >
            {SYSTEM_LABELS[sysB]}
          </span>
        </div>
      </div>

      {showModes && scaleMode && (
        <div className="px-3 pb-1">
          <span className="text-[0.5rem] tracking-[0.08em] text-[var(--muted)]">
            {MODE_ROMAN[scaleMode][posA.scaletone - 1]} — {MODES[scaleMode][posA.scaletone - 1]}
          </span>
        </div>
      )}

      <div className="px-2 pb-2">
        <UnifiedFretboard
          strings={mergedStrings}
          noteFilter={noteFilter}
          chordTones={chordTones}
          orderedSystems={orderedSystems}
          displayStartFret={
            keyOffset !== undefined
              ? Math.min(posA.startFret, posB.startFret) + keyOffset
              : undefined
          }
        />
      </div>
    </div>
  );
}

// ─── PositionCell ─────────────────────────────────────────────────────────────

function fretRange(strings: ScaleString[], fretOffset: number): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const s of strings) {
    for (const n of s.notes) {
      const f = n.fret + fretOffset;
      if (f < min) min = f;
      if (f > max) max = f;
    }
  }
  return [min, max];
}

function PositionCell({
  pos,
  isSelected,
  onClick,
  noteFilter,
  chordTones,
  fretOffset = 0,
  fretCount,
  showModes = false,
  scaleMode = "major",
  displayStartFret,
}: {
  pos: ScalePosition;
  isSelected: boolean;
  onClick: () => void;
  noteFilter: NoteFilter;
  chordTones: Set<string>;
  fretOffset?: number;
  fretCount?: number;
  showModes?: boolean;
  scaleMode?: ScaleMode;
  displayStartFret?: number;
}) {
  const sysColor = `var(--sys-${pos.system})`;
  const [minFret, maxFret] = fretRange(pos.strings, fretOffset);
  const modeRoman = MODE_ROMAN[scaleMode][pos.scaletone - 1];
  const modeName = MODES[scaleMode][pos.scaletone - 1];

  return (
    <div
      onClick={onClick}
      className={[
        "border -mt-px -ml-px cursor-pointer transition-colors duration-100 flex",
        isSelected
          ? "bg-[var(--surface)] border-[var(--text)] relative z-[2]"
          : "border-[var(--border)] hover:bg-[var(--surface)]",
      ].join(" ")}
    >
      {/* System color accent bar */}
      <div
        className="w-[3px] shrink-0"
        style={{ backgroundColor: sysColor }}
      />

      <div className="flex-1 p-[0.9rem_1rem_0.7rem] min-w-0">
        <div className="flex justify-between items-center mb-[0.45rem]">
          <div className="flex flex-col gap-[0.2rem]">
            <div className="font-display text-[0.68rem] tracking-[0.13em] uppercase text-[var(--muted)]">
              {pos.shapeName ? (
                <>
                  <strong className="text-[var(--accent)] font-normal text-[0.82rem]">
                    {pos.shapeName}
                  </strong>{" "}
                  Shape
                </>
              ) : (
                <>
                  Start on{" "}
                  <strong className="text-[var(--accent)] font-normal text-[0.82rem]">
                    {pos.startDeg}
                  </strong>
                </>
              )}
            </div>
            {showModes && (
              <div className="font-display text-[0.62rem] tracking-[0.1em] text-[var(--text)]">
                <span className="text-[var(--accent)]">{modeRoman}</span>
                {" · "}
                {modeName}
              </div>
            )}
          </div>
          <div className="flex items-center gap-[0.4rem]">
            <span className="font-mono text-[0.5rem] tracking-[0.04em] text-[var(--muted)]">
              frets {minFret}–{maxFret}
            </span>
            <span
              className="font-display text-[0.58rem] px-[0.45rem] py-[0.15rem] tracking-[0.1em] uppercase"
              style={{
                color: sysColor,
                border: `1px solid ${sysColor}`,
              }}
            >
              {SYSTEM_FULL_LABELS[pos.system]}
            </span>
          </div>
        </div>
        <Fretboard
          strings={pos.strings}
          noteFilter={noteFilter}
          chordTones={chordTones}
          fretOffset={fretOffset}
          fretCount={fretCount}
          displayStartFret={displayStartFret}
        />
      </div>
    </div>
  );
}

// ─── ShapeModal ───────────────────────────────────────────────────────────────

function ShapeModal({
  pos,
  systemIdx,
  systemTotal,
  onClose,
  onPrev,
  onNext,
  noteFilter,
  chordTones,
  scaleMode,
  showModes,
}: {
  pos: ScalePosition;
  systemIdx: number;
  systemTotal: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  noteFilter: NoteFilter;
  chordTones: Set<string>;
  scaleMode: ScaleMode;
  showModes: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") onPrev();
      else if (e.key === "ArrowRight") onNext();
      else if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onPrev, onNext, onClose]);

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Focus trap — focus the panel on mount so keyboard events register
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  const sname = scaleMode === "minor" ? "natural minor" : "major";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 max-[560px]:items-end max-[560px]:p-0"
      style={{
        backgroundColor: "rgba(10, 8, 6, 0.82)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative w-full max-w-[740px] bg-[var(--surface)] outline-none max-[560px]:max-h-[90vh] max-[560px]:overflow-y-auto"
        style={{
          border: "1px solid var(--border)",
          borderTop: "3px solid var(--accent)",
          boxShadow: "0 32px 96px rgba(0,0,0,0.55)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="hidden max-[560px]:flex justify-center pt-[0.7rem] pb-[0.1rem]">
          <div className="w-8 h-[3px] bg-[var(--border)]" />
        </div>

        {/* Header */}
        <div
          className="flex items-start justify-between px-5 pt-4 pb-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div>
            <div className="flex items-center gap-[0.5rem] mb-[0.3rem]">
              <div
                className="w-[6px] h-[6px] rounded-full shrink-0"
                style={{ backgroundColor: `var(--sys-${pos.system})` }}
              />
              <span
                className="font-display text-[0.55rem] tracking-[0.18em] uppercase"
                style={{ color: `var(--sys-${pos.system})` }}
              >
                {SYSTEM_FULL_LABELS[pos.system]} system
              </span>
            </div>
            <div className="font-display text-[1.05rem] tracking-[0.07em] uppercase leading-none">
              {pos.shapeName ? (
                <>
                  <span className="text-[var(--accent)]">{pos.shapeName}</span>{" "}
                  Shape
                </>
              ) : (
                <>
                  Scaletone {pos.scaletone}
                  <span className="text-[var(--accent)]">
                    {" "}
                    · {pos.startDeg}
                  </span>
                </>
              )}
            </div>
            {showModes && (
              <div className="font-display text-[0.72rem] tracking-[0.1em] mt-[0.35rem]">
                <span className="text-[var(--accent)]">
                  {MODE_ROMAN[scaleMode][pos.scaletone - 1]}
                </span>
                {" · "}
                {MODES[scaleMode][pos.scaletone - 1]}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 pt-[0.15rem]">
            <div className="font-display text-[0.75rem] tracking-[0.14em] uppercase text-[var(--text)]">
              {systemIdx + 1} / {systemTotal}
            </div>
            <button
              onClick={onClose}
              className="font-display text-[0.65rem] tracking-[0.1em] uppercase border cursor-pointer transition-colors duration-100 px-3 py-[0.35rem] max-[700px]:py-[0.6rem] max-[700px]:min-h-[44px] bg-transparent text-[var(--text)] border-[var(--border)] hover:border-[var(--text)]"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Fretboard area */}
        <div className="flex items-center gap-2 px-3 py-6 max-[560px]:grid max-[560px]:grid-cols-2 max-[560px]:py-4 max-[560px]:px-4 max-[560px]:gap-3">
          {/* Prev */}
          <button
            onClick={onPrev}
            aria-label="Previous shape"
            className="shrink-0 w-10 h-10 flex items-center justify-center border cursor-pointer transition-colors duration-100 bg-transparent text-[var(--text)] border-[var(--border)] hover:border-[var(--text)] font-display text-[1rem] max-[560px]:order-2 max-[560px]:h-14 max-[560px]:w-full"
          >
            ←
          </button>

          {/* Large fretboard */}
          <div className="flex-1 min-w-0 max-[560px]:col-span-2 max-[560px]:order-1">
            <Fretboard
              strings={pos.strings}
              noteFilter={noteFilter}
              chordTones={chordTones}
              large
            />
          </div>

          {/* Next */}
          <button
            onClick={onNext}
            aria-label="Next shape"
            className="shrink-0 w-10 h-10 flex items-center justify-center border cursor-pointer transition-colors duration-100 bg-transparent text-[var(--text)] border-[var(--border)] hover:border-[var(--text)] font-display text-[1rem] max-[560px]:order-3 max-[560px]:h-14 max-[560px]:w-full"
          >
            →
          </button>
        </div>

        {/* Detail info */}
        <div
          className="flex gap-6 flex-wrap px-5 pt-3 pb-4"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <div className="text-[0.65rem] leading-[1.75] text-[var(--muted)] min-w-[9rem]">
            <b className="block text-[0.55rem] tracking-[0.12em] uppercase text-[var(--text)] mb-[0.15rem]">
              {pos.shapeName ? "Shape" : "Scaletone"}
            </b>
            {pos.shapeName
              ? `${pos.shapeName} shape — based on open ${pos.shapeName} chord form`
              : `Degree ${pos.scaletone} of ${sname} scale on low E`}
          </div>
          <div className="text-[0.65rem] leading-[1.75] text-[var(--muted)] min-w-[12rem]">
            <b className="block text-[0.55rem] tracking-[0.12em] uppercase text-[var(--text)] mb-[0.15rem]">
              System
            </b>
            {pos.system === "3nps"
              ? "Pure 3nps — every string has 3 consecutive scale degrees"
              : pos.system === "sym"
                ? "Symmetric — low E and high e are identical"
                : "CAGED — 5 movable shapes based on open chord forms"}
          </div>
        </div>

        {/* Keyboard hint */}
        <div className="px-5 pb-3 text-[0.48rem] tracking-[0.1em] uppercase text-[var(--muted)] max-[560px]:hidden">
          ← → arrow keys to navigate · esc to close
        </div>
      </div>
    </div>
  );
}

// ─── System selector helpers ─────────────────────────────────────────────────

const SYSTEM_ORDER: System[] = ["3nps", "caged", "sym"];
const SYSTEM_LABELS: Record<System, string> = {
  "3nps": "3nps",
  sym: "Symmetric",
  caged: "CAGED",
};

const SYSTEM_FULL_LABELS: Record<System, string> = {
  "3nps": "3NPS",
  sym: "Symmetric",
  caged: "CAGED",
};

function toggleSystem(current: System[], clicked: System): System[] {
  if (current.includes(clicked)) {
    // Don't deselect if it's the only one
    if (current.length === 1) return current;
    return current.filter((s) => s !== clicked);
  }
  if (current.length < 2) {
    return [...current, clicked];
  }
  // 2 already selected — do nothing (button should be disabled)
  return current;
}

// ─── ScalePositions ───────────────────────────────────────────────────────────

export function ScalePositions() {
  const [isDark, setIsDark] = useState(false);
  const [keyIdx, setKeyIdx] = useState(() => {
    if (typeof window === "undefined") return 3; // SSR: default G
    const s = localStorage.getItem("shred-dojo-key");
    const n = s !== null ? Number(s) : NaN;
    return Number.isInteger(n) && n >= 0 && n < 12 ? n : 3;
  });
  const [scaleMode, setScaleMode] = useState<ScaleMode>("major");
  const [noteFilter, setNoteFilter] = useState<NoteFilter>("all");
  const [selectedSystems, setSelectedSystems] = useState<System[]>(() =>
    typeof window !== "undefined" && window.innerWidth < 640
      ? ["3nps"]
      : ["3nps", "caged"],
  );
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [modalIdx, setModalIdx] = useState<number | null>(null);
  const [showModes, setShowModes] = useState(false);
  const [isHarmonicMinor, setIsHarmonicMinor] = useState(false);
  const [unifiedScaletones, setUnifiedScaletones] = useState<Set<number>>(
    new Set(),
  );

  useEffect(() => {
    const stored = localStorage.getItem("shred-dojo-dark");
    if (stored !== null) {
      setIsDark(stored === "true");
    } else {
      setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  }, []);

  function toggleDark() {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("shred-dojo-dark", String(next));
      return next;
    });
  }

  const cfg = isHarmonicMinor && scaleMode === "minor" ? HARMONIC_MINOR_CFG : SCALES[scaleMode];
  const chordTones = cfg.chordTones;

  const selectedKey = KEYS[keyIdx];
  const keyOffset = (selectedKey.fret - ROOT_FRET + 12) % 12;

  function handleKeyChange(idx: number) {
    setKeyIdx(idx);
    localStorage.setItem("shred-dojo-key", String(idx));
  }

  // Build all positions (3nps + sym + caged)
  const allPositions = useMemo(() => {
    const threeAndSym = buildAllPositions(cfg);
    const caged = buildCagedPositions(cfg);
    return [...threeAndSym, ...caged];
  }, [cfg]);

  // Sort selected systems by SYSTEM_ORDER for consistent column placement
  const orderedSystems = useMemo(
    () => SYSTEM_ORDER.filter((s) => selectedSystems.includes(s)),
    [selectedSystems],
  );

  // Group positions by system
  const positionsBySystem = useMemo(() => {
    const map = new Map<System, ScalePosition[]>();
    for (const sys of SYSTEM_ORDER) {
      map.set(
        sys,
        allPositions.filter((p) => p.system === sys),
      );
    }
    return map;
  }, [allPositions]);

  // Build grid rows: paired by scaletone when 2 systems selected
  const gridItems = useMemo(() => {
    if (orderedSystems.length === 1) {
      // Single system — flat list
      return (positionsBySystem.get(orderedSystems[0]) ?? []).map((pos) => ({
        pos,
        key: `${pos.scaletone}-${pos.system}`,
        fretOffset: 0,
        fretCount: undefined as number | undefined,
        scaletone: pos.scaletone,
      }));
    }

    // Two systems — pair by scaletone (1-7)
    const [sysA, sysB] = orderedSystems;
    const posA = positionsBySystem.get(sysA) ?? [];
    const posB = positionsBySystem.get(sysB) ?? [];
    const items: {
      pos: ScalePosition | null;
      key: string;
      fretOffset: number;
      fretCount?: number;
      scaletone: number;
    }[] = [];

    for (let st = 1; st <= 7; st++) {
      const a = posA.find((p) => p.scaletone === st) ?? null;
      const b = posB.find((p) => p.scaletone === st) ?? null;

      let fretOffsetA = 0;
      let fretOffsetB = 0;
      if (a && b) {
        const diff = a.startFret - b.startFret;
        if (Math.abs(diff) <= 6) {
          if (diff > 0) fretOffsetA = diff;
          else if (diff < 0) fretOffsetB = -diff;
        }
      }

      let fretCountB: number | undefined = undefined;
      if (a && b && sysA === "3nps" && sysB === "caged") {
        const maxFretA = Math.max(...a.strings.flatMap((s) => s.notes.map((n) => n.fret)));
        const maxFretB = Math.max(...b.strings.flatMap((s) => s.notes.map((n) => n.fret)));
        const naturalA = maxFretA + 2 + fretOffsetA;
        const naturalB = maxFretB + 2 + fretOffsetB;
        fretCountB = Math.max(naturalB, naturalA);
      }

      items.push({ pos: a, key: `${st}-${sysA}`, fretOffset: fretOffsetA, scaletone: st });
      items.push({ pos: b, key: `${st}-${sysB}`, fretOffset: fretOffsetB, fretCount: fretCountB, scaletone: st });
    }
    return items;
  }, [orderedSystems, positionsBySystem]);

  function handleScaleChange(mode: ScaleMode) {
    setScaleMode(mode);
    setSelectedIdx(null);
    setModalIdx(null);
    setUnifiedScaletones(new Set());
    if (mode === "major") setIsHarmonicMinor(false);
  }

  function handleSystemToggle(sys: System) {
    setSelectedSystems((prev) => toggleSystem(prev, sys));
    setSelectedIdx(null);
    setModalIdx(null);
    setUnifiedScaletones(new Set());
  }

  function handleUnifyToggle(scaletone: number) {
    setUnifiedScaletones((prev) => {
      const next = new Set(prev);
      if (next.has(scaletone)) next.delete(scaletone);
      else next.add(scaletone);
      return next;
    });
  }

  function handleSelect(pos: ScalePosition) {
    const globalIdx = allPositions.indexOf(pos);
    setSelectedIdx(globalIdx);
    setModalIdx(globalIdx);
  }

  function handleModalClose() {
    setModalIdx(null);
  }

  // Returns all positions with the same system as the one currently in the modal
  const modalSystemPositions = useMemo(() => {
    if (modalIdx === null) return [];
    const sys = allPositions[modalIdx]?.system;
    return allPositions.filter((p) => p.system === sys);
  }, [allPositions, modalIdx]);

  function handleModalNav(dir: -1 | 1) {
    if (modalIdx === null) return;
    const sys = allPositions[modalIdx].system;
    const sysPositions = allPositions.filter((p) => p.system === sys);
    const sysIdx = sysPositions.indexOf(allPositions[modalIdx]);
    const nextSysIdx =
      (sysIdx + dir + sysPositions.length) % sysPositions.length;
    const nextPos = sysPositions[nextSysIdx];
    const nextGlobalIdx = allPositions.indexOf(nextPos);
    setSelectedIdx(nextGlobalIdx);
    setModalIdx(nextGlobalIdx);
  }

  const modalPos = modalIdx !== null ? (allPositions[modalIdx] ?? null) : null;
  const modalSystemIdx = modalPos ? modalSystemPositions.indexOf(modalPos) : 0;

  return (
    <div
      style={isDark ? DARK_THEME : LIGHT_THEME}
      className="bg-[var(--bg)] text-[var(--text)] font-mono pb-20 transition-[background,color] duration-200 min-h-screen"
    >
      <Nav isDark={isDark} toggleDark={toggleDark} />
      <div className="pt-8 [@media(max-height:500px)]:pt-3 px-6">
      {/* Header */}
      <header className="max-w-[980px] mx-auto mb-10 flex items-end justify-between flex-wrap gap-4 border-b-2 border-[var(--text)] pb-6">
        <h1 className="font-display font-semibold text-[clamp(2rem,5vw,3.2rem)] tracking-[0.04em] uppercase leading-none">
          <span className="normal-case">{selectedKey.name}</span>{" "}
          <em className="text-[var(--accent)] not-italic">
            {cfg.title}
          </em>
          <br />
          Scale Positions
        </h1>
        <div className="text-[0.63rem] text-[var(--muted)] tracking-[0.05em] leading-[1.7] max-w-[18rem] text-right">
          Diatonic scale shapes across three systems: 3nps, CAGED, and
          symmetric.
        </div>
      </header>

      {/* Scale control row */}
      <div className="max-w-[980px] mx-auto flex gap-3 flex-wrap items-center pb-3 mb-3">
        <span className="text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)] mr-1">
          Scale
        </span>
        <CtrlButton
          label="Major"
          active={scaleMode === "major"}
          onClick={() => handleScaleChange("major")}
        />
        <CtrlButton
          label="Minor"
          active={scaleMode === "minor"}
          onClick={() => handleScaleChange("minor")}
        />
        {scaleMode === "minor" && (
          <>
            <div className="h-4 w-px mx-1" style={{ backgroundColor: "var(--border)" }} />
            <button
              onClick={() => {
                setIsHarmonicMinor((v) => !v);
                setSelectedIdx(null);
                setModalIdx(null);
                setUnifiedScaletones(new Set());
              }}
              className="font-display text-[0.75rem] tracking-[0.08em] uppercase border px-2 py-[0.3rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg)] max-[700px]:py-[0.55rem] max-[700px]:px-[1rem]"
              style={
                isHarmonicMinor
                  ? { backgroundColor: "var(--seventh-col)", borderColor: "var(--seventh-col)", color: "white" }
                  : { backgroundColor: "transparent", borderColor: "var(--border)", color: "var(--text)" }
              }
            >
              Harm. Minor
            </button>
          </>
        )}
        <div className="flex-1" />
        <span className="text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)] mr-1">
          Labels
        </span>
        <CtrlButton
          label="Modes"
          active={showModes}
          onClick={() => setShowModes((v) => !v)}
          small
        />
      </div>

      {/* Show + System control row */}
      <div className="max-w-[980px] mx-auto flex gap-3 flex-wrap items-center border-b border-[var(--border)] pb-5 mb-6">
        <span className="text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)] mr-1">
          Show
        </span>
        <CtrlButton
          label="All"
          active={noteFilter === "all"}
          onClick={() => setNoteFilter("all")}
        />
        <CtrlButton
          label="Pentatonic"
          active={noteFilter === "penta"}
          onClick={() => setNoteFilter("penta")}
        />
        <CtrlButton
          label="Chord tones"
          active={noteFilter === "chord"}
          onClick={() => setNoteFilter("chord")}
        />
        <div className="flex-1" />
        <span className="text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)] mr-1">
          System
        </span>
        <span className="text-[0.55rem] tracking-[0.04em] text-[var(--muted)] mr-1">
          {selectedSystems.length >= 2 ? "(deselect one to switch)" : "(pick 1–2)"}
        </span>
        {SYSTEM_ORDER.map((sys) => {
          const isActive = selectedSystems.includes(sys);
          const isDisabled = !isActive && selectedSystems.length >= 2;
          return (
            <CtrlButton
              key={sys}
              label={SYSTEM_LABELS[sys]}
              active={isActive}
              disabled={isDisabled}
              title={isDisabled ? "Deselect a system first" : undefined}
              onClick={() => handleSystemToggle(sys)}
            />
          );
        })}
      </div>

      {/* Key selector row */}
      <div className="max-w-[980px] mx-auto flex gap-2 flex-wrap items-center border-b border-[var(--border)] pb-5 mb-6">
        <span className="text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)] mr-1">
          Key
        </span>
        {KEYS.map((key, i) => (
          <CtrlButton
            key={key.name}
            label={key.name}
            active={keyIdx === i}
            onClick={() => handleKeyChange(i)}
            small
            normalCase
          />
        ))}
      </div>

      {/* Legend */}
      <Legend diaLabel={cfg.diaLabel} />

      {/* Grid */}
      <div className="max-w-[980px] mx-auto grid grid-cols-2 max-[560px]:grid-cols-1">
        {gridItems.map(({ pos, key, fretOffset, fretCount, scaletone }, i) => {
          const isTwoSystems = orderedSystems.length === 2;
          const showSeparator = isTwoSystems && i % 2 === 0;
          const isUnified = isTwoSystems && unifiedScaletones.has(scaletone);

          // Skip the second cell of a unified pair
          if (isUnified && i % 2 === 1) return null;

          // Check if both positions exist for this scaletone (for unify button)
          const pairItem = isTwoSystems && i % 2 === 0 ? gridItems[i + 1] : null;
          const canUnify = pairItem?.pos != null && pos != null;

          // Render unified cell
          if (isUnified && i % 2 === 0 && pos && pairItem?.pos) {
            return (
              <Fragment key={key}>
                <div className="col-span-2 max-[560px]:col-span-1 flex items-center gap-3 px-4 -mt-px border border-[var(--border)] bg-[var(--surface)] py-[0.35rem]">
                  <div className="flex-1 h-px bg-[var(--border)]" />
                  <span className="font-display text-[0.62rem] tracking-[0.18em] uppercase text-[var(--accent)]">
                    {ROMAN[scaletone - 1]}
                  </span>
                  <div className="flex-1 h-px bg-[var(--border)]" />
                  <button
                    onClick={() => handleUnifyToggle(scaletone)}
                    className="font-display text-[0.55rem] px-[0.6rem] py-[0.15rem] tracking-[0.1em] uppercase border transition-all duration-100 cursor-pointer bg-[var(--text)] text-[var(--bg)] border-[var(--text)]"
                  >
                    Split
                  </button>
                </div>
                <UnifiedCell
                  posA={pos}
                  posB={pairItem.pos}
                  fretOffsetA={fretOffset}
                  fretOffsetB={pairItem.fretOffset}
                  noteFilter={noteFilter}
                  chordTones={chordTones}
                  orderedSystems={orderedSystems as [System, System]}
                  showModes={showModes}
                  scaleMode={scaleMode}
                  keyOffset={keyOffset}
                />
              </Fragment>
            );
          }

          const cell = !pos ? (
            <div
              key={key}
              className="border border-dashed -mt-px -ml-px border-[var(--border)] flex items-center justify-center min-h-[8rem]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(-45deg, transparent, transparent 6px, var(--fret-bar) 6px, var(--fret-bar) 7px)",
              }}
            >
              <div className="flex flex-col items-center gap-[0.5rem] opacity-40 text-center">
                <div className="font-display text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)]">
                  No CAGED shape
                </div>
                <div className="font-mono text-[0.52rem] tracking-[0.04em] text-[var(--muted)] leading-[1.5]">
                  CAGED has 5 shapes (scaletones 1–5)
                </div>
              </div>
            </div>
          ) : (
            <PositionCell
              key={key}
              pos={pos}
              isSelected={selectedIdx === allPositions.indexOf(pos)}
              onClick={() => handleSelect(pos)}
              noteFilter={noteFilter}
              chordTones={chordTones}
              fretOffset={fretOffset}
              fretCount={fretCount}
              showModes={showModes}
              scaleMode={scaleMode}
              displayStartFret={pos.startFret + keyOffset - fretOffset}
            />
          );
          return (
            <Fragment key={key}>
              {showSeparator && (
                <div className="col-span-2 max-[560px]:col-span-1 flex items-center gap-3 px-4 -mt-px border border-[var(--border)] bg-[var(--surface)] py-[0.35rem]">
                  <div className="flex-1 h-px bg-[var(--border)]" />
                  <span className="font-display text-[0.62rem] tracking-[0.18em] uppercase text-[var(--accent)]">
                    {ROMAN[scaletone - 1]}
                  </span>
                  <div className="flex-1 h-px bg-[var(--border)]" />
                  {canUnify && (
                    <button
                      onClick={() => handleUnifyToggle(scaletone)}
                      className="font-display text-[0.55rem] px-[0.6rem] py-[0.15rem] tracking-[0.1em] uppercase border transition-all duration-100 cursor-pointer bg-transparent text-[var(--muted)] border-[var(--border)] hover:border-[var(--text)] hover:text-[var(--text)]"
                    >
                      Unify
                    </button>
                  )}
                </div>
              )}
              {cell}
            </Fragment>
          );
        })}
      </div>

      {/* Shape modal */}
      {modalPos && (
        <ShapeModal
          pos={modalPos}
          systemIdx={modalSystemIdx}
          systemTotal={modalSystemPositions.length}
          onClose={handleModalClose}
          onPrev={() => handleModalNav(-1)}
          onNext={() => handleModalNav(1)}
          noteFilter={noteFilter}
          chordTones={chordTones as Set<string>}
          scaleMode={scaleMode}
          showModes={showModes}
        />
      )}
      <footer className="max-w-[980px] mx-auto mt-16 pt-5 border-t border-[var(--border)] text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)] text-center">
        Incorporates concepts taught by{" "}
        <a
          href="https://www.youtube.com/@PebberBrown"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent)] hover:underline"
        >
          Pebber Brown
        </a>
      </footer>
      </div>
    </div>
  );
}
