import { useState, useEffect } from "react";
import { DARK_THEME, LIGHT_THEME } from "./scalePositions.theme";
import { Nav } from "./Nav";
import {
  FIFTHS,
  keySigLabel,
  keySigShort,
  type KeyInfo,
} from "./circleOfFifths.utils";

// ─── SVG geometry ─────────────────────────────────────────────────────────────

const CX = 280;
const CY = 280;

function deg2rad(d: number) {
  return (d * Math.PI) / 180;
}

function polarToCart(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = deg2rad(angleDeg);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcSegmentPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startDeg: number,
  endDeg: number
): string {
  const p1 = polarToCart(cx, cy, rOuter, startDeg);
  const p2 = polarToCart(cx, cy, rOuter, endDeg);
  const p3 = polarToCart(cx, cy, rInner, endDeg);
  const p4 = polarToCart(cx, cy, rInner, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

// Each slot = 30°. Gap = 2° total (1° on each side).
function segmentAngles(i: number) {
  const base = i * 30 - 90;
  return { start: base + 1, end: base + 29, mid: base + 15 };
}

// ─── CircleDiagram ────────────────────────────────────────────────────────────

function CircleDiagram({
  selectedIdx,
  hoveredIdx,
  onSelect,
  onHover,
}: {
  selectedIdx: number | null;
  hoveredIdx: number | null;
  onSelect: (i: number) => void;
  onHover: (i: number | null) => void;
}) {
  const selected = selectedIdx !== null ? FIFTHS[selectedIdx] : null;

  return (
    <svg
      viewBox="0 0 560 560"
      className="w-full max-w-[520px]"
      aria-label="Circle of fifths diagram"
    >
      {/* Outer ring — major keys */}
      {FIFTHS.map((info, i) => {
        const { start, end, mid } = segmentAngles(i);
        const isSelected = selectedIdx === i;
        const isHovered = hoveredIdx === i && !isSelected;
        const tp = polarToCart(CX, CY, 220, mid);
        return (
          <g
            key={`maj-${i}`}
            onClick={() => onSelect(i)}
            onMouseEnter={() => onHover(i)}
            onMouseLeave={() => onHover(null)}
            style={{ cursor: "pointer" }}
          >
            <path
              d={arcSegmentPath(CX, CY, 260, 180, start, end)}
              style={{
                fill: isSelected
                  ? "var(--accent)"
                  : isHovered
                    ? "var(--border)"
                    : "var(--surface)",
                stroke: "var(--border)",
                strokeWidth: 2,
                transition: "fill 0.12s",
              }}
            />
            <text
              x={tp.x}
              y={tp.y}
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                fill: isSelected ? "var(--bg)" : "var(--text)",
                fontFamily: "var(--font-display)",
                fontSize: info.major.length > 2 ? "12px" : "15px",
                fontWeight: 600,
                letterSpacing: "0.04em",
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              {info.major}
            </text>
          </g>
        );
      })}

      {/* Key signature ring */}
      {FIFTHS.map((info, i) => {
        const { start, end, mid } = segmentAngles(i);
        const isSelected = selectedIdx === i;
        const tp = polarToCart(CX, CY, 159, mid);
        return (
          <g
            key={`sig-${i}`}
            onClick={() => onSelect(i)}
            style={{ cursor: "pointer" }}
          >
            <path
              d={arcSegmentPath(CX, CY, 178, 140, start, end)}
              style={{
                fill: isSelected ? "var(--accent)" : "var(--border)",
                stroke: "var(--bg)",
                strokeWidth: 2,
                opacity: isSelected ? 0.55 : 1,
                transition: "fill 0.12s",
              }}
            />
            <text
              x={tp.x}
              y={tp.y}
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                fill: isSelected ? "var(--bg)" : "var(--text)",
                fontFamily: "var(--font-mono)",
                fontSize: "9.5px",
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              {keySigShort(info.keySig)}
            </text>
          </g>
        );
      })}

      {/* Inner ring — relative minors */}
      {FIFTHS.map((info, i) => {
        const { start, end, mid } = segmentAngles(i);
        const isSelected = selectedIdx === i;
        const isHovered = hoveredIdx === i && !isSelected;
        const tp = polarToCart(CX, CY, 111, mid);
        return (
          <g
            key={`min-${i}`}
            onClick={() => onSelect(i)}
            onMouseEnter={() => onHover(i)}
            onMouseLeave={() => onHover(null)}
            style={{ cursor: "pointer" }}
          >
            <path
              d={arcSegmentPath(CX, CY, 138, 84, start, end)}
              style={{
                fill: isSelected
                  ? "var(--accent)"
                  : isHovered
                    ? "var(--muted)"
                    : "var(--surface)",
                stroke: "var(--border)",
                strokeWidth: 2,
                opacity: isSelected ? 0.65 : 1,
                transition: "fill 0.12s",
              }}
            />
            <text
              x={tp.x}
              y={tp.y}
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                fill: isSelected ? "var(--bg)" : "var(--text)",
                fontFamily: "var(--font-mono)",
                fontSize: "8px",
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              {info.minor}
            </text>
          </g>
        );
      })}

      {/* Center disc */}
      <circle
        cx={CX}
        cy={CY}
        r={82}
        style={{ fill: "var(--bg)", stroke: "var(--border)", strokeWidth: 1 }}
      />
      {selected ? (
        <>
          <text
            x={CX}
            y={CY - 12}
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fill: "var(--accent)",
              fontFamily: "var(--font-display)",
              fontSize: "30px",
              fontWeight: 700,
              letterSpacing: "0.03em",
              userSelect: "none",
            }}
          >
            {selected.major}
          </text>
          <text
            x={CX}
            y={CY + 20}
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fill: "var(--muted)",
              fontFamily: "var(--font-mono)",
              fontSize: "8px",
              letterSpacing: "0.18em",
              userSelect: "none",
            }}
          >
            MAJOR
          </text>
        </>
      ) : (
        <text
          x={CX}
          y={CY}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fill: "var(--faint)",
            fontFamily: "var(--font-display)",
            fontSize: "13px",
            letterSpacing: "0.12em",
            userSelect: "none",
          }}
        >
          SELECT KEY
        </text>
      )}

      {/* Ring labels */}
      <text
        x={CX}
        y={14}
        textAnchor="middle"
        style={{
          fill: "var(--muted)",
          fontFamily: "var(--font-mono)",
          fontSize: "7px",
          letterSpacing: "0.14em",
          userSelect: "none",
        }}
      >
        MAJOR KEYS
      </text>
    </svg>
  );
}

