import { useState, useEffect, useRef, useCallback } from "react";
import { useStoredDarkMode } from "./useStoredDarkMode";

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_BPM = 40;
const MAX_BPM = 240;
const BEATS = 4;
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.1;
const NOTE_NAMES = ["E", "F", "F#", "G", "Ab", "A", "Bb", "B", "C", "Db", "D", "Eb"] as const;
const E2_HZ = 82.41;

type SubDiv = 1 | 2 | 3 | 4 | 6;

// ─── Audio ────────────────────────────────────────────────────────────────────

function scheduleClick(
  type: "down" | "beat" | "sub",
  time: number,
  ctx: AudioContext,
  onTick?: () => void
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = "triangle";
  osc.frequency.value = type === "down" ? 1100 : type === "beat" ? 750 : 500;
  const vol = type === "down" ? 0.45 : type === "beat" ? 0.25 : 0.1;

  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(vol, time + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.055);
  osc.start(time);
  osc.stop(time + 0.06);

  if (onTick) {
    const msFromNow = Math.max(0, (time - ctx.currentTime) * 1000);
    setTimeout(onTick, msFromNow);
  }
}

// ─── Theme ────────────────────────────────────────────────────────────────────

// Mirrors theme.ts chrome tokens. Hardcoded because this widget renders at the
// App root, outside any page's themed div, so CSS variables don't resolve here.
function getColors(isDark: boolean) {
  return {
    bg:     isDark ? "#151320" : "#ffffff",
    border: isDark ? "#292437" : "#c9c9c4",
    text:   isDark ? "#ece8f6" : "#111114",
    muted:  isDark ? "#8a85a6" : "#565660",
    accent: isDark ? "#ff5d8f" : "#d80a28",
    faint:  isDark ? "#241f33" : "#dededa",
  };
}

// ─── Subdivision icons ────────────────────────────────────────────────────────

function IconQuarter() {
  return (
    <svg width="9" height="12" viewBox="0 0 9 14" fill="currentColor" aria-hidden="true" style={{ display: "block" }}>
      <ellipse cx="2.2" cy="12.5" rx="2.3" ry="1.6" transform="rotate(-12 2.2 12.5)" />
      <rect x="4.3" y="1" width="1.2" height="12" />
    </svg>
  );
}

function IconEighths() {
  return (
    <svg width="15" height="12" viewBox="0 0 16 14" fill="currentColor" aria-hidden="true" style={{ display: "block" }}>
      <ellipse cx="2.2" cy="12.5" rx="2.3" ry="1.6" transform="rotate(-12 2.2 12.5)" />
      <ellipse cx="11" cy="12.5" rx="2.3" ry="1.6" transform="rotate(-12 11 12.5)" />
      <rect x="4.3" y="3.5" width="1.2" height="9" />
      <rect x="13.1" y="3.5" width="1.2" height="9" />
      <rect x="4.3" y="3.5" width="10" height="1.6" />
    </svg>
  );
}

function IconSixteenths() {
  return (
    <svg width="15" height="12" viewBox="0 0 16 14" fill="currentColor" aria-hidden="true" style={{ display: "block" }}>
      <ellipse cx="2.2" cy="12.5" rx="2.3" ry="1.6" transform="rotate(-12 2.2 12.5)" />
      <ellipse cx="11" cy="12.5" rx="2.3" ry="1.6" transform="rotate(-12 11 12.5)" />
      <rect x="4.3" y="2" width="1.2" height="10.5" />
      <rect x="13.1" y="2" width="1.2" height="10.5" />
      <rect x="4.3" y="2" width="10" height="1.6" />
      <rect x="4.3" y="5.5" width="10" height="1.6" />
    </svg>
  );
}

