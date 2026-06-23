import { useState, useMemo, useEffect } from "react";
import { DARK_THEME, LIGHT_THEME, STRING_LINE } from "./theme";
import { CtrlButton } from "./CtrlButton";
import { Nav } from "./Nav";
import { PageHeader } from "./PageHeader";
import type { StringName } from "./scalePositions.types";
import {
  buildBox,
  type BoxNote,
  type PentaDegree,
  type PentaScaleMode,
} from "./pentatonicTriads.utils";
import {
  buildColorNotes,
  MINOR_COLOR_MODES,
  MAJOR_COLOR_MODES,
  type ColorNote,
  type ColorDegreeLabel,
  type ColorModeConfig,
} from "./pentatonicColors.utils";

// ─── Dot helpers ──────────────────────────────────────────────────────────────

function pentaDotColors(deg: PentaDegree): { bg: string; fg: string } {
  if (deg === "R") return { bg: "var(--root-col)", fg: "#fff" };
  if (deg === "b3" || deg === "3") return { bg: "var(--third-col)", fg: "#fff" };
  if (deg === "5") return { bg: "var(--fifth-col)", fg: "#fff" };
  return { bg: "var(--text)", fg: "var(--bg)" };
}

// ─── PentaDot ─────────────────────────────────────────────────────────────────

function PentaDot({ deg }: { deg: PentaDegree }) {
  const { bg, fg } = pentaDotColors(deg);
  return (
    <div
      className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[0.46rem] font-display tracking-[0.02em] relative z-[2] shrink-0"
      style={{ background: bg, color: fg }}
    >
      {deg}
    </div>
  );
}

// ─── ColorDot ─────────────────────────────────────────────────────────────────

function ColorDot({ label }: { label: ColorDegreeLabel }) {
  return (
    <div
      className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[0.42rem] font-display tracking-[0.02em] relative z-[2] shrink-0 text-white"
      style={{ background: "var(--sys-caged)" }}
    >
      {label}
    </div>
  );
}

// ─── ColorFretboard ───────────────────────────────────────────────────────────

const VISUAL_ORDER: StringName[] = ["e", "B", "G", "D", "A", "E"];

