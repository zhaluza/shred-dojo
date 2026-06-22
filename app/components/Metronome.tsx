import { useState, useEffect, useRef, useCallback } from "react";
import { CtrlButton } from "./CtrlButton";
import { PageShell } from "./PageShell";
import { PageHeader } from "./PageHeader";
import { Timer } from "./Timer";
import { addSession } from "./practiceLog.utils";
import { useDrone, DronePanel } from "./Drone";
import { CircleKeySelector } from "./CircleKeySelector";
import { KEYS, NOTE_NAMES, mod12 } from "./pentatonicPractice.utils";

// ─── Metronome hook ──────────────────────────────────────────────────────────
// Same look-ahead Web Audio scheduler as MorningCoffee / PentatonicPractice,
// with its own `met-*` persistence keys plus tap-tempo (from MetronomeWidget).

const BEATS = 4;
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.1;
const MET_MIN_BPM = 30;
const MET_MAX_BPM = 220;
const DEFAULT_BPM = 100;
const DEFAULT_VOLUME = 0.85; // 0–1 master level; louder than the old fixed gains
// Peak gain per click tier at full volume (square wave). Pushed high so the
// short click reads loud against an amp; the master volume scales these down.
const TIER_GAIN = { downbeat: 0.95, beat: 0.7, sub: 0.42 };

type Subdivision = 1 | 2 | 3;

function useMetronome() {
  const [bpm, setBpmState] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_BPM;
    const v = parseInt(localStorage.getItem("met-bpm") ?? "", 10);
    return v >= MET_MIN_BPM && v <= MET_MAX_BPM ? v : DEFAULT_BPM;
  });
  const [subdivision, setSubdivisionState] = useState<Subdivision>(() => {
    if (typeof window === "undefined") return 1;
    const v = parseInt(localStorage.getItem("met-sub") ?? "", 10);
    return (v === 1 || v === 2 || v === 3 ? v : 1) as Subdivision;
  });
  const [volume, setVolumeState] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_VOLUME;
    const v = parseFloat(localStorage.getItem("met-vol") ?? "");
    return v >= 0 && v <= 1 ? v : DEFAULT_VOLUME;
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSlot, setCurrentSlot] = useState(-1);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bpmRef = useRef(bpm);
  const subRef = useRef(subdivision);
  const volRef = useRef(volume);
  const nextNoteTimeRef = useRef(0);
  const beatCountRef = useRef(0);
  const isPlayingRef = useRef(false);
  const tapTimesRef = useRef<number[]>([]);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { subRef.current = subdivision; }, [subdivision]);
  useEffect(() => { volRef.current = volume; }, [volume]);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    try { localStorage.setItem("met-vol", String(clamped)); } catch {}
  }, []);

  const setBpm = useCallback((v: number) => {
    const clamped = Math.max(MET_MIN_BPM, Math.min(MET_MAX_BPM, Math.round(v)));
    setBpmState(clamped);
    try { localStorage.setItem("met-bpm", String(clamped)); } catch {}
  }, []);

  const setSubdivision = useCallback((v: Subdivision) => {
    setSubdivisionState(v);
    try { localStorage.setItem("met-sub", String(v)); } catch {}
  }, []);

  // Tap tempo — average of last 4 tap intervals (from MetronomeWidget).
  const handleTap = useCallback(() => {
    const now = performance.now();
    const taps = [...tapTimesRef.current, now].slice(-4);
    tapTimesRef.current = taps;
    if (taps.length >= 2) {
      let total = 0;
      for (let i = 1; i < taps.length; i++) total += taps[i] - taps[i - 1];
      const avg = total / (taps.length - 1);
      setBpm(Math.min(MET_MAX_BPM, Math.max(MET_MIN_BPM, Math.round(60000 / avg))));
    }
  }, [setBpm]);

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
    const tier = isDownbeat ? TIER_GAIN.downbeat : isBeat ? TIER_GAIN.beat : TIER_GAIN.sub;
    // Floor at a tiny epsilon: exponential ramps can't target 0, and this keeps
    // volume 0% effectively silent without breaking the envelope.
    const vol = Math.max(0.0001, tier * volRef.current);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
    osc.start(time);
    osc.stop(time + 0.07);

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

  return { bpm, setBpm, subdivision, setSubdivision, volume, setVolume, isPlaying, toggle, currentSlot, handleTap };
}

// prefers-reduced-motion as reactive state.
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
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

// ─── Beat dial (signature element) ───────────────────────────────────────────
// A ring of subdivision dots around a circle, downbeat at 12 o'clock, with the
// giant BPM at center that pulses on the downbeat.

