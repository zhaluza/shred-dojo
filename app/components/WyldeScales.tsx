import { useState, useEffect, useMemo } from "react";
import { Nav } from "./Nav";
import { DARK_THEME, LIGHT_THEME, STRING_LINE } from "./scalePositions.theme";
import type { Degree, ScaleMode, ScaleNote, ScaleString } from "./scalePositions.types";
import { FRET_DOUBLE, FRET_INLAYS, ROOT_FRET, SNAME } from "./scalePositions.utils";
import { buildAllWyldePositions, type WyldePosition } from "./wyldeScales.utils";
import type { BoxNote } from "./pentatonicTriads.utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTE_NAMES = [
  "E", "F", "F#", "G", "Ab", "A", "Bb", "B", "C", "Db", "D", "Eb",
] as const;

const KEYS = NOTE_NAMES.map((name, fret) => ({ name, fret }));

// ─── Dot ──────────────────────────────────────────────────────────────────────

function Dot({ note, size = "md" }: { note: ScaleNote; size?: "md" | "sm" }) {
  let bg: string, fg: string, border: string | undefined;
  if (note.deg === "R") {
    bg = "var(--root-col)"; fg = "#fff";
  } else if (note.penta) {
    bg = "var(--text)"; fg = "var(--bg)";
  } else {
    bg = "var(--surface)"; fg = "var(--text)"; border = "1.5px solid var(--text)";
  }
  const cls = size === "sm"
    ? "w-5 h-5 text-[0.42rem]"
    : "w-7 h-7 text-[0.56rem]";
  return (
    <div
      className={`${cls} rounded-full flex items-center justify-center relative z-[2] font-display font-semibold tracking-tight shrink-0`}
      style={{ backgroundColor: bg, color: fg, border }}
    >
      {note.deg}
    </div>
  );
}

// ─── PentaDot ─────────────────────────────────────────────────────────────────

function PentaDot({ deg, size = "md" }: { deg: string; size?: "md" | "sm" }) {
  const bg = deg === "R" ? "var(--root-col)" : "var(--text)";
  const fg = deg === "R" ? "#fff" : "var(--bg)";
  const cls = size === "sm"
    ? "w-5 h-5 text-[0.42rem]"
    : "w-7 h-7 text-[0.56rem]";
  return (
    <div
      className={`${cls} rounded-full flex items-center justify-center relative z-[2] font-display font-semibold tracking-tight shrink-0`}
      style={{ backgroundColor: bg, color: fg }}
    >
      {deg}
    </div>
  );
}

// ─── StringRow ────────────────────────────────────────────────────────────────