function IconEighthTriplet() {
  return (
    <svg width="22" height="12" viewBox="0 0 22 14" fill="currentColor" aria-hidden="true" style={{ display: "block" }}>
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

function IconSixteenthTriplet() {
  return (
    <svg width="22" height="12" viewBox="0 0 22 14" fill="currentColor" aria-hidden="true" style={{ display: "block" }}>
      <text x="11" y="3" textAnchor="middle" fontSize="4.5" fontStyle="italic" fontFamily="sans-serif">3</text>
      <rect x="1.5" y="4" width="19" height="1.5" />
      <rect x="1.5" y="7.5" width="19" height="1.5" />
      <rect x="1.5" y="4" width="1.2" height="8.5" />
      <rect x="10.4" y="4" width="1.2" height="8.5" />
      <rect x="19.3" y="4" width="1.2" height="8.5" />
      <ellipse cx="2.1" cy="12.5" rx="2.3" ry="1.6" transform="rotate(-12 2.1 12.5)" />
      <ellipse cx="11" cy="12.5" rx="2.3" ry="1.6" transform="rotate(-12 11 12.5)" />
      <ellipse cx="19.9" cy="12.5" rx="2.3" ry="1.6" transform="rotate(-12 19.9 12.5)" />
    </svg>
  );
}

// ─── MetronomeWidget ──────────────────────────────────────────────────────────

export function MetronomeWidget() {
  const [mounted, setMounted] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [subdiv, setSubdiv] = useState<SubDiv>(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [isExpanded, setIsExpanded] = useState(false);
  const isDark = useStoredDarkMode();
  const [pulse, setPulse] = useState(false);
  const [editingBpm, setEditingBpm] = useState(false);
  const [bpmInputVal, setBpmInputVal] = useState("");
  const [droneKey, setDroneKey] = useState<number | null>(null);
  const [hoveredEl, setHoveredEl] = useState<string | null>(null);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  const [windowHeight, setWindowHeight] = useState(
    typeof window !== "undefined" ? window.innerHeight : 768
  );

  // Refs — stable across renders, used by scheduler
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0);
  const beatIndexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bpmRef = useRef(bpm);
  const subdivRef = useRef<SubDiv>(subdiv);
  const isPlayingRef = useRef(false);
  const tapTimesRef = useRef<number[]>([]);
  const dragStartRef = useRef<{ y: number; bpm: number } | null>(null);
  const dragMovedRef = useRef(false);
  const bpmInputElRef = useRef<HTMLInputElement>(null);
  const droneOscRef = useRef<OscillatorNode | null>(null);
  const droneGainRef = useRef<GainNode | null>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => {
    subdivRef.current = subdiv;
    beatIndexRef.current = 0; // Reset to avoid out-of-bounds slot on subdivision change
  }, [subdiv]);

  // Track window width for responsive panel sizing
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Auto-focus BPM input when entering edit mode
  useEffect(() => {
    if (editingBpm && bpmInputElRef.current) {
      bpmInputElRef.current.focus();
      bpmInputElRef.current.select();
    }
  }, [editingBpm]);

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

    const sub = subdivRef.current;
    const spb = 60.0 / bpmRef.current;
    const sps = spb / sub;
    const totalSlots = BEATS * sub;

    while (nextNoteTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD_S) {
      const slot = beatIndexRef.current;
      const isDownbeat = slot === 0;
      const isBeat = slot % sub === 0;
      const type = isDownbeat ? "down" : isBeat ? "beat" : "sub";
      const visualBeat = Math.floor(slot / sub);

      scheduleClick(
        type,
        nextNoteTimeRef.current,
        ctx,
        isBeat ? () => onBeat(visualBeat) : undefined
      );

      beatIndexRef.current = (beatIndexRef.current + 1) % totalSlots;
      nextNoteTimeRef.current += sps;
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

  // BPM drag — vertical drag on number; click (no drag) enters type mode
  const handleBpmMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (editingBpm) return;
      e.preventDefault();
      dragMovedRef.current = false;
      dragStartRef.current = { y: e.clientY, bpm };
      const move = (ev: MouseEvent) => {
        if (!dragStartRef.current) return;
        const delta = dragStartRef.current.y - ev.clientY;
        if (Math.abs(delta) > 3) dragMovedRef.current = true;
        if (dragMovedRef.current) {
          setBpm(Math.min(MAX_BPM, Math.max(MIN_BPM,
            Math.round(dragStartRef.current.bpm + delta * 0.6)
          )));
        }
      };
      const up = () => {
        if (!dragMovedRef.current) {
          setBpmInputVal(String(bpmRef.current));
          setEditingBpm(true);
        }
        dragStartRef.current = null;
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    },
    [bpm, editingBpm]
  );

  // BPM touch drag — same velocity math as mouse drag
  const handleBpmTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (editingBpm) return;
      e.preventDefault();
      dragMovedRef.current = false;
      dragStartRef.current = { y: e.touches[0].clientY, bpm };
      const move = (ev: TouchEvent) => {
        if (!dragStartRef.current) return;
        const delta = dragStartRef.current.y - ev.touches[0].clientY;
        if (Math.abs(delta) > 3) dragMovedRef.current = true;
        if (dragMovedRef.current) {
          setBpm(Math.min(MAX_BPM, Math.max(MIN_BPM,
            Math.round(dragStartRef.current.bpm + delta * 0.6)
          )));
        }
      };
      const up = () => {
        if (!dragMovedRef.current) {
          setBpmInputVal(String(bpmRef.current));
          setEditingBpm(true);
        }
        dragStartRef.current = null;
        window.removeEventListener("touchmove", move);
        window.removeEventListener("touchend", up);
      };
      window.addEventListener("touchmove", move, { passive: false });
      window.addEventListener("touchend", up);
    },
    [bpm, editingBpm]
  );

  const commitBpmInput = useCallback(() => {
    const val = parseInt(bpmInputVal, 10);
    if (!isNaN(val) && bpmInputVal.trim() !== "") {
      setBpm(Math.min(MAX_BPM, Math.max(MIN_BPM, val)));
    }
    setEditingBpm(false);
  }, [bpmInputVal]);

  // BPM scroll wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1 : -1;
    setBpm((b) => Math.min(MAX_BPM, Math.max(MIN_BPM, b + delta)));
  }, []);

  // Drone — sustained sine wave at root note
  const startDrone = useCallback((semitone: number) => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();

    // Fade out and stop any existing drone
    if (droneGainRef.current && droneOscRef.current) {
      const g = droneGainRef.current;
      g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.07);
      droneOscRef.current.stop(ctx.currentTime + 0.08);
      droneOscRef.current = null;
      droneGainRef.current = null;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = E2_HZ * Math.pow(2, semitone / 12);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    droneOscRef.current = osc;
    droneGainRef.current = gain;
  }, []);

  const stopDrone = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx || !droneGainRef.current || !droneOscRef.current) return;
    const g = droneGainRef.current;
    g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    droneOscRef.current.stop(ctx.currentTime + 0.14);
    droneOscRef.current = null;
    droneGainRef.current = null;
  }, []);

  const handleDroneKey = useCallback((semitone: number) => {
    if (droneKey === semitone) {
      stopDrone();
      setDroneKey(null);
    } else {
      startDrone(semitone);
      setDroneKey(semitone);
    }
  }, [droneKey, startDrone, stopDrone]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    // Stop drone directly via refs (closure captures latest refs)
    const ctx = audioCtxRef.current;
    if (ctx && droneGainRef.current && droneOscRef.current) {
      droneGainRef.current.gain.setValueAtTime(0, ctx.currentTime);
      droneOscRef.current.stop();
    }
    audioCtxRef.current?.close();
  }, []);

  if (!mounted) return null;

  const C = getColors(isDark);
  const isMobile = windowWidth < 700;
  const isShortViewport = windowHeight < 500;
  const panelWidth = isMobile ? Math.min(windowWidth - 32, 280) : 216;
  const droneGridCols = isMobile || isShortViewport ? 4 : 6;
  const safeBottom = `calc(env(safe-area-inset-bottom, 0px) + ${isMobile ? 16 : 24}px)`;
  // In landscape / short viewports, cap panel height so it doesn't overflow screen
  const panelMaxHeight = isShortViewport ? windowHeight - 60 : undefined;

  const subdivOptions: Array<{ val: SubDiv; label: string; icon: React.ReactNode }> = [
    { val: 1, label: "Quarter note", icon: <IconQuarter /> },
    { val: 2, label: "Eighth note", icon: <IconEighths /> },
    { val: 4, label: "Sixteenth note", icon: <IconSixteenths /> },
    { val: 3, label: "Eighth triplet", icon: <IconEighthTriplet /> },
    { val: 6, label: "Sixteenth triplet", icon: <IconSixteenthTriplet /> },
  ];

  return (
    <div
      style={{
        position: "fixed",
        bottom: safeBottom,
        right: isMobile ? 12 : 24,
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
            width: panelWidth,
            maxHeight: panelMaxHeight,
            overflowY: panelMaxHeight ? "auto" : undefined,
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
              fontFamily: "'Space Grotesk', sans-serif",
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
                padding: isMobile ? "8px 0 8px 16px" : "0 0 0 10px",
                fontSize: "0.6rem",
                lineHeight: 1,
                minWidth: isMobile ? 44 : undefined,
                minHeight: isMobile ? 44 : undefined,
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
            {editingBpm ? (
              <input
                ref={bpmInputElRef}
                type="text"
                inputMode="numeric"
                value={bpmInputVal}
                onChange={(e) => setBpmInputVal(e.target.value)}
                onBlur={commitBpmInput}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitBpmInput();
                  if (e.key === "Escape") setEditingBpm(false);
                }}
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "3.6rem",
                  fontWeight: 600,
                  lineHeight: 1,
                  color: C.text,
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${C.accent}`,
                  outline: "none",
                  width: "100%",
                  textAlign: "center",
                  letterSpacing: "-0.02em",
                }}
              />
            ) : (
              <div
                onMouseDown={handleBpmMouseDown}
                onTouchStart={handleBpmTouchStart}
                onWheel={handleWheel}
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
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
                  touchAction: "none",
                }}
              >
                {bpm}
              </div>
            )}
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "0.44rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: C.muted,
              marginTop: 3,
              marginBottom: 10,
            }}>
              bpm · drag · scroll · click
            </div>
          </div>

          {/* Subdivision */}
          <div style={{ padding: "0 12px 10px" }}>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "0.44rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: C.muted,
              marginBottom: 5,
            }}>
              Subdivision
            </div>
            <div style={{ display: "flex", gap: 3 }}>
              {subdivOptions.map(({ val, label, icon }) => {
                const active = subdiv === val;
                const hk = `sub${val}`;
                const isHov = hoveredEl === hk;
                return (
                  <button
                    key={val}
                    onClick={() => setSubdiv(val)}
                    onMouseEnter={() => setHoveredEl(hk)}
                    onMouseLeave={() => setHoveredEl(null)}
                    title={label}
                    aria-label={label}
                    aria-pressed={active}
                    style={{
                      flex: 1,
                      padding: isMobile ? "9px 2px" : "5px 2px",
                      background: active ? C.text : "transparent",
                      border: `1px solid ${active ? C.text : isHov ? C.text : C.border}`,
                      color: active ? C.bg : C.text,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: isMobile ? 40 : undefined,
                      transition: "background 80ms, color 80ms, border-color 80ms",
                    }}
                  >
                    {icon}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fine adjustment */}
          <div style={{ display: "flex", gap: 4, padding: "0 12px 10px" }}>
            {([-5, -1, 1, 5] as const).map((d) => {
              const hk = `adj${d}`;
              const isHovered = hoveredEl === hk;
              return (
                <button
                  key={d}
                  onClick={() => setBpm((b) => Math.min(MAX_BPM, Math.max(MIN_BPM, b + d)))}
                  onMouseEnter={() => setHoveredEl(hk)}
                  onMouseLeave={() => setHoveredEl(null)}
                  style={{
                    flex: 1,
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: "0.58rem",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    padding: isMobile ? "8px 0" : "4px 0",
                    background: "transparent",
                    border: `1px solid ${isHovered ? C.text : C.border}`,
                    color: C.text,
                    cursor: "pointer",
                    minHeight: isMobile ? 40 : undefined,
                    transition: "border-color 80ms",
                  }}
                >
                  {d > 0 ? `+${d}` : d}
                </button>
              );
            })}
          </div>

          {/* Tap + Start/Stop */}
          <div style={{ display: "flex", gap: 6, padding: "0 12px 12px" }}>
            <button
              onClick={handleTap}
              onMouseEnter={() => setHoveredEl("tap")}
              onMouseLeave={() => setHoveredEl(null)}
              style={{
                flex: 1,
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "0.72rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: isMobile ? "11px 0" : "7px 0",
                background: "transparent",
                border: `1px solid ${hoveredEl === "tap" ? C.text : C.border}`,
                color: C.text,
                cursor: "pointer",
                minHeight: isMobile ? 44 : undefined,
                transition: "border-color 80ms",
              }}
            >
              Tap
            </button>
            <button
              onClick={togglePlay}
              style={{
                flex: 1,
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "0.72rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: isMobile ? "11px 0" : "7px 0",
                background: isPlaying ? C.text : "transparent",
                border: `1px solid ${isPlaying ? C.text : C.border}`,
                color: isPlaying ? C.bg : C.text,
                cursor: "pointer",
                transition: "background 80ms, color 80ms, border-color 80ms",
                minHeight: isMobile ? 44 : undefined,
              }}
            >
              {isPlaying ? "Stop" : "Start"}
            </button>
          </div>

          {/* Drone section */}
          <div style={{ borderTop: `1px solid ${C.faint}`, padding: "10px 12px 13px" }}>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "0.44rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: C.muted,
              marginBottom: 7,
            }}>
              Drone {droneKey !== null ? `· ${NOTE_NAMES[droneKey]}` : ""}
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${droneGridCols}, 1fr)`,
              gap: 3,
            }}>
              {NOTE_NAMES.map((name, i) => {
                const active = droneKey === i;
                const hk = `drone${i}`;
                const isHovered = !active && hoveredEl === hk;
                return (
                  <button
                    key={name}
                    onClick={() => handleDroneKey(i)}
                    onMouseEnter={() => setHoveredEl(hk)}
                    onMouseLeave={() => setHoveredEl(null)}
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: "0.6rem",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      padding: isMobile ? "8px 0" : "5px 0",
                      background: active ? C.accent : "transparent",
                      border: `1px solid ${active ? C.accent : isHovered ? C.text : C.border}`,
                      color: active ? (isDark ? C.bg : "#fff") : C.text,
                      cursor: "pointer",
                      transition: "background 80ms, color 80ms, border-color 80ms",
                      minHeight: isMobile ? 36 : undefined,
                    }}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Trigger button ──────────────────────────────────────────────── */}
      <button
        onClick={() => setIsExpanded((x) => !x)}
        title="Metronome"
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "0.68rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          padding: isMobile ? "10px 14px" : "7px 13px",
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
          minHeight: isMobile ? 44 : undefined,
        }}
      >
        <span style={{ fontSize: "0.9rem", lineHeight: 1 }}>♩</span>
        <span style={{ minWidth: "2.6ch", textAlign: "right" }}>{bpm}</span>
        {droneKey !== null && (
          <span style={{
            fontSize: "0.55rem",
            color: isPlaying ? C.bg : C.accent,
            opacity: 0.9,
          }}>
            ~{NOTE_NAMES[droneKey]}
          </span>
        )}
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
