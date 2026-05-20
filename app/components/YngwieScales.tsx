import { useState, useEffect, useMemo } from "react";
import { Nav } from "./Nav";
import { DARK_THEME, LIGHT_THEME, STRING_LINE } from "./scalePositions.theme";
import { CtrlButton } from "./CtrlButton";
import type { Degree, ScaleString, StringName } from "./scalePositions.types";
import { FRET_DOUBLE, FRET_INLAYS, ROOT_FRET } from "./scalePositions.utils";
import { buildYngwieShapes, KEY_NAMES, type YngwieShape } from "./yngwieScales.utils";
import { FullNeckFretboard, type FullNeckLayer, type FullNeckNote } from "./FullNeckFretboard";

// ─── Constants ────────────────────────────────────────────────────────────────

const KEYS = KEY_NAMES.map((name, fret) => ({ name, fret }));
// Both shapes span 6 relative frets; 8 columns gives one column of breathing room
const FRET_COUNT = 8;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeDisplayFret(startFret: number, keyOffset: number, octaveShift: number): number {
  const raw = startFret + keyOffset;
  const base = raw > 12 ? raw - 12 : raw;
  return base + octaveShift;
}

function shapeToAbsNotes(shape: YngwieShape, dsf: number): FullNeckNote[] {
  return shape.strings.flatMap((str) =>
    str.notes.map((n) => ({
      string: str.name as StringName,
      absoluteFret: n.fret + dsf,
      deg: n.deg as Degree,
    }))
  ).filter((n) => n.absoluteFret >= 0 && n.absoluteFret <= 24);
}

// ─── Dot ──────────────────────────────────────────────────────────────────────

function Dot({ deg }: { deg: string }) {
  let bg: string, fg: string, border: string | undefined;
  if (deg === "R") {
    bg = "var(--root-col)"; fg = "#fff";
  } else if (deg === "7") {
    // Leading tone — the defining note of harmonic minor
    bg = "var(--seventh-col)"; fg = "#fff";
  } else {
    bg = "var(--surface)"; fg = "var(--text)"; border = "1.5px solid var(--text)";
  }
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center relative z-[2] font-display font-semibold text-[0.56rem] tracking-tight shrink-0"
      style={{ backgroundColor: bg, color: fg, border }}
    >
      {deg}
    </div>
  );
}

// ─── FretHeader ───────────────────────────────────────────────────────────────

