import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { useTimer, type TimerController } from "./Timer";
import { addSession } from "./practiceLog.utils";

// ─── Practice Station engine (shared, persistent) ──────────────────────────────
// The metronome scheduler, tempo trainer, and countdown timer all live here in a
// context provider mounted above the router (root.tsx), so a running session keeps
// clicking + counting down when you navigate away from /metronome. The page and
// the floating MetronomeWidget are both views into this one shared engine.

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.1;
export const MET_MIN_BPM = 30;
export const MET_MAX_BPM = 220;
const DEFAULT_BPM = 100;
const DEFAULT_VOLUME = 0.85; // 0–1 master level
// Peak gain per click tier at full volume (square wave). `accent` marks the first
// pulse of an interior beat-group (e.g. beat 4 of 6/8).
const TIER_GAIN = { downbeat: 0.95, accent: 0.82, beat: 0.7, sub: 0.42 };

export type Subdivision = 1 | 2 | 3;

// ─── Time signatures ─────────────────────────────────────────────────────────
export type TimeSig = { id: string; num: number; groups: number[]; starts: Set<number> };

function makeSig(id: string, num: number, groups: number[]): TimeSig {
  const starts = new Set<number>();
  let acc = 0;
  for (const g of groups) {
    starts.add(acc);
    acc += g;
  }
  return { id, num, groups, starts };
}

export const TIME_SIGS: TimeSig[] = [
  makeSig("4/4", 4, [4]),
  makeSig("3/4", 3, [3]),
  makeSig("2/4", 2, [2]),
  makeSig("5/4", 5, [3, 2]),
  makeSig("6/8", 6, [3, 3]),
  makeSig("9/8", 9, [3, 3, 3]),
  makeSig("5/8", 5, [3, 2]),
  makeSig("7/8", 7, [2, 2, 3]),
];
const DEFAULT_TIMESIG = "4/4";

function sigById(id: string): TimeSig {
  return TIME_SIGS.find((t) => t.id === id) ?? TIME_SIGS[0];
}

// ─── Math-rock groupings ───────────────────────────────────────────────────────
export type Grouping = { groups: number[]; style: string; note: string };

const COUNT_WORDS = ["ONE", "two", "three", "four", "five", "six", "seven"];

export function countString(groups: number[]): string {
  return groups.map((g) => COUNT_WORDS.slice(0, g).join("-")).join(" / ");
}

export function groupingKey(groups: number[]): string {
  return groups.join("-");
}

const GROUPINGS_BY_NUM: Record<number, Grouping[]> = {
  5: [
    { groups: [3, 2], style: "Long + Short", note: "Most common — Eastern-European folk, Tool, etc." },
    { groups: [2, 3], style: "Short + Long", note: "Feels like an upbeat into a phrase." },
    { groups: [2, 2, 1], style: "Even + Short", note: "Slightly syncopated feel." },
    { groups: [2, 1, 2], style: "Symmetrical", note: "Creates tension and release." },
    { groups: [1, 2, 2], style: "Short + Even", note: "Quirky and off-kilter." },
    { groups: [1, 1, 3], style: "Short bursts", note: "Rare, used for effect." },
    { groups: [1, 3, 1], style: "Long center", note: "Balanced but unusual." },
    { groups: [5], style: "Straight", note: "Very uncommon — feels awkward to count evenly." },
  ],
  7: [
    { groups: [2, 2, 3], style: "Even + Long", note: "The most common 7/8 grouping." },
    { groups: [3, 2, 2], style: "Long + Even", note: "Driving, front-loaded feel." },
    { groups: [2, 3, 2], style: "Symmetrical", note: "Centered, balanced phrasing." },
    { groups: [3, 4], style: "Long + Longer", note: "Two broad beats — a half-time lean." },
    { groups: [4, 3], style: "Longer + Long", note: "Spacious, then a quick turnaround." },
  ],
};

export function groupingsFor(num: number): Grouping[] | null {
  return GROUPINGS_BY_NUM[num] ?? null;
}