function BeatDial({
  bpm,
  subdivision,
  currentSlot,
  isPlaying,
  reduced,
}: {
  bpm: number;
  subdivision: Subdivision;
  currentSlot: number;
  isPlaying: boolean;
  reduced: boolean;
}) {
  const totalSlots = BEATS * subdivision;
  const CX = 100;
  const CY = 100;
  const R = 80;
  const onDownbeat = isPlaying && currentSlot === 0;

  return (
    <div className="w-[min(48vw,190px)] aspect-square mx-auto select-none">
      <svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
        {/* downbeat glow ring */}
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1}
          style={{
            opacity: onDownbeat ? 0.5 : 0,
            transition: reduced ? "none" : onDownbeat ? "opacity 60ms ease-out" : "opacity 260ms ease-in",
          }}
        />

        {/* subdivision dots */}
        {Array.from({ length: totalSlots }, (_, i) => {
          const angle = (-90 + (360 / totalSlots) * i) * (Math.PI / 180);
          const x = CX + R * Math.cos(angle);
          const y = CY + R * Math.sin(angle);
          const isBeat = i % subdivision === 0;
          const isActive = isPlaying && i === currentSlot;
          const r = isActive ? 8 : isBeat ? 5 : 3.5;
          const fill = isActive
            ? "var(--accent)"
            : isBeat
              ? "var(--text)"
              : "var(--faint)";
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={r}
              fill={fill}
              style={{ transition: reduced ? "none" : "r 80ms ease-out, fill 120ms ease-out" }}
            />
          );
        })}

        {/* center BPM */}
        <g
          style={{
            transformOrigin: "100px 100px",
            transform: onDownbeat ? "scale(1.05)" : "scale(1)",
            transition: reduced ? "none" : onDownbeat ? "transform 60ms ease-out" : "transform 240ms ease-in",
          }}
        >
          <text
            x={CX}
            y={CY - 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="Oswald, sans-serif"
            fontWeight={600}
            fontSize="42"
            fill="var(--text)"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {bpm}
          </text>
          <text
            x={CX}
            y={CY + 26}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="Oswald, sans-serif"
            fontSize="9"
            letterSpacing="2"
            fill="var(--muted)"
          >
            BPM
          </text>
        </g>
      </svg>
    </div>
  );
}

// ─── Subdivision selector ────────────────────────────────────────────────────

