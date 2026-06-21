import { useState, useEffect, useRef, useCallback } from "react";
import { CtrlButton } from "./CtrlButton";

// ─── Shared countdown Timer ────────────────────────────────────────────────────
// Single source of truth for the Practice Station and Pentatonic Practice timers.
// Stacked layout: MM:SS readout + progress bar, preset row + custom length,
// Start/Pause + "+5 min" + reset. Persists its target under `storageKey`.

const TIMER_PRESETS = [1, 2, 3, 5, 10];
const TIMER_MAX_MIN = 180;

function readSec(key: string, fallback: number, min: number, max: number) {
  if (typeof window === "undefined") return fallback;
  const v = parseInt(localStorage.getItem(key) ?? "", 10);
  return v >= min && v <= max ? v : fallback;
}

/** Format a duration in seconds as `MM:SS`. */
export function fmtClock(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function Timer({
  storageKey,
  presets = TIMER_PRESETS,
  maxMin = TIMER_MAX_MIN,
  onSecond,
}: {
  storageKey: string;
  presets?: number[];
  maxMin?: number;
  /** Called once per counted-down second while running (for time attribution). */
  onSecond?: () => void;
}) {
  const maxSec = maxMin * 60;
  const [target, setTarget] = useState<number>(() => readSec(storageKey, 180, 10, maxSec));
  const [remaining, setRemaining] = useState<number>(() => readSec(storageKey, 180, 10, maxSec));
  const [running, setRunning] = useState(false);
  const [customMin, setCustomMin] = useState("");
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  // Keep the latest onSecond in a ref so the interval below stays stable while
  // always invoking the current callback (which closes over the active section).
  const onSecondRef = useRef(onSecond);
  onSecondRef.current = onSecond;

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
          onSecondRef.current?.();
          chime();
          return 0;
        }
        onSecondRef.current?.();
        return r - 1;
      });
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [running, chime]);

  useEffect(() => () => { ctxRef.current?.close(); }, []);

  const persistTarget = (s: number) => {
    try { localStorage.setItem(storageKey, String(s)); } catch {}
  };

  const setPreset = (mins: number) => {
    const s = mins * 60;
    setTarget(s);
    setRemaining(s);
    setRunning(false);
    setCustomMin("");
    persistTarget(s);
  };
  const applyCustom = (raw: string) => {
    setCustomMin(raw);
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n >= 1 && n <= maxMin) {
      const s = n * 60;
      setTarget(s);
      setRemaining(s);
      setRunning(false);
      persistTarget(s);
    }
  };
  // Tack on 5 minutes — extends the running/paused session, or resumes a finished one.
  const addFive = () => {
    const wasDone = remaining === 0;
    setTarget((t) => { const nt = t + 300; persistTarget(nt); return nt; });
    setRemaining((r) => r + 300);
    if (wasDone) setRunning(true);
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
  const isPresetActive = presets.some((m) => target === m * 60);

  return (
    <div>
      <div className="text-[0.5rem] tracking-[0.18em] uppercase mb-3" style={{ color: "var(--muted)" }}>
        Timer
      </div>

      {/* Time readout + progress */}
      <div className="flex flex-col gap-2 mb-4">
        <div
          className="font-mono font-semibold text-center tabular-nums"
          style={{ fontSize: "2rem", letterSpacing: "0.04em", color: done ? "var(--accent)" : "var(--text)", lineHeight: 1 }}
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

      {/* Presets + custom length */}
      <div className="flex items-center gap-1 flex-wrap mb-3">
        {presets.map((m) => {
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
        <label className="flex items-center gap-1 ml-1">
          <input
            type="number"
            min={1}
            max={maxMin}
            value={customMin}
            onChange={(e) => applyCustom(e.target.value)}
            placeholder="—"
            aria-label="Custom length in minutes"
            className="font-mono text-[0.7rem] border px-2 py-[0.3rem] max-[700px]:py-[0.45rem] w-[3.6rem] text-center bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            style={{
              borderColor: !isPresetActive ? "var(--text)" : "var(--border)",
              color: "var(--text)",
            }}
          />
          <span className="font-mono text-[0.6rem]" style={{ color: "var(--muted)" }}>min</span>
        </label>
      </div>

      {/* Controls */}
      <div className="flex gap-2 flex-wrap">
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
        <CtrlButton label="+5 min" active={false} onClick={addFive} normalCase />
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
  );
}
