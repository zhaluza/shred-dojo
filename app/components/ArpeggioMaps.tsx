import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import { DARK_THEME, LIGHT_THEME, STRING_LINE } from "./scalePositions.theme";
import { CtrlButton } from "./CtrlButton";
import { Nav } from "./Nav";
import type {
  ScaleNote,
  ScalePosition,
  ScaleString,
} from "./scalePositions.types";
import {
  CHORD_LABELS,
  CHORD_TONES,
  CHORD_TYPES,
  type ChordType,
} from "./chordVoicings.types";
import { DEG_COLOR } from "./chordVoicings.utils";
import { buildArpeggioPositions, buildArpeggio3npsPositions } from "./arpeggioMaps.utils";

type ArpeggioSystem = "caged" | "3nps";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"] as const;


// ─── Dot ──────────────────────────────────────────────────────────────────────

function Dot({
  note,
  visible,
}: {
  note: ScaleNote;
  visible: boolean;
}) {
  const bg = DEG_COLOR[note.deg];
  const isRoot = note.deg === "R";

  return (
    <div
      className={[
        "w-5 h-5 text-[0.47rem] rounded-full flex items-center justify-center relative z-[2]",
        "transition-[opacity,transform] duration-[120ms] font-display tracking-[0.02em]",
        visible ? "" : "opacity-0 scale-[0.2] pointer-events-none",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        backgroundColor: bg,
        color: "#fff",
        border: isRoot ? "none" : undefined,
      }}
    >
      {note.deg}
    </div>
  );
}

// ─── StringRow ────────────────────────────────────────────────────────────────

function StringRow({
  str,
  fretCount,
  chordTones,
}: {
  str: ScaleString;
  fretCount: number;
  chordTones: Set<string>;
}) {
  const line = STRING_LINE[str.name];

  function isVisible(note: ScaleNote): boolean {
    return chordTones.has(note.deg);
  }

  return (
    <div className="flex items-center h-[29px]" data-string={str.name}>
      <div className="w-[1.9rem] text-right pr-[0.4rem] shrink-0 text-[0.5rem] text-[var(--muted)]">
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
  chordTones,
}: {
  strings: ScaleString[];
  chordTones: Set<string>;
}) {
  const maxFret = Math.max(...strings.flatMap((s) => s.notes.map((n) => n.fret)));
  const fretCount = maxFret + 2;

  return (
    <div className="w-full">
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
      {[...strings].reverse().map((str) => (
        <StringRow
          key={str.name}
          str={str}
          fretCount={fretCount}
          chordTones={chordTones}
        />
      ))}
    </div>
  );
}

// ─── PositionCard ─────────────────────────────────────────────────────────────

function PositionCard({
  pos,
  chordTones,
}: {
  pos: ScalePosition;
  chordTones: Set<string>;
}) {
  const chordNotes = pos.strings.flatMap((s) =>
    s.notes.filter((n) => chordTones.has(n.deg))
  );
  const fretNums = chordNotes.map((n) => n.fret);
  const minF = Math.min(...fretNums);
  const maxF = Math.max(...fretNums);

  const isCaged = pos.system === "caged";
  const systemColor = isCaged ? "var(--sys-caged)" : "var(--sys-3nps)";
  const label = isCaged
    ? `${pos.shapeName} Shape`
    : `Pos ${ROMAN[pos.scaletone - 1]}`;

  return (
    <div
      className="border border-[var(--border)] -mt-px -ml-px"
      style={{ background: "var(--surface)" }}
    >
      <div className="h-[3px]" style={{ backgroundColor: systemColor }} />
      <div className="px-4 pt-3 pb-4">
        <div className="flex items-center justify-between mb-3">
          <span
            className="font-display text-[0.68rem] tracking-[0.13em] uppercase"
            style={{ color: systemColor }}
          >
            {label}
          </span>
          <span className="font-mono text-[0.52rem] text-[var(--muted)]">
            frets {minF}–{maxF}
          </span>
        </div>
        <Fretboard strings={pos.strings} chordTones={chordTones} />
      </div>
    </div>
  );
}

// ─── Degree Legend ────────────────────────────────────────────────────────────