function SubdivisionButtons({
  subdivision,
  setSubdivision,
}: {
  subdivision: Subdivision;
  setSubdivision: (v: Subdivision) => void;
}) {
  return (
    <div className="flex gap-1">
      {([
        { label: "♩", val: 1 as Subdivision, ariaLabel: "Quarter note" },
        { label: "♫", val: 2 as Subdivision, ariaLabel: "Eighth notes" },
        { label: null, val: 3 as Subdivision, ariaLabel: "Triplets" },
      ] as const).map(({ label, val, ariaLabel }) => (
        <button
          key={val}
          onClick={() => setSubdivision(val)}
          aria-label={ariaLabel}
          aria-pressed={subdivision === val}
          className="font-display text-[0.7rem] px-[0.6rem] py-[0.35rem] max-[700px]:min-h-[44px] border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
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
  );
}

// ─── Tempo trainer ───────────────────────────────────────────────────────────
// Auto-increase BPM by `amt` every `bars` measures while the metronome runs.

function readInt(key: string, fallback: number, min: number, max: number) {
  if (typeof window === "undefined") return fallback;
  const v = parseInt(localStorage.getItem(key) ?? "", 10);
  return v >= min && v <= max ? v : fallback;
}

function TempoTrainer({
  met,
}: {
  met: ReturnType<typeof useMetronome>;
}) {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("met-ramp-on") === "true";
  });
  const [amt, setAmt] = useState<number>(() => readInt("met-ramp-amt", 5, 1, 50));
  const [bars, setBars] = useState<number>(() => readInt("met-ramp-bars", 4, 1, 64));
  const [barsLeft, setBarsLeft] = useState(bars);

  const prevSlotRef = useRef(-1);
  const completedRef = useRef(0);
  // Latest config readable from the slot-watching effect without stale closures.
  const cfgRef = useRef({ enabled, bars, amt, bpm: met.bpm, playing: met.isPlaying });
  cfgRef.current = { enabled, bars, amt, bpm: met.bpm, playing: met.isPlaying };

  const setEnabledP = (v: boolean) => {
    setEnabled(v);
    try { localStorage.setItem("met-ramp-on", String(v)); } catch {}
  };
  const setAmtP = (v: number) => {
    const c = Math.max(1, Math.min(50, v));
    setAmt(c);
    try { localStorage.setItem("met-ramp-amt", String(c)); } catch {}
  };
  const setBarsP = (v: number) => {
    const c = Math.max(1, Math.min(64, v));
    setBars(c);
    try { localStorage.setItem("met-ramp-bars", String(c)); } catch {}
  };

  // Reset the bar counter whenever playback stops or the trainer is toggled.
  useEffect(() => {
    if (!met.isPlaying || !enabled) {
      completedRef.current = 0;
      setBarsLeft(bars);
    }
  }, [met.isPlaying, enabled, bars]);

  // Count completed bars on each downbeat and bump the tempo when due.
  useEffect(() => {
    const slot = met.currentSlot;
    const prev = prevSlotRef.current;
    prevSlotRef.current = slot;
    const { enabled, bars, amt, bpm, playing } = cfgRef.current;
    if (!enabled || !playing) return;
    // A wrap into slot 0 (prev was a later slot) marks a completed measure.
    if (slot === 0 && prev > 0) {
      completedRef.current += 1;
      if (completedRef.current >= bars) {
        completedRef.current = 0;
        met.setBpm(bpm + amt);
      }
      setBarsLeft(bars - completedRef.current);
    }
  }, [met.currentSlot]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-[0.5rem] tracking-[0.18em] uppercase" style={{ color: "var(--muted)" }}>
          Tempo Trainer
        </div>
        <CtrlButton
          label={enabled ? "On" : "Off"}
          active={enabled}
          onClick={() => setEnabledP(!enabled)}
          small
        />
      </div>

      {enabled && (
        <div className="flex items-center gap-4 flex-wrap">
          <Stepper
            label="+ bpm"
            value={amt}
            onChange={setAmtP}
            steps={[-1, 1]}
            suffix=""
          />
          <Stepper
            label="every"
            value={bars}
            onChange={setBarsP}
            steps={[-1, 1]}
            suffix=" bars"
          />
          <div className="text-[0.62rem] tabular-nums" style={{ color: "var(--faint)" }}>
            {met.isPlaying
              ? `next +${amt} in ${barsLeft} bar${barsLeft === 1 ? "" : "s"}`
              : "starts when running"}
          </div>
        </div>
      )}
    </div>
  );
}

// A small labelled −/value/+ stepper.
function Stepper({
  label,
  value,
  onChange,
  steps,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  steps: [number, number];
  suffix: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.5rem] tracking-[0.14em] uppercase" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      <div className="flex items-center gap-1">
        <CtrlButton label="−" active={false} onClick={() => onChange(value + steps[0])} small />
        <span
          className="font-mono text-[0.8rem] tabular-nums text-center min-w-[58px]"
          style={{ color: "var(--text)" }}
        >
          {value}{suffix}
        </span>
        <CtrlButton label="+" active={false} onClick={() => onChange(value + steps[1])} small />
      </div>
    </div>
  );
}

// ─── Key & drone ─────────────────────────────────────────────────────────────
// Pick a key on the circle of fifths; an optional tonic drone follows its root.
// Key/mode/volume persist under `met-drone-*`.

