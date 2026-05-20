import { useState, useEffect, useMemo } from "react";
import { Nav } from "./Nav";
import { DARK_THEME, LIGHT_THEME, STRING_LINE } from "./scalePositions.theme";
import { CtrlButton } from "./CtrlButton";
import type { ScaleString } from "./scalePositions.types";
import { FRET_DOUBLE, FRET_INLAYS, ROOT_FRET } from "./scalePositions.utils";
import { buildYngwieShapes, KEY_NAMES, type YngwieShape } from "./yngwieScales.utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const KEYS = KEY_NAMES.map((name, fret) => ({ name, fret }));
// Both shapes span 6 relative frets; 8 columns gives one column of breathing room
const FRET_COUNT = 8;

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
    <div className="flex items-center h-[44px]">
      <div
        className="w-[2.2rem] text-right pr-[0.45rem] shrink-0 font-display tracking-[0.08em] uppercase text-[0.52rem]"
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
            transparent calc(100% / ${FRET_COUNT} - 1px),
            var(--fret-bar) calc(100% / ${FRET_COUNT} - 1px),
            var(--fret-bar) calc(100% / ${FRET_COUNT})
          )`,
        }}
      >
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
    </div>
  );
}

// ─── ShapeCard ────────────────────────────────────────────────────────────────

function ShapeCard({ shape, keyOffset }: { shape: YngwieShape; keyOffset: number }) {
  // Mod 12 ensures the shape appears in the correct octave for every key.
  // Without it, shapes built in G can land 12 frets too high for keys below G
  // (e.g. Little Savage in E would show at fret 17 instead of 5).
  const displayStartFret = (shape.startFret + keyOffset) % 12;

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
    </div>
  );
}

// ─── YngwieScales ─────────────────────────────────────────────────────────────

export function YngwieScales() {
  const [isDark, setIsDark] = useState(false);
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
  const shapes = useMemo(() => buildYngwieShapes(), []);

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

        {/* Key selector */}
        <div className="flex flex-col gap-[5px] mb-8">
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

        {/* Shape cards */}
        <div className="grid grid-cols-1 min-[700px]:grid-cols-2 gap-4">
          {shapes.map((shape) => (
            <ShapeCard key={shape.name} shape={shape} keyOffset={keyOffset} />
          ))}
        </div>
      </main>
    </div>
  );
}
