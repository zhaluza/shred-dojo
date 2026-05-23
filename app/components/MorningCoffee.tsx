import { useState, useEffect, useRef, useCallback } from "react";
import { Nav } from "./Nav";
import { CtrlButton } from "./CtrlButton";
import { LIGHT_THEME, DARK_THEME } from "./theme";
import {
  buildCagedPositions,
  SCALES,
  FRET_INLAYS,
  FRET_DOUBLE,
} from "./scalePositions.utils";
import type { ScaleString } from "./scalePositions.types";
import {
  KEYS,
  RELATIVE_MINORS,
  DRILLS,
  REFS,
  getKeyOffset,
  minorRootName,
} from "./morningCoffee.utils";

const TOTAL = KEYS.length * DRILLS.length; // 168

// ─── Metronome hook ──────────────────────────────────────────────────────────

const BEATS = 4;
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.1;
const MET_MIN_BPM = 40;
const MET_MAX_BPM = 220;

type Subdivision = 1 | 2 | 3;

function useMetronomePanel() {
  const [bpm, setBpmState] = useState<number>(() => {
    if (typeof window === "undefined") return 90;
    const v = parseInt(localStorage.getItem("mc-bpm") ?? "", 10);
    return v >= MET_MIN_BPM && v <= MET_MAX_BPM ? v : 90;
  });
  const [subdivision, setSubdivisionState] = useState<Subdivision>(() => {
    if (typeof window === "undefined") return 1;
    const v = parseInt(localStorage.getItem("mc-sub") ?? "", 10);
    return (v === 1 || v === 2 || v === 3 ? v : 1) as Subdivision;
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSlot, setCurrentSlot] = useState(-1);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bpmRef = useRef(bpm);
  const subRef = useRef(subdivision);
  const nextNoteTimeRef = useRef(0);
  const beatCountRef = useRef(0);
  const isPlayingRef = useRef(false);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { subRef.current = subdivision; }, [subdivision]);

  const setBpm = useCallback((v: number) => {
    const clamped = Math.max(MET_MIN_BPM, Math.min(MET_MAX_BPM, Math.round(v)));
    setBpmState(clamped);
    try { localStorage.setItem("mc-bpm", String(clamped)); } catch {}
  }, []);

  const setSubdivision = useCallback((v: Subdivision) => {
    setSubdivisionState(v);
    try { localStorage.setItem("mc-sub", String(v)); } catch {}
  }, []);

  const scheduleClick = useCallback((
    ctx: AudioContext,
    time: number,
    slot: number,
  ) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";

    const sub = subRef.current;
    const isDownbeat = slot === 0;
    const isBeat = slot % sub === 0;
    osc.frequency.value = isDownbeat ? 1500 : isBeat ? 1000 : 700;
    const vol = isDownbeat ? 0.3 : isBeat ? 0.18 : 0.1;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
    osc.start(time);
    osc.stop(time + 0.05);

    const msFromNow = Math.max(0, (time - ctx.currentTime) * 1000);
    setTimeout(() => setCurrentSlot(slot), msFromNow);
  }, []);

  const runScheduler = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const sub = subRef.current;
    const totalSlots = BEATS * sub;
    const spSlot = 60.0 / bpmRef.current / sub;
    while (nextNoteTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD_S) {
      scheduleClick(ctx, nextNoteTimeRef.current, beatCountRef.current);
      beatCountRef.current = (beatCountRef.current + 1) % totalSlots;
      nextNoteTimeRef.current += spSlot;
    }
    timerRef.current = setTimeout(runScheduler, LOOKAHEAD_MS);
  }, [scheduleClick]);

  const start = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();
    beatCountRef.current = 0;
    nextNoteTimeRef.current = ctx.currentTime + 0.05;
    isPlayingRef.current = true;
    setIsPlaying(true);
    runScheduler();
  }, [runScheduler]);

  const stop = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentSlot(-1);
  }, []);

  const toggle = useCallback(() => {
    if (isPlayingRef.current) stop(); else start();
  }, [start, stop]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    audioCtxRef.current?.close();
  }, []);

  return { bpm, setBpm, subdivision, setSubdivision, isPlaying, toggle, currentSlot };
}

// ─── ShapeFretboard ──────────────────────────────────────────────────────────

