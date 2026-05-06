import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import { DARK_THEME, LIGHT_THEME, STRING_LINE } from "./scalePositions.theme";
import { Nav } from "./Nav";
import type { Degree } from "./scalePositions.types";
import {
  CHORD_LABELS,
  CHORD_TONES,
  CHORD_TYPES,
  type ChordType,
  type ChordVoicingData,
} from "./chordVoicings.types";
import { buildChordVoicings, DEG_COLOR } from "./chordVoicings.utils";

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

// ─── ChordDiagram ─────────────────────────────────────────────────────────────

const FRET_ROWS = 5;
const CELL = 34; // px — square cell size
const DIAGRAM_W = CELL * 6;

function ChordDiagram({ voicing }: { voicing: ChordVoicingData }) {
  // Strings ordered low E → high e for iteration, but we render columns left→right
  const strings = voicing.strings; // index 0 = low E, index 5 = high e
  const STRING_NAMES = ["E", "A", "D", "G", "B", "e"];

  return (
    <div className="flex flex-col items-center gap-[6px]">
      {/* String name headers */}
      <div
        className="flex"
        style={{ width: DIAGRAM_W }}
      >
        {STRING_NAMES.map((name, i) => (
          <div
            key={i}
            className="font-mono text-[0.42rem] text-[var(--muted)] text-center"
            style={{ width: CELL }}
          >
            {name}
          </div>
        ))}
      </div>

      {/* Muted / open indicators */}
      <div
        className="flex"
        style={{ width: DIAGRAM_W, height: 14 }}
      >
        {strings.map((s, i) => (
          <div
            key={i}
            className="font-display text-[0.6rem] flex items-center justify-center"
            style={{
              width: CELL,
              color: s.muted ? "var(--muted)" : "var(--text)",
            }}
          >
            {s.muted ? "×" : s.open ? "○" : ""}
          </div>
        ))}
      </div>

      {/* Fret label + diagram grid */}
      <div className="flex items-start gap-[4px]">
        {/* Fret number label (left side, only when not showing nut) */}
        <div
          className="font-mono text-[0.52rem] text-[var(--muted)] text-right shrink-0"
          style={{ width: 20, paddingTop: CELL * 0.4 }}
        >
          {!voicing.showNut ? `${voicing.baseFret}fr` : ""}
        </div>

        {/* Diagram */}
        <div style={{ position: "relative", width: DIAGRAM_W }}>
          {/* Nut line */}
          {voicing.showNut && (
            <div
              style={{
                height: 4,
                backgroundColor: "var(--text)",
                width: DIAGRAM_W,
              }}
            />
          )}

          {/* String lines (absolute, behind the grid) */}
          <div
            style={{
              position: "absolute",
              top: voicing.showNut ? 4 : 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              pointerEvents: "none",
            }}
          >
            {strings.map((_, i) => {
              const name = STRING_NAMES[i] as keyof typeof STRING_LINE;
              const line = STRING_LINE[name as "E" | "A" | "D" | "G" | "B" | "e"] ?? {
                height: "1px",
                colorVar: "var(--border)",
              };
              return (
                <div
                  key={i}
                  style={{
                    width: CELL,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "stretch",
                  }}
                >
                  <div
                    style={{
                      width: line.height,
                      height: "100%",
                      backgroundColor: line.colorVar,
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Fret rows */}
          {Array.from({ length: FRET_ROWS }, (_, row) => (
            <div
              key={row}
              style={{
                display: "flex",
                borderTop: row === 0 ? "none" : `1px solid var(--fret-bar)`,
                position: "relative",
                zIndex: 1,
              }}
            >
              {strings.map((s, si) => {
                const hasNote = !s.muted && s.fret === row;
                return (
                  <div
                    key={si}
                    style={{
                      width: CELL,
                      height: CELL,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      zIndex: 2,
                    }}
                  >
                    {hasNote && s.deg && (
                      <div
                        className="rounded-full flex items-center justify-center font-display tracking-[0.02em]"
                        style={{
                          width: 22,
                          height: 22,
                          fontSize: "0.43rem",
                          backgroundColor: s.open
                            ? "transparent"
                            : DEG_COLOR[s.deg],
                          color: s.open ? "var(--text)" : "#fff",
                          border: s.open
                            ? "1.5px solid var(--text)"
                            : "none",
                        }}
                      >
                        {s.deg}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Shape label */}
      <div className="font-display text-[0.68rem] tracking-[0.13em] uppercase text-[var(--muted)] mt-[2px]">
        {voicing.shapeName} Shape
      </div>
    </div>
  );
}

// ─── Degree Legend ────────────────────────────────────────────────────────────

function DegreeLegend({ chordType }: { chordType: ChordType }) {
  const tones = CHORD_TONES[chordType];
  const labels: Record<Degree, string> = {
    R: "Root",
    "2": "2nd",
    b3: "Minor 3rd",
    "3": "Major 3rd",
    "4": "4th",
    "b5": "Flat 5th",
    "5": "5th",
    b6: "b6th",
    "6": "6th",
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
          {labels[deg]}
        </div>
      ))}
    </div>
  );
}

// ─── ChordVoicings ────────────────────────────────────────────────────────────

export function ChordVoicings() {
  const [chordType, setChordType] = useState<ChordType>("maj");
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
  const voicings = useMemo(() => buildChordVoicings(chordType), [chordType]);

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
            Chord{" "}
            <span style={{ color: "var(--accent)" }}>Voicings</span>
          </h1>
          <div className="text-[0.58rem] text-[var(--muted)] tracking-[0.1em] uppercase text-right leading-[1.7]">
            G root · 5 CAGED shapes
            <br />
            slide to any root
          </div>
        </header>

        {/* Controls */}
        <div className="mb-6 flex gap-3 flex-wrap items-center border-b border-[var(--border)] pb-4">
          <span className="text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)]">
            Chord
          </span>
          {CHORD_TYPES.map((ct) => (
            <CtrlBtn
              key={ct}
              label={CHORD_LABELS[ct]}
              active={chordType === ct}
              onClick={() => setChordType(ct)}
            />
          ))}
        </div>

        {/* Degree legend */}
        <DegreeLegend chordType={chordType} />

        {/* Diagrams */}
        <div className="flex flex-wrap gap-x-8 gap-y-10 justify-center">
          {voicings.map((v) => (
            <ChordDiagram key={v.shapeName} voicing={v} />
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-5 border-t border-[var(--border)] flex items-center justify-between flex-wrap gap-3">
          <span className="text-[0.55rem] text-[var(--muted)] tracking-[0.1em] uppercase">
            © Shred Dojo
          </span>
          <Link
            to="/arpeggio-maps"
            className="font-display text-[0.65rem] tracking-[0.1em] uppercase no-underline border border-[var(--border)] px-3 py-[0.3rem] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--text)] transition-colors"
          >
            Arpeggio Maps →
          </Link>
        </footer>
      </div>
    </div>
  );
}
