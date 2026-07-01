import { useState, useEffect } from "react";
import { CtrlButton } from "./CtrlButton";
import { PageShell } from "./PageShell";
import { PageHeader } from "./PageHeader";
import { TimerView } from "./Timer";
import { useDrone, DronePanel } from "./Drone";
import { CircleKeySelector } from "./CircleKeySelector";
import { KEYS, NOTE_NAMES, mod12 } from "./pentatonicPractice.utils";
import {
  usePracticeStation,
  effectiveSig,
  groupingsFor,
  countString,
  groupingKey,
  TIME_SIGS,
  MET_MIN_BPM,
  MET_MAX_BPM,
  type TimeSig,
  type Subdivision,
  type MetronomeApi,
  type TempoRamp,
} from "./practiceStation";

// ─── Standalone Practice Station page ──────────────────────────────────────────
// A view into the shared, persistent metronome/timer engine (see
// `practiceStation.tsx`). The engine keeps running across navigation; this page is
// the full control surface and the floating MetronomeWidget is the compact remote.

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
// Presentational — the ramp state/logic lives in the shared provider.

function TempoTrainer({
  met,
  ramp,
}: {
  met: MetronomeApi;
  ramp: TempoRamp;
}) {
  const { enabled, setEnabled, amt, setAmt, bars, setBars, barsLeft } = ramp;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-[0.5rem] tracking-[0.18em] uppercase" style={{ color: "var(--muted)" }}>
          Tempo Trainer
        </div>
        <CtrlButton
          label={enabled ? "On" : "Off"}
          active={enabled}
          onClick={() => setEnabled(!enabled)}
          small
        />
      </div>

      {enabled && (
        <div className="flex items-center gap-4 flex-wrap">
          <Stepper
            label="+ bpm"
            value={amt}
            onChange={setAmt}
            steps={[-1, 1]}
            suffix=""
          />
          <Stepper
            label="every"
            value={bars}
            onChange={setBars}
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
  const [keyIdx, setKeyIdx] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const v = parseInt(localStorage.getItem("met-drone-key") ?? "", 10);
    return v >= 0 && v <= 11 ? v : 0;
  });
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
  const { met, ramp, timer } = usePracticeStation();
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

            <TempoTrainer met={met} ramp={ramp} />
          </div>

          {/* ── Timer ── */}
          <div
            className="p-5 max-[700px]:p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <TimerView controller={timer} />
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