function ShapeFretboard({
  strings,
  displayStartFret,
  pentaSet,
}: {
  strings: ScaleString[];
  displayStartFret: number;
  pentaSet: Set<string>;
}) {
  const allFrets = strings.flatMap((s) => s.notes.map((n) => n.fret));
  const maxRelFret = Math.max(...allFrets);
  const fretCount = maxRelFret + 2;

  const W = 420;
  const H = 148;
  const LEFT = 24;
  const RIGHT = 12;
  const TOP = 30;
  const fretW = (W - LEFT - RIGHT) / fretCount;
  const strH = (H - TOP - 10) / 5;

  const fretX = (f: number) => LEFT + (f + 0.5) * fretW;
  // s=0 = low E at bottom, s=5 = high e at top
  const strY = (s: number) => TOP + (5 - s) * strH;
  const DOT_R = 8.5;
  const STR_LABELS = ["E", "A", "D", "G", "B", "e"];
  const STR_WIDTHS = [2, 1.5, 1.5, 1, 0.75, 0.5];

  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", maxWidth: W, display: "block", overflow: "visible" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Inlay markers above fret numbers */}
        {Array.from({ length: fretCount }, (_, fi) => {
          const absF = fi + displayStartFret;
          if (FRET_DOUBLE.has(absF)) {
            return (
              <g key={`inlay-${fi}`}>
                <circle cx={fretX(fi)} cy={TOP - 19} r={2.5} fill="var(--faint)" />
                <circle cx={fretX(fi)} cy={TOP - 11} r={2.5} fill="var(--faint)" />
              </g>
            );
          }
          if (FRET_INLAYS.has(absF)) {
            return (
              <circle key={`inlay-${fi}`} cx={fretX(fi)} cy={TOP - 15} r={2.5} fill="var(--faint)" />
            );
          }
          return null;
        })}

        {/* Fret numbers */}
        {Array.from({ length: fretCount }, (_, fi) => (
          <text
            key={`fn-${fi}`}
            x={fretX(fi)}
            y={TOP - 3}
            textAnchor="middle"
            fontSize={9}
            fill="var(--faint)"
            fontFamily="'Source Code Pro', monospace"
          >
            {fi + displayStartFret}
          </text>
        ))}

        {/* Fret bar lines */}
        {Array.from({ length: fretCount + 1 }, (_, fi) => (
          <line
            key={`fb-${fi}`}
            x1={LEFT + fi * fretW}
            y1={TOP}
            x2={LEFT + fi * fretW}
            y2={TOP + 5 * strH}
            stroke="var(--fret-bar)"
            strokeWidth={0.5}
          />
        ))}

        {/* Strings and string labels */}
        {strings.map((str, si) => (
          <g key={`str-${str.name}`}>
            <line
              x1={LEFT}
              y1={strY(si)}
              x2={W - RIGHT}
              y2={strY(si)}
              stroke="var(--border)"
              strokeWidth={STR_WIDTHS[si]}
            />
            <text
              x={LEFT - 5}
              y={strY(si) + 3.5}
              textAnchor="end"
              fontSize={9}
              fill="var(--muted)"
              fontFamily="'Source Code Pro', monospace"
            >
              {STR_LABELS[si]}
            </text>
          </g>
        ))}

        {/* Note dots */}
        {strings.map((str, si) =>
          str.notes.map((note) => {
            const cx = fretX(note.fret);
            const cy = strY(si);
            const isRoot = note.deg === "R";
            const isPenta = pentaSet.has(note.deg);

            let fill = "transparent";
            let stroke = "var(--border)";
            let textFill = "var(--muted)";

            if (isRoot) {
              fill = "var(--root-col)";
              stroke = "var(--root-col)";
              textFill = "#fff";
            } else if (isPenta) {
              fill = "var(--text)";
              stroke = "var(--text)";
              textFill = "var(--bg)";
            }

            const fs = note.deg.length > 1 ? 7 : 8.5;
            return (
              <g key={`n-${si}-${note.fret}`}>
                <circle cx={cx} cy={cy} r={DOT_R} fill={fill} stroke={stroke} strokeWidth={1.5} />
                <text
                  x={cx}
                  y={cy + 3.2}
                  textAnchor="middle"
                  fontSize={fs}
                  fill={textFill}
                  fontFamily="'Oswald', sans-serif"
                  fontWeight={500}
                >
                  {note.deg}
                </text>
              </g>
            );
          })
        )}
      </svg>
    </div>
  );
}