function DiaStringRow({
  str,
  fretCount,
  offset,
  size,
}: {
  str: ScaleString;
  fretCount: number;
  offset: number; // add to relative fret to get display-coord fret
  size: "md" | "sm";
}) {
  const line = STRING_LINE[str.name];
  const rowH = size === "sm" ? "h-[32px]" : "h-[44px]";
  const labelW = size === "sm" ? "w-[1.8rem] text-[0.46rem]" : "w-[2.2rem] text-[0.52rem]";

  return (
    <div className={`flex items-center ${rowH}`}>
      <div
        className={`${labelW} text-right pr-[0.45rem] shrink-0 font-display tracking-[0.08em] uppercase`}
        style={{ color: "var(--muted)" }}
      >
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
          const note = str.notes.find((n) => n.fret + offset === f);
          return (
            <div
              key={f}
              className={`flex-1 ${rowH} flex items-center justify-center relative z-[1]`}
            >
              {note && <Dot note={note} size={size} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PentaStringRow({
  strName,
  notes,
  fretCount,
  size,
}: {
  strName: string;
  notes: Array<{ relFret: number; deg: string }>;
  fretCount: number;
  size: "md" | "sm";
}) {
  const line = STRING_LINE[strName as keyof typeof STRING_LINE];
  const rowH = size === "sm" ? "h-[32px]" : "h-[44px]";
  const labelW = size === "sm" ? "w-[1.8rem] text-[0.46rem]" : "w-[2.2rem] text-[0.52rem]";

  return (
    <div className={`flex items-center ${rowH}`}>
      <div
        className={`${labelW} text-right pr-[0.45rem] shrink-0 font-display tracking-[0.08em] uppercase`}
        style={{ color: "var(--muted)" }}
      >
        {strName}
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
          const note = notes.find((n) => n.relFret === f);
          return (
            <div
              key={f}
              className={`flex-1 ${rowH} flex items-center justify-center relative z-[1]`}
            >
              {note && <PentaDot deg={note.deg} size={size} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── FretHeader ───────────────────────────────────────────────────────────────

function FretHeader({
  fretCount,
  displayStartFret,
  labelW,
  size,
}: {
  fretCount: number;
  displayStartFret: number;
  labelW: string;
  size: "md" | "sm";
}) {
  const inlayDot = size === "sm" ? "w-[3px] h-[3px]" : "w-[4px] h-[4px]";
  const numSize = size === "sm" ? "text-[0.38rem]" : "text-[0.44rem]";

  return (
    <>
      <div className={`flex ${labelW} h-[12px] mb-[2px]`}>
        {Array.from({ length: fretCount }, (_, f) => {
          const abs = f + displayStartFret;
          const isDouble = FRET_DOUBLE.has(abs);
          const hasInlay = FRET_INLAYS.has(abs);
          return (
            <div key={f} className="flex-1 flex items-center justify-center flex-col gap-[2px]">
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
      <div className={`flex ${labelW} mb-[2px]`}>
        {Array.from({ length: fretCount }, (_, f) => (
          <div key={f} className={`flex-1 text-center ${numSize} font-mono`} style={{ color: "var(--faint)" }}>
            {f + displayStartFret}
          </div>
        ))}
      </div>
    </>
  );
}

// ─── WyldeFretboard ───────────────────────────────────────────────────────────

function DiaFretboard({
  strings,
  diaOffset,
  fretCount,
  displayStartFret,
  size,
}: {
  strings: ScaleString[];
  diaOffset: number;
  fretCount: number;
  displayStartFret: number;
  size: "md" | "sm";
}) {
  const labelW = size === "sm" ? "pl-[1.8rem]" : "pl-[2.2rem]";
  return (
    <div className="w-full select-none">
      <FretHeader fretCount={fretCount} displayStartFret={displayStartFret} labelW={labelW} size={size} />
      {[...strings].reverse().map((str) => (
        <DiaStringRow key={str.name} str={str} fretCount={fretCount} offset={diaOffset} size={size} />
      ))}
    </div>
  );
}

function PentaFretboard({
  pentaBox,
  pentaRawMin,
  pentaOffset,
  fretCount,
  displayStartFret,
  size,
}: {
  pentaBox: BoxNote[];
  pentaRawMin: number;
  pentaOffset: number;
  fretCount: number;
  displayStartFret: number;
  size: "md" | "sm";
}) {
  const labelW = size === "sm" ? "pl-[1.8rem]" : "pl-[2.2rem]";

  const byString = useMemo(() => {
    const map = new Map<string, Array<{ relFret: number; deg: string }>>();
    for (const sn of SNAME) map.set(sn, []);
    for (const note of pentaBox) {
      // Normalize penta absolute fret to its own relative space (same as toRelative for
      // diatonic), then apply pentaOffset to land on the shared fretboard coordinate.
      const rel = (note.fret - pentaRawMin) + pentaOffset;
      if (rel >= 0 && rel < fretCount) {
        map.get(note.string)!.push({ relFret: rel, deg: note.deg });
      }
    }
    return map;
  }, [pentaBox, pentaRawMin, pentaOffset, fretCount]);

  return (
    <div className="w-full select-none">
      <FretHeader fretCount={fretCount} displayStartFret={displayStartFret} labelW={labelW} size={size} />
      {[...SNAME].reverse().map((sn) => (
        <PentaStringRow
          key={sn}
          strName={sn}
          notes={byString.get(sn) ?? []}
          fretCount={fretCount}
          size={size}
        />
      ))}
    </div>
  );
}

// ─── PositionCard ─────────────────────────────────────────────────────────────

function PositionCard({
  pos,
  keyOffset,
  size,
}: {
  pos: WyldePosition;
  keyOffset: number;
  size: "md" | "sm";
}) {
  const diaAbsStart = pos.startFret + keyOffset;
  // Penta uses the same normalization as diatonic: (raw_fret - rawMin) + (rawMin%12) + keyOffset.
  // Without this, penta boxes whose rawMin crosses the 12-fret boundary (e.g. rawMin=12→startFret=0)
  // land a full octave away from their diatonic counterpart.
  const pentaAbsStart = (pos.pentaRawMin % 12) + keyOffset;

  const diaAbsFrets = pos.strings.flatMap((s) =>
    s.notes.map((n) => n.fret + diaAbsStart)
  );
  // Penta display absolute = (penta.fret - pentaRawMin) + pentaAbsStart
  const pentaAbsFrets = pos.pentaBox.map(
    (n) => (n.fret - pos.pentaRawMin) + pentaAbsStart
  );
  const allAbs = [...diaAbsFrets, ...pentaAbsFrets];

  const displayStartFret = Math.min(...allAbs);
  const maxAbs = Math.max(...allAbs);
  const fretCount = maxAbs - displayStartFret + 3;

  // offset: diatonic relative fret + diaOffset = display coordinate
  const diaOffset = diaAbsStart - displayStartFret;
  // offset: (penta.fret - pentaRawMin) + pentaOffset = display coordinate
  const pentaOffset = pentaAbsStart - displayStartFret;

  return (
    <div
      className="rounded-sm border flex flex-col"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
    >
      {/* Card header */}
      <div
        className="px-4 py-3 border-b flex items-baseline gap-3"
        style={{ borderColor: "var(--border)" }}
      >
        <span
          className="font-display text-[0.56rem] tracking-[0.16em] uppercase"
          style={{ color: "var(--muted)" }}
        >
          Position {pos.degIdx + 1}
        </span>
        <span
          className="font-display font-semibold text-[0.95rem] tracking-[0.1em] uppercase"
          style={{ color: "var(--text)" }}
        >
          {pos.modeName}
        </span>
        <span
          className="font-display text-[0.56rem] tracking-[0.14em] uppercase ml-auto"
          style={{ color: "var(--muted)" }}
        >
          Penta Box {pos.pentaBoxIdx + 1}
        </span>
      </div>

      {/* Fretboards */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: "var(--border)" }}>
        {/* Diatonic */}
        <div className="p-4">
          <div
            className="font-display text-[0.52rem] tracking-[0.16em] uppercase mb-3"
            style={{ color: "var(--muted)" }}
          >
            Diatonic (7 notes)
          </div>
          <DiaFretboard
            strings={pos.strings}
            diaOffset={diaOffset}
            fretCount={fretCount}
            displayStartFret={displayStartFret}
            size={size}
          />
        </div>

        {/* Pentatonic */}
        <div className="p-4">
          <div
            className="font-display text-[0.52rem] tracking-[0.16em] uppercase mb-3"
            style={{ color: "var(--muted)" }}
          >
            Pentatonic (5 notes)
          </div>
          <PentaFretboard
            pentaBox={pos.pentaBox}
            pentaRawMin={pos.pentaRawMin}
            pentaOffset={pentaOffset}
            fretCount={fretCount}
            displayStartFret={displayStartFret}
            size={size}
          />
        </div>
      </div>
    </div>
  );
}

// ─── ControlBtn ───────────────────────────────────────────────────────────────

function ControlBtn({
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
        small ? "px-2 py-[0.2rem] text-[0.62rem] max-[700px]:py-[0.55rem] max-[700px]:px-3" : "px-3 py-[0.3rem] text-[0.7rem] max-[700px]:py-[0.55rem] max-[700px]:px-4",
        "font-display tracking-[0.08em] uppercase border cursor-pointer transition-colors whitespace-nowrap",
        active
          ? "border-[var(--text)] bg-[var(--text)] text-[var(--bg)]"
          : "border-[var(--border)] bg-transparent text-[var(--text)] hover:border-[var(--text)]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

// ─── WyldeScales ──────────────────────────────────────────────────────────────

export function WyldeScales() {
  const [isDark, setIsDark] = useState(false);
  const [scale, setScale] = useState<ScaleMode>("minor");
  const [keyIdx, setKeyIdx] = useState(0);

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

  const positions = useMemo(() => buildAllWyldePositions(scale), [scale]);

  const size: "md" | "sm" = "md";

  return (
    <div className="min-h-screen" style={theme}>
      <Nav isDark={isDark} toggleDark={toggleDark} />

      <main className="px-4 md:px-8 py-8 max-w-[1400px] mx-auto">
        {/* Page title */}
        <div className="mb-8">
          <h1
            className="font-display font-semibold text-[clamp(1.8rem,4vw,2.8rem)] tracking-[0.04em] uppercase leading-none mb-1"
            style={{ color: "var(--text)" }}
          >
            Wylde Scales
          </h1>
          <p
            className="font-mono text-[0.78rem] mt-2 max-w-[560px]"
            style={{ color: "var(--muted)" }}
          >
            Zakk Wylde's 3-notes-per-string approach: each mode paired with its corresponding pentatonic box.
            The G→B string transition repeats the last note of G string, keeping the shape in a compact 4–5 fret window.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          {/* Scale */}
          <div className="flex flex-col gap-[5px]">
            <span
              className="text-[0.52rem] tracking-[0.16em] uppercase font-display"
              style={{ color: "var(--muted)" }}
            >
              Scale
            </span>
            <div className="flex gap-1">
              <ControlBtn label="Minor" active={scale === "minor"} onClick={() => setScale("minor")} />
              <ControlBtn label="Major" active={scale === "major"} onClick={() => setScale("major")} />
            </div>
          </div>

          {/* Key */}
          <div className="flex flex-col gap-[5px]">
            <span
              className="text-[0.52rem] tracking-[0.16em] uppercase font-display"
              style={{ color: "var(--muted)" }}
            >
              Key
            </span>
            <div className="flex flex-wrap gap-[3px]">
              {KEYS.map(({ name, fret }) => (
                <ControlBtn
                  key={fret}
                  label={name}
                  active={keyIdx === fret}
                  onClick={() => setKey(fret)}
                  small
                />
              ))}
            </div>
          </div>
        </div>

        {/* Position cards */}
        <div className="flex flex-col gap-4">
          {positions.map((pos) => (
            <PositionCard key={pos.degIdx} pos={pos} keyOffset={keyOffset} size={size} />
          ))}
        </div>
      </main>
    </div>
  );
}
