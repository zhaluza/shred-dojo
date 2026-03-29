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
  System,
} from "./scalePositions.types";
import {
  buildAllPositions,
  buildCagedPositions,
  SCALES,
} from "./scalePositions.utils";

// ─── ControlButton ────────────────────────────────────────────────────────────

function ControlButton({
  label,
  active,
  onClick,
  small,
  disabled,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  small?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "font-display border transition-all duration-100",
        small
          ? "text-[0.65rem] px-[0.7rem] py-[0.3rem] tracking-[0.1em]"
          : "text-[0.75rem] px-[0.85rem] py-[0.35rem] tracking-[0.08em]",
        "uppercase",
        disabled
          ? "bg-transparent text-[var(--muted)] border-[var(--border)] opacity-40 cursor-not-allowed"
          : active
            ? "bg-[var(--text)] text-[var(--bg)] border-[var(--text)] cursor-pointer"
            : "bg-transparent text-[var(--text)] border-[var(--border)] hover:border-[var(--text)] cursor-pointer",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend({
  diaLabel,
  showTwoNps,
}: {
  diaLabel: string;
  showTwoNps: boolean;
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
  isTwoNps,
  large = false,
  fretOffset = 0,
}: {
  str: ScaleString;
  fretCount: number;
  noteFilter: NoteFilter;
  chordTones: Set<string>;
  isTwoNps: boolean;
  large?: boolean;
  fretOffset?: number;
}) {
  const line = isTwoNps ? TWO_NPS_LINE : STRING_LINE[str.name];
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
  twoNps,
  large = false,
  fretOffset = 0,
}: {
  strings: ScaleString[];
  noteFilter: NoteFilter;
  chordTones: Set<string>;
  twoNps: string | null;
  large?: boolean;
  fretOffset?: number;
}) {
  const maxFret = Math.max(
    ...strings.flatMap((s) => s.notes.map((n) => n.fret)),
  );
  const fretCount = maxFret + 2 + fretOffset;

  return (
    <div className="w-full">
      {/* Fret numbers */}
      <div
        className={`flex ${large ? "pl-[2.4rem]" : "pl-[1.9rem]"} mb-[0.15rem]`}
      >
        {Array.from({ length: fretCount }, (_, f) => (
          <div
            key={f}
            className={`flex-1 text-center ${large ? "text-[0.6rem]" : "text-[0.45rem]"} text-[var(--faint)]`}
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
          chordTones={chordTones}
          isTwoNps={twoNps === str.name}
          large={large}
          fretOffset={fretOffset}
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
  chordTones,
  fretOffset = 0,
}: {
  pos: ScalePosition;
  isSelected: boolean;
  onClick: () => void;
  noteFilter: NoteFilter;
  chordTones: Set<string>;
  fretOffset?: number;
}) {
  const sysColor = `var(--sys-${pos.system})`;

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
        <Fretboard
          strings={pos.strings}
          noteFilter={noteFilter}
          chordTones={chordTones}
          twoNps={pos.twoNps}
          fretOffset={fretOffset}
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: "rgba(10, 8, 6, 0.82)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative w-full max-w-[740px] bg-[var(--surface)] outline-none"
        style={{
          border: "1px solid var(--border)",
          borderTop: "3px solid var(--accent)",
          boxShadow: "0 32px 96px rgba(0,0,0,0.55)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
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
          </div>

          <div className="flex items-center gap-4 pt-[0.15rem]">
            <div className="font-display text-[0.55rem] tracking-[0.14em] uppercase text-[var(--muted)]">
              {systemIdx + 1} / {systemTotal}
            </div>
            <button
              onClick={onClose}
              className="font-display text-[0.65rem] tracking-[0.1em] uppercase border cursor-pointer transition-colors duration-100 px-3 py-[0.35rem] bg-transparent text-[var(--text)] border-[var(--border)] hover:border-[var(--text)]"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Fretboard area */}
        <div className="flex items-center gap-2 px-3 py-6">
          {/* Prev */}
          <button
            onClick={onPrev}
            aria-label="Previous shape"
            className="shrink-0 w-10 h-10 flex items-center justify-center border cursor-pointer transition-colors duration-100 bg-transparent text-[var(--text)] border-[var(--border)] hover:border-[var(--text)] font-display text-[1rem]"
          >
            ←
          </button>

          {/* Large fretboard */}
          <div className="flex-1 min-w-0">
            <Fretboard
              strings={pos.strings}
              noteFilter={noteFilter}
              chordTones={chordTones}
              twoNps={pos.twoNps}
              large
            />
          </div>

          {/* Next */}
          <button
            onClick={onNext}
            aria-label="Next shape"
            className="shrink-0 w-10 h-10 flex items-center justify-center border cursor-pointer transition-colors duration-100 bg-transparent text-[var(--text)] border-[var(--border)] hover:border-[var(--text)] font-display text-[1rem]"
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
                ? "Symmetric — low E and high e are identical; B string is 2nps"
                : "CAGED — 5 movable shapes based on open chord forms"}
          </div>
        </div>

        {/* Keyboard hint */}
        <div className="px-5 pb-3 text-[0.48rem] tracking-[0.1em] uppercase text-[var(--muted)]">
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
  const [scaleMode, setScaleMode] = useState<ScaleMode>("minor");
  const [noteFilter, setNoteFilter] = useState<NoteFilter>("all");
  const [selectedSystems, setSelectedSystems] = useState<System[]>([
    "3nps",
    "caged",
  ]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [modalIdx, setModalIdx] = useState<number | null>(null);

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

  const cfg = SCALES[scaleMode];
  const chordTones = cfg.chordTones;

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

      items.push({ pos: a, key: `${st}-${sysA}`, fretOffset: fretOffsetA });
      items.push({ pos: b, key: `${st}-${sysB}`, fretOffset: fretOffsetB });
    }
    return items;
  }, [orderedSystems, positionsBySystem]);

  function handleScaleChange(mode: ScaleMode) {
    setScaleMode(mode);
    setSelectedIdx(null);
    setModalIdx(null);
  }

  function handleSystemToggle(sys: System) {
    setSelectedSystems((prev) => toggleSystem(prev, sys));
    setSelectedIdx(null);
    setModalIdx(null);
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

  const showTwoNpsLegend =
    selectedSystems.includes("3nps") || selectedSystems.includes("sym");

  return (
    <div
      style={isDark ? DARK_THEME : LIGHT_THEME}
      className="bg-[var(--bg)] text-[var(--text)] font-mono pb-20 pt-8 px-6 transition-[background,color] duration-200 min-h-screen"
    >
      {/* Header */}
      <header className="max-w-[980px] mx-auto mb-10 flex items-end justify-between flex-wrap gap-4 border-b-2 border-[var(--text)] pb-6">
        <h1 className="font-display font-semibold text-[clamp(2rem,5vw,3.2rem)] tracking-[0.04em] uppercase leading-none">
          {scaleMode === "minor" ? "Natural " : ""}
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
            Diatonic scale shapes across three systems: 3nps, CAGED, and
            symmetric.
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
          label="Chord tones"
          active={noteFilter === "chord"}
          onClick={() => setNoteFilter("chord")}
        />
        <div className="flex-1" />
        <span className="text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)] mr-1">
          System
        </span>
        <span className="text-[0.55rem] tracking-[0.04em] text-[var(--muted)] mr-1">
          (pick 1–2)
        </span>
        {SYSTEM_ORDER.map((sys) => {
          const isActive = selectedSystems.includes(sys);
          const isDisabled = !isActive && selectedSystems.length >= 2;
          return (
            <ControlButton
              key={sys}
              label={SYSTEM_LABELS[sys]}
              active={isActive}
              disabled={isDisabled}
              onClick={() => handleSystemToggle(sys)}
            />
          );
        })}
      </div>

      {/* Legend */}
      <Legend diaLabel={cfg.diaLabel} showTwoNps={showTwoNpsLegend} />

      {/* Grid */}
      <div className="max-w-[980px] mx-auto grid grid-cols-2 max-[560px]:grid-cols-1">
        {gridItems.map(({ pos, key, fretOffset }) => {
          if (!pos) {
            return (
              <div
                key={key}
                className="p-[0.9rem_1rem_0.7rem] border border-dashed -mt-px -ml-px border-[var(--border)]"
              />
            );
          }
          const globalIdx = allPositions.indexOf(pos);
          return (
            <PositionCell
              key={key}
              pos={pos}
              isSelected={selectedIdx === globalIdx}
              onClick={() => handleSelect(pos)}
              noteFilter={noteFilter}
              chordTones={chordTones}
              fretOffset={fretOffset}
            />
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
  );
}