// ─── FretboardLegend ─────────────────────────────────────────────────────────

function FretboardLegend({ isMinor }: { isMinor: boolean }) {
  const diaLabel = isMinor ? "Diatonic only (2, b6)" : "Diatonic only (4, 7)";
  return (
    <div className="flex gap-4 flex-wrap items-center mb-2" style={{ fontSize: "0.68rem", color: "var(--muted)" }}>
      <span className="flex items-center gap-1">
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--root-col)", display: "inline-block" }} />
        Root
      </span>
      <span className="flex items-center gap-1">
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--text)", display: "inline-block" }} />
        Pentatonic
      </span>
      <span className="flex items-center gap-1">
        <span style={{ width: 10, height: 10, borderRadius: "50%", border: "1.5px solid var(--border)", display: "inline-block" }} />
        {diaLabel}
      </span>
    </div>
  );
}

function TripletIcon() {
  return (
    <svg
      width="22" height="14" viewBox="0 0 22 14"
      fill="currentColor" aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "-2px" }}
    >
      {/* "3" above beam */}
      <text x="11" y="4" textAnchor="middle" fontSize="5" fontStyle="italic" fontFamily="sans-serif">3</text>
      {/* Beam */}
      <rect x="1.5" y="5" width="19" height="1.6" />
      {/* Stems */}
      <rect x="1.5" y="5" width="1.2" height="7" />
      <rect x="10.4" y="5" width="1.2" height="7" />
      <rect x="19.3" y="5" width="1.2" height="7" />
      {/* Note heads */}
      <ellipse cx="2.1" cy="12.5" rx="2.3" ry="1.6" transform="rotate(-12 2.1 12.5)" />
      <ellipse cx="11" cy="12.5" rx="2.3" ry="1.6" transform="rotate(-12 11 12.5)" />
      <ellipse cx="19.9" cy="12.5" rx="2.3" ry="1.6" transform="rotate(-12 19.9 12.5)" />
    </svg>
  );
}

// ─── MetronomePanel ──────────────────────────────────────────────────────────