function FretHeader({ displayStartFret }: { displayStartFret: number }) {
  return (
    <>
      <div className="flex pl-[2.2rem] h-[12px] mb-[2px]">
        {Array.from({ length: FRET_COUNT }, (_, f) => {
          const abs = f + displayStartFret;
          const isDouble = FRET_DOUBLE.has(abs);
          const hasInlay = FRET_INLAYS.has(abs);
          return (
            <div key={f} className="flex-1 flex items-center justify-center flex-col gap-[2px]">
              {isDouble ? (
                <>
                  <div className="w-[4px] h-[4px] rounded-full" style={{ backgroundColor: "var(--faint)" }} />
                  <div className="w-[4px] h-[4px] rounded-full" style={{ backgroundColor: "var(--faint)" }} />
                </>
              ) : hasInlay ? (
                <div className="w-[4px] h-[4px] rounded-full" style={{ backgroundColor: "var(--faint)" }} />
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="flex pl-[2.2rem] mb-[2px]">
        {Array.from({ length: FRET_COUNT }, (_, f) => (
          <div
            key={f}
            className="flex-1 text-center text-[0.44rem] font-mono"
            style={{ color: "var(--faint)" }}
          >
            {f + displayStartFret}
          </div>
        ))}
      </div>
    </>
  );
}

// ─── StringRow ────────────────────────────────────────────────────────────────

function StringRow({ str }: { str: ScaleString }) {
  const line = STRING_LINE[str.name as keyof typeof STRING_LINE];
  return (
    <div className="relative flex pl-[2.2rem]">
      <div
        className="absolute top-1/2 left-0 right-0 -translate-y-1/2 pointer-events-none"
        style={{ height: line.height, backgroundColor: line.colorVar }}
      />
      {Array.from({ length: FRET_COUNT }, (_, f) => {
        const note = str.notes.find((n) => n.fret === f);
        return (
          <div
            key={f}
            className="flex-1 h-[44px] flex items-center justify-center relative z-[1]"
          >
            {note && <Dot deg={note.deg} />}
          </div>
        );
      })}
    </div>
  );
}

// ─── ShapeCard ────────────────────────────────────────────────────────────────

function ShapeCard({
  shape,
  displayStartFret,
  isNeckOpen,
  showAllShapes,
  neckLayers,
  onToggleNeck,
  onToggleShowAll,
}: {
  shape: YngwieShape;
  displayStartFret: number;
  isNeckOpen: boolean;
  showAllShapes: boolean;
  neckLayers: FullNeckLayer[];
  onToggleNeck: () => void;
  onToggleShowAll: () => void;
}) {
  return (
    <div
      className="rounded-sm border flex flex-col"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
    >
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: "var(--border)", borderTopWidth: "3px", borderTopColor: "var(--accent)" }}
      >
        <div
          className="font-display font-semibold text-[1rem] tracking-[0.1em] uppercase"
          style={{ color: "var(--text)" }}
        >
          {shape.name}
        </div>
        <div
          className="font-mono text-[0.72rem] mt-[3px]"
          style={{ color: "var(--muted)" }}
        >
          {shape.tagline}
        </div>
      </div>
      <div className="p-4 select-none">
        <FretHeader displayStartFret={displayStartFret} />
        {[...shape.strings].reverse().map((str) => (
          <StringRow key={str.name} str={str} />
        ))}
      </div>

      {/* Full Neck toggle */}
      <div style={{ borderTop: "1px solid var(--border)" }}>
        <button
          onClick={onToggleNeck}
          className="w-full px-4 py-[0.5rem] flex items-center gap-2 text-[0.5rem] tracking-[0.12em] uppercase cursor-pointer transition-colors duration-100 hover:bg-[var(--surface)]"
          style={{ color: "var(--muted)", backgroundColor: "transparent" }}
        >
          <span>{isNeckOpen ? "▲" : "▼"}</span>
          Full Neck
        </button>

        {isNeckOpen && (
          <div className="px-4 pb-4">
            {/* Show all shapes toggle */}
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showAllShapes}
                onChange={onToggleShowAll}
                className="accent-[var(--accent)]"
              />
              <span className="text-[0.48rem] tracking-[0.1em] uppercase" style={{ color: "var(--muted)" }}>
                Show other shapes (dimmed)
              </span>
            </label>
            <FullNeckFretboard layers={neckLayers} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── YngwieScales ─────────────────────────────────────────────────────────────

export function YngwieScales() {
  const [isDark, setIsDark] = useState(false);
  const [keyIdx, setKeyIdx] = useState(0);
  const [octaveShift, setOctaveShift] = useState<0 | 12>(0);
  const [neckOpenIdx, setNeckOpenIdx] = useState<number | null>(null);
  const [showAllShapes, setShowAllShapes] = useState(false);

  useEffect(() => {
    const dark = localStorage.getItem("shred-dojo-dark") === "true";
    setIsDark(dark);
    const key = localStorage.getItem("shred-dojo-key");
    if (key !== null) setKeyIdx(Number(key));
  }, []);

  function toggleDark() {
    setIsDark((d) => {
      localStorage.setItem("shred-dojo-dark", String(!d));
      return !d;
    });
  }

  function setKey(idx: number) {
    setKeyIdx(idx);
    localStorage.setItem("shred-dojo-key", String(idx));
  }

  const theme = isDark ? DARK_THEME : LIGHT_THEME;
  const keyOffset = (keyIdx - ROOT_FRET + 12) % 12;
  const shapes = useMemo(() => buildYngwieShapes(), []);

  // Precompute display start fret and absolute notes for each shape
  const shapeData = useMemo(() =>
    shapes.map((shape) => ({
      dsf: computeDisplayFret(shape.startFret, keyOffset, octaveShift),
    })),
    [shapes, keyOffset, octaveShift]
  );

  // Main layer: normalized + octaveShift (matches card display)
  const absNotesByShape = useMemo(() =>
    shapes.map((shape, i) => shapeToAbsNotes(shape, shapeData[i].dsf)),
    [shapes, shapeData]
  );

  // Dimmed layers: raw positions so other shapes appear at their natural neck location
  const rawAbsNotesByShape = useMemo(() =>
    shapes.map((shape) => shapeToAbsNotes(shape, shape.startFret + keyOffset)),
    [shapes, keyOffset]
  );

  function buildNeckLayers(cardIdx: number): FullNeckLayer[] {
    return absNotesByShape.map((notes, i) => ({
      notes: i === cardIdx ? notes : rawAbsNotesByShape[i],
      isMain: i === cardIdx,
    }));
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]" style={theme}>
      <Nav isDark={isDark} toggleDark={toggleDark} />

      <main className="px-4 md:px-8 py-8 [@media(max-height:500px)]:py-3 max-w-[1400px] mx-auto">
        {/* Page title */}
        <div className="mb-8">
          <h1
            className="font-display font-semibold text-[clamp(1.8rem,4vw,2.8rem)] tracking-[0.04em] uppercase leading-none mb-1"
            style={{ color: "var(--text)" }}
          >
            Yngwie Scales
          </h1>
          <p
            className="font-mono text-[0.78rem] mt-2 max-w-[580px]"
            style={{ color: "var(--muted)" }}
          >
            Harmonic minor shapes favored by Yngwie Malmsteen. The raised 7th degree
            (leading tone, shown in{" "}
            <span style={{ color: "var(--seventh-col)" }}>purple</span>
            ) creates an augmented 2nd with the b6 — a 3-fret stretch that defines
            the classical shred sound.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-start gap-6 mb-8">
          {/* Key selector */}
          <div className="flex flex-col gap-[5px]">
            <span
              className="text-[0.52rem] tracking-[0.16em] uppercase font-display"
              style={{ color: "var(--muted)" }}
            >
              Key
            </span>
            <div className="flex flex-wrap gap-[3px]">
              {KEYS.map(({ name, fret }) => (
                <CtrlButton
                  key={fret}
                  label={name}
                  active={keyIdx === fret}
                  onClick={() => setKey(fret)}
                  small
                />
              ))}
            </div>
          </div>

          {/* Register toggle */}
          <div className="flex flex-col gap-[5px]">
            <span
              className="text-[0.52rem] tracking-[0.16em] uppercase font-display"
              style={{ color: "var(--muted)" }}
            >
              Register
            </span>
            <div className="flex gap-1">
              <CtrlButton
                label="Lower 12"
                active={octaveShift === 0}
                onClick={() => setOctaveShift(0)}
                small
              />
              <CtrlButton
                label="Upper 12"
                active={octaveShift === 12}
                onClick={() => setOctaveShift(12)}
                small
              />
            </div>
          </div>
        </div>

        {/* Shape cards */}
        <div className="grid grid-cols-1 min-[700px]:grid-cols-2 gap-4">
          {shapes.map((shape, idx) => {
            const allLayers = buildNeckLayers(idx);
            const activeLayers = showAllShapes
              ? allLayers
              : allLayers.filter((l) => l.isMain);
            return (
              <ShapeCard
                key={shape.name}
                shape={shape}
                displayStartFret={shapeData[idx].dsf}
                isNeckOpen={neckOpenIdx === idx}
                showAllShapes={showAllShapes}
                neckLayers={activeLayers}
                onToggleNeck={() =>
                  setNeckOpenIdx((prev) => (prev === idx ? null : idx))
                }
                onToggleShowAll={() => setShowAllShapes((v) => !v)}
              />
            );
          })}
        </div>
      </main>
    </div>
  );
}
