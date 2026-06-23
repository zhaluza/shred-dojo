import { useEffect, useState } from "react";
import { PageShell } from "./PageShell";
import { PageHeader } from "./PageHeader";
import { CtrlButton } from "./CtrlButton";
import { CircleKeySelector } from "./CircleKeySelector";
import { DronePanel, useDrone } from "./Drone";
import { Timer } from "./Timer";
import { CagedConcepts } from "./CagedConcepts";
import { CagedExercises } from "./CagedExercises";
import { KEYS } from "./pentatonicPractice.utils";
import { addSession } from "./practiceLog.utils";
import { noteName, type ConceptMode } from "./cagedImmersion.utils";

// ─── CAGED Immersion — the experience shell ─────────────────────────────────────
// One route, two modules (Concepts / Exercises) sharing a key picker + practice
// rig (drone + timer; metronome is the global floating widget).
// Based on the Guthrie Trapp CAGED / 1-4-5 course.

type Module = "concepts" | "exercises";

function readLS(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(key) ?? fallback;
}

export function CagedImmersion() {
  const [keyIdx, setKeyIdx] = useState<number>(() => {
    const v = parseInt(readLS("caged-key", "1"), 10); // default G
    return v >= 0 && v < KEYS.length ? v : 1;
  });
  const [mode, setMode] = useState<ConceptMode>(() =>
    readLS("caged-mode", "major") === "minor" ? "minor" : "major",
  );
  const [module, setModule] = useState<Module>(() =>
    readLS("caged-module", "concepts") === "exercises" ? "exercises" : "concepts",
  );

  const tonicPc = KEYS[keyIdx].pc;
  const tonic = noteName(tonicPc);
  const drone = useDrone(tonicPc, "caged-drone-vol");

  useEffect(() => { try { localStorage.setItem("caged-key", String(keyIdx)); } catch {} }, [keyIdx]);
  useEffect(() => { try { localStorage.setItem("caged-mode", mode); } catch {} }, [mode]);
  useEffect(() => { try { localStorage.setItem("caged-module", module); } catch {} }, [module]);

  return (
    <PageShell maxWidth={1240}>
      <PageHeader
        eyebrow="Train · Harmony"
        title={<>CAGED <span style={{ color: "var(--accent)" }}>Immersion</span></>}
        subtitle="Guthrie Trapp's CAGED / 1-4-5 method — the core concepts, then seven transposable exercises. Pick a key, turn on the drone, and play."
        meta={[
          { label: "Key", value: tonic },
          { label: "Module", value: module === "concepts" ? "Concepts" : "Exercises" },
        ]}
      />

      {/* Module switcher */}
      <div className="mb-6 flex gap-2 flex-wrap items-center">
        <CtrlButton label="Concepts" active={module === "concepts"} onClick={() => setModule("concepts")} />
        <CtrlButton label="Exercises" active={module === "exercises"} onClick={() => setModule("exercises")} />
        <span className="font-mono text-[0.58rem] tracking-[0.1em] uppercase ml-1" style={{ color: "var(--muted)" }}>
          {module === "concepts" ? "The core concepts" : "Seven transposable exercises"}
        </span>
      </div>

      <div className="grid lg:grid-cols-[1fr_290px] gap-6 items-start">
        {/* Main content */}
        <div className="min-w-0 order-last lg:order-first">
          {module === "concepts" ? (
            <CagedConcepts tonicPc={tonicPc} mode={mode} />
          ) : (
            <CagedExercises tonicPc={tonicPc} />
          )}
        </div>

        {/* Practice rig */}
        <aside className="lg:sticky lg:top-4 border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-5">
          {/* Key picker */}
          <div>
            <div className="text-[0.5rem] tracking-[0.18em] uppercase mb-2" style={{ color: "var(--muted)" }}>
              Key
            </div>
            <div className="flex justify-center">
              <CircleKeySelector keyIdx={keyIdx} mode="major" onSelect={setKeyIdx} />
            </div>
            <div className="mt-1 text-center font-display font-semibold text-[1rem] tracking-[0.04em]">
              {tonic}
            </div>
          </div>

          {/* Concept sound toggle — concepts module only */}
          {module === "concepts" && (
            <div>
              <div className="text-[0.5rem] tracking-[0.18em] uppercase mb-2" style={{ color: "var(--muted)" }}>
                Concept sound
              </div>
              <div className="flex gap-2">
                <CtrlButton label="Major" active={mode === "major"} onClick={() => setMode("major")} small />
                <CtrlButton label="Minor" active={mode === "minor"} onClick={() => setMode("minor")} small />
              </div>
            </div>
          )}

          {/* Drone */}
          <div className="border-t border-[var(--border)] pt-4">
            <DronePanel drone={drone} rootNote={tonic} />
          </div>

          {/* Timer */}
          <div className="border-t border-[var(--border)] pt-4">
            <Timer
              storageKey="caged-timer-sec"
              defaultLabel={`CAGED ${module === "concepts" ? "Concepts" : "Exercises"} — ${tonic}`}
              onLogSession={(sec, label) =>
                addSession({
                  startedAt: Date.now() - sec * 1000,
                  durationSec: sec,
                  source: "caged-immersion",
                  section: module === "concepts" ? "Concepts" : "Exercises",
                  label: label || undefined,
                })
              }
            />
          </div>

          <p className="font-mono text-[0.56rem] leading-[1.6] m-0" style={{ color: "var(--faint)" }}>
            Need a click? The metronome widget floats bottom-right on every page.
          </p>
        </aside>
      </div>
    </PageShell>
  );
}
