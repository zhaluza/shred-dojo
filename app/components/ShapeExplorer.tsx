import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router";
import { Nav } from "./Nav";
import { DARK_THEME, LIGHT_THEME, STRING_LINE } from "./scalePositions.theme";
import { CtrlButton } from "./CtrlButton";
import type {
  Degree,
  NoteFilter,
  ScaleMode,
  ScaleNote,
  ScaleString,
  StringName,
} from "./scalePositions.types";
import {
  buildAllPositions,
  buildCagedPositions,
  FRET_DOUBLE,
  FRET_INLAYS,
  ROOT_FRET,
  SCALES,
  SNAME,
  toRelative,
} from "./scalePositions.utils";
import {
  buildBox,
  bluesNotesForBox,
  type PentaScaleMode,
  type BoxNote,
} from "./pentatonicTriads.utils";
import { HARMONIC_MINOR_CFG } from "./yngwieScales.utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTE_NAMES = [
  "E", "F", "F#", "G", "Ab", "A", "Bb", "B", "C", "Db", "D", "Eb",
] as const;

const KEYS = NOTE_NAMES.map((name, fret) => ({ name, fret }));

const MODE_NAMES: Record<ScaleMode, string[]> = {
  major: ["Ionian", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Aeolian", "Locrian"],
  minor: ["Aeolian", "Locrian", "Ionian", "Dorian", "Phrygian", "Lydian", "Mixolydian"],
};

const DEGREE_ORDER: Degree[] = ["R", "2", "b3", "3", "4", "b5", "5", "b6", "6", "b7", "7"];

type ExplorerSystem = "3nps" | "caged" | "penta";
type ViewMode = "focus" | "overview" | "pair";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShapeData {
  strings: ScaleString[];
  startFret: number; // raw min fret % 12, for key-offset calculation
  label: string;
  subLabel?: string;
}

interface CombinedNote {
  fret: number;
  deg: Degree;
  penta: boolean;
  which: "a" | "b" | "both";
}

interface CombinedString {
  name: StringName;
  notes: CombinedNote[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNoteForDegree(deg: string, keyFret: number): string {
  const SEMI_MAP: Record<string, number> = {
    R: 0, "2": 2, b3: 3, "3": 4, "4": 5, "b5": 6, "5": 7, b6: 8, "6": 9, b7: 10, "7": 11,
  };
  return NOTE_NAMES[(keyFret + (SEMI_MAP[deg] ?? 0) + 12) % 12];
}

function boxNotesToScaleStrings(boxNotes: BoxNote[]): { strings: ScaleString[]; startFret: number } {
  const groups = new Map<StringName, BoxNote[]>();
  for (const note of boxNotes) {
    if (!groups.has(note.string)) groups.set(note.string, []);
    groups.get(note.string)!.push(note);
  }

  const rawStrings: ScaleString[] = SNAME.map((name) => ({
    name,
    notes: (groups.get(name) ?? [])
      .map((n) => ({ fret: n.fret, deg: n.deg as Degree, penta: true }))
      .sort((a, b) => a.fret - b.fret),
  }));

  const allFrets = rawStrings.flatMap((s) => s.notes.map((n) => n.fret));
  const minFret = allFrets.length > 0 ? Math.min(...allFrets) : 0;

  return {
    strings: toRelative(rawStrings),
    startFret: minFret % 12,
  };
}

function buildCombinedStrings(
  shapeA: ShapeData,
  shapeB: ShapeData,
  dsfA: number,
  dsfB: number,
): { strings: CombinedString[]; displayStartFret: number; fretCount: number } {
  // Map "stringName:absFret" -> note info for each shape
  const mapA = new Map<string, { deg: Degree; penta: boolean }>();
  for (const str of shapeA.strings) {
    for (const n of str.notes) {
      mapA.set(`${str.name}:${n.fret + dsfA}`, { deg: n.deg, penta: n.penta ?? false });
    }
  }
  const mapB = new Map<string, { deg: Degree; penta: boolean }>();
  for (const str of shapeB.strings) {
    for (const n of str.notes) {
      mapB.set(`${str.name}:${n.fret + dsfB}`, { deg: n.deg, penta: n.penta ?? false });
    }
  }

  const allKeys = new Set([...mapA.keys(), ...mapB.keys()]);
  let minFret = Infinity, maxFret = -Infinity;
  for (const key of allKeys) {
    const f = parseInt(key.slice(key.indexOf(":") + 1));
    if (f < minFret) minFret = f;
    if (f > maxFret) maxFret = f;
  }
  if (!isFinite(minFret)) { minFret = 0; maxFret = 4; }

  const strings: CombinedString[] = SNAME.map((name) => {
    const fretNotes = new Map<number, CombinedNote>();
    for (const key of allKeys) {
      const colon = key.indexOf(":");
      if (key.slice(0, colon) !== name) continue;
      const absFret = parseInt(key.slice(colon + 1));
      const inA = mapA.has(key);
      const inB = mapB.has(key);
      const note = mapA.get(key) ?? mapB.get(key)!;
      fretNotes.set(absFret, {
        fret: absFret - minFret,
        deg: note.deg,
        penta: note.penta,
        which: inA && inB ? "both" : inA ? "a" : "b",
      });
    }
    return {
      name,
      notes: [...fretNotes.values()].sort((a, b) => a.fret - b.fret),
    };
  });

  return { strings, displayStartFret: minFret, fretCount: maxFret - minFret + 3 };
}

// ─── Dot ──────────────────────────────────────────────────────────────────────

function Dot({ note, visible, compact = false }: { note: ScaleNote; visible: boolean; compact?: boolean }) {
  let bg: string, fg: string, border: string | undefined;
  if (note.deg === "R") {
    bg = "var(--root-col)"; fg = "#fff";
  } else if (note.deg === "b5") {
    bg = "var(--blues-col)"; fg = "#fff";
  } else if (note.penta) {
    bg = "var(--text)"; fg = "var(--bg)";
  } else {
    bg = "var(--bg)"; fg = "var(--text)"; border = "1.5px solid var(--text)";
  }

  return (
    <div
      className={[
        compact ? "w-4 h-4 text-[0.38rem]" : "w-8 h-8 text-[0.62rem]",
        "rounded-full flex items-center justify-center",
        "relative z-[2] font-display font-semibold tracking-tight",
        "transition-[opacity,transform] duration-[150ms]",
        visible ? "" : "opacity-0 scale-[0.1] pointer-events-none",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ backgroundColor: bg, color: fg, border }}
    >
      {note.deg}
    </div>
  );
}

// ─── CombinedDot ──────────────────────────────────────────────────────────────

function CombinedDot({ note, visible }: { note: CombinedNote; visible: boolean }) {
  let bg: string, fg: string, border: string | undefined, boxShadow: string | undefined;

  if (note.deg === "R") {
    bg = "var(--root-col)";
    fg = "#fff";
    // Shape B root or shared root gets a blue ring to indicate presence in B
    if (note.which === "b" || note.which === "both") {
      boxShadow = "0 0 0 2px var(--surface), 0 0 0 3.5px var(--fifth-col)";
    }
  } else if (note.which === "b") {
    bg = "var(--fifth-col)";
    fg = "#fff";
  } else if (note.which === "both") {
    // A styling with blue ring to show it's also in B
    if (note.penta) {
      bg = "var(--text)"; fg = "var(--bg)";
    } else {
      bg = "var(--bg)"; fg = "var(--text)"; border = "1.5px solid var(--text)";
    }
    boxShadow = "0 0 0 2px var(--surface), 0 0 0 3.5px var(--fifth-col)";
  } else {
    // which === "a" — standard appearance
    if (note.penta) {
      bg = "var(--text)"; fg = "var(--bg)";
    } else {
      bg = "var(--bg)"; fg = "var(--text)"; border = "1.5px solid var(--text)";
    }
  }

  return (
    <div
      className={[
        "w-8 h-8 text-[0.62rem]",
        "rounded-full flex items-center justify-center",
        "relative z-[2] font-display font-semibold tracking-tight",
        "transition-[opacity,transform] duration-[150ms]",
        visible ? "" : "opacity-0 scale-[0.1] pointer-events-none",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ backgroundColor: bg, color: fg, border, boxShadow }}
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
  compact = false,
}: {
  str: ScaleString;
  fretCount: number;
  noteFilter: NoteFilter;
  chordTones: Set<string>;
  compact?: boolean;
}) {
  const line = STRING_LINE[str.name];
  const rowH = compact ? "h-[28px]" : "h-[50px]";
  const labelW = compact ? "w-[1.6rem] text-[0.45rem]" : "w-[2.4rem] text-[0.55rem]";

  function isVisible(note: ScaleNote): boolean {
    if (noteFilter === "all") return true;
    if (noteFilter === "penta") return note.deg === "R" || note.penta;
    if (noteFilter === "chord") return chordTones.has(note.deg);
    return true;
  }

  return (
    <div className={`flex items-center ${rowH}`}>
      <div className={`${labelW} text-right pr-[0.5rem] shrink-0 text-[var(--muted)] font-display tracking-[0.08em] uppercase`}>
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
              {note && <Dot note={note} visible={isVisible(note)} compact={compact} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── CombinedStringRow ────────────────────────────────────────────────────────

function CombinedStringRow({
  str,
  fretCount,
  noteFilter,
  chordTones,
}: {
  str: CombinedString;
  fretCount: number;
  noteFilter: NoteFilter;
  chordTones: Set<string>;
}) {
  const line = STRING_LINE[str.name];

  function isVisible(note: CombinedNote): boolean {
    if (noteFilter === "all") return true;
    if (noteFilter === "penta") return note.deg === "R" || note.penta;
    if (noteFilter === "chord") return chordTones.has(note.deg);
    return true;
  }

  return (
    <div className="flex items-center h-[50px]">
      <div className="w-[2.4rem] text-[0.55rem] text-right pr-[0.5rem] shrink-0 text-[var(--muted)] font-display tracking-[0.08em] uppercase">
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
              className="flex-1 h-[50px] flex items-center justify-center relative z-[1]"
            >
              {note && <CombinedDot note={note} visible={isVisible(note)} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ExplorerFretboard ────────────────────────────────────────────────────────

function ExplorerFretboard({
  strings,
  noteFilter,
  chordTones,
  displayStartFret,
  compact = false,
}: {
  strings: ScaleString[];
  noteFilter: NoteFilter;
  chordTones: Set<string>;
  displayStartFret: number;
  compact?: boolean;
}) {
  const maxRelFret = Math.max(...strings.flatMap((s) => s.notes.map((n) => n.fret)));
  const fretCount = maxRelFret + 3;

  const inlayDot = compact ? "w-[3px] h-[3px]" : "w-[5px] h-[5px]";

  return (
    <div className="w-full select-none">
      {/* Fret inlay markers */}
      <div className={`flex ${compact ? "pl-[1.6rem] h-[10px]" : "pl-[2.4rem] h-[16px]"} mb-1`}>
        {Array.from({ length: fretCount }, (_, f) => {
          const abs = f + displayStartFret;
          const isDouble = FRET_DOUBLE.has(abs);
          const hasInlay = FRET_INLAYS.has(abs);
          return (
            <div
              key={f}
              className="flex-1 flex items-center justify-center flex-col gap-[3px]"
            >
              {isDouble ? (
                <>
                  <div className={`${inlayDot} rounded-full`} style={{ backgroundColor: "var(--faint)" }} />
                  <div className={`${inlayDot} rounded-full`} style={{ backgroundColor: "var(--faint)" }} />
                </>
              ) : hasInlay ? (
                <div className={`${inlayDot} rounded-full`} style={{ backgroundColor: "var(--faint)" }} />
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Fret numbers — actual guitar frets for selected key */}
      <div className={`flex ${compact ? "pl-[1.6rem]" : "pl-[2.4rem]"} mb-[0.2rem]`}>
        {Array.from({ length: fretCount }, (_, f) => (
          <div
            key={f}
            className={`flex-1 text-center ${compact ? "text-[0.38rem]" : "text-[0.5rem]"} text-[var(--faint)] font-mono`}
          >
            {f + displayStartFret}
          </div>
        ))}
      </div>

      {/* Strings — high e at top */}
      {[...strings].reverse().map((str) => (
        <StringRow
          key={str.name}
          str={str}
          fretCount={fretCount}
          noteFilter={noteFilter}
          chordTones={chordTones}
          compact={compact}
        />
      ))}
    </div>
  );
}

// ─── CombinedFretboard ────────────────────────────────────────────────────────

function CombinedFretboard({
  strings,
  fretCount,
  noteFilter,
  chordTones,
  displayStartFret,
}: {
  strings: CombinedString[];
  fretCount: number;
  noteFilter: NoteFilter;
  chordTones: Set<string>;
  displayStartFret: number;
}) {
  return (
    <div className="w-full select-none">
      {/* Fret inlay markers */}
      <div className="flex pl-[2.4rem] h-[16px] mb-1">
        {Array.from({ length: fretCount }, (_, f) => {
          const abs = f + displayStartFret;
          const isDouble = FRET_DOUBLE.has(abs);
          const hasInlay = FRET_INLAYS.has(abs);
          return (
            <div key={f} className="flex-1 flex items-center justify-center flex-col gap-[3px]">
              {isDouble ? (
                <>
                  <div className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: "var(--faint)" }} />
                  <div className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: "var(--faint)" }} />
                </>
              ) : hasInlay ? (
                <div className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: "var(--faint)" }} />
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Fret numbers */}
      <div className="flex pl-[2.4rem] mb-[0.2rem]">
        {Array.from({ length: fretCount }, (_, f) => (
          <div key={f} className="flex-1 text-center text-[0.5rem] text-[var(--faint)] font-mono">
            {f + displayStartFret}
          </div>
        ))}
      </div>

      {/* Strings — high e at top */}
      {[...strings].reverse().map((str) => (
        <CombinedStringRow
          key={str.name}
          str={str}
          fretCount={fretCount}
          noteFilter={noteFilter}
          chordTones={chordTones}
        />
      ))}
    </div>
  );
}

// ─── OverviewGrid ─────────────────────────────────────────────────────────────

function OverviewGrid({
  shapes,
  selectedIdx,
  keyOffset,
  effectiveFilter,
  chordTones,
  onSelect,
}: {
  shapes: ShapeData[];
  selectedIdx: number;
  keyOffset: number;
  effectiveFilter: NoteFilter;
  chordTones: Set<string>;
  onSelect: (idx: number) => void;
}) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
    >
      {shapes.map((shape, i) => {
        const displayStartFret = shape.startFret + keyOffset;
        const isActive = i === selectedIdx;
        return (
          <div
            key={i}
            onClick={() => onSelect(i)}
            className={[
              "border cursor-pointer transition-colors duration-100 p-3",
              isActive
                ? "border-[var(--text)] bg-[var(--surface)]"
                : "border-[var(--border)] hover:bg-[var(--surface)] hover:border-[var(--text)]",
            ].join(" ")}
          >
            <div className="mb-2">
              <p className="font-display text-[0.68rem] tracking-[0.1em] uppercase text-[var(--text)] leading-tight">
                {shape.label}
              </p>
              {shape.subLabel && (
                <p className="text-[0.42rem] tracking-[0.12em] uppercase text-[var(--muted)] mt-[0.1rem]">
                  {shape.subLabel}
                </p>
              )}
            </div>
            <ExplorerFretboard
              strings={shape.strings}
              noteFilter={effectiveFilter}
              chordTones={chordTones}
              displayStartFret={displayStartFret}
              compact
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── ShapeExplorer ────────────────────────────────────────────────────────────

export function ShapeExplorer() {
  const [scaleMode, setScaleMode] = useState<ScaleMode>("minor");
  const [system, setSystem] = useState<ExplorerSystem>("3nps");
  const [shapeIdx, setShapeIdx] = useState(0);
  const [pairIdx, setPairIdx] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("focus");
  const [noteFilter, setNoteFilter] = useState<NoteFilter>("all");
  const [keyIdx, setKeyIdx] = useState(3); // Default: G (fret 3)
  const [isDark, setIsDark] = useState(false);
  const [bluesMode, setBluesMode] = useState(false);
  const [isHarmonicMinor, setIsHarmonicMinor] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("shred-dojo-dark");
    if (stored === "true") setIsDark(true);
  }, []);

  const toggleDark = () =>
    setIsDark((prev) => {
      localStorage.setItem("shred-dojo-dark", String(!prev));
      return !prev;
    });

  const theme = isDark ? DARK_THEME : LIGHT_THEME;
  const cfg = isHarmonicMinor && scaleMode === "minor" ? HARMONIC_MINOR_CFG : SCALES[scaleMode];
  const selectedKey = KEYS[keyIdx];

  // Build positions for the current scale config
  const positions3nps = useMemo(
    () => buildAllPositions(cfg).filter((p) => p.system === "3nps"),
    [cfg],
  );
  const positionsCaged = useMemo(() => buildCagedPositions(cfg), [cfg]);

  const pentaBoxes: ShapeData[] = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => {
        const rawNotes = buildBox(i, scaleMode as PentaScaleMode);
        const boxNotes =
          bluesMode && scaleMode === "minor"
            ? [...rawNotes, ...bluesNotesForBox(rawNotes)]
            : rawNotes;
        const { strings, startFret } = boxNotesToScaleStrings(boxNotes);
        return { strings, startFret, label: `Box ${i + 1}` };
      }),
    [scaleMode, bluesMode],
  );

  // Shapes for the selected system
  const shapes: ShapeData[] = useMemo(() => {
    if (system === "3nps") {
      return positions3nps.map((p, i) => ({
        strings: p.strings,
        startFret: p.startFret,
        label: `Position ${i + 1}`,
        subLabel: MODE_NAMES[scaleMode][i],
      }));
    }
    if (system === "caged") {
      return positionsCaged.map((p) => ({
        strings: p.strings,
        startFret: p.startFret,
        label: `${p.shapeName} Shape`,
        subLabel: `Scaletone ${p.scaletone}`,
      }));
    }
    return pentaBoxes;
  }, [system, positions3nps, positionsCaged, pentaBoxes, scaleMode]);

  const safeIdx = Math.min(shapeIdx, shapes.length - 1);
  const pairSafeIdx = Math.min(pairIdx, shapes.length - 1);
  const shape = shapes[safeIdx];
  const shapeB = shapes[pairSafeIdx];

  // Key offset: how far the selected key is from G (ROOT_FRET=3)
  const keyOffset = (selectedKey.fret - ROOT_FRET + 12) % 12;
  // Actual guitar fret where this shape starts for the selected key
  const displayStartFret = shape.startFret + keyOffset;
  const displayStartFretB = shapeB.startFret + keyOffset;

  // Penta system always shows penta filter
  const effectiveFilter: NoteFilter = system === "penta" ? "penta" : noteFilter;

  // Merged fretboard for Pair view
  const combined = useMemo(
    () => buildCombinedStrings(shape, shapeB, displayStartFret, displayStartFretB),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shape, shapeB, displayStartFret, displayStartFretB],
  );

  // Unique degrees that appear in this shape, sorted by interval order
  const degreesInShape = useMemo(() => {
    const seen = new Set<string>();
    const result: ScaleNote[] = [];
    for (const str of shape.strings) {
      for (const note of str.notes) {
        if (!seen.has(note.deg)) {
          seen.add(note.deg);
          result.push(note);
        }
      }
    }
    return result.sort(
      (a, b) => DEGREE_ORDER.indexOf(a.deg) - DEGREE_ORDER.indexOf(b.deg),
    );
  }, [shape]);

  function changeSystem(sys: ExplorerSystem) {
    setSystem(sys);
    setShapeIdx(0);
    setPairIdx(1);
    setViewMode("focus");
    if (sys !== "penta") setBluesMode(false);
    if (sys === "penta") setIsHarmonicMinor(false);
  }

  function changeMode(mode: ScaleMode) {
    setScaleMode(mode);
    setShapeIdx(0);
    if (mode === "major") {
      setBluesMode(false);
      setIsHarmonicMinor(false);
    }
  }

  // Short label for shape nav pills
  function shapeNavLabel(s: ShapeData, i: number): string {
    if (system === "caged") return s.label.replace(" Shape", "");
    if (system === "3nps") return String(i + 1);
    return `B${i + 1}`;
  }

  return (
    <div
      className="min-h-screen flex flex-col font-mono bg-[var(--bg)] text-[var(--text)]"
      style={theme}
    >
      <Nav isDark={isDark} toggleDark={toggleDark} />

      {/* ── Controls ── */}
      <div className="max-w-[1300px] mx-auto w-full px-6 pt-8 [@media(max-height:500px)]:pt-3 pb-2">
        {/* Page heading */}
        <div className="mb-7">
          <p className="text-[0.5rem] tracking-[0.2em] uppercase text-[var(--muted)] mb-1">
            Shape Explorer
          </p>
          <h1 className="font-display font-semibold text-[clamp(1.8rem,4vw,2.8rem)] tracking-[0.04em] uppercase leading-none">
            <span className="normal-case">{selectedKey.name}</span>{" "}
            <span style={{ color: "var(--accent)" }}>
              {scaleMode === "minor"
              ? isHarmonicMinor
                ? "Harmonic Minor"
                : "Minor"
              : "Major"}
            </span>
          </h1>
        </div>

        <div className="flex flex-wrap gap-x-7 gap-y-4 mb-5">
          {/* Scale mode */}
          <div className="flex flex-col gap-[0.4rem]">
            <p className="text-[0.46rem] tracking-[0.18em] uppercase text-[var(--muted)]">
              Scale
            </p>
            <div className="flex gap-1">
              <CtrlButton
                label="Minor"
                active={scaleMode === "minor"}
                onClick={() => changeMode("minor")}
                small
              />
              <CtrlButton
                label="Major"
                active={scaleMode === "major"}
                onClick={() => changeMode("major")}
                small
              />
            </div>
          </div>

          {/* Harmonic minor variant — diatonic systems only */}
          {scaleMode === "minor" && system !== "penta" && (
            <div className="flex flex-col gap-[0.4rem]">
              <p className="text-[0.46rem] tracking-[0.18em] uppercase text-[var(--muted)]">
                Variant
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setIsHarmonicMinor((v) => !v)}
                  className="font-display text-[0.6rem] tracking-[0.1em] uppercase border transition-all duration-100 cursor-pointer px-[0.65rem] py-[0.25rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg)]"
                  style={
                    isHarmonicMinor
                      ? { backgroundColor: "var(--seventh-col)", borderColor: "var(--seventh-col)", color: "#fff" }
                      : { backgroundColor: "transparent", borderColor: "var(--border)", color: "var(--text)" }
                  }
                >
                  Harmonic
                </button>
              </div>
            </div>
          )}

          {/* Blues toggle — penta + minor only */}
          {system === "penta" && scaleMode === "minor" && (
            <div className="flex flex-col gap-[0.4rem]">
              <p className="text-[0.46rem] tracking-[0.18em] uppercase text-[var(--muted)]">
                Blues
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setBluesMode((v) => !v)}
                  className="font-display text-[0.6rem] tracking-[0.1em] uppercase border transition-all duration-100 cursor-pointer px-[0.65rem] py-[0.25rem]"
                  style={
                    bluesMode
                      ? { backgroundColor: "var(--blues-col)", borderColor: "var(--blues-col)", color: "#fff" }
                      : { backgroundColor: "transparent", borderColor: "var(--border)", color: "var(--text)" }
                  }
                >
                  Blues Scale
                </button>
              </div>
            </div>
          )}

          {/* System */}
          <div className="flex flex-col gap-[0.4rem]">
            <p className="text-[0.46rem] tracking-[0.18em] uppercase text-[var(--muted)]">
              System
            </p>
            <div className="flex gap-1">
              <CtrlButton
                label="3nps"
                active={system === "3nps"}
                onClick={() => changeSystem("3nps")}
                small
              />
              <CtrlButton
                label="CAGED"
                active={system === "caged"}
                onClick={() => changeSystem("caged")}
                small
              />
              <CtrlButton
                label="Penta"
                active={system === "penta"}
                onClick={() => changeSystem("penta")}
                small
              />
            </div>
          </div>

          {/* Note filter — hidden for penta (always shows penta notes) */}
          {system !== "penta" && (
            <div className="flex flex-col gap-[0.4rem]">
              <p className="text-[0.46rem] tracking-[0.18em] uppercase text-[var(--muted)]">
                Show
              </p>
              <div className="flex gap-1">
                <CtrlButton
                  label="All"
                  active={noteFilter === "all"}
                  onClick={() => setNoteFilter("all")}
                  small
                />
                <CtrlButton
                  label="Penta"
                  active={noteFilter === "penta"}
                  onClick={() => setNoteFilter("penta")}
                  small
                />
                <CtrlButton
                  label="Chord"
                  active={noteFilter === "chord"}
                  onClick={() => setNoteFilter("chord")}
                  small
                />
              </div>
            </div>
          )}

          {/* View mode */}
          <div className="flex flex-col gap-[0.4rem]">
            <p className="text-[0.46rem] tracking-[0.18em] uppercase text-[var(--muted)]">
              View
            </p>
            <div className="flex gap-1">
              <CtrlButton
                label="Focus"
                active={viewMode === "focus"}
                onClick={() => setViewMode("focus")}
                small
              />
              <CtrlButton
                label="Pair"
                active={viewMode === "pair"}
                onClick={() => setViewMode("pair")}
                small
              />
              <CtrlButton
                label="Overview"
                active={viewMode === "overview"}
                onClick={() => setViewMode("overview")}
                small
              />
            </div>
          </div>
        </div>

        {/* Key selector */}
        <div className="flex flex-col gap-[0.4rem] mb-7">
          <p className="text-[0.46rem] tracking-[0.18em] uppercase text-[var(--muted)]">
            Key
          </p>
          <div className="flex flex-wrap gap-1">
            {KEYS.map((key, i) => (
              <CtrlButton
                key={key.name}
                label={key.name}
                active={keyIdx === i}
                onClick={() => setKeyIdx(i)}
                small
                normalCase
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 max-w-[1300px] mx-auto w-full px-6 pb-12">
        {viewMode === "overview" ? (
          <OverviewGrid
            shapes={shapes}
            selectedIdx={safeIdx}
            keyOffset={keyOffset}
            effectiveFilter={effectiveFilter}
            chordTones={cfg.chordTones}
            onSelect={(idx) => {
              setShapeIdx(idx);
              setViewMode("focus");
            }}
          />
        ) : viewMode === "pair" ? (
          <>
            {/* Shape A + B selectors */}
            <div className="flex flex-col gap-4 mb-5">
              {/* Shape A */}
              <div>
                <p className="text-[0.42rem] tracking-[0.16em] uppercase mb-2" style={{ color: "var(--text)" }}>
                  Shape A
                </p>
                <div className="flex items-center gap-3 mb-2">
                  <button
                    onClick={() => setShapeIdx((i) => Math.max(0, i - 1))}
                    disabled={safeIdx === 0}
                    className={[
                      "font-display text-[0.7rem] tracking-[0.06em] uppercase border transition-all duration-100 px-3 py-[0.35rem] max-[700px]:py-[0.6rem] max-[700px]:min-h-[44px] shrink-0",
                      safeIdx === 0
                        ? "border-[var(--border)] text-[var(--muted)] opacity-30 cursor-not-allowed"
                        : "border-[var(--border)] text-[var(--text)] hover:border-[var(--text)] cursor-pointer",
                    ].join(" ")}
                  >
                    ← Prev
                  </button>
                  <div className="flex-1 min-w-0 flex flex-col items-center">
                    <p className="font-display text-[0.88rem] tracking-[0.1em] uppercase text-[var(--text)] text-center leading-tight">
                      {shape.label}
                    </p>
                    {shape.subLabel && (
                      <p className="text-[0.48rem] tracking-[0.14em] uppercase text-[var(--muted)] mt-[0.15rem] text-center">
                        {shape.subLabel}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setShapeIdx((i) => Math.min(shapes.length - 1, i + 1))}
                    disabled={safeIdx === shapes.length - 1}
                    className={[
                      "font-display text-[0.7rem] tracking-[0.06em] uppercase border transition-all duration-100 px-3 py-[0.35rem] max-[700px]:py-[0.6rem] max-[700px]:min-h-[44px] shrink-0",
                      safeIdx === shapes.length - 1
                        ? "border-[var(--border)] text-[var(--muted)] opacity-30 cursor-not-allowed"
                        : "border-[var(--border)] text-[var(--text)] hover:border-[var(--text)] cursor-pointer",
                    ].join(" ")}
                  >
                    Next →
                  </button>
                </div>
                <div className="flex items-center justify-center gap-1 flex-wrap">
                  {shapes.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setShapeIdx(i)}
                      className={[
                        "font-display text-[0.58rem] tracking-[0.1em] uppercase border transition-all duration-150 cursor-pointer px-[0.55rem] py-[0.18rem] max-[700px]:px-[0.8rem] max-[700px]:py-[0.55rem]",
                        i === safeIdx
                          ? "bg-[var(--text)] text-[var(--bg)] border-[var(--text)]"
                          : "bg-transparent text-[var(--muted)] border-[var(--border)] hover:border-[var(--text)] hover:text-[var(--text)]",
                      ].join(" ")}
                    >
                      {shapeNavLabel(s, i)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shape B */}
              <div>
                <p className="text-[0.42rem] tracking-[0.16em] uppercase mb-2" style={{ color: "var(--fifth-col)" }}>
                  Shape B
                </p>
                <div className="flex items-center gap-3 mb-2">
                  <button
                    onClick={() => setPairIdx((i) => Math.max(0, i - 1))}
                    disabled={pairSafeIdx === 0}
                    className={[
                      "font-display text-[0.7rem] tracking-[0.06em] uppercase border transition-all duration-100 px-3 py-[0.35rem] max-[700px]:py-[0.6rem] max-[700px]:min-h-[44px] shrink-0",
                      pairSafeIdx === 0
                        ? "border-[var(--border)] text-[var(--muted)] opacity-30 cursor-not-allowed"
                        : "border-[var(--border)] text-[var(--text)] hover:border-[var(--text)] cursor-pointer",
                    ].join(" ")}
                  >
                    ← Prev
                  </button>
                  <div className="flex-1 min-w-0 flex flex-col items-center">
                    <p className="font-display text-[0.88rem] tracking-[0.1em] uppercase text-center leading-tight" style={{ color: "var(--fifth-col)" }}>
                      {shapeB.label}
                    </p>
                    {shapeB.subLabel && (
                      <p className="text-[0.48rem] tracking-[0.14em] uppercase text-[var(--muted)] mt-[0.15rem] text-center">
                        {shapeB.subLabel}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setPairIdx((i) => Math.min(shapes.length - 1, i + 1))}
                    disabled={pairSafeIdx === shapes.length - 1}
                    className={[
                      "font-display text-[0.7rem] tracking-[0.06em] uppercase border transition-all duration-100 px-3 py-[0.35rem] max-[700px]:py-[0.6rem] max-[700px]:min-h-[44px] shrink-0",
                      pairSafeIdx === shapes.length - 1
                        ? "border-[var(--border)] text-[var(--muted)] opacity-30 cursor-not-allowed"
                        : "border-[var(--border)] text-[var(--text)] hover:border-[var(--text)] cursor-pointer",
                    ].join(" ")}
                  >
                    Next →
                  </button>
                </div>
                <div className="flex items-center justify-center gap-1 flex-wrap">
                  {shapes.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setPairIdx(i)}
                      className={[
                        "font-display text-[0.58rem] tracking-[0.1em] uppercase border transition-all duration-150 cursor-pointer px-[0.55rem] py-[0.18rem] max-[700px]:px-[0.8rem] max-[700px]:py-[0.55rem]",
                        i === pairSafeIdx
                          ? "text-[#fff] border-[var(--fifth-col)]"
                          : "bg-transparent text-[var(--muted)] border-[var(--border)] hover:border-[var(--fifth-col)] hover:text-[var(--text)]",
                      ].join(" ")}
                      style={i === pairSafeIdx ? { backgroundColor: "var(--fifth-col)" } : {}}
                    >
                      {shapeNavLabel(s, i)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Combined legend */}
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex items-center gap-[0.4rem] text-[0.5rem] text-[var(--muted)] tracking-[0.08em] uppercase">
                <div className="w-[13px] h-[13px] rounded-full shrink-0" style={{ backgroundColor: "var(--text)" }} />
                {shape.label} (A)
              </div>
              <div className="flex items-center gap-[0.4rem] text-[0.5rem] text-[var(--muted)] tracking-[0.08em] uppercase">
                <div className="w-[13px] h-[13px] rounded-full shrink-0" style={{ backgroundColor: "var(--fifth-col)" }} />
                {shapeB.label} (B)
              </div>
              <div className="flex items-center gap-[0.4rem] text-[0.5rem] text-[var(--muted)] tracking-[0.08em] uppercase">
                <div
                  className="w-[13px] h-[13px] rounded-full shrink-0"
                  style={{
                    backgroundColor: "var(--text)",
                    boxShadow: "0 0 0 2px var(--bg), 0 0 0 3.5px var(--fifth-col)",
                  }}
                />
                Both
              </div>
              <div className="flex items-center gap-[0.4rem] text-[0.5rem] text-[var(--muted)] tracking-[0.08em] uppercase">
                <div className="w-[13px] h-[13px] rounded-full shrink-0" style={{ backgroundColor: "var(--root-col)" }} />
                Root
              </div>
            </div>

            {/* Combined fretboard */}
            <div
              className="border border-[var(--border)] p-5 mb-5"
              style={{ backgroundColor: "var(--surface)" }}
            >
              <CombinedFretboard
                strings={combined.strings}
                fretCount={combined.fretCount}
                noteFilter={effectiveFilter}
                chordTones={cfg.chordTones}
                displayStartFret={combined.displayStartFret}
              />
            </div>
          </>
        ) : (
        <>
        {/* Shape navigator header */}
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => setShapeIdx((i) => Math.max(0, i - 1))}
            disabled={safeIdx === 0}
            className={[
              "font-display text-[0.7rem] tracking-[0.06em] uppercase border transition-all duration-100 px-3 py-[0.35rem] max-[700px]:py-[0.6rem] max-[700px]:min-h-[44px] shrink-0",
              safeIdx === 0
                ? "border-[var(--border)] text-[var(--muted)] opacity-30 cursor-not-allowed"
                : "border-[var(--border)] text-[var(--text)] hover:border-[var(--text)] cursor-pointer",
            ].join(" ")}
          >
            ← Prev
          </button>

          <div className="flex-1 min-w-0 flex flex-col items-center">
            <p className="font-display text-[0.95rem] tracking-[0.1em] uppercase text-[var(--text)] text-center leading-tight">
              {shape.label}
            </p>
            {shape.subLabel && (
              <p className="text-[0.52rem] tracking-[0.15em] uppercase text-[var(--muted)] mt-[0.2rem] text-center">
                {shape.subLabel}
              </p>
            )}
          </div>

          <button
            onClick={() => setShapeIdx((i) => Math.min(shapes.length - 1, i + 1))}
            disabled={safeIdx === shapes.length - 1}
            className={[
              "font-display text-[0.7rem] tracking-[0.06em] uppercase border transition-all duration-100 px-3 py-[0.35rem] max-[700px]:py-[0.6rem] max-[700px]:min-h-[44px] shrink-0",
              safeIdx === shapes.length - 1
                ? "border-[var(--border)] text-[var(--muted)] opacity-30 cursor-not-allowed"
                : "border-[var(--border)] text-[var(--text)] hover:border-[var(--text)] cursor-pointer",
            ].join(" ")}
          >
            Next →
          </button>
        </div>

        {/* Shape nav pills */}
        <div className="flex items-center justify-center gap-1 mb-5 flex-wrap">
          {shapes.map((s, i) => (
            <button
              key={i}
              onClick={() => setShapeIdx(i)}
              className={[
                "font-display text-[0.58rem] tracking-[0.1em] uppercase border transition-all duration-150 cursor-pointer px-[0.55rem] py-[0.18rem] max-[700px]:px-[0.8rem] max-[700px]:py-[0.55rem]",
                i === safeIdx
                  ? "bg-[var(--text)] text-[var(--bg)] border-[var(--text)]"
                  : "bg-transparent text-[var(--muted)] border-[var(--border)] hover:border-[var(--text)] hover:text-[var(--text)]",
              ].join(" ")}
            >
              {shapeNavLabel(s, i)}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-[0.4rem] text-[0.5rem] text-[var(--muted)] tracking-[0.08em] uppercase">
            <div
              className="w-[13px] h-[13px] rounded-full shrink-0"
              style={{ backgroundColor: "var(--root-col)" }}
            />
            Root
          </div>
          <div className="flex items-center gap-[0.4rem] text-[0.5rem] text-[var(--muted)] tracking-[0.08em] uppercase">
            <div
              className="w-[13px] h-[13px] rounded-full shrink-0"
              style={{ backgroundColor: "var(--text)" }}
            />
            Pentatonic
          </div>
          {bluesMode && (
            <div className="flex items-center gap-[0.4rem] text-[0.5rem] text-[var(--muted)] tracking-[0.08em] uppercase">
              <div
                className="w-[13px] h-[13px] rounded-full shrink-0"
                style={{ backgroundColor: "var(--blues-col)" }}
              />
              Blue note (b5)
            </div>
          )}
          {system !== "penta" && (
            <div className="flex items-center gap-[0.4rem] text-[0.5rem] text-[var(--muted)] tracking-[0.08em] uppercase">
              <div
                className="w-[13px] h-[13px] rounded-full shrink-0"
                style={{ border: "1.5px solid var(--text)" }}
              />
              {cfg.diaLabel}
            </div>
          )}
        </div>

        {/* Fretboard */}
        <div
          className="border border-[var(--border)] p-5 mb-7"
          style={{ backgroundColor: "var(--surface)" }}
        >
          <ExplorerFretboard
            strings={shape.strings}
            noteFilter={effectiveFilter}
            chordTones={cfg.chordTones}
            displayStartFret={displayStartFret}
          />
        </div>

        {/* Notes in key */}
        <div>
          <p className="text-[0.46rem] tracking-[0.18em] uppercase text-[var(--muted)] mb-3">
            Notes in{" "}
            <span style={{ color: "var(--text)" }}>
              {selectedKey.name} {scaleMode === "minor" ? "Minor" : "Major"}
            </span>{" "}
            — {shape.label}
            {shape.subLabel ? ` (${shape.subLabel})` : ""}
          </p>

          <div className="flex flex-wrap gap-2">
            {degreesInShape.map((note) => {
              const isShown =
                effectiveFilter === "all" ||
                (effectiveFilter === "penta" &&
                  (note.penta || note.deg === "R")) ||
                (effectiveFilter === "chord" && cfg.chordTones.has(note.deg));

              let bg: string, fg: string, border: string | undefined;
              if (note.deg === "R") {
                bg = "var(--root-col)"; fg = "#fff";
              } else if (note.penta) {
                bg = "var(--text)"; fg = "var(--bg)";
              } else {
                bg = "transparent"; fg = "var(--text)"; border = "1px solid var(--border)";
              }

              const noteName = getNoteForDegree(note.deg, selectedKey.fret);

              return (
                <div
                  key={note.deg}
                  className="flex items-baseline gap-[0.4rem] px-3 py-[0.45rem] transition-opacity duration-150"
                  style={{
                    backgroundColor: bg,
                    border,
                    opacity: isShown ? 1 : 0.28,
                  }}
                >
                  <span
                    className="font-display text-[0.58rem] tracking-[0.1em] uppercase"
                    style={{ color: fg, opacity: 0.75 }}
                  >
                    {note.deg}
                  </span>
                  <span
                    className="font-display text-[0.82rem] font-semibold tracking-wide"
                    style={{ color: fg }}
                  >
                    {noteName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        </>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--border)] px-6 py-4 flex justify-between items-center flex-wrap gap-2">
        <span className="text-[0.5rem] text-[var(--faint)] tracking-[0.1em] uppercase">
          © Shred Dojo
        </span>
        <div className="flex items-center gap-4">
          <Link
            to="/scale-positions"
            className="text-[0.5rem] text-[var(--accent)] tracking-[0.1em] uppercase no-underline border-b border-[var(--accent)] pb-px hover:opacity-80 transition-opacity"
          >
            Compare Systems →
          </Link>
          <Link
            to="/pentatonic-triads"
            className="text-[0.5rem] text-[var(--accent)] tracking-[0.1em] uppercase no-underline border-b border-[var(--accent)] pb-px hover:opacity-80 transition-opacity"
          >
            Triads →
          </Link>
        </div>
      </footer>
    </div>
  );
}
