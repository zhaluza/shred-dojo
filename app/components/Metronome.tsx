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

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.1;
const MET_MIN_BPM = 30;
const MET_MAX_BPM = 220;
const DEFAULT_BPM = 100;
const DEFAULT_VOLUME = 0.85; // 0–1 master level; louder than the old fixed gains
// Peak gain per click tier at full volume (square wave). Pushed high so the
// short click reads loud against an amp; the master volume scales these down.
// `accent` marks the first pulse of an interior beat-group (e.g. beat 4 of 6/8).
const TIER_GAIN = { downbeat: 0.95, accent: 0.82, beat: 0.7, sub: 0.42 };

type Subdivision = 1 | 2 | 3;

// ─── Time signatures ─────────────────────────────────────────────────────────
// `num` = pulses per measure (the metronome clicks each one); `groups` = how
// those pulses are accented — the first pulse of each group gets an accent, and
// the very first is the downbeat. Subdivision layers extra clicks per beat.
type TimeSig = { id: string; num: number; groups: number[]; starts: Set<number> };

function makeSig(id: string, num: number, groups: number[]): TimeSig {
  const starts = new Set<number>();
  let acc = 0;
  for (const g of groups) {
    starts.add(acc);
    acc += g;
  }
  return { id, num, groups, starts };
}

// Odd/compound meters use their conventional groupings (5→3+2, 7/8→2+2+3, …).
const TIME_SIGS: TimeSig[] = [
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
// Odd meters can be felt with different accent groupings (5 = 3+2, 2+3, …). Each
// grouping reshapes which pulses get the accent; the metronome's accent already
// lands on each group's first pulse, so a grouping is just an alternate `groups`
// array. Keyed by pulse count so it applies to any odd meter of that length
// (5/8 and 5/4 share the 5-pulse set). `style`/`note` are the descriptive labels;
// the "ONE-two-three / ONE-two" counting line is derived from the group sizes.
type Grouping = { groups: number[]; style: string; note: string };

const COUNT_WORDS = ["ONE", "two", "three", "four", "five", "six", "seven"];

// "ONE-two-three / ONE-two" — first pulse of each group capitalised.
function countString(groups: number[]): string {
  return groups.map((g) => COUNT_WORDS.slice(0, g).join("-")).join(" / ");
}

function groupingKey(groups: number[]): string {
  return groups.join("-");
}

// First entry per length is the conventional default (matches the TIME_SIGS groups).
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

function groupingsFor(num: number): Grouping[] | null {
  return GROUPINGS_BY_NUM[num] ?? null;
}

// The sig actually driving the scheduler/dial: an odd meter's accents follow the
// chosen grouping; everything else uses its conventional groups.
function effectiveSig(timeSigId: string, grouping: number[]): TimeSig {
  const base = sigById(timeSigId);
  if (!groupingsFor(base.num)) return base;
  return makeSig(base.id, base.num, grouping);
}

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
    const sub = subRef.current;
    const sig = sigRef.current;
    const isBeat = slot % sub === 0;
    const beatIdx = slot / sub;
    const isGroupStart = isBeat && (beatIdx === 0 || sig.starts.has(beatIdx));
    // Accents-only (math-rock practice): only the first pulse of each group
    // sounds — the rest stay silent but still advance the dial. Limited to meters
    // that expose groupings so it never silently mutes a normal meter.
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
      // Floor at a tiny epsilon: exponential ramps can't target 0, and this keeps
      // volume 0% effectively silent without breaking the envelope.
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
  timeSig,
  currentSlot,
  isPlaying,
  reduced,
  accentsOnly,
}: {
  bpm: number;
  subdivision: Subdivision;
  timeSig: TimeSig;
  currentSlot: number;
  isPlaying: boolean;
  reduced: boolean;
  accentsOnly: boolean;
}) {
  const totalSlots = timeSig.num * subdivision;
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
          const beatIdx = i / subdivision;
          const isDown = isBeat && beatIdx === 0;
          const isAccent = isBeat && timeSig.starts.has(beatIdx);
          const isActive = isPlaying && i === currentSlot;
          const isGroupStart = isBeat && (isDown || isAccent);
          // Accents-only: the silent pulses fade back so the eye locks onto the
          // accented group-starts that actually sound.
          const muted = accentsOnly && !isGroupStart;
          const r = isActive ? 8 : isDown ? 6 : isAccent ? 5.5 : isBeat ? 5 : 3.5;
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
              style={{ opacity: muted && !isActive ? 0.3 : 1, transition: reduced ? "none" : "r 80ms ease-out, fill 120ms ease-out, opacity 120ms ease-out" }}
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
            background: subdivision === val ? "var(--accent)" : "transparent",
            borderColor: subdivision === val ? "var(--accent)" : "var(--border)",
            color: subdivision === val ? "var(--bg)" : "var(--text)",
            boxShadow: subdivision === val ? "var(--glow)" : undefined,
          }}
        >
          {label ?? <TripletIcon />}
        </button>
      ))}
    </div>
  );
}

