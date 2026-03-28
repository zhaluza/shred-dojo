import { useEffect, useMemo, useRef, useState } from "react";
import {
  DARK_THEME,
  LIGHT_THEME,
  STRING_LINE,
  TWO_NPS_LINE,
} from "./scalePositions.theme";
import type {
  NoteFilter,
  ScaleMode,
  ScaleNote,
  ScalePosition,
  ScaleString,
  SysFilter,
} from "./scalePositions.types";
import { buildAllPositions, SCALES } from "./scalePositions.utils";

// ─── ControlButton ────────────────────────────────────────────────────────────

function ControlButton({
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
        "font-display border cursor-pointer transition-all duration-100",
        small
          ? "text-[0.65rem] px-[0.7rem] py-[0.3rem] tracking-[0.1em]"
          : "text-[0.75rem] px-[0.85rem] py-[0.35rem] tracking-[0.08em]",
        "uppercase",
        active
          ? "bg-[var(--text)] text-[var(--bg)] border-[var(--text)]"
          : "bg-transparent text-[var(--text)] border-[var(--border)] hover:border-[var(--text)]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend({ diaLabel }: { diaLabel: string }) {
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
      <div className="flex items-center gap-[0.45rem] text-[0.58rem] text-[var(--muted)] tracking-[0.08em] uppercase">
        <div className="w-[20px] h-[2px] bg-[var(--two-nps)] shrink-0" />
        2nps string
      </div>
    </div>
  );
}

// ─── Dot ──────────────────────────────────────────────────────────────────────