// ─── KeyInfoModal ─────────────────────────────────────────────────────────────

function KeyInfoModal({
  info,
  onClose,
  onSelectMajor,
}: {
  info: KeyInfo;
  onClose: () => void;
  onSelectMajor: (major: string) => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const QUALITY_LABEL: Record<string, string> = { maj: "Maj", min: "min", dim: "dim" };

  function RelatedPill({ label }: { label: string }) {
    const idx = FIFTHS.findIndex((k) => k.major === label || k.minor === label);
    const isMajor = FIFTHS[idx]?.major === label;
    return (
      <button
        onClick={() => { if (idx >= 0) onSelectMajor(label); }}
        className="font-display text-[0.65rem] tracking-[0.08em] uppercase border border-[var(--border)] text-[var(--text)] bg-transparent px-2 py-[0.2rem] max-[700px]:py-[0.5rem] max-[700px]:px-3 hover:border-[var(--text)] transition-colors cursor-pointer"
        style={isMajor ? {} : { color: "var(--muted)" }}
      >
        {label}
      </button>
    );
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(10,8,6,0.82)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="w-full max-w-md bg-[var(--surface)]"
        style={{ border: "1px solid var(--border)", borderTop: "3px solid var(--accent)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-baseline justify-between px-5 py-4 border-b border-[var(--border)]">
          <span className="font-display font-semibold text-[1.1rem] tracking-[0.08em] uppercase text-[var(--text)]">
            {info.major} Major
          </span>
          <div className="flex items-center gap-4">
            <span className="text-[0.7rem] tracking-[0.12em] uppercase text-[var(--muted)] font-mono">
              {keySigLabel(info.keySig)}
            </span>
            <button
              onClick={onClose}
              className="font-display text-[0.75rem] tracking-[0.08em] uppercase border border-[var(--border)] text-[var(--muted)] bg-transparent px-2 py-[0.2rem] max-[700px]:py-[0.5rem] max-[700px]:px-3 max-[700px]:min-w-[40px] hover:border-[var(--text)] hover:text-[var(--text)] transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Diatonic chords */}
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <div className="text-[0.52rem] tracking-[0.18em] uppercase text-[var(--muted)] mb-3">
            Diatonic chords
          </div>
          <div className="grid grid-cols-7 gap-1">
            {info.diatonicChords.map((chord, i) => (
              <div key={i} className="flex flex-col items-center gap-[3px]">
                <span className="font-display text-[0.6rem] tracking-[0.12em] uppercase text-[var(--muted)]">
                  {chord.numeral}
                </span>
                <span className="font-display text-[0.78rem] tracking-[0.04em] font-semibold text-[var(--text)] leading-none">
                  {info.scaleNotes[i]}
                </span>
                <span
                  className="font-mono text-[0.55rem] tracking-[0.06em]"
                  style={{
                    color:
                      chord.quality === "maj"
                        ? "var(--text)"
                        : chord.quality === "min"
                          ? "var(--muted)"
                          : "var(--accent)",
                  }}
                >
                  {QUALITY_LABEL[chord.quality]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Relative minor + related keys */}
        <div className="px-5 py-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <div>
              <div className="text-[0.52rem] tracking-[0.18em] uppercase text-[var(--muted)] mb-1">
                Relative minor
              </div>
              <span className="font-display text-[0.82rem] tracking-[0.08em] uppercase text-[var(--text)]">
                {info.minor}
              </span>
            </div>
            <div>
              <div className="text-[0.52rem] tracking-[0.18em] uppercase text-[var(--muted)] mb-1">
                Closely related
              </div>
              <div className="flex flex-wrap gap-1">
                {[...info.relatedMajors, ...info.relatedMinors].map((label) => (
                  <RelatedPill key={label} label={label} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CircleOfFifths (page) ────────────────────────────────────────────────────

export function CircleOfFifths() {
  const [isDark, setIsDark] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("shred-dojo-dark");
    if (stored !== null) setIsDark(stored === "true");
  }, []);

  const toggleDark = () =>
    setIsDark((prev) => {
      localStorage.setItem("shred-dojo-dark", String(!prev));
      return !prev;
    });

  function handleSelectMajor(major: string) {
    const idx = FIFTHS.findIndex((k) => k.major === major || k.minor === major);
    if (idx >= 0) setSelectedIdx(idx);
  }

  const theme = isDark ? DARK_THEME : LIGHT_THEME;
  const selected = selectedIdx !== null ? FIFTHS[selectedIdx] : null;

  return (
    <div
      className="min-h-screen font-mono bg-[var(--bg)] text-[var(--text)]"
      style={theme}
    >
      <Nav isDark={isDark} toggleDark={toggleDark} />
      <div className="px-6 md:px-8 py-8 md:py-10 [@media(max-height:500px)]:py-3 max-w-3xl mx-auto">
        <header className="mb-8 md:mb-10">
          <h1 className="font-display font-semibold text-[clamp(2rem,5vw,3.2rem)] tracking-[0.04em] uppercase leading-none text-[var(--text)]">
            Circle of Fifths
          </h1>
          <p className="mt-3 text-[0.82rem] text-[var(--muted)] leading-relaxed max-w-md">
            Click any segment to see the key&apos;s scale, diatonic chords, and related keys.
            Outer ring = major keys · Middle = key signature · Inner = relative minors.
          </p>
        </header>

        <main className="flex flex-col items-center">
          <CircleDiagram
            selectedIdx={selectedIdx}
            hoveredIdx={hoveredIdx}
            onSelect={setSelectedIdx}
            onHover={setHoveredIdx}
          />
        </main>
      </div>

      {selected !== null && (
        <KeyInfoModal
          info={selected}
          onClose={() => setSelectedIdx(null)}
          onSelectMajor={handleSelectMajor}
        />
      )}
    </div>
  );
}