function DegreeLegend({ chordType }: { chordType: ChordType }) {
  const tones = CHORD_TONES[chordType];
  const labels: Partial<Record<string, string>> = {
    R: "Root",
    b3: "Minor 3rd",
    "3": "Major 3rd",
    "5": "5th",
    b7: "Minor 7th",
    "7": "Major 7th",
  };

  return (
    <div
      className="flex flex-wrap gap-x-5 gap-y-2 items-center px-4 py-3 border border-[var(--border)] mb-8"
      style={{ background: "var(--surface)" }}
    >
      {tones.map((deg) => (
        <div
          key={deg}
          className="flex items-center gap-[0.4rem] text-[0.55rem] text-[var(--muted)] tracking-[0.07em] uppercase"
        >
          <div
            className="rounded-full shrink-0 flex items-center justify-center font-display"
            style={{
              width: 18,
              height: 18,
              fontSize: "0.4rem",
              backgroundColor: DEG_COLOR[deg],
              color: "#fff",
            }}
          >
            {deg}
          </div>
          {labels[deg] ?? deg}
        </div>
      ))}
    </div>
  );
}

// ─── ArpeggioMaps ─────────────────────────────────────────────────────────────

export function ArpeggioMaps() {
  const [chordType, setChordType] = useState<ChordType>("maj");
  const [system, setSystem] = useState<ArpeggioSystem>("caged");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("shred-dojo-dark");
    if (saved === "true") setIsDark(true);
  }, []);

  const toggleDark = () => {
    setIsDark((d) => {
      localStorage.setItem("shred-dojo-dark", String(!d));
      return !d;
    });
  };

  const theme = isDark ? DARK_THEME : LIGHT_THEME;
  const positions = useMemo(
    () =>
      system === "caged"
        ? buildArpeggioPositions(chordType)
        : buildArpeggio3npsPositions(chordType),
    [chordType, system]
  );
  const chordTones = useMemo(
    () => new Set<string>(CHORD_TONES[chordType]),
    [chordType]
  );

  return (
    <div
      className="min-h-screen font-mono bg-[var(--bg)] text-[var(--text)]"
      style={theme}
    >
      <Nav isDark={isDark} toggleDark={toggleDark} />
      <div className="max-w-[1200px] mx-auto px-5 pt-8 [@media(max-height:500px)]:pt-3 pb-20">
        {/* Header */}
        <header className="mb-6 flex items-end justify-between flex-wrap gap-4 border-b-2 border-[var(--text)] pb-5">
          <h1 className="font-display font-semibold text-[clamp(1.8rem,4vw,2.8rem)] tracking-[0.04em] uppercase leading-none">
            Arpeggio{" "}
            <span style={{ color: "var(--accent)" }}>Maps</span>
          </h1>
          <div className="text-[0.58rem] text-[var(--muted)] tracking-[0.1em] uppercase text-right leading-[1.7]">
            G root · {system === "caged" ? "5 CAGED" : "7 3nps"} positions
            <br />
            slide up the neck to transpose
          </div>
        </header>

        {/* Controls */}
        <div className="mb-6 flex gap-3 flex-wrap items-center border-b border-[var(--border)] pb-4">
          <span className="text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)]">
            System
          </span>
          <CtrlButton
            label="CAGED"
            active={system === "caged"}
            onClick={() => setSystem("caged")}
          />
          <CtrlButton
            label="3nps"
            active={system === "3nps"}
            onClick={() => setSystem("3nps")}
          />
          <div className="w-px h-5 bg-[var(--border)] mx-1" />
          <span className="text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)]">
            Chord
          </span>
          {CHORD_TYPES.map((ct) => (
            <CtrlButton
              key={ct}
              label={CHORD_LABELS[ct]}
              active={chordType === ct}
              onClick={() => setChordType(ct)}
            />
          ))}
        </div>

        {/* Degree legend */}
        <DegreeLegend chordType={chordType} />

        {/* Position cards grid */}
        <div className="grid grid-cols-2 max-[560px]:grid-cols-1 gap-0">
          {positions.map((pos) => (
            <PositionCard
              key={pos.shapeName ?? `${pos.system}-${pos.scaletone}`}
              pos={pos}
              chordTones={chordTones}
            />
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-5 border-t border-[var(--border)] flex items-center justify-between flex-wrap gap-3">
          <span className="text-[0.55rem] text-[var(--muted)] tracking-[0.1em] uppercase">
            © Shred Dojo
          </span>
          <Link
            to="/chord-voicings"
            className="font-display text-[0.65rem] tracking-[0.1em] uppercase no-underline border border-[var(--border)] px-3 py-[0.3rem] max-[700px]:py-[0.55rem] max-[700px]:px-4 text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--text)] transition-colors"
          >
            ← Chord Voicings
          </Link>
        </footer>
      </div>
    </div>
  );
}
