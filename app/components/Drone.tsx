import { useState, useEffect, useRef, useCallback } from "react";

// ─── Drone hook ──────────────────────────────────────────────────────────────
// Sustained tonic drone that follows a root pitch class. Own AudioContext
// (created lazily on first toggle, within the click gesture, to satisfy autoplay
// policy). Off by default; only volume persists (an "on" state can't auto-resume
// audio without a user gesture). Used by PentatonicPractice and the standalone
// Metronome "Practice Station".

const A4_HZ = 440;
const DRONE_BASE_MIDI = 48; // root pc 0 → C3 (130.8 Hz); keeps the drone low-mid
const DRONE_MASTER_MAX = 0.4; // master-gain ceiling at volume = 1

// Relative-to-root voices (semitones, gain weight, detune cents)
const DRONE_VOICES = [
  { semis: 0, gain: 0.5, detune: 0 },
  { semis: 0, gain: 0.28, detune: -6 }, // chorus
  { semis: 7, gain: 0.24, detune: 0 }, // fifth
  { semis: 12, gain: 0.14, detune: 0 }, // octave
];

const pcToFreq = (pc: number, semis = 0) =>
  A4_HZ * Math.pow(2, (DRONE_BASE_MIDI + pc + semis - 69) / 12);

type DroneVoice = { osc: OscillatorNode; gain: GainNode; semis: number };

export function useDrone(rootPc: number, storageKey: string) {
  const [enabled, setEnabled] = useState(false);
  const [volume, setVolumeState] = useState<number>(() => {
    if (typeof window === "undefined") return 0.5;
    const v = parseFloat(localStorage.getItem(storageKey) ?? "");
    return v >= 0 && v <= 1 ? v : 0.5;
  });

  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const voicesRef = useRef<DroneVoice[]>([]);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enabledRef = useRef(false);
  const volumeRef = useRef(volume);
  const rootPcRef = useRef(rootPc);

  const start = useCallback(() => {
    if (stopTimerRef.current) { clearTimeout(stopTimerRef.current); stopTimerRef.current = null; }
    let ctx = ctxRef.current;
    if (!ctx) { ctx = new AudioContext(); ctxRef.current = ctx; }
    if (ctx.state === "suspended") ctx.resume();
    let master = masterRef.current;
    if (!master) {
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      masterRef.current = master;
    }
    if (voicesRef.current.length === 0) {
      voicesRef.current = DRONE_VOICES.map((v) => {
        const osc = ctx!.createOscillator();
        osc.type = "sine";
        osc.frequency.value = pcToFreq(rootPcRef.current, v.semis);
        osc.detune.value = v.detune;
        const gain = ctx!.createGain();
        gain.gain.value = v.gain;
        osc.connect(gain).connect(master!);
        osc.start();
        return { osc, gain, semis: v.semis };
      });
    }
    const now = ctx.currentTime;
    const g = master.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(0.0001, g.value), now);
    g.linearRampToValueAtTime(volumeRef.current * DRONE_MASTER_MAX, now + 0.12);
  }, []);

  const stop = useCallback(() => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0.0001, now + 0.15);
    const voices = voicesRef.current;
    voicesRef.current = [];
    stopTimerRef.current = setTimeout(() => {
      voices.forEach(({ osc, gain }) => {
        try { osc.stop(); osc.disconnect(); gain.disconnect(); } catch {}
      });
    }, 220);
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      enabledRef.current = next;
      if (next) start(); else stop();
      return next;
    });
  }, [start, stop]);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    volumeRef.current = clamped;
    setVolumeState(clamped);
    try { localStorage.setItem(storageKey, String(clamped)); } catch {}
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (ctx && master && enabledRef.current) {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(clamped * DRONE_MASTER_MAX, now + 0.06);
    }
  }, [storageKey]);

  // Retune live when the key changes.
  useEffect(() => {
    rootPcRef.current = rootPc;
    const ctx = ctxRef.current;
    if (!ctx || voicesRef.current.length === 0) return;
    const now = ctx.currentTime;
    voicesRef.current.forEach(({ osc, semis }) => {
      const f = pcToFreq(rootPc, semis);
      osc.frequency.cancelScheduledValues(now);
      osc.frequency.setValueAtTime(osc.frequency.value, now);
      osc.frequency.exponentialRampToValueAtTime(f, now + 0.08);
    });
  }, [rootPc]);

  useEffect(() => () => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    voicesRef.current.forEach(({ osc }) => { try { osc.stop(); } catch {} });
    ctxRef.current?.close();
  }, []);

  return { enabled, toggle, volume, setVolume };
}

// ─── DronePanel ──────────────────────────────────────────────────────────────

export function DronePanel({
  drone,
  rootNote,
}: {
  drone: ReturnType<typeof useDrone>;
  rootNote: string;
}) {
  const { enabled, toggle, volume, setVolume } = drone;
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[0.5rem] tracking-[0.18em] uppercase" style={{ color: "var(--muted)" }}>
          Drone
        </span>
        <span className="font-display text-[0.62rem] tracking-[0.06em] uppercase" style={{ color: "var(--faint)" }}>
          root · {rootNote}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          aria-pressed={enabled}
          aria-label={enabled ? "Turn drone off" : "Turn drone on"}
          className="font-display text-[0.72rem] tracking-[0.08em] uppercase border px-3 py-[0.35rem] max-[700px]:py-[0.55rem] min-w-[58px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] shrink-0"
          style={{
            background: enabled ? "var(--accent)" : "transparent",
            borderColor: enabled ? "var(--accent)" : "var(--border)",
            color: enabled ? "#fff" : "var(--text)",
          }}
        >
          {enabled ? "On" : "Off"}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          disabled={!enabled}
          className="flex-1 min-w-0 accent-[var(--accent)] disabled:opacity-40"
          aria-label="Drone volume"
        />
      </div>
    </div>
  );
}