export function effectiveSig(timeSigId: string, grouping: number[]): TimeSig {
  const base = sigById(timeSigId);
  if (!groupingsFor(base.num)) return base;
  return makeSig(base.id, base.num, grouping);
}

// ─── Metronome hook ────────────────────────────────────────────────────────────

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
  const [timeSig, setTimeSigState] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_TIMESIG;
    const v = localStorage.getItem("met-timesig") ?? "";
    return TIME_SIGS.some((t) => t.id === v) ? v : DEFAULT_TIMESIG;
  });
  const [volume, setVolumeState] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_VOLUME;
    const v = parseFloat(localStorage.getItem("met-vol") ?? "");
    return v >= 0 && v <= 1 ? v : DEFAULT_VOLUME;
  });
  const [grouping, setGroupingState] = useState<number[]>(() => {
    const sig = sigById(timeSig);
    const options = groupingsFor(sig.num);
    if (typeof window === "undefined" || !options) return sig.groups;
    const stored = localStorage.getItem("met-grouping") ?? "";
    const match = options.find((o) => groupingKey(o.groups) === stored);
    return match ? match.groups : sig.groups;
  });
  const [accentsOnly, setAccentsOnlyState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("met-accents-only") === "true";
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSlot, setCurrentSlot] = useState(-1);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bpmRef = useRef(bpm);
  const subRef = useRef(subdivision);
  const sigRef = useRef<TimeSig>(effectiveSig(timeSig, grouping));
  const groupingRef = useRef(grouping);
  const accentsOnlyRef = useRef(accentsOnly);
  const volRef = useRef(volume);
  const nextNoteTimeRef = useRef(0);
  const beatCountRef = useRef(0);
  const isPlayingRef = useRef(false);
  const tapTimesRef = useRef<number[]>([]);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { subRef.current = subdivision; }, [subdivision]);
  useEffect(() => { sigRef.current = effectiveSig(timeSig, grouping); }, [timeSig, grouping]);
  useEffect(() => { groupingRef.current = grouping; }, [grouping]);
  useEffect(() => { accentsOnlyRef.current = accentsOnly; }, [accentsOnly]);
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

  const setGrouping = useCallback((groups: number[]) => {
    groupingRef.current = groups;
    setGroupingState(groups);
    try { localStorage.setItem("met-grouping", groupingKey(groups)); } catch {}
  }, []);

  const setAccentsOnly = useCallback((v: boolean) => {
    setAccentsOnlyState(v);
    try { localStorage.setItem("met-accents-only", String(v)); } catch {}
  }, []);

  const setTimeSig = useCallback((v: string) => {
    setTimeSigState(v);
    try { localStorage.setItem("met-timesig", v); } catch {}
    // Reconcile the grouping with the new meter: keep the current one if it still
    // sums to the new pulse count, otherwise fall back to the conventional groups.
    const sig = sigById(v);
    const prev = groupingRef.current;
    const sum = prev.reduce((a, b) => a + b, 0);
    const next = groupingsFor(sig.num) && sum === sig.num ? prev : sig.groups;
    groupingRef.current = next;
    setGroupingState(next);
    try { localStorage.setItem("met-grouping", groupingKey(next)); } catch {}
  }, []);

  // Tap tempo — average of last 4 tap intervals.
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
    const sub = subRef.current;
    const sig = sigRef.current;
    const isBeat = slot % sub === 0;
    const beatIdx = slot / sub;
    const isGroupStart = isBeat && (beatIdx === 0 || sig.starts.has(beatIdx));
    const accentsOnly = accentsOnlyRef.current && !!groupingsFor(sig.num);

    if (!accentsOnly || isGroupStart) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";

      let freq: number;
      let tier: number;
      if (!isBeat) {
        freq = 700;
        tier = TIER_GAIN.sub;
      } else if (beatIdx === 0) {
        freq = 1500;
        tier = TIER_GAIN.downbeat;
      } else if (sig.starts.has(beatIdx)) {
        freq = 1250;
        tier = TIER_GAIN.accent;
      } else {
        freq = 1000;
        tier = TIER_GAIN.beat;
      }
      osc.frequency.value = freq;
      const vol = Math.max(0.0001, tier * volRef.current);

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(vol, time + 0.001);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
      osc.start(time);
      osc.stop(time + 0.07);
    }

    const msFromNow = Math.max(0, (time - ctx.currentTime) * 1000);
    setTimeout(() => setCurrentSlot(slot), msFromNow);
  }, []);

  const runScheduler = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const sub = subRef.current;
    const totalSlots = sigRef.current.num * sub;
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

  return { bpm, setBpm, subdivision, setSubdivision, timeSig, setTimeSig, grouping, setGrouping, accentsOnly, setAccentsOnly, volume, setVolume, isPlaying, toggle, currentSlot, handleTap };
}

