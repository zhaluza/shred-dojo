import { useState, useEffect, useRef, useCallback } from "react";
import { CtrlButton } from "./CtrlButton";

// ─── Shared countdown Timer ────────────────────────────────────────────────────
// Single source of truth for the Practice Station and Pentatonic Practice timers.
// Stacked layout: MM:SS readout + progress bar, preset row + custom length,
// Start/Pause + "+5 min" + reset. Persists its target under `storageKey`.

const TIMER_PRESETS = [1, 2, 3, 5, 10];
const TIMER_MAX_MIN = 180;
// Don't log practice runs shorter than this (accidental start/stop blips).
const MIN_LOG_SEC = 5;

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
  onLogSession,
  onDiscardSession,
  defaultLabel = "",
}: {
  storageKey: string;
  presets?: number[];
  maxMin?: number;
  /** Called once per counted-down second while running (for live attribution). */
  onSecond?: () => void;
  /** Save an elapsed sitting to the practice log with the user's (optional) label. */
  onLogSession?: (elapsedSec: number, label: string) => void;
  /** The user dismissed the review bar without saving. */
  onDiscardSession?: () => void;
  /** Prefill for the review bar's label field (e.g. the active section). */
  defaultLabel?: string;
}) {
  const maxSec = maxMin * 60;
  const [target, setTarget] = useState<number>(() => readSec(storageKey, 180, 10, maxSec));
  const [remaining, setRemaining] = useState<number>(() => readSec(storageKey, 180, 10, maxSec));
  const [running, setRunning] = useState(false);
  const [customMin, setCustomMin] = useState("");
  // A finished sitting awaiting the user's save/discard decision.
  const [pending, setPending] = useState<{ sec: number } | null>(null);
  const [label, setLabel] = useState("");
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  // Wall-clock state so the countdown stays accurate when the tab is backgrounded
  // (browsers throttle/pause setInterval in inactive tabs). `deadlineRef` is the
  // ms timestamp the countdown hits 0; elapsed is accrued from real time, not tick
  // count, with `lastAccountRef` marking the last accounted instant and `fracRef`
  // carrying the sub-second remainder.
  const deadlineRef = useRef(0);
  const lastAccountRef = useRef(0);
  const fracRef = useRef(0);

  // Keep the latest onSecond / defaultLabel in refs so the interval and finishRun
  // stay stable while always reading the current values.
  const onSecondRef = useRef(onSecond);
  onSecondRef.current = onSecond;
  const defaultLabelRef = useRef(defaultLabel);
  defaultLabelRef.current = defaultLabel;

  // Seconds elapsed in the current contiguous sitting (accrues across pauses);
  // flushed by finishRun() on reset / completion / length change.
  const runElapsedRef = useRef(0);
  const finishRun = useCallback(() => {
    const sec = runElapsedRef.current;
    runElapsedRef.current = 0;
    fracRef.current = 0;
    if (sec >= MIN_LOG_SEC) {
      setPending({ sec });
      setLabel(defaultLabelRef.current);
    }
  }, []);

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
    // Begin a run segment from the current `remaining` (captured when running
    // flipped true; `remaining` is intentionally not a dep so seconds ticking by
    // don't restart the segment — addFive bumps deadlineRef directly instead).
    const start = Date.now();
    deadlineRef.current = start + remaining * 1000;
    lastAccountRef.current = start;
    let finished = false; // per-segment guard so completion fires once

    const tick = () => {
      if (finished) return;
      const now = Date.now();
      // Accrue real elapsed time (capped at the deadline) and pulse onSecond once
      // per whole second — so a backgrounded gap is credited correctly on return.
      const effNow = Math.min(now, deadlineRef.current);
      const delta = Math.max(0, effNow - lastAccountRef.current);
      lastAccountRef.current = effNow;
      fracRef.current += delta / 1000;
      while (fracRef.current >= 1) {
        fracRef.current -= 1;
        runElapsedRef.current += 1;
        onSecondRef.current?.();
      }
      const rem = Math.max(0, Math.ceil((deadlineRef.current - now) / 1000));
      setRemaining(rem);
      if (now >= deadlineRef.current) {
        finished = true;
        if (tickRef.current) clearInterval(tickRef.current);
        setRunning(false);
        finishRun();
        chime();
      }
    };

    tickRef.current = setInterval(tick, 250);
    // Resync immediately when returning to the tab (don't wait for the throttled tick).
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, chime, finishRun]);

  useEffect(() => () => { ctxRef.current?.close(); }, []);

  const persistTarget = (s: number) => {
    try { localStorage.setItem(storageKey, String(s)); } catch {}
  };

  const setPreset = (mins: number) => {
    const s = mins * 60;
    finishRun(); // changing length ends the current sitting
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
      finishRun();
      setTarget(s);
      setRemaining(s);
      setRunning(false);
      persistTarget(s);
    }
  };
  // Tack on 5 minutes — extends the running/paused session, or resumes a finished one.
  // Clear any typed custom value so it can't go stale against the new total (the
  // total reads off the "/ MM:SS" display instead).
  const addFive = () => {
    const wasDone = remaining === 0;
    setTarget((t) => { const nt = t + 300; persistTarget(nt); return nt; });
    setRemaining((r) => r + 300);
    deadlineRef.current += 300 * 1000; // extend the live deadline if a run is active
    setCustomMin("");
    if (wasDone) setRunning(true);
  };
  const toggle = () => {
    if (remaining === 0) {
      setRemaining(target);
      setRunning(true);
      return;
    }
    setRunning((v) => !v); // pause just suspends — the sitting keeps accruing
  };
  const reset = () => {
    finishRun();
    setRunning(false);
    setRemaining(target);
  };

  const saveSession = () => {
    if (pending) onLogSession?.(pending.sec, label.trim());
    setPending(null);
  };
  const discardSession = () => {
    onDiscardSession?.();
    setPending(null);
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
        <div className="flex items-baseline justify-center gap-2">
          <span
            className="font-mono font-semibold tabular-nums"
            style={{ fontSize: "2rem", letterSpacing: "0.04em", color: done ? "var(--accent)" : "var(--text)", lineHeight: 1 }}
          >
            {mm}:{ss}
          </span>
          <span
            className="font-mono tabular-nums text-[0.8rem]"
            style={{ color: "var(--muted)" }}
            title="Total session length"
          >
            / {fmtClock(target)}
          </span>
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
              borderColor: customMin !== "" && !isPresetActive ? "var(--text)" : "var(--border)",
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

      {/* Review bar — opt-in save of a finished sitting */}
      {pending && (
        <div
          className="mt-3 p-3 flex flex-col gap-2"
          style={{ background: "var(--bg)", border: "1px solid var(--accent)" }}
        >
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[0.6rem] tracking-[0.14em] uppercase" style={{ color: "var(--muted)" }}>
              Practiced
            </span>
            <span className="font-mono font-semibold tabular-nums text-[0.95rem]" style={{ color: "var(--text)" }}>
              {fmtClock(pending.sec)}
            </span>
          </div>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveSession(); }}
            placeholder="Label (optional)"
            aria-label="Session label"
            className="font-mono text-[0.75rem] border px-2 py-[0.4rem] bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          />
          <div className="flex gap-2">
            <CtrlButton label="Save" active onClick={saveSession} small normalCase />
            <CtrlButton label="Discard" active={false} onClick={discardSession} small normalCase />
          </div>
        </div>
      )}
    </div>
  );
}
