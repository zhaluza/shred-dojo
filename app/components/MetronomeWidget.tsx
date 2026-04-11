import { useState, useEffect, useRef, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_BPM = 40;
const MAX_BPM = 240;
const BEATS = 4;
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.1;

// ─── Audio ────────────────────────────────────────────────────────────────────

function scheduleClick(
  beat: number,
  time: number,
  ctx: AudioContext,
  onBeat: (b: number) => void
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  // Downbeat: higher pitch, louder
  osc.type = "triangle";
  osc.frequency.value = beat === 0 ? 1100 : 750;

  const vol = beat === 0 ? 0.45 : 0.25;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(vol, time + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.055);
  osc.start(time);
  osc.stop(time + 0.06);

  // Schedule visual update to match audio timing
  const msFromNow = Math.max(0, (time - ctx.currentTime) * 1000);
  setTimeout(() => onBeat(beat), msFromNow);
}

// ─── Theme ────────────────────────────────────────────────────────────────────

function getColors(isDark: boolean) {
  return {
    bg:     isDark ? "#1e1a16" : "#ede8dc",
    border: isDark ? "#352e24" : "#c8bfaa",
    text:   isDark ? "#e8e0d0" : "#1a1612",
    muted:  isDark ? "#6a6058" : "#8a8070",
    accent: isDark ? "#c8604a" : "#8b1a1a",
    faint:  isDark ? "#3a3228" : "#d8cebb",
  };
}

// ─── MetronomeWidget ──────────────────────────────────────────────────────────

export function MetronomeWidget() {
  const [mounted, setMounted] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [pulse, setPulse] = useState(false);

  // Refs — stable across renders, used by scheduler
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0);
  const beatIndexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bpmRef = useRef(bpm);
  const isPlayingRef = useRef(false);
  const tapTimesRef = useRef<number[]>([]);
  const dragStartRef = useRef<{ y: number; bpm: number } | null>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);

  // Dark mode — poll localStorage every 500ms (pages each manage their own state,
  // no shared context, so polling is the least-invasive sync strategy)
  useEffect(() => {
    if (!mounted) return;
    const sync = () => setIsDark(localStorage.getItem("shred-dojo-dark") === "true");
    sync();
    const id = setInterval(sync, 500);
    return () => clearInterval(id);
  }, [mounted]);

  // Visual beat callback — stable, no re-render deps
  const onBeat = useCallback((beat: number) => {
    setCurrentBeat(beat);
    setPulse(true);
    setTimeout(() => setPulse(false), 80);
  }, []);

  // Look-ahead scheduler — self-scheduling via setTimeout
  const runScheduler = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const spb = 60.0 / bpmRef.current;
    while (nextNoteTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD_S) {
      scheduleClick(beatIndexRef.current, nextNoteTimeRef.current, ctx, onBeat);
      beatIndexRef.current = (beatIndexRef.current + 1) % BEATS;
      nextNoteTimeRef.current += spb;
    }
    timerRef.current = setTimeout(runScheduler, LOOKAHEAD_MS);
  }, [onBeat]);

  const start = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();

    beatIndexRef.current = 0;
    nextNoteTimeRef.current = ctx.currentTime + 0.05;
    isPlayingRef.current = true;
    setIsPlaying(true);
    runScheduler();
  }, [runScheduler]);

  const stop = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentBeat(-1);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) stop(); else start();
  }, [start, stop]);

  // Tap tempo — average of last 4 tap intervals
  const handleTap = useCallback(() => {
    const now = performance.now();
    const taps = [...tapTimesRef.current, now].slice(-4);
    tapTimesRef.current = taps;
    if (taps.length >= 2) {
      let total = 0;
      for (let i = 1; i < taps.length; i++) total += taps[i] - taps[i - 1];
      const avg = total / (taps.length - 1);
      setBpm(Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(60000 / avg))));
    }
  }, []);

  // BPM drag — vertical mouse drag on the BPM number
  const handleBpmMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragStartRef.current = { y: e.clientY, bpm };
      const move = (ev: MouseEvent) => {
        if (!dragStartRef.current) return;
        const delta = dragStartRef.current.y - ev.clientY;
        setBpm(Math.min(MAX_BPM, Math.max(MIN_BPM,
          Math.round(dragStartRef.current.bpm + delta * 0.6)
        )));
      };
      const up = () => {
        dragStartRef.current = null;
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    },
    [bpm]
  );

  // BPM scroll wheel — scroll over number to nudge
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1 : -1;
    setBpm((b) => Math.min(MAX_BPM, Math.max(MIN_BPM, b + delta)));
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    audioCtxRef.current?.close();
  }, []);

  if (!mounted) return null;

  const C = getColors(isDark);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 45,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 6,
      }}
    >
      {/* ── Expanded panel ──────────────────────────────────────────────── */}
      {isExpanded && (
        <div
          style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderTop: `3px solid ${C.accent}`,
            width: 216,
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "9px 12px 8px",
            borderBottom: `1px solid ${C.faint}`,
          }}>
            <span style={{
              fontFamily: "'Oswald', sans-serif",
              fontSize: "0.57rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: C.muted,
            }}>
              Metronome
            </span>
            <button
              onClick={() => setIsExpanded(false)}
              aria-label="Close metronome"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: C.muted,
                padding: "0 0 0 10px",
                fontSize: "0.6rem",
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          {/* Beat segments */}
          <div style={{
            display: "flex",
            gap: 4,
            padding: "14px 12px 10px",
            alignItems: "flex-end",
          }}>
            {Array.from({ length: BEATS }, (_, i) => {
              const active = currentBeat === i;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: i === 0 ? 8 : 5,
                    backgroundColor: active ? C.accent : C.faint,
                    transition: active
                      ? "background-color 15ms, transform 15ms"
                      : "background-color 200ms, transform 200ms",
                    transform: active ? "scaleY(1.25)" : "scaleY(1)",
                    transformOrigin: "bottom",
                  }}
                />
              );
            })}
          </div>

          {/* BPM display */}
          <div style={{ textAlign: "center", padding: "4px 12px 2px" }}>
            <div
              onMouseDown={handleBpmMouseDown}
              onWheel={handleWheel}
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontSize: "3.6rem",
                fontWeight: 600,
                lineHeight: 1,
                color: C.text,
                cursor: "ns-resize",
                userSelect: "none",
                letterSpacing: "-0.02em",
                display: "inline-block",
                transition: "transform 50ms",
                transform: pulse && isPlaying ? "scale(1.05)" : "scale(1)",
              }}
            >
              {bpm}
            </div>
            <div style={{
              fontFamily: "'Source Code Pro', monospace",
              fontSize: "0.44rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: C.muted,
              marginTop: 3,
              marginBottom: 10,
            }}>
              bpm · drag or scroll
            </div>
          </div>

          {/* Fine adjustment */}
          <div style={{ display: "flex", gap: 4, padding: "0 12px 10px" }}>
            {([-5, -1, 1, 5] as const).map((d) => (
              <button
                key={d}
                onClick={() => setBpm((b) => Math.min(MAX_BPM, Math.max(MIN_BPM, b + d)))}
                style={{
                  flex: 1,
                  fontFamily: "'Oswald', sans-serif",
                  fontSize: "0.58rem",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  padding: "4px 0",
                  background: "transparent",
                  border: `1px solid ${C.border}`,
                  color: C.text,
                  cursor: "pointer",
                }}
              >
                {d > 0 ? `+${d}` : d}
              </button>
            ))}
          </div>

          {/* Tap + Start/Stop */}
          <div style={{ display: "flex", gap: 6, padding: "0 12px 12px" }}>
            <button
              onClick={handleTap}
              style={{
                flex: 1,
                fontFamily: "'Oswald', sans-serif",
                fontSize: "0.72rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "7px 0",
                background: "transparent",
                border: `1px solid ${C.border}`,
                color: C.text,
                cursor: "pointer",
              }}
            >
              Tap
            </button>
            <button
              onClick={togglePlay}
              style={{
                flex: 1,
                fontFamily: "'Oswald', sans-serif",
                fontSize: "0.72rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "7px 0",
                background: isPlaying ? C.text : "transparent",
                border: `1px solid ${isPlaying ? C.text : C.border}`,
                color: isPlaying ? C.bg : C.text,
                cursor: "pointer",
                transition: "background 80ms, color 80ms, border-color 80ms",
              }}
            >
              {isPlaying ? "Stop" : "Start"}
            </button>
          </div>
        </div>
      )}

      {/* ── Trigger button ──────────────────────────────────────────────── */}
      <button
        onClick={() => setIsExpanded((x) => !x)}
        title="Metronome"
        style={{
          fontFamily: "'Oswald', sans-serif",
          fontSize: "0.68rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          padding: "7px 13px",
          display: "flex",
          alignItems: "center",
          gap: 7,
          background: isPlaying ? C.text : C.bg,
          border: `1px solid ${C.border}`,
          outline: isPlaying ? `2px solid ${C.accent}` : "none",
          outlineOffset: 2,
          color: isPlaying ? C.bg : C.muted,
          cursor: "pointer",
          transition: "background 100ms, color 100ms, outline 100ms",
        }}
      >
        <span style={{ fontSize: "0.9rem", lineHeight: 1 }}>♩</span>
        <span style={{ minWidth: "2.6ch", textAlign: "right" }}>{bpm}</span>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: isPlaying
              ? (pulse ? C.bg : `${C.bg}99`)
              : C.faint,
            display: "inline-block",
            transition: pulse ? "background-color 20ms" : "background-color 160ms",
            flexShrink: 0,
          }}
        />
      </button>
    </div>
  );
}
