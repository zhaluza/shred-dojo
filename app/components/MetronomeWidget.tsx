import { useState, useEffect, useRef, useCallback } from "react";
import { useStoredDarkMode } from "./useStoredDarkMode";
import {
  usePracticeStation,
  effectiveSig,
  MET_MIN_BPM,
  MET_MAX_BPM,
} from "./practiceStation";
import { fmtClock } from "./Timer";

// ─── Floating metronome remote ─────────────────────────────────────────────────
// The compact, always-visible face of the shared Practice Station engine
// (`practiceStation.tsx`). It controls the one metronome + countdown timer, shows
// the live countdown when a session is running, and surfaces the Save/Discard log
// prompt on completion — so a session started on /metronome keeps clicking and
// stays loggable from any page. Its tonic drone is an independent quick utility.

const NOTE_NAMES = ["E", "F", "F#", "G", "Ab", "A", "Bb", "B", "C", "Db", "D", "Eb"] as const;
const E2_HZ = 82.41;

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

function IconTriplet() {
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

// ─── MetronomeWidget ──────────────────────────────────────────────────────────

export function MetronomeWidget() {
  const { met, timer } = usePracticeStation();
  const { bpm, setBpm, subdivision, setSubdivision, isPlaying, toggle, currentSlot, handleTap, timeSig, grouping } = met;

  const [mounted, setMounted] = useState(false);
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

  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;
  const dragStartRef = useRef<{ y: number; bpm: number } | null>(null);
  const dragMovedRef = useRef(false);
  const bpmInputElRef = useRef<HTMLInputElement>(null);

  // Independent quick-drone (its own AudioContext — separate from the metronome).
  const droneCtxRef = useRef<AudioContext | null>(null);
  const droneOscRef = useRef<OscillatorNode | null>(null);
  const droneGainRef = useRef<GainNode | null>(null);

  const sig = effectiveSig(timeSig, grouping);
  const totalBeats = sig.num;
  const currentBeat = currentSlot >= 0 ? Math.floor(currentSlot / subdivision) : -1;

  useEffect(() => { setMounted(true); }, []);

  // Track window size for responsive panel sizing.
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Auto-focus BPM input when entering edit mode.
  useEffect(() => {
    if (editingBpm && bpmInputElRef.current) {
      bpmInputElRef.current.focus();
      bpmInputElRef.current.select();
    }
  }, [editingBpm]);

  // Visual pulse on each beat (fires when the engine's slot lands on a beat).
  useEffect(() => {
    if (!isPlaying || currentSlot < 0) return;
    if (currentSlot % subdivision !== 0) return;
    setPulse(true);
    const id = setTimeout(() => setPulse(false), 80);
    return () => clearTimeout(id);
  }, [currentSlot, isPlaying, subdivision]);

  // BPM drag — vertical drag on number; click (no drag) enters type mode.
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
          setBpm(Math.min(MET_MAX_BPM, Math.max(MET_MIN_BPM,
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
    [bpm, editingBpm, setBpm]
  );

  // BPM touch drag — same velocity math as mouse drag.
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
          setBpm(Math.min(MET_MAX_BPM, Math.max(MET_MIN_BPM,
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
    [bpm, editingBpm, setBpm]
  );

  const commitBpmInput = useCallback(() => {
    const val = parseInt(bpmInputVal, 10);
    if (!isNaN(val) && bpmInputVal.trim() !== "") {
      setBpm(Math.min(MET_MAX_BPM, Math.max(MET_MIN_BPM, val)));
    }
    setEditingBpm(false);
  }, [bpmInputVal, setBpm]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1 : -1;
    setBpm(Math.min(MET_MAX_BPM, Math.max(MET_MIN_BPM, bpmRef.current + delta)));
  }, [setBpm]);

  // Drone — sustained sine wave at root note (independent of the metronome).
  const startDrone = useCallback((semitone: number) => {
    if (!droneCtxRef.current) droneCtxRef.current = new AudioContext();
    const ctx = droneCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();

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
    const ctx = droneCtxRef.current;
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
    const ctx = droneCtxRef.current;
    if (ctx && droneGainRef.current && droneOscRef.current) {
      droneGainRef.current.gain.setValueAtTime(0, ctx.currentTime);
      droneOscRef.current.stop();
    }
    droneCtxRef.current?.close();
  }, []);

  if (!mounted) return null;

  const C = getColors(isDark);
  const isMobile = windowWidth < 700;
  const isShortViewport = windowHeight < 500;
  const panelWidth = isMobile ? Math.min(windowWidth - 32, 280) : 216;
  const droneGridCols = isMobile || isShortViewport ? 4 : 6;
  const safeBottom = `calc(env(safe-area-inset-bottom, 0px) + ${isMobile ? 16 : 24}px)`;
  const panelMaxHeight = isShortViewport ? windowHeight - 60 : undefined;

  const subdivOptions: Array<{ val: 1 | 2 | 3; label: string; icon: React.ReactNode }> = [
    { val: 1, label: "Quarter note", icon: <IconQuarter /> },
    { val: 2, label: "Eighth note", icon: <IconEighths /> },
    { val: 3, label: "Triplet", icon: <IconTriplet /> },
  ];

  // A session is "active" (worth surfacing in the collapsed trigger) when the timer
  // is running, mid-countdown, or waiting on a save decision.
  const timerActive = timer.running || timer.pending !== null || timer.remaining < timer.target;

  const btnBase = {
    fontFamily: "'Space Grotesk', sans-serif" as const,
    textTransform: "uppercase" as const,
    cursor: "pointer" as const,
  };

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
              Practice Station
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
            {Array.from({ length: totalBeats }, (_, i) => {
              const active = currentBeat === i && isPlaying;
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
                const active = subdivision === val;
                const hk = `sub${val}`;
                const isHov = hoveredEl === hk;
                return (
                  <button
                    key={val}
                    onClick={() => setSubdivision(val)}
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
                  onClick={() => setBpm(bpm + d)}
                  onMouseEnter={() => setHoveredEl(hk)}
                  onMouseLeave={() => setHoveredEl(null)}
                  style={{
                    ...btnBase,
                    flex: 1,
                    fontSize: "0.58rem",
                    letterSpacing: "0.04em",
                    padding: isMobile ? "8px 0" : "4px 0",
                    background: "transparent",
                    border: `1px solid ${isHovered ? C.text : C.border}`,
                    color: C.text,
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
                ...btnBase,
                flex: 1,
                fontSize: "0.72rem",
                letterSpacing: "0.1em",
                padding: isMobile ? "11px 0" : "7px 0",
                background: "transparent",
                border: `1px solid ${hoveredEl === "tap" ? C.text : C.border}`,
                color: C.text,
                minHeight: isMobile ? 44 : undefined,
                transition: "border-color 80ms",
              }}
            >
              Tap
            </button>
            <button
              onClick={toggle}
              style={{
                ...btnBase,
                flex: 1,
                fontSize: "0.72rem",
                letterSpacing: "0.1em",
                padding: isMobile ? "11px 0" : "7px 0",
                background: isPlaying ? C.text : "transparent",
                border: `1px solid ${isPlaying ? C.text : C.border}`,
                color: isPlaying ? C.bg : C.text,
                transition: "background 80ms, color 80ms, border-color 80ms",
                minHeight: isMobile ? 44 : undefined,
              }}
            >
              {isPlaying ? "Stop" : "Start"}
            </button>
          </div>

          {/* ── Timer ── */}
          <div style={{ borderTop: `1px solid ${C.faint}`, padding: "10px 12px 13px" }}>
            <div style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 8,
            }}>
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "0.44rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: C.muted,
              }}>
                Timer
              </span>
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "1.15rem",
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                color: timer.done ? C.accent : C.text,
                lineHeight: 1,
              }}>
                {fmtClock(timer.remaining)}
              </span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={timer.toggle}
                style={{
                  ...btnBase,
                  flex: 1,
                  fontSize: "0.66rem",
                  letterSpacing: "0.08em",
                  padding: isMobile ? "10px 0" : "6px 0",
                  background: timer.running ? C.accent : "transparent",
                  border: `1px solid ${timer.running ? C.accent : C.border}`,
                  color: timer.running ? (isDark ? C.bg : "#fff") : C.text,
                  minHeight: isMobile ? 40 : undefined,
                  transition: "background 80ms, color 80ms, border-color 80ms",
                }}
              >
                {timer.running ? "Pause" : timer.done ? "Restart" : "Start"}
              </button>
              <button
                onClick={timer.addFive}
                style={{
                  ...btnBase,
                  flex: 1,
                  fontSize: "0.66rem",
                  letterSpacing: "0.06em",
                  padding: isMobile ? "10px 0" : "6px 0",
                  background: "transparent",
                  border: `1px solid ${C.border}`,
                  color: C.text,
                  minHeight: isMobile ? 40 : undefined,
                }}
              >
                +5
              </button>
              <button
                onClick={timer.reset}
                aria-label="Reset timer"
                style={{
                  ...btnBase,
                  fontSize: "0.8rem",
                  padding: isMobile ? "10px 12px" : "6px 10px",
                  background: "transparent",
                  border: `1px solid ${C.border}`,
                  color: C.text,
                  lineHeight: 1,
                  minHeight: isMobile ? 40 : undefined,
                }}
              >
                ↺
              </button>
            </div>

            {/* Review — log the finished sitting from anywhere */}
            {timer.pending && (
              <div style={{
                marginTop: 10,
                padding: 10,
                background: C.bg,
                border: `1px solid ${C.accent}`,
                display: "flex",
                flexDirection: "column",
                gap: 7,
              }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: "0.5rem",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: C.muted,
                  }}>
                    Practiced
                  </span>
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                    color: C.text,
                  }}>
                    {fmtClock(timer.pending.sec)}
                  </span>
                </div>
                <input
                  type="text"
                  value={timer.label}
                  onChange={(e) => timer.setLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") timer.saveSession(); }}
                  placeholder="Label (optional)"
                  aria-label="Session label"
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "0.7rem",
                    padding: "6px 7px",
                    background: "transparent",
                    border: `1px solid ${C.border}`,
                    color: C.text,
                    outline: "none",
                  }}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={timer.saveSession}
                    style={{
                      ...btnBase,
                      flex: 1,
                      fontSize: "0.62rem",
                      letterSpacing: "0.06em",
                      padding: "7px 0",
                      background: C.accent,
                      border: `1px solid ${C.accent}`,
                      color: isDark ? C.bg : "#fff",
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={timer.discardSession}
                    style={{
                      ...btnBase,
                      flex: 1,
                      fontSize: "0.62rem",
                      letterSpacing: "0.06em",
                      padding: "7px 0",
                      background: "transparent",
                      border: `1px solid ${C.border}`,
                      color: C.text,
                    }}
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}
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
                      ...btnBase,
                      fontSize: "0.6rem",
                      letterSpacing: "0.04em",
                      padding: isMobile ? "8px 0" : "5px 0",
                      background: active ? C.accent : "transparent",
                      border: `1px solid ${active ? C.accent : isHovered ? C.text : C.border}`,
                      color: active ? (isDark ? C.bg : "#fff") : C.text,
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
        title="Practice Station"
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
        {timerActive && (
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "0.62rem",
            fontVariantNumeric: "tabular-nums",
            color: isPlaying ? C.bg : (timer.done ? C.accent : C.text),
            borderLeft: `1px solid ${isPlaying ? C.bg : C.border}`,
            paddingLeft: 7,
            opacity: isPlaying ? 0.9 : 1,
          }}>
            {fmtClock(timer.remaining)}
          </span>
        )}
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