// ─── Time signature selector ─────────────────────────────────────────────────

function TimeSigButtons({
  timeSig,
  setTimeSig,
}: {
  timeSig: string;
  setTimeSig: (v: string) => void;
}) {
  return (
    <div className="flex gap-1 flex-wrap justify-center">
      {TIME_SIGS.map((t) => (
        <button
          key={t.id}
          onClick={() => setTimeSig(t.id)}
          aria-label={`Time signature ${t.id}`}
          aria-pressed={timeSig === t.id}
          className="font-display text-[0.7rem] tabular-nums px-[0.55rem] py-[0.35rem] max-[700px]:min-h-[44px] border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          style={{
            background: timeSig === t.id ? "var(--accent)" : "transparent",
            borderColor: timeSig === t.id ? "var(--accent)" : "var(--border)",
            color: timeSig === t.id ? "var(--bg)" : "var(--text)",
            boxShadow: timeSig === t.id ? "var(--glow)" : undefined,
          }}
        >
          {t.id}
        </button>
      ))}
    </div>
  );
}

// ─── Math-rock grouping selector ─────────────────────────────────────────────
// Shown only for odd meters that expose alternate accent groupings (5/8, 7/8…).
// Picks how the bar is felt (3+2 vs 2+3 …) and offers an accents-only practice
// mode (strum only on the accents — the "ONE two three FOUR five" exercise).

function GroupingPanel({
  num,
  grouping,
  setGrouping,
  accentsOnly,
  setAccentsOnly,
}: {
  num: number;
  grouping: number[];
  setGrouping: (g: number[]) => void;
  accentsOnly: boolean;
  setAccentsOnly: (v: boolean) => void;
}) {
  const options = groupingsFor(num);
  if (!options) return null;
  const activeKey = groupingKey(grouping);
  const active = options.find((o) => groupingKey(o.groups) === activeKey) ?? options[0];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <span className="text-[0.5rem] tracking-[0.16em] uppercase" style={{ color: "var(--muted)" }}>
          Groupings
        </span>
        <CtrlButton
          label="Accents only"
          active={accentsOnly}
          onClick={() => setAccentsOnly(!accentsOnly)}
          title="Silence the in-between pulses — click only on the accent of each group"
          small
          normalCase
        />
      </div>

      <div className="flex gap-1 flex-wrap justify-center">
        {options.map((o) => {
          const k = groupingKey(o.groups);
          const on = k === activeKey;
          return (
            <button
              key={k}
              onClick={() => setGrouping(o.groups)}
              aria-label={`Grouping ${o.groups.join(" plus ")}`}
              aria-pressed={on}
              className="font-display text-[0.7rem] tabular-nums px-[0.55rem] py-[0.35rem] max-[700px]:min-h-[44px] border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              style={{
                background: on ? "var(--accent)" : "transparent",
                borderColor: on ? "var(--accent)" : "var(--border)",
                color: on ? "var(--bg)" : "var(--text)",
                boxShadow: on ? "var(--glow)" : undefined,
              }}
            >
              {o.groups.join("+")}
            </button>
          );
        })}
      </div>

      <div className="text-center leading-snug">
        <div className="font-mono text-[0.72rem]" style={{ color: "var(--accent)" }}>
          {countString(active.groups)}
        </div>
        <div className="text-[0.6rem]" style={{ color: "var(--muted)" }}>
          {active.style} — {active.note}
        </div>
      </div>
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
  const { bpm, setBpm, subdivision, setSubdivision, timeSig, setTimeSig, grouping, setGrouping, accentsOnly, setAccentsOnly, volume, setVolume, isPlaying, toggle, currentSlot, handleTap } = met;
  const sig = effectiveSig(timeSig, grouping);
  const hasGroupings = !!groupingsFor(sig.num);
  const volPct = Math.round(volume * 100);
  const feel = subdivision === 1 ? "Quarter" : subdivision === 2 ? "Eighth" : "Triplet";

  return (
    <PageShell maxWidth={960}>
      <PageHeader
        eyebrow="Practice Station"
        title="Metronome"
        meta={[
          { label: "Tempo", value: `${bpm} BPM` },
          { label: "Meter", value: hasGroupings ? `${timeSig} · ${grouping.join("+")}` : timeSig },
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
              timeSig={sig}
              currentSlot={currentSlot}
              isPlaying={isPlaying}
              reduced={reduced}
              accentsOnly={accentsOnly && hasGroupings}
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

            {/* Time signature */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[0.5rem] tracking-[0.16em] uppercase" style={{ color: "var(--muted)" }}>
                Meter
              </span>
              <TimeSigButtons timeSig={timeSig} setTimeSig={setTimeSig} />
            </div>

            {hasGroupings && (
              <GroupingPanel
                num={sig.num}
                grouping={grouping}
                setGrouping={setGrouping}
                accentsOnly={accentsOnly}
                setAccentsOnly={setAccentsOnly}
              />
            )}

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