function Dot({ note, visible }: { note: ScaleNote; visible: boolean }) {
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
        "w-5 h-5 rounded-full flex items-center justify-center text-[0.47rem] relative z-[2]",
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
  isTwoNps,
}: {
  str: ScaleString;
  fretCount: number;
  noteFilter: NoteFilter;
  isTwoNps: boolean;
}) {
  const line = isTwoNps ? TWO_NPS_LINE : STRING_LINE[str.name];

  function isVisible(note: ScaleNote): boolean {
    if (noteFilter === "all") return true;
    if (noteFilter === "penta") return note.deg === "R" || note.penta;
    if (noteFilter === "dia") return note.deg === "R" || !note.penta;
    return true;
  }

  return (
    <div className="flex items-center h-[29px]" data-string={str.name}>
      {/* String name */}
      <div
        className={[
          "w-[1.9rem] text-[0.5rem] text-right pr-[0.4rem] shrink-0",
          isTwoNps ? "text-[var(--accent)]" : "text-[var(--muted)]",
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
          const note = str.notes.find((n) => n.fret === f);
          return (
            <div
              key={f}
              className="flex-1 h-[29px] flex items-center justify-center relative z-[1]"
            >
              {note && <Dot note={note} visible={isVisible(note)} />}
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
  twoNps,
}: {
  strings: ScaleString[];
  noteFilter: NoteFilter;
  twoNps: string | null;
}) {
  const maxFret = Math.max(...strings.flatMap((s) => s.notes.map((n) => n.fret)));
  const fretCount = maxFret + 2;

  return (
    <div className="w-full">
      {/* Fret numbers */}
      <div className="flex pl-[1.9rem] mb-[0.15rem]">
        {Array.from({ length: fretCount }, (_, f) => (
          <div
            key={f}
            className="flex-1 text-center text-[0.45rem] text-[var(--faint)]"
          >
            {f}
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
          isTwoNps={str.notes.length === 2}
        />
      ))}
    </div>
  );
}

// ─── PositionCell ─────────────────────────────────────────────────────────────

function PositionCell({
  pos,
  isSelected,
  onClick,
  noteFilter,
}: {
  pos: ScalePosition;
  isSelected: boolean;
  onClick: () => void;
  noteFilter: NoteFilter;
}) {
  return (
    <div
      onClick={onClick}
      className={[
        "p-[0.9rem_1rem_0.7rem] border -mt-px -ml-px cursor-pointer transition-colors duration-100",
        isSelected
          ? "bg-[var(--surface)] border-[var(--text)] relative z-[2]"
          : "border-[var(--border)] hover:bg-[var(--surface)]",
      ].join(" ")}
    >
      <div className="flex justify-between items-center mb-[0.45rem]">
        <div className="font-display text-[0.68rem] tracking-[0.13em] uppercase text-[var(--muted)]">
          St {pos.scaletone}{" "}
          <strong className="text-[var(--accent)] font-normal text-[0.82rem]">
            · {pos.startDeg}
          </strong>
        </div>
        <span className="text-[0.5rem] px-[0.35rem] py-[0.1rem] border border-[var(--border)] text-[var(--muted)] tracking-[0.05em]">
          {pos.system}
        </span>
      </div>
      <Fretboard strings={pos.strings} noteFilter={noteFilter} twoNps={pos.twoNps} />
    </div>
  );
}

// ─── DetailPanel ──────────────────────────────────────────────────────────────

function DetailPanel({
  pos,
  scaleMode,
}: {
  pos: ScalePosition | null;
  scaleMode: ScaleMode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pos && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [pos]);

  if (!pos) return null;

  const sname = scaleMode === "minor" ? "natural minor" : "major";

  return (
    <div
      ref={ref}
      className="max-w-[980px] mx-auto mt-6 bg-[var(--surface)] p-[1.1rem_1.4rem]"
      style={{
        border: "1px solid var(--border)",
        borderLeft: "3px solid var(--accent)",
      }}
    >
      <div className="font-display text-[0.95rem] tracking-[0.1em] uppercase mb-[0.6rem]">
        Scaletone {pos.scaletone} · starts on {pos.startDeg} ·{" "}
        {pos.system === "3nps" ? "pure 3nps" : "symmetric"}
      </div>
      <div className="flex gap-8 flex-wrap">
        <div className="text-[0.65rem] leading-[1.75] text-[var(--muted)] min-w-[10rem]">
          <b className="block text-[0.55rem] tracking-[0.12em] uppercase text-[var(--text)] mb-[0.15rem]">
            Scaletone
          </b>
          Degree {pos.scaletone} of {sname} scale on low E
        </div>
        <div className="text-[0.65rem] leading-[1.75] text-[var(--muted)] min-w-[10rem]">
          <b className="block text-[0.55rem] tracking-[0.12em] uppercase text-[var(--text)] mb-[0.15rem]">
            System
          </b>
          {pos.system === "3nps"
            ? "Pure 3nps — every string has 3 consecutive scale degrees"
            : "Symmetric — low E and high e are identical; B string is 2nps"}
        </div>
        <div className="text-[0.65rem] leading-[1.75] text-[var(--muted)] min-w-[10rem]">
          <b className="block text-[0.55rem] tracking-[0.12em] uppercase text-[var(--text)] mb-[0.15rem]">
            2nps string
          </b>
          {pos.twoNps
            ? "B string — drops its last degree to make e = E"
            : "None — all 6 strings are 3nps"}
        </div>
      </div>
    </div>
  );
}

// ─── ScalePositions ───────────────────────────────────────────────────────────

export function ScalePositions() {
  const [isDark, setIsDark] = useState(false);
  const [scaleMode, setScaleMode] = useState<ScaleMode>("minor");
  const [noteFilter, setNoteFilter] = useState<NoteFilter>("all");
  const [sysFilter, setSysFilter] = useState<SysFilter>("both");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

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

  const positions = useMemo(
    () => buildAllPositions(SCALES[scaleMode]),
    [scaleMode]
  );

  const visiblePositions = useMemo(
    () =>
      sysFilter === "both" ? positions : positions.filter((p) => p.system === sysFilter),
    [positions, sysFilter]
  );

  function handleScaleChange(mode: ScaleMode) {
    setScaleMode(mode);
    setSelectedIdx(null);
  }

  function handleSelect(globalIdx: number) {
    setSelectedIdx((prev) => (prev === globalIdx ? null : globalIdx));
  }

  const selectedPos =
    selectedIdx !== null ? positions[selectedIdx] ?? null : null;

  const cfg = SCALES[scaleMode];

  return (
    <div
      style={isDark ? DARK_THEME : LIGHT_THEME}
      className="bg-[var(--bg)] text-[var(--text)] font-mono pb-20 pt-8 px-6 transition-[background,color] duration-200 min-h-screen"
    >
      {/* Header */}
      <header className="max-w-[980px] mx-auto mb-10 flex items-end justify-between flex-wrap gap-4 border-b-2 border-[var(--text)] pb-6">
        <h1 className="font-display font-semibold text-[clamp(2rem,5vw,3.2rem)] tracking-[0.04em] uppercase leading-none">
          Natural{" "}
          <em className="text-[var(--accent)] not-italic">
            {scaleMode === "minor" ? "Minor" : "Major"}
          </em>
          <br />
          Scale Positions
        </h1>
        <div className="flex flex-col items-end gap-3">
          <ControlButton
            label={isDark ? "◑ Light" : "◐ Dark"}
            active={false}
            onClick={toggleDark}
            small
          />
          <div className="text-[0.63rem] text-[var(--muted)] tracking-[0.05em] leading-[1.7] max-w-[18rem] text-right">
            Based on Pebber Brown's 14-position system.
            <br />
            Each scale shown as pure 3nps shapes and symmetric variants where the
            low and high E strings match.
          </div>
        </div>
      </header>

      {/* Scale control row */}
      <div className="max-w-[980px] mx-auto flex gap-3 flex-wrap items-center pb-3 mb-3">
        <span className="text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)] mr-1">
          Scale
        </span>
        <ControlButton
          label="Minor"
          active={scaleMode === "minor"}
          onClick={() => handleScaleChange("minor")}
        />
        <ControlButton
          label="Major"
          active={scaleMode === "major"}
          onClick={() => handleScaleChange("major")}
        />
      </div>

      {/* Show + System control row */}
      <div className="max-w-[980px] mx-auto flex gap-3 flex-wrap items-center border-b border-[var(--border)] pb-5 mb-6">
        <span className="text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)] mr-1">
          Show
        </span>
        <ControlButton
          label="All"
          active={noteFilter === "all"}
          onClick={() => setNoteFilter("all")}
        />
        <ControlButton
          label="Pentatonic"
          active={noteFilter === "penta"}
          onClick={() => setNoteFilter("penta")}
        />
        <ControlButton
          label="Diatonic +"
          active={noteFilter === "dia"}
          onClick={() => setNoteFilter("dia")}
        />
        <div className="flex-1" />
        <span className="text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)] mr-1">
          System
        </span>
        <ControlButton
          label="Both"
          active={sysFilter === "both"}
          onClick={() => setSysFilter("both")}
        />
        <ControlButton
          label="3nps only"
          active={sysFilter === "3nps"}
          onClick={() => setSysFilter("3nps")}
        />
        <ControlButton
          label="Symmetric only"
          active={sysFilter === "sym"}
          onClick={() => setSysFilter("sym")}
        />
      </div>

      {/* Legend */}
      <Legend diaLabel={cfg.diaLabel} />

      {/* Grid */}
      <div className="max-w-[980px] mx-auto grid grid-cols-2 max-[560px]:grid-cols-1">
        {visiblePositions.map((pos) => {
          const globalIdx = positions.indexOf(pos);
          return (
            <PositionCell
              key={`${pos.scaletone}-${pos.system}`}
              pos={pos}
              isSelected={selectedIdx === globalIdx}
              onClick={() => handleSelect(globalIdx)}
              noteFilter={noteFilter}
            />
          );
        })}
      </div>

      {/* Detail panel */}
      <DetailPanel pos={selectedPos} scaleMode={scaleMode} />
    </div>
  );
}