export type MetronomeApi = ReturnType<typeof useMetronome>;

// ─── Tempo trainer ─────────────────────────────────────────────────────────────
// Auto-increase BPM by `amt` every `bars` measures while the metronome runs. Lives
// in the provider so ramping continues even after you navigate off /metronome.

function readInt(key: string, fallback: number, min: number, max: number) {
  if (typeof window === "undefined") return fallback;
  const v = parseInt(localStorage.getItem(key) ?? "", 10);
  return v >= min && v <= max ? v : fallback;
}

function useTempoRamp(met: MetronomeApi) {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("met-ramp-on") === "true";
  });
  const [amt, setAmtState] = useState<number>(() => readInt("met-ramp-amt", 5, 1, 50));
  const [bars, setBarsState] = useState<number>(() => readInt("met-ramp-bars", 4, 1, 64));
  const [barsLeft, setBarsLeft] = useState(bars);

  const prevSlotRef = useRef(-1);
  const completedRef = useRef(0);
  const cfgRef = useRef({ enabled, bars, amt, bpm: met.bpm, playing: met.isPlaying });
  cfgRef.current = { enabled, bars, amt, bpm: met.bpm, playing: met.isPlaying };

  const setEnabled = (v: boolean) => {
    setEnabledState(v);
    try { localStorage.setItem("met-ramp-on", String(v)); } catch {}
  };
  const setAmt = (v: number) => {
    const c = Math.max(1, Math.min(50, v));
    setAmtState(c);
    try { localStorage.setItem("met-ramp-amt", String(c)); } catch {}
  };
  const setBars = (v: number) => {
    const c = Math.max(1, Math.min(64, v));
    setBarsState(c);
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
    if (slot === 0 && prev > 0) {
      completedRef.current += 1;
      if (completedRef.current >= bars) {
        completedRef.current = 0;
        met.setBpm(bpm + amt);
      }
      setBarsLeft(bars - completedRef.current);
    }
  }, [met.currentSlot]); // eslint-disable-line react-hooks/exhaustive-deps

  return { enabled, setEnabled, amt, setAmt, bars, setBars, barsLeft };
}

export type TempoRamp = ReturnType<typeof useTempoRamp>;

// ─── Provider ────────────────────────────────────────────────────────────────

interface PracticeStationValue {
  met: MetronomeApi;
  ramp: TempoRamp;
  timer: TimerController;
}

const PracticeStationContext = createContext<PracticeStationValue | null>(null);

export function PracticeStationProvider({ children }: { children: ReactNode }) {
  const met = useMetronome();
  const ramp = useTempoRamp(met);
  const timer = useTimer({
    storageKey: "met-timer-sec",
    onLogSession: (sec, label) =>
      addSession({
        startedAt: Date.now() - sec * 1000,
        durationSec: sec,
        source: "practice-station",
        bpm: met.bpm,
        label: label || undefined,
      }),
  });

  return (
    <PracticeStationContext.Provider value={{ met, ramp, timer }}>
      {children}
    </PracticeStationContext.Provider>
  );
}

export function usePracticeStation(): PracticeStationValue {
  const ctx = useContext(PracticeStationContext);
  if (!ctx) {
    throw new Error("usePracticeStation must be used within a PracticeStationProvider");
  }
  return ctx;
}