function MetronomePanel({
  met,
}: {
  met: ReturnType<typeof useMetronomePanel>;
}) {
  const { bpm, setBpm, subdivision, setSubdivision, isPlaying, toggle, currentSlot } = met;
  const totalSlots = BEATS * subdivision;

  return (
    <div
      className="rounded-sm p-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {/* BPM row */}
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={toggle}
          aria-label={isPlaying ? "Stop metronome" : "Start metronome"}
          className="font-display text-[0.72rem] tracking-[0.08em] uppercase border px-3 py-[0.35rem] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          style={{
            background: isPlaying ? "var(--text)" : "transparent",
            borderColor: isPlaying ? "var(--text)" : "var(--border)",
            color: isPlaying ? "var(--bg)" : "var(--text)",
          }}
        >
          {isPlaying ? "Stop" : "Start"}
        </button>

        <span
          className="font-display font-semibold tabular-nums flex-shrink-0"
          style={{ fontSize: "1.5rem", color: "var(--text)", lineHeight: 1 }}
        >
          {bpm}
        </span>
        <span className="text-[0.55rem] tracking-[0.12em] uppercase flex-shrink-0" style={{ color: "var(--muted)" }}>
          bpm
        </span>

        <input
          type="range"
          min={MET_MIN_BPM}
          max={MET_MAX_BPM}
          value={bpm}
          onChange={(e) => setBpm(parseInt(e.target.value, 10))}
          className="flex-1 accent-[var(--accent)]"
          aria-label="BPM"
        />

        {/* Subdivision buttons */}
        <div className="flex gap-1 flex-shrink-0">
          {([
            { label: "♩", val: 1 as Subdivision, ariaLabel: "Quarter note" },
            { label: "♫", val: 2 as Subdivision, ariaLabel: "Eighth notes" },
            { label: null, val: 3 as Subdivision, ariaLabel: "Triplets" },
          ] as const).map(({ label, val, ariaLabel }) => (
            <button
              key={val}
              onClick={() => setSubdivision(val)}
              aria-label={ariaLabel}
              className="font-display text-[0.65rem] px-[0.5rem] py-[0.25rem] border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              style={{
                background: subdivision === val ? "var(--text)" : "transparent",
                borderColor: subdivision === val ? "var(--text)" : "var(--border)",
                color: subdivision === val ? "var(--bg)" : "var(--text)",
              }}
            >
              {label ?? <TripletIcon />}
            </button>
          ))}
        </div>
      </div>

      {/* Beat indicator dots */}
      <div className="flex gap-[3px]" style={{ height: 4 }}>
        {Array.from({ length: totalSlots }, (_, i) => {
          const isBeat = i % subdivision === 0;
          const isActive = i === currentSlot;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: isBeat ? 4 : 3,
                alignSelf: "flex-end",
                borderRadius: 2,
                background: isActive
                  ? "var(--accent)"
                  : isBeat
                    ? "var(--border)"
                    : "var(--faint)",
                transition: isActive ? "background 20ms" : "background 180ms",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── MorningCoffee ───────────────────────────────────────────────────────────

// Pre-compute E-shape positions once (G-root, transposed by keyOffset at render)
const MAJ_E_SHAPE = buildCagedPositions(SCALES.major)[0];
const MIN_E_SHAPE = buildCagedPositions(SCALES.minor)[0];

export function MorningCoffee() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("shred-dojo-dark");
    if (stored !== null) {
      setIsDark(stored === "true");
    } else {
      setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  }, []);

  const toggleDark = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      try { localStorage.setItem("shred-dojo-dark", String(next)); } catch {}
      return next;
    });
  }, []);

  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  // Navigation state — lazy-initialized from localStorage
  const [drillIdx, setDrillIdx] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    try {
      const s = JSON.parse(localStorage.getItem("mc-state3") ?? "{}");
      return typeof s.d === "number"
        ? Math.max(0, Math.min(DRILLS.length - 1, s.d))
        : 0;
    } catch { return 0; }
  });

  const [keyIdx, setKeyIdx] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    try {
      const s = JSON.parse(localStorage.getItem("mc-state3") ?? "{}");
      return typeof s.k === "number"
        ? Math.max(0, Math.min(KEYS.length - 1, s.k))
        : 0;
    } catch { return 0; }
  });

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const s = JSON.parse(localStorage.getItem("mc-state3") ?? "{}");
      return typeof s.sb === "boolean" ? s.sb : true;
    } catch { return true; }
  });

  const [showShape, setShowShape] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const s = JSON.parse(localStorage.getItem("mc-state3") ?? "{}");
      return typeof s.sh === "boolean" ? s.sh : false;
    } catch { return false; }
  });

  // Persist state
  useEffect(() => {
    try {
      localStorage.setItem(
        "mc-state3",
        JSON.stringify({ d: drillIdx, k: keyIdx, sb: sidebarOpen, sh: showShape })
      );
    } catch {}
  }, [drillIdx, keyIdx, sidebarOpen, showShape]);

  const met = useMetronomePanel();

  // Derived values
  const drill = DRILLS[drillIdx];
  const key = KEYS[keyIdx];
  const cursor = drillIdx * KEYS.length + keyIdx;
  const isMinorDrill = drill.mode === "minor";

  const label = drill.labelFor(key, keyIdx);
  const spIdx = label.indexOf(" ");
  const keyPart = spIdx > 0 ? label.slice(0, spIdx) : label;
  const descPart = spIdx > 0 ? label.slice(spIdx + 1) : "";

  // Fretboard key offsets
  const majKeyOffset = getKeyOffset(key);
  const relMinorRoot = minorRootName(RELATIVE_MINORS[keyIdx]);
  const minKeyOffset = getKeyOffset(relMinorRoot);

  const majDisplayStart = MAJ_E_SHAPE.startFret + majKeyOffset;
  const minDisplayStart = MIN_E_SHAPE.startFret + minKeyOffset;

  // Navigation handlers
  const nextKey = useCallback(() => {
    if (keyIdx < KEYS.length - 1) {
      setKeyIdx((k) => k + 1);
    } else if (drillIdx < DRILLS.length - 1) {
      setDrillIdx((d) => d + 1);
      setKeyIdx(0);
    }
  }, [keyIdx, drillIdx]);

  const prevKey = useCallback(() => {
    if (keyIdx > 0) {
      setKeyIdx((k) => k - 1);
    } else if (drillIdx > 0) {
      setDrillIdx((d) => d - 1);
      setKeyIdx(KEYS.length - 1);
    }
  }, [keyIdx, drillIdx]);

  const nextDrill = useCallback(() => {
    if (drillIdx < DRILLS.length - 1) {
      setDrillIdx((d) => d + 1);
      setKeyIdx(0);
    }
  }, [drillIdx]);

  const prevDrill = useCallback(() => {
    if (drillIdx > 0) {
      setDrillIdx((d) => d - 1);
      setKeyIdx(0);
    }
  }, [drillIdx]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        nextKey();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevKey();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        met.toggle();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [nextKey, prevKey, met.toggle]);

  const ref = REFS[drill.id];
  const isLast = drillIdx === DRILLS.length - 1 && keyIdx === KEYS.length - 1;
  const isLastKey = keyIdx === KEYS.length - 1 && drillIdx < DRILLS.length - 1;

  const nextLabel = isLast ? "Done" : isLastKey ? "Next drill →" : "Next key →";

  return (
    <div style={theme} className="bg-[var(--bg)] text-[var(--text)] min-h-screen">
      <Nav isDark={isDark} toggleDark={toggleDark} />

      <div className="max-w-[960px] mx-auto px-4 pt-8 pb-20 [@media(max-height:500px)]:pt-3">
        <div className="flex gap-0">
          {/* ── Sidebar ──────────────────────────────────────────────── */}
          <div
            className={`flex-shrink-0 border-r border-[var(--border)] transition-all duration-200 overflow-hidden hidden min-[640px]:block ${
              sidebarOpen ? "w-[176px] opacity-100" : "w-0 opacity-0"
            }`}
          >
            <div className="text-[0.5rem] tracking-[0.18em] uppercase text-[var(--muted)] px-3 pt-1 pb-2">
              Drills
            </div>
            {DRILLS.map((d, di) => (
              <button
                key={d.id}
                onClick={() => { setDrillIdx(di); setKeyIdx(0); }}
                className={`block w-full text-left font-mono text-[0.68rem] leading-relaxed py-[5px] px-3 border-l-2 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] ${
                  di === drillIdx
                    ? "border-[var(--accent)] text-[var(--text)] bg-[var(--surface)]"
                    : "border-transparent text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]"
                }`}
              >
                {di + 1}. {d.name}
              </button>
            ))}
          </div>

          {/* ── Main ─────────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 pl-4 flex flex-col gap-4">
            {/* Progress row */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen((o) => !o)}
                aria-label="Toggle drill list"
                className="hidden min-[640px]:block text-[var(--muted)] hover:text-[var(--text)] transition-colors px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                style={{ fontSize: "1rem" }}
              >
                ☰
              </button>
              <div
                className="flex-1 rounded-full overflow-hidden"
                style={{ height: 3, background: "var(--surface)" }}
              >
                <div
                  className="h-full transition-all duration-200"
                  style={{
                    width: `${Math.round(((cursor + 1) / TOTAL) * 100)}%`,
                    background: "var(--accent)",
                  }}
                />
              </div>
              <span className="text-[0.62rem] tracking-[0.06em] tabular-nums flex-shrink-0" style={{ color: "var(--muted)" }}>
                {cursor + 1} / {TOTAL}
              </span>
            </div>

            {/* Content card */}
            <div
              className="p-5"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderTop: "3px solid var(--accent)",
              }}
            >
              <div className="text-[0.5rem] tracking-[0.18em] uppercase mb-1" style={{ color: "var(--muted)" }}>
                {drill.name}
              </div>
              <div
                className="font-display font-semibold leading-none tracking-[0.04em] uppercase mb-1"
                style={{ fontSize: "clamp(2rem, 5vw, 2.8rem)" }}
              >
                {keyPart}
              </div>
              {descPart && (
                <div className="text-[0.9rem] mb-4" style={{ color: "var(--muted)" }}>
                  {descPart}
                </div>
              )}

              {/* Reference / hint section */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", marginTop: descPart ? 0 : "1rem" }}>
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="text-[0.5rem] tracking-[0.18em] uppercase" style={{ color: "var(--muted)" }}>
                    {keyIdx === 0 && ref ? ref.title : ""}
                  </div>
                  <CtrlButton
                    label={showShape ? "Hide shape" : "Scale shape"}
                    active={showShape}
                    onClick={() => setShowShape((s) => !s)}
                    small
                  />
                </div>

                {keyIdx === 0 && ref ? (
                  <div className="flex flex-col gap-2">
                    {ref.tab && (
                      <pre
                        className="font-mono overflow-x-auto whitespace-pre"
                        style={{ fontSize: "0.72rem", lineHeight: 1.6, color: "var(--muted)", margin: 0 }}
                      >
                        {ref.tab}
                      </pre>
                    )}
                    {ref.pairs && (
                      <div className="font-mono" style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                        {ref.pairs}
                      </div>
                    )}
                    <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{ref.note}</div>
                  </div>
                ) : (
                  <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{drill.hint}</div>
                )}
              </div>
            </div>

            {/* Key pips */}
            <div className="flex flex-wrap gap-[5px]">
              {KEYS.map((k, ki) => (
                <button
                  key={k}
                  onClick={() => setKeyIdx(ki)}
                  aria-label={`Key ${k}`}
                  className={`font-display text-[0.6rem] tracking-[0.04em] border rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg)] ${
                    ki === keyIdx
                      ? "bg-[var(--text)] text-[var(--bg)] border-[var(--text)]"
                      : "text-[var(--muted)] border-[var(--border)] hover:border-[var(--text)] hover:text-[var(--text)]"
                  }`}
                  style={{ width: 26, height: 26 }}
                >
                  {k}
                </button>
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-2">
              <CtrlButton
                label="⟨⟨"
                active={false}
                onClick={prevDrill}
                disabled={drillIdx === 0}
                title="Previous drill"
                small
              />
              <CtrlButton
                label="⟨"
                active={false}
                onClick={prevKey}
                disabled={keyIdx === 0 && drillIdx === 0}
                title="Previous key"
                small
              />
              <button
                onClick={isLast ? undefined : nextKey}
                disabled={isLast}
                className="flex-1 font-display text-[0.75rem] tracking-[0.08em] uppercase border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] px-4 py-[0.35rem] max-[700px]:py-[0.6rem] disabled:opacity-50 disabled:cursor-default"
                style={{
                  background: "var(--accent)",
                  borderColor: "var(--accent)",
                  color: "#fff",
                }}
              >
                {nextLabel}
              </button>
              <CtrlButton
                label="⟩⟩"
                active={false}
                onClick={nextDrill}
                disabled={drillIdx === DRILLS.length - 1}
                title="Next drill"
                small
              />
            </div>

            {/* Scale shape fretboard */}
            {showShape && (
              <div className="flex flex-col gap-5">
                {isMinorDrill ? (
                  /* Minor drills: show only the relative minor E-shape */
                  <div>
                    <div className="text-[0.5rem] tracking-[0.18em] uppercase mb-2" style={{ color: "var(--muted)" }}>
                      {RELATIVE_MINORS[keyIdx]} natural minor — CAGED E shape
                    </div>
                    <FretboardLegend isMinor />
                    <ShapeFretboard
                      strings={MIN_E_SHAPE.strings}
                      displayStartFret={minDisplayStart}
                      pentaSet={SCALES.minor.penta}
                    />
                  </div>
                ) : (
                  /* Major drills: show only the major E-shape */
                  <div>
                    <div className="text-[0.5rem] tracking-[0.18em] uppercase mb-2" style={{ color: "var(--muted)" }}>
                      {key} major — CAGED E shape
                    </div>
                    <FretboardLegend isMinor={false} />
                    <ShapeFretboard
                      strings={MAJ_E_SHAPE.strings}
                      displayStartFret={majDisplayStart}
                      pentaSet={SCALES.major.penta}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Metronome */}
            <MetronomePanel met={met} />

            {/* Footer hints */}
            <div className="flex justify-between items-center">
              <span className="text-[0.6rem]" style={{ color: "var(--muted)" }}>
                ← → keys · m = metronome
              </span>
              <button
                onClick={() => { setDrillIdx(0); setKeyIdx(0); }}
                className="text-[0.6rem] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                style={{ color: "var(--muted)" }}
              >
                Reset progress
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