function ColorFretboard({
  boxNotes,
  colorNotes,
  displayMin,
  displayMax,
}: {
  boxNotes: BoxNote[];
  colorNotes: ColorNote[];
  displayMin: number;
  displayMax: number;
}) {
  const fretCount = displayMax - displayMin + 1;

  return (
    <div className="w-full overflow-x-auto">
      {/* Fret number row */}
      <div className="flex pl-[1.9rem] mb-[0.15rem]">
        {Array.from({ length: fretCount }, (_, idx) => (
          <div
            key={idx}
            className="flex-1 text-center text-[0.44rem] text-[var(--faint)]"
          >
            {displayMin + idx}
          </div>
        ))}
      </div>

      {/* String rows */}
      {VISUAL_ORDER.map((sname) => {
        const line = STRING_LINE[sname];
        return (
          <div key={sname} className="flex items-center h-[34px]" data-string={sname}>
            <div className="w-[1.9rem] text-right pr-[0.4rem] shrink-0 text-[0.5rem] text-[var(--muted)]">
              {sname}
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
              {Array.from({ length: fretCount }, (_, idx) => {
                const absFret = displayMin + idx;
                const pentaNote = boxNotes.find(
                  (n) => n.string === sname && n.fret === absFret
                );
                const colorNote = colorNotes.find(
                  (n) => n.string === sname && n.fret === absFret
                );
                return (
                  <div
                    key={idx}
                    className="flex-1 h-[34px] flex items-center justify-center relative z-[1]"
                  >
                    {pentaNote ? (
                      <PentaDot deg={pentaNote.deg} />
                    ) : colorNote ? (
                      <ColorDot label={colorNote.degLabel} />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── ColorsLegend ─────────────────────────────────────────────────────────────

function ColorsLegend({
  scale,
  colorConfig,
}: {
  scale: PentaScaleMode;
  colorConfig: ColorModeConfig;
}) {
  const thirdLabel = scale === "minor" ? "Minor 3rd" : "Major 3rd";
  const thirdDeg = scale === "minor" ? "b3" : "3";
  const exampleLabel = colorConfig.addedSemis[0]?.degLabel ?? "b5";

  const items: Array<{
    dotStyle: React.CSSProperties;
    textStyle: React.CSSProperties;
    label: string;
    deg: string;
  }> = [
    {
      dotStyle: { background: "var(--root-col)" },
      textStyle: { color: "#fff" },
      label: "Root",
      deg: "R",
    },
    {
      dotStyle: { background: "var(--third-col)" },
      textStyle: { color: "#fff" },
      label: thirdLabel,
      deg: thirdDeg,
    },
    {
      dotStyle: { background: "var(--fifth-col)" },
      textStyle: { color: "#fff" },
      label: "Perfect 5th",
      deg: "5",
    },
    {
      dotStyle: { background: "var(--text)" },
      textStyle: { color: "var(--bg)" },
      label: "Pentatonic tone",
      deg: "·",
    },
    {
      dotStyle: { background: "var(--sys-caged)" },
      textStyle: { color: "#fff" },
      label: "Color note",
      deg: exampleLabel,
    },
  ];

  return (
    <div
      className="mb-6 flex flex-wrap gap-x-5 gap-y-2 items-center px-4 py-3 border border-[var(--border)]"
      style={{ background: "var(--surface)" }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-[0.45rem] text-[0.55rem] text-[var(--muted)] tracking-[0.07em] uppercase"
        >
          <div
            className="w-[18px] h-[18px] rounded-full shrink-0 flex items-center justify-center text-[0.42rem]"
            style={{ ...item.dotStyle, ...item.textStyle }}
          >
            {item.deg}
          </div>
          {item.label}
        </div>
      ))}
    </div>
  );
}

// ─── PentatonicColors ─────────────────────────────────────────────────────────

export function PentatonicColors() {
  const [scale, setScale] = useState<PentaScaleMode>("minor");
  const [modeId, setModeId] = useState<string>(MINOR_COLOR_MODES[0].id);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("shred-dojo-dark");
    if (stored !== null) setIsDark(stored === "true");
  }, []);

  const toggleDark = () =>
    setIsDark((prev) => {
      localStorage.setItem("shred-dojo-dark", String(!prev));
      return !prev;
    });

  const activeModes = scale === "minor" ? MINOR_COLOR_MODES : MAJOR_COLOR_MODES;

  const handleScaleChange = (s: PentaScaleMode) => {
    const modes = s === "minor" ? MINOR_COLOR_MODES : MAJOR_COLOR_MODES;
    setScale(s);
    setModeId(modes[0].id);
  };

  const colorConfig = useMemo(
    () => activeModes.find((m) => m.id === modeId) ?? activeModes[0],
    [activeModes, modeId]
  );

  const { boxNotes, displayMin, displayMax, colorNotes } = useMemo(() => {
    const box = buildBox(0, scale);
    const frets = box.map((n) => n.fret);
    const boxMin = Math.min(...frets);
    const boxMax = Math.max(...frets);
    const dMin = boxMin - 1;
    const dMax = boxMax + 1;
    const cNotes = buildColorNotes(box, colorConfig, dMin, dMax);
    return { boxNotes: box, displayMin: dMin, displayMax: dMax, colorNotes: cNotes };
  }, [scale, colorConfig]);

  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  return (
    <div
      className="min-h-screen font-mono bg-[var(--bg)] text-[var(--text)]"
      style={theme}
    >
      <Nav isDark={isDark} toggleDark={toggleDark} />
      <div className="max-w-[1100px] mx-auto px-5 pt-8 [@media(max-height:500px)]:pt-3 pb-20">
        <PageHeader
          eyebrow="Pentatonic"
          title={<>Pentatonic <span style={{ color: "var(--accent)" }}>Colors</span></>}
          subtitle="G root · Box 1 — add color notes from related modes."
        />

        {/* Scale controls */}
        <div className="mb-3 flex gap-3 flex-wrap items-center">
          <span className="text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)]">
            Scale
          </span>
          <CtrlButton
            label="Minor"
            active={scale === "minor"}
            onClick={() => handleScaleChange("minor")}
          />
          <CtrlButton
            label="Major"
            active={scale === "major"}
            onClick={() => handleScaleChange("major")}
          />
        </div>

        {/* Mode controls */}
        <div className="mb-5 flex gap-3 flex-wrap items-center border-b border-[var(--border)] pb-4">
          <span className="text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)]">
            Color
          </span>
          {activeModes.map((m) => (
            <CtrlButton
              key={m.id}
              label={m.label}
              active={modeId === m.id}
              onClick={() => setModeId(m.id)}
            />
          ))}
        </div>

        {/* Legend */}
        <ColorsLegend scale={scale} colorConfig={colorConfig} />

        {/* Fretboard card */}
        <div
          className="border border-[var(--border)] mb-6"
          style={{ background: "var(--surface)" }}
        >
          {/* Card header */}
          <div className="flex justify-between items-center px-4 py-[0.65rem] border-b border-[var(--border)] flex-wrap gap-2">
            <div className="font-display text-[0.9rem] tracking-[0.06em]">
              <strong className="font-semibold">
                {scale === "minor" ? "Minor" : "Major"} Pentatonic
              </strong>{" "}
              <span className="text-[var(--muted)]">· Box 1 · G root</span>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <span
                className="font-display text-[0.5rem] px-[0.5rem] py-[0.15rem] border tracking-[0.08em] uppercase border-[var(--sys-caged)] text-[var(--sys-caged)]"
              >
                + {colorConfig.label}
              </span>
              <span className="font-display text-[0.5rem] px-[0.5rem] py-[0.15rem] border border-[var(--border)] text-[var(--muted)] tracking-[0.08em] uppercase">
                frets {displayMin + 1}–{displayMax - 1}
              </span>
            </div>
          </div>

          {/* Fretboard */}
          <div className="px-4 py-4 overflow-x-auto">
            <ColorFretboard
              boxNotes={boxNotes}
              colorNotes={colorNotes}
              displayMin={displayMin}
              displayMax={displayMax}
            />
          </div>
        </div>

        {/* Mode description */}
        <div
          className="px-4 py-4 border border-[var(--border)]"
          style={{ background: "var(--surface)" }}
        >
          <div className="mb-2 font-display text-[0.68rem] tracking-[0.13em] uppercase text-[var(--muted)]">
            About {colorConfig.label}
          </div>
          <p className="text-[0.72rem] text-[var(--muted)] leading-[1.85] max-w-[640px]">
            {colorConfig.description}
          </p>
        </div>
      </div>
    </div>
  );
}
