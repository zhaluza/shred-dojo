import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Nav } from "./Nav";
import { CtrlButton } from "./CtrlButton";
import { LIGHT_THEME, DARK_THEME } from "./theme";
import { FRET_INLAYS, FRET_DOUBLE } from "./scalePositions.utils";
import {
  KEYS,
  NOTE_NAMES,
  STRING_NAMES,
  SHAPE_OFFSETS,
  SHAPES,
  SHAPE_MIN_REL,
  STRING_SETS,
  STEPS,
  mod12,
  pcAt,
  rootFretLowE,
} from "./pentatonicPractice.utils";

// ─── Metronome hook ──────────────────────────────────────────────────────────
// Same look-ahead scheduler pattern as MorningCoffee / MetronomeWidget.

const BEATS = 4;
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.1;
const MET_MIN_BPM = 40;
const MET_MAX_BPM = 220;

type Subdivision = 1 | 2 | 3;

function useMetronomePanel() {
  const [bpm, setBpmState] = useState<number>(() => {
    if (typeof window === "undefined") return 80;
    const v = parseInt(localStorage.getItem("pp-bpm") ?? "", 10);
    return v >= MET_MIN_BPM && v <= MET_MAX_BPM ? v : 80;
  });
  const [subdivision, setSubdivisionState] = useState<Subdivision>(() => {
    if (typeof window === "undefined") return 1;
    const v = parseInt(localStorage.getItem("pp-sub") ?? "", 10);
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
    try { localStorage.setItem("pp-bpm", String(clamped)); } catch {}
  }, []);

  const setSubdivision = useCallback((v: Subdivision) => {
    setSubdivisionState(v);
    try { localStorage.setItem("pp-sub", String(v)); } catch {}
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

function TripletIcon() {
  return (
    <svg
      width="22" height="14" viewBox="0 0 22 14"
      fill="currentColor" aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "-2px" }}
    >
      <text x="11" y="4" textAnchor="middle" fontSize="5" fontStyle="italic" fontFamily="sans-serif">3</text>
      <rect x="1.5" y="5" width="19" height="1.6" />
      <rect x="1.5" y="5" width="1.2" height="7" />
      <rect x="10.4" y="5" width="1.2" height="7" />
      <rect x="19.3" y="5" width="1.2" height="7" />
      <ellipse cx="2.1" cy="12.5" rx="2.3" ry="1.6" transform="rotate(-12 2.1 12.5)" />
      <ellipse cx="11" cy="12.5" rx="2.3" ry="1.6" transform="rotate(-12 11 12.5)" />
      <ellipse cx="19.9" cy="12.5" rx="2.3" ry="1.6" transform="rotate(-12 19.9 12.5)" />
    </svg>
  );
}

// ─── MetronomePanel ──────────────────────────────────────────────────────────

function MetronomePanel({ met }: { met: ReturnType<typeof useMetronomePanel> }) {
  const { bpm, setBpm, subdivision, setSubdivision, isPlaying, toggle, currentSlot } = met;
  const totalSlots = BEATS * subdivision;

  const subButtons = (
    [
      { label: "♩", val: 1 as Subdivision, ariaLabel: "Quarter note" },
      { label: "♫", val: 2 as Subdivision, ariaLabel: "Eighth notes" },
      { label: null, val: 3 as Subdivision, ariaLabel: "Triplets" },
    ] as const
  ).map(({ label, val, ariaLabel }) => (
    <button
      key={val}
      onClick={() => setSubdivision(val)}
      aria-label={ariaLabel}
      className="font-display text-[0.65rem] px-[0.5rem] py-[0.3rem] border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      style={{
        background: subdivision === val ? "var(--text)" : "transparent",
        borderColor: subdivision === val ? "var(--text)" : "var(--border)",
        color: subdivision === val ? "var(--bg)" : "var(--text)",
      }}
    >
      {label ?? <TripletIcon />}
    </button>
  ));

  return (
    <div>
      <div className="text-[0.5rem] tracking-[0.18em] uppercase mb-2" style={{ color: "var(--muted)" }}>
        Metronome
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          aria-label={isPlaying ? "Stop metronome" : "Start metronome"}
          className="font-display text-[0.72rem] tracking-[0.08em] uppercase border px-3 py-[0.35rem] max-[700px]:py-[0.55rem] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] shrink-0"
          style={{
            background: isPlaying ? "var(--accent)" : "transparent",
            borderColor: isPlaying ? "var(--accent)" : "var(--border)",
            color: isPlaying ? "#fff" : "var(--text)",
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
          className="flex-1 min-w-0 accent-[var(--accent)]"
          aria-label="BPM"
        />

        <div className="hidden min-[460px]:flex gap-1 flex-shrink-0">
          {subButtons}
        </div>
      </div>

      <div className="flex min-[460px]:hidden gap-2 mt-2 justify-end">
        {subButtons}
      </div>

      {/* Beat indicator dots */}
      <div className="flex gap-[3px] mt-3" style={{ height: 4 }}>
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

// ─── Timer ───────────────────────────────────────────────────────────────────

function Timer() {
  const PRESETS = [1, 2, 3, 5];
  const [target, setTarget] = useState(180); // seconds
  const [remaining, setRemaining] = useState(180);
  const [running, setRunning] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  const chime = useCallback(() => {
    try {
      const ctx = ctxRef.current ?? new AudioContext();
      ctxRef.current = ctx;
      ctx.resume();
      const now = ctx.currentTime;
      [880, 1318].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = f;
        const t = now + i * 0.18;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.55);
      });
    } catch {
      /* audio unavailable */
    }
  }, []);

  useEffect(() => {
    if (!running) {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    tickRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (tickRef.current) clearInterval(tickRef.current);
          setRunning(false);
          chime();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [running, chime]);

  useEffect(() => () => { ctxRef.current?.close(); }, []);

  const setPreset = (mins: number) => {
    const s = mins * 60;
    setTarget(s);
    setRemaining(s);
    setRunning(false);
  };
  const toggle = () => {
    if (remaining === 0) {
      setRemaining(target);
      setRunning(true);
      return;
    }
    setRunning((v) => !v);
  };
  const reset = () => {
    setRunning(false);
    setRemaining(target);
  };

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const pct = target ? (remaining / target) * 100 : 0;
  const done = remaining === 0;

  return (
    <div>
      <div className="text-[0.5rem] tracking-[0.18em] uppercase mb-2" style={{ color: "var(--muted)" }}>
        Timer
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 flex-shrink-0">
          {PRESETS.map((m) => {
            const on = target === m * 60;
            return (
              <button
                key={m}
                onClick={() => setPreset(m)}
                className="font-mono text-[0.7rem] border px-2 py-[0.3rem] max-[700px]:py-[0.45rem] min-w-[34px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                style={{
                  background: on ? "var(--text)" : "transparent",
                  borderColor: on ? "var(--text)" : "var(--border)",
                  color: on ? "var(--bg)" : "var(--muted)",
                }}
              >
                {m}m
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-w-[90px] flex flex-col gap-[6px]">
          <div
            className="font-mono font-semibold text-center tabular-nums"
            style={{ fontSize: "1.4rem", letterSpacing: "0.04em", color: done ? "var(--accent)" : "var(--text)", lineHeight: 1 }}
          >
            {mm}:{ss}
          </div>
          <div className="rounded-full overflow-hidden" style={{ height: 4, background: "var(--border)" }}>
            <div
              className="h-full"
              style={{ width: pct + "%", background: "var(--accent)", transition: "width 1s linear" }}
            />
          </div>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={toggle}
            className="font-display text-[0.72rem] tracking-[0.08em] uppercase border px-3 py-[0.35rem] max-[700px]:py-[0.55rem] min-w-[72px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            style={{
              background: running ? "var(--accent)" : "transparent",
              borderColor: running ? "var(--accent)" : "var(--border)",
              color: running ? "#fff" : "var(--text)",
            }}
          >
            {running ? "Pause" : done ? "Restart" : "Start"}
          </button>
          <button
            onClick={reset}
            aria-label="Reset timer"
            className="font-display border px-3 py-[0.35rem] max-[700px]:py-[0.55rem] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            style={{ background: "transparent", borderColor: "var(--border)", color: "var(--text)", lineHeight: 1, fontSize: "1rem" }}
          >
            ↺
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ShapeDiagram ────────────────────────────────────────────────────────────

function ShapeDiagram({
  shapeIdx,
  minorRootPc,
  mode,
  startFret,
}: {
  shapeIdx: number;
  minorRootPc: number;
  mode: "minor" | "major";
  startFret: number;
}) {
  const shape = SHAPES[shapeIdx];
  const rel = shape.flat();
  const minRel = Math.min(...rel);
  const maxRel = Math.max(...rel);
  const span = maxRel - minRel; // 3 or 4
  const cols = span + 1;
  const cw = 44, rh = 26, pad = 26;
  const W = pad * 2 + cols * cw;
  const H = pad * 2 + 5 * rh + 18;
  const majorPc = mod12(minorRootPc + 3);
  const lowestShown = startFret + (minRel - SHAPE_OFFSETS[shapeIdx]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", maxWidth: 340, overflow: "visible" }}
      role="img"
      aria-label={`Shape ${shapeIdx + 1} diagram`}
    >
      {/* strings (horizontal, low E at bottom) */}
      {STRING_NAMES.map((n, s) => {
        const y = pad + (5 - s) * rh;
        return (
          <g key={s}>
            <line
              x1={pad} y1={y} x2={W - pad} y2={y}
              stroke="var(--border)"
              strokeWidth={s < 2 ? 2 : 1}
            />
            <text
              x={pad - 12} y={y + 4}
              fontSize="11" fill="var(--muted)"
              textAnchor="middle" fontFamily="'Source Code Pro', monospace"
            >
              {n}
            </text>
          </g>
        );
      })}
      {/* fret lines */}
      {Array.from({ length: cols + 1 }, (_, i) => {
        const x = pad + i * cw;
        return (
          <line
            key={i} x1={x} y1={pad} x2={x} y2={pad + 5 * rh}
            stroke="var(--fret-bar)" strokeWidth="1"
          />
        );
      })}
      {/* inlay markers + fret numbers */}
      {Array.from({ length: cols }, (_, i) => {
        const x = pad + i * cw + cw / 2;
        const f = lowestShown + i;
        const fShow = f > 0 ? f : f + 12;
        return (
          <g key={i}>
            {FRET_DOUBLE.has(fShow) ? (
              <>
                <circle cx={x - 4} cy={H - 9} r={2} fill="var(--faint)" />
                <circle cx={x + 4} cy={H - 9} r={2} fill="var(--faint)" />
              </>
            ) : FRET_INLAYS.has(fShow) ? (
              <circle cx={x} cy={H - 9} r={2} fill="var(--faint)" />
            ) : null}
            <text
              x={x} y={H - 22}
              fontSize="11" fill="var(--faint)"
              textAnchor="middle" fontFamily="'Source Code Pro', monospace"
            >
              {fShow}
            </text>
          </g>
        );
      })}
      {/* notes */}
      {shape.map((pair, s) =>
        pair.map((relFret, j) => {
          const col = relFret - minRel;
          const x = pad + col * cw + cw / 2;
          const y = pad + (5 - s) * rh;
          const fret = startFret + (relFret - SHAPE_OFFSETS[shapeIdx]);
          const pc = pcAt(s, fret);
          const isMinorRoot = pc === minorRootPc;
          const isMajorRoot = pc === majorPc;
          const isRoot = mode === "minor" ? isMinorRoot : isMajorRoot;
          const isOtherRoot = mode === "minor" ? isMajorRoot : isMinorRoot;
          return (
            <circle
              key={s + "-" + j}
              cx={x} cy={y} r={8.5}
              fill={isRoot ? "var(--root-col)" : isOtherRoot ? "none" : "var(--text)"}
              stroke={isOtherRoot ? "var(--root-col)" : "none"}
              strokeWidth={isOtherRoot ? 2 : 0}
            />
          );
        }),
      )}
    </svg>
  );
}

// ─── StringPairDiagram ───────────────────────────────────────────────────────

function StringPairDiagram({
  strings,
  minorRootPc,
  mode,
}: {
  strings: [number, number];
  minorRootPc: number;
  mode: "minor" | "major";
}) {
  const pentaSet = new Set([0, 3, 5, 7, 10].map((i) => mod12(minorRootPc + i)));
  const rootPc = mode === "minor" ? minorRootPc : mod12(minorRootPc + 3);
  const maxFret = 15;
  const cw = 34, rh = 30, pad = 26;
  const W = pad * 2 + (maxFret + 1) * cw;
  const H = pad + 2 * rh + 16;
  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", minWidth: 560 }}
        role="img"
        aria-label="Two-string pentatonic map"
      >
        {strings.map((s, row) => {
          const y = pad + row * rh;
          return (
            <g key={s}>
              <line
                x1={pad} y1={y} x2={W - pad} y2={y}
                stroke="var(--border)" strokeWidth="1.5"
              />
              <text
                x={pad - 12} y={y + 4}
                fontSize="11" fill="var(--muted)"
                textAnchor="middle" fontFamily="'Source Code Pro', monospace"
              >
                {STRING_NAMES[s]}
              </text>
              {Array.from({ length: maxFret + 1 }, (_, f) => {
                const pc = pcAt(s, f);
                if (!pentaSet.has(pc)) return null;
                const x = pad + f * cw + cw / 2;
                const isRoot = pc === rootPc;
                return (
                  <circle
                    key={f} cx={x} cy={y} r={8}
                    fill={isRoot ? "var(--root-col)" : "var(--text)"}
                  />
                );
              })}
            </g>
          );
        })}
        {Array.from({ length: maxFret + 1 }, (_, f) => (
          <text
            key={f}
            x={pad + f * cw + cw / 2} y={H - 4}
            fontSize="10" fill="var(--faint)"
            textAnchor="middle" fontFamily="'Source Code Pro', monospace"
          >
            {f}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ─── CircleOfFifths key selector ─────────────────────────────────────────────

function CircleSelector({
  keyIdx,
  mode,
  onSelect,
}: {
  keyIdx: number;
  mode: "minor" | "major";
  onSelect: (i: number) => void;
}) {
  const R = 130, cx = 150, cy = 150;
  const majorActive = mode === "major";
  return (
    <svg
      viewBox="0 0 300 300"
      style={{ width: "100%", maxWidth: 280 }}
      role="img"
      aria-label="Circle of fifths key selector"
    >
      {KEYS.map((k, i) => {
        const a0 = ((i - 0.5) / 12) * Math.PI * 2 - Math.PI / 2;
        const a1 = ((i + 0.5) / 12) * Math.PI * 2 - Math.PI / 2;
        const arc = (r: number, a: number): [number, number] => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
        const [x0, y0] = arc(R, a0);
        const [x1, y1] = arc(R, a1);
        const [x2, y2] = arc(46, a1);
        const [x3, y3] = arc(46, a0);
        const [bx0, by0] = arc(92, a0);
        const [bx1, by1] = arc(92, a1);
        const mid = (a0 + a1) / 2;
        const [mx, my] = arc(R - 24, mid);
        const [ix, iy] = arc(68, mid);
        const sel = i === keyIdx;
        return (
          <g key={k.maj} onClick={() => onSelect(i)} style={{ cursor: "pointer" }}>
            {/* outer (major) wedge */}
            <path
              d={`M ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1} L ${bx1} ${by1} A 92 92 0 0 0 ${bx0} ${by0} Z`}
              fill="var(--accent)"
              fillOpacity={sel && majorActive ? 0.16 : 0}
              stroke="var(--border)"
              strokeWidth="1"
            />
            {/* inner (minor) wedge */}
            <path
              d={`M ${bx0} ${by0} A 92 92 0 0 1 ${bx1} ${by1} L ${x2} ${y2} A 46 46 0 0 0 ${x3} ${y3} Z`}
              fill="var(--accent)"
              fillOpacity={sel && !majorActive ? 0.16 : 0}
              stroke="var(--border)"
              strokeWidth="1"
            />
            <text
              x={mx} y={my + 4}
              textAnchor="middle"
              fontSize={majorActive ? 15 : 12}
              fontWeight={sel && majorActive ? 700 : 500}
              fill={sel && majorActive ? "var(--accent)" : majorActive ? "var(--text)" : "var(--faint)"}
              fontFamily="'Oswald', sans-serif"
              style={{ pointerEvents: "none" }}
            >
              {k.maj}
            </text>
            <text
              x={ix} y={iy + 3}
              textAnchor="middle"
              fontSize={majorActive ? 9 : 12}
              fontWeight={sel && !majorActive ? 700 : 500}
              fill={sel && !majorActive ? "var(--accent)" : majorActive ? "var(--faint)" : "var(--text)"}
              fontFamily="'Oswald', sans-serif"
              style={{ pointerEvents: "none" }}
            >
              {k.min}
            </text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={46} fill="none" stroke="var(--border)" />
      <circle
        cx={cx} cy={cy} r={92}
        fill="none"
        stroke={majorActive ? "var(--border)" : "var(--accent)"}
        strokeOpacity={majorActive ? 1 : 0.55}
      />
      <circle
        cx={cx} cy={cy} r={R}
        fill="none"
        stroke={majorActive ? "var(--accent)" : "var(--border)"}
        strokeOpacity={majorActive ? 0.55 : 1}
      />
    </svg>
  );
}

// ─── PentatonicPractice ──────────────────────────────────────────────────────

export function PentatonicPractice() {
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

  const [step, setStep] = useState(0);
  const [keyIdx, setKeyIdx] = useState(3); // A / F#m
  const [mode, setMode] = useState<"minor" | "major">("minor");
  const [shapeIdx, setShapeIdx] = useState(0);
  const [pairIdx, setPairIdx] = useState(0);
  const [anchorKeyIdx, setAnchorKeyIdx] = useState(3);
  const [revealed, setRevealed] = useState(false);
  const [showHints, setShowHints] = useState(true);
  const [showDiagram, setShowDiagram] = useState(true);

  const met = useMetronomePanel();

  const key = KEYS[keyIdx];
  const minorRootPc = mod12(key.pc + 9);
  const rootPc = mode === "minor" ? minorRootPc : key.pc;
  const keyLabel = mode === "minor" ? key.min : key.maj;

  // anchor fret for steps 1 & 3
  const anchorKey = KEYS[anchorKeyIdx];
  const anchorMinorPc = mod12(anchorKey.pc + 9);
  const anchorRootPc = mode === "minor" ? anchorMinorPc : anchorKey.pc;
  const anchorFret = rootFretLowE(anchorRootPc);
  const impliedMinorFret = anchorFret - SHAPE_OFFSETS[shapeIdx];
  const impliedMinorPc = mod12(4 + impliedMinorFret);
  const impliedMajorPc = mod12(impliedMinorPc + 3);
  const impliedKey = KEYS.find((k) => k.pc === impliedMajorPc);

  const minorRootFret = rootFretLowE(minorRootPc);
  const startFretInKey = (() => {
    let f = mod12(minorRootFret + SHAPE_OFFSETS[shapeIdx]);
    if (f === 0) f = 12;
    return f;
  })();

  const lowest = useMemo(() => {
    let best: { shape: number; start: number; low: number } | null = null;
    SHAPES.forEach((_, i) => {
      let start = mod12(minorRootFret + SHAPE_OFFSETS[i]);
      let low = start + SHAPE_MIN_REL[i];
      if (low < 0) { start += 12; low += 12; }
      if (!best || low < best.low) best = { shape: i, start, low };
    });
    return best!;
  }, [minorRootFret]);

  const anchored = step === 0 || step === 2;
  const diagramStartFret = anchored ? anchorFret : startFretInKey;
  const diagramMinorPc = anchored ? impliedMinorPc : minorRootPc;

  const nextShape = () => { setShapeIdx((s) => (s + 1) % 5); setRevealed(false); };
  const prevShape = () => { setShapeIdx((s) => (s + 4) % 5); setRevealed(false); };
  const nextKey = () => {
    const n = (keyIdx + 1) % 12;
    setKeyIdx(n); setAnchorKeyIdx(n); setRevealed(false);
  };
  const prevKey = () => {
    const n = (keyIdx + 11) % 12;
    setKeyIdx(n); setAnchorKeyIdx(n); setRevealed(false);
  };
  const randomKey = () => {
    let n;
    do { n = Math.floor(Math.random() * 12); } while (n === keyIdx);
    setKeyIdx(n); setAnchorKeyIdx(n); setRevealed(false);
  };
  const selectKey = (i: number) => {
    setKeyIdx(i); setAnchorKeyIdx(i); setRevealed(false);
  };
  const goStep = (i: number) => {
    setStep(i); setShapeIdx(0); setPairIdx(0); setRevealed(false); setAnchorKeyIdx(keyIdx);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowRight") { e.preventDefault(); nextKey(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prevKey(); }
      else if (e.key === "m" || e.key === "M") { e.preventDefault(); met.toggle(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyIdx, met.toggle]);

  const S = STEPS[step];

  const sectionLabel = "text-[0.5rem] tracking-[0.18em] uppercase";

  return (
    <div style={theme} className="bg-[var(--bg)] text-[var(--text)] min-h-screen">
      <Nav isDark={isDark} toggleDark={toggleDark} />

      <div className="max-w-[1100px] mx-auto px-4 pt-8 pb-20 [@media(max-height:500px)]:pt-3">
        {/* ── Header: eyebrow + step tabs / select ── */}
        <div className="mb-5">
          <div className="text-[0.58rem] tracking-[0.22em] uppercase mb-3" style={{ color: "var(--accent)" }}>
            Pentatonic Practice
          </div>

          {/* Desktop step tabs */}
          <nav
            className="hidden min-[760px]:flex gap-1 flex-wrap"
            style={{ borderBottom: "1px solid var(--border)" }}
            aria-label="Practice step"
          >
            {STEPS.map((s, i) => {
              const active = i === step;
              return (
                <button
                  key={i}
                  onClick={() => goStep(i)}
                  className="flex items-center gap-2 px-[10px] py-2 text-[0.8rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  style={{
                    color: active ? "var(--text)" : "var(--muted)",
                    borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
                  }}
                >
                  <span
                    className="font-mono text-[0.7rem] inline-flex items-center justify-center rounded-full"
                    style={{
                      width: 18, height: 18,
                      border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                      color: active ? "var(--accent)" : "var(--muted)",
                    }}
                  >
                    {i + 1}
                  </span>
                  {s.title}
                </button>
              );
            })}
          </nav>

          {/* Mobile step select */}
          <label
            className="flex min-[760px]:hidden items-center gap-3 px-4 py-3 relative"
            style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
          >
            <span
              className="font-mono text-[0.72rem] font-bold rounded-full flex items-center justify-center shrink-0"
              style={{ width: 22, height: 22, border: "1px solid var(--accent)", color: "var(--accent)" }}
            >
              {step + 1}
            </span>
            <select
              value={step}
              onChange={(e) => goStep(+e.target.value)}
              aria-label="Practice step"
              className="flex-1 bg-transparent border-none font-display text-[0.95rem] font-semibold uppercase tracking-[0.04em] appearance-none pr-5 focus-visible:outline-none"
              style={{ color: "var(--text)" }}
            >
              {STEPS.map((s, i) => (
                <option key={i} value={i} style={{ background: "var(--surface)", color: "var(--text)" }}>
                  {i + 1}. {s.title}
                </option>
              ))}
            </select>
            <span className="absolute right-4 pointer-events-none" style={{ color: "var(--muted)" }}>▾</span>
          </label>
        </div>

        {/* ── Main grid: work + side ── */}
        <div className="flex gap-4 items-start max-[860px]:flex-col">
          {/* Work panel */}
          <section
            className="flex-1 min-w-0 p-5 max-[700px]:p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderTop: "3px solid var(--accent)" }}
          >
            <div className="flex items-baseline gap-3 flex-wrap">
              <h1 className="font-display font-semibold uppercase tracking-[0.04em] leading-none m-0" style={{ fontSize: "clamp(1.5rem,4vw,1.9rem)" }}>
                {S.title}
              </h1>
              <span className="font-mono text-[0.7rem] tracking-[0.04em]" style={{ color: "var(--accent)" }}>
                Goal · {S.goal}
              </span>
            </div>
            <p className="text-[0.85rem] leading-[1.55] mt-2 mb-4 max-w-[60ch]" style={{ color: "var(--muted)" }}>
              {S.desc}
            </p>

            {/* View toggles */}
            <div className="flex gap-2 mb-4">
              <CtrlButton label="Hints" active={showHints} onClick={() => setShowHints((v) => !v)} small normalCase />
              <CtrlButton label="Diagram" active={showDiagram} onClick={() => setShowDiagram((v) => !v)} small normalCase />
            </div>

            {/* Status */}
            <div
              className="flex gap-x-8 gap-y-3 flex-wrap p-4"
              style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
            >
              {anchored ? (
                <>
                  {showHints && (
                    <Stat label="Anchor — low E fret">
                      <span className="font-display font-bold" style={{ fontSize: "1.5rem" }}>
                        {anchorFret}
                        <small className="text-[0.8rem] font-normal ml-1" style={{ color: "var(--muted)" }}>
                          ({NOTE_NAMES[anchorRootPc]})
                        </small>
                      </span>
                    </Stat>
                  )}
                  <Stat label="Shape">
                    <span className="font-display font-bold" style={{ fontSize: "1.5rem" }}>{shapeIdx + 1}</span>
                  </Stat>
                  {step === 2 && (
                    <Stat label="Key">
                      {revealed && impliedKey ? (
                        <span className="font-display font-bold" style={{ fontSize: "1.5rem", color: "var(--accent)" }}>
                          {impliedKey.min}
                          <small className="text-[0.8rem] font-normal ml-1" style={{ color: "var(--muted)" }}>
                            / {impliedKey.maj}
                          </small>
                        </span>
                      ) : (
                        <CtrlButton label="Reveal" active={false} onClick={() => setRevealed(true)} small />
                      )}
                    </Stat>
                  )}
                </>
              ) : step === 1 ? (
                <>
                  <Stat label="Key">
                    <span className="font-display font-bold" style={{ fontSize: "1.5rem", color: "var(--accent)" }}>{keyLabel}</span>
                  </Stat>
                  <Stat label="Shape">
                    <span className="font-display font-bold" style={{ fontSize: "1.5rem" }}>{shapeIdx + 1}</span>
                  </Stat>
                  {showHints && (
                    <Stat label="Low-E start fret">
                      <span className="font-display font-bold" style={{ fontSize: "1.5rem" }}>{startFretInKey}</span>
                    </Stat>
                  )}
                </>
              ) : step === 3 ? (
                <>
                  <Stat label="Key">
                    <span className="font-display font-bold" style={{ fontSize: "1.5rem", color: "var(--accent)" }}>{keyLabel}</span>
                  </Stat>
                  <Stat label="Lowest full shape">
                    {revealed ? (
                      <span className="font-display font-bold" style={{ fontSize: "1.5rem" }}>
                        Shape {lowest.shape + 1}
                        <small className="text-[0.8rem] font-normal ml-1" style={{ color: "var(--muted)" }}>
                          · starts fret {lowest.start}{lowest.low === 0 ? " (uses open strings)" : ""}
                        </small>
                      </span>
                    ) : (
                      <CtrlButton label="Reveal" active={false} onClick={() => setRevealed(true)} small />
                    )}
                  </Stat>
                </>
              ) : step === 4 ? (
                <>
                  <Stat label="Key">
                    <span className="font-display font-bold" style={{ fontSize: "1.5rem", color: "var(--accent)" }}>{keyLabel}</span>
                  </Stat>
                  <Stat label="String pair">
                    <span className="font-display font-bold" style={{ fontSize: "1.5rem" }}>{STRING_SETS[pairIdx].label}</span>
                  </Stat>
                </>
              ) : (
                <>
                  <Stat label="Key">
                    <span className="font-display font-bold" style={{ fontSize: "1.5rem", color: "var(--accent)" }}>{keyLabel}</span>
                  </Stat>
                  <Stat label="Suggested shape to dwell in">
                    <span className="font-display font-bold" style={{ fontSize: "1.5rem" }}>{shapeIdx + 1}</span>
                  </Stat>
                </>
              )}
            </div>

            {/* Controls */}
            <div className="flex gap-2 flex-wrap mt-4">
              {step !== 4 ? (
                <div className="flex gap-2">
                  <CtrlButton label="← Prev shape" active={false} onClick={prevShape} small normalCase />
                  <CtrlButton label="Next shape →" active={false} onClick={nextShape} small normalCase />
                </div>
              ) : (
                <div className="flex gap-2">
                  <CtrlButton label="← Prev pair" active={false} onClick={() => setPairIdx((p) => (p + 4) % 5)} small normalCase />
                  <CtrlButton label="Next pair →" active={false} onClick={() => setPairIdx((p) => (p + 1) % 5)} small normalCase />
                </div>
              )}
              <div className="flex gap-2">
                <CtrlButton label="← Prev key" active={false} onClick={prevKey} small normalCase />
                <CtrlButton label="Next key →" active={false} onClick={nextKey} small normalCase />
              </div>
              <CtrlButton label="Random key" active={false} onClick={randomKey} small normalCase />
              {step === 5 && (
                <CtrlButton label="Random shape" active={false} onClick={() => setShapeIdx(Math.floor(Math.random() * 5))} small normalCase />
              )}
            </div>

            {/* Diagram */}
            {showDiagram && (
              step === 4 ? (
                <div className="mt-4">
                  <StringPairDiagram strings={STRING_SETS[pairIdx].strings} minorRootPc={minorRootPc} mode={mode} />
                  <Legend>
                    <LegendDot fill="var(--root-col)" /> root ({NOTE_NAMES[rootPc]})
                    <LegendDot fill="var(--text)" className="ml-2" /> scale tone
                  </Legend>
                </div>
              ) : (
                <div className="mt-4">
                  <ShapeDiagram shapeIdx={shapeIdx} minorRootPc={diagramMinorPc} mode={mode} startFret={diagramStartFret} />
                  <Legend>
                    <LegendDot fill="var(--root-col)" /> {mode} root
                    <LegendDot ring className="ml-2" /> relative {mode === "minor" ? "major" : "minor"} root
                    <LegendDot fill="var(--text)" className="ml-2" /> scale tone
                  </Legend>
                </div>
              )
            )}

            {/* Prompts */}
            {showHints && (
              <ul className="mt-4 pl-5 list-disc text-[0.85rem] leading-[1.6] max-w-[62ch]" style={{ color: "var(--muted)" }}>
                {S.prompts.map((p, i) => (
                  <li key={i} className="mb-1">{p}</li>
                ))}
              </ul>
            )}
          </section>

          {/* Side panel */}
          <aside
            className="w-[300px] max-[860px]:w-full shrink-0 p-4 flex flex-col items-center gap-3"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex gap-2 w-full">
              {(["minor", "major"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="flex-1 font-display text-[0.72rem] tracking-[0.06em] uppercase border py-2 max-[700px]:py-[0.6rem] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  style={{
                    background: mode === m ? "var(--accent)" : "transparent",
                    borderColor: mode === m ? "var(--accent)" : "var(--border)",
                    color: mode === m ? "#fff" : "var(--muted)",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
            <CircleSelector keyIdx={keyIdx} mode={mode} onSelect={selectKey} />
            <p className="text-[0.62rem] text-center m-0" style={{ color: "var(--faint)" }}>
              Tap a wedge to set the key{anchored ? " (also resets the anchor)" : ""}.
            </p>
          </aside>
        </div>

        {/* ── Tools: metronome + timer ── */}
        <div
          className="grid grid-cols-2 max-[760px]:grid-cols-1 gap-x-6 gap-y-5 mt-4 p-5 max-[700px]:p-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <MetronomePanel met={met} />
          <Timer />
        </div>

        {/* Footer hint */}
        <div className="mt-3 text-[0.6rem]" style={{ color: "var(--muted)" }}>
          ← → keys · m = metronome
        </div>
      </div>
    </div>
  );
}

// ─── Small presentational helpers ────────────────────────────────────────────

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[0.55rem] tracking-[0.14em] uppercase mb-1" style={{ color: "var(--faint)" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function Legend({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-[6px] flex-wrap mt-2 text-[0.72rem]" style={{ color: "var(--muted)" }}>
      {children}
    </div>
  );
}

function LegendDot({ fill, ring, className }: { fill?: string; ring?: boolean; className?: string }) {
  return (
    <span
      className={"inline-block rounded-full " + (className ?? "")}
      style={{
        width: 11, height: 11,
        background: ring ? "transparent" : fill,
        border: ring ? "2px solid var(--root-col)" : "none",
      }}
    />
  );
}