function KeyDrone() {
  const [keyIdx, setKeyIdx] = useState<number>(() => readInt("met-drone-key", 0, 0, 11));
  const [mode, setMode] = useState<"minor" | "major">(() => {
    if (typeof window === "undefined") return "minor";
    return localStorage.getItem("met-drone-mode") === "major" ? "major" : "minor";
  });

  const minorRootPc = mod12(KEYS[keyIdx].pc + 9);
  const rootPc = mode === "minor" ? minorRootPc : KEYS[keyIdx].pc;
  const drone = useDrone(rootPc, "met-drone-vol");

  const selectKey = (i: number) => {
    setKeyIdx(i);
    try { localStorage.setItem("met-drone-key", String(i)); } catch {}
  };
  const selectMode = (m: "minor" | "major") => {
    setMode(m);
    try { localStorage.setItem("met-drone-mode", m); } catch {}
  };

  return (
    <div className="grid grid-cols-[auto_1fr] max-[560px]:grid-cols-1 gap-6 max-[560px]:gap-4 items-center">
      <div className="flex flex-col items-center gap-3 w-[240px] max-[560px]:w-full max-[560px]:max-w-[280px] max-[560px]:mx-auto">
        <div className="flex gap-2 w-full">
          {(["minor", "major"] as const).map((m) => (
            <button
              key={m}
              onClick={() => selectMode(m)}
              aria-pressed={mode === m}
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
        <CircleKeySelector keyIdx={keyIdx} mode={mode} onSelect={selectKey} />
      </div>

      <div className="flex flex-col gap-3">
        <DronePanel drone={drone} rootNote={NOTE_NAMES[rootPc]} />
        <p className="text-[0.62rem] leading-[1.5] m-0" style={{ color: "var(--faint)" }}>
          Tap a wedge to set the key. The drone sustains that key's root so you can
          check intonation or jam against a tonal center.
        </p>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function Metronome() {
  const reduced = useReducedMotion();
  const met = useMetronome();
  const { bpm, setBpm, subdivision, setSubdivision, volume, setVolume, isPlaying, toggle, currentSlot, handleTap } = met;
  const volPct = Math.round(volume * 100);
  const feel = subdivision === 1 ? "Quarter" : subdivision === 2 ? "Eighth" : "Triplet";

  return (
    <PageShell maxWidth={960}>
      <PageHeader
        eyebrow="Practice Station"
        title="Metronome"
        meta={[
          { label: "Tempo", value: `${bpm} BPM` },
          { label: "Feel", value: feel },
          { label: "Status", value: isPlaying ? "Running" : "Stopped" },
        ]}
      />

      <span className="sr-only" aria-live="polite">Tempo {bpm} BPM</span>

      <div className="grid grid-cols-[1.25fr_1fr] max-[820px]:grid-cols-1 gap-4 items-start">
        {/* ── Metronome (primary instrument — accent top-rule) ── */}
        <div
          className="p-5 max-[700px]:p-4 flex flex-col gap-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderTop: "2px solid var(--accent)" }}
        >
          <BeatDial
              bpm={bpm}
              subdivision={subdivision}
              currentSlot={currentSlot}
              isPlaying={isPlaying}
              reduced={reduced}
            />

            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                onClick={toggle}
                aria-label={isPlaying ? "Stop metronome" : "Start metronome"}
                className="font-display text-[0.82rem] tracking-[0.1em] uppercase border px-7 py-[0.5rem] max-[700px]:py-[0.6rem] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                style={{
                  background: isPlaying ? "var(--accent)" : "transparent",
                  borderColor: isPlaying ? "var(--accent)" : "var(--border)",
                  color: isPlaying ? "var(--bg)" : "var(--text)",
                }}
              >
                {isPlaying ? "Stop" : "Start"}
              </button>
              <CtrlButton label="Tap" active={false} onClick={handleTap} />
              <SubdivisionButtons subdivision={subdivision} setSubdivision={setSubdivision} />
            </div>

            {/* BPM slider + fine steppers */}
            <div className="flex items-center gap-2">
              <div className="flex gap-1 flex-shrink-0">
                <CtrlButton label="−5" active={false} onClick={() => setBpm(bpm - 5)} small />
                <CtrlButton label="−1" active={false} onClick={() => setBpm(bpm - 1)} small />
              </div>
              <input
                type="range"
                min={MET_MIN_BPM}
                max={MET_MAX_BPM}
                value={bpm}
                onChange={(e) => setBpm(parseInt(e.target.value, 10))}
                className="flex-1 min-w-0 accent-[var(--accent)]"
                aria-label="Tempo in BPM"
              />
              <div className="flex gap-1 flex-shrink-0">
                <CtrlButton label="+1" active={false} onClick={() => setBpm(bpm + 1)} small />
                <CtrlButton label="+5" active={false} onClick={() => setBpm(bpm + 5)} small />
              </div>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-3">
              <span
                className="text-[0.5rem] tracking-[0.14em] uppercase shrink-0"
                style={{ color: "var(--muted)" }}
              >
                Vol
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={volPct}
                onChange={(e) => setVolume(parseInt(e.target.value, 10) / 100)}
                className="flex-1 min-w-0 accent-[var(--accent)]"
                aria-label="Metronome volume"
              />
              <span
                className="font-mono text-[0.65rem] tabular-nums text-right shrink-0 w-[2.6rem]"
                style={{ color: "var(--muted)" }}
              >
                {volPct}%
              </span>
            </div>

            {/* divider */}
            <div style={{ height: 1, background: "var(--border)" }} />

            <TempoTrainer met={met} />
          </div>

          {/* ── Timer ── */}
          <div
            className="p-5 max-[700px]:p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <Timer
              storageKey="met-timer-sec"
              onLogSession={(sec, label) =>
                addSession({
                  startedAt: Date.now() - sec * 1000,
                  durationSec: sec,
                  source: "practice-station",
                  bpm: met.bpm,
                  label: label || undefined,
                })
              }
            />
          </div>
        </div>

        {/* ── Key & drone ── */}
        <div
          className="mt-4 p-5 max-[700px]:p-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="text-[0.58rem] tracking-[0.18em] uppercase mb-4" style={{ color: "var(--muted)" }}>
            Key &amp; Drone
          </div>
          <KeyDrone />
        </div>
    </PageShell>
  );
}
