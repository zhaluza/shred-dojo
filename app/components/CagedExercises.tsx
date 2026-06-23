import { useEffect, useState } from "react";
import { ChordDiagram } from "./ChordVoicings";
import { CtrlButton } from "./CtrlButton";
import {
  LESSONS,
  lessonHarmony,
  resolveLessonZones,
  exampleImages,
  EXAMPLE_KEY_PC,
  noteName,
} from "./cagedImmersion.utils";

// ─── Module 2: CAGED Exercises ──────────────────────────────────────────────────
// The seven transposable lessons. Each shows its concept + practice steps + the
// transposed harmony, with the CAGED shape diagrams HIDDEN BY DEFAULT (active
// recall): name/find the shapes in this key first, then reveal to check. The
// reveal re-hides whenever the key or lesson changes, so each is a fresh rep.

const TAG_LABEL: Record<string, string> = { Major: "Major", Dominant: "Dominant", Minor: "Minor key" };

export function CagedExercises({ tonicPc }: { tonicPc: number }) {
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showExample, setShowExample] = useState(true);
  const lesson = LESSONS[idx];

  // Re-hide diagrams on any key or lesson change — a new recall rep each time.
  useEffect(() => {
    setRevealed(false);
  }, [tonicPc, idx]);

  const harmony = lessonHarmony(lesson, tonicPc);
  const zones = resolveLessonZones(lesson, tonicPc);
  const tonic = noteName(tonicPc);
  const examples = exampleImages(lesson.id);
  const inExampleKey = tonicPc === EXAMPLE_KEY_PC;

  return (
    <div>
      {/* Lesson selector — letter badge + full title so each exercise is legible */}
      <div className="mb-6 border-b border-[var(--border)] pb-4">
        <div className="text-[0.58rem] tracking-[0.16em] uppercase mb-2" style={{ color: "var(--muted)" }}>
          Exercise
        </div>
        <div className="grid grid-cols-2 max-[640px]:grid-cols-1 gap-2">
          {LESSONS.map((l, i) => {
            const on = i === idx;
            return (
              <button
                key={l.id}
                onClick={() => setIdx(i)}
                aria-pressed={on}
                className="flex items-center gap-3 px-3 py-2 border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg)]"
                style={{
                  background: on ? "var(--surface)" : "transparent",
                  borderColor: on ? "var(--accent)" : "var(--border)",
                  boxShadow: on ? "inset 3px 0 0 0 var(--accent)" : "none",
                }}
              >
                <span
                  className="font-display font-semibold text-[0.95rem] leading-none shrink-0 w-5 text-center"
                  style={{ color: on ? "var(--accent)" : "var(--muted)" }}
                >
                  {l.id}
                </span>
                <span className="font-mono text-[0.66rem] leading-[1.3]" style={{ color: "var(--text)" }}>
                  {l.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail */}
      <section className="border border-[var(--border)] bg-[var(--surface)]" style={{ borderTop: "2px solid var(--accent)" }}>
        {/* Header */}
        <div className="px-4 md:px-5 py-4 border-b border-[var(--border)]">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-display font-semibold text-[1.4rem] leading-none" style={{ color: "var(--accent)" }}>
              {lesson.id}
            </span>
            <h2 className="font-display font-semibold uppercase tracking-[0.03em] leading-none m-0 text-[clamp(1.1rem,2.8vw,1.6rem)] flex-1 min-w-[200px]">
              {lesson.title}
            </h2>
          </div>
          <div className="mt-2 inline-block font-mono text-[0.5rem] tracking-[0.14em] uppercase border border-[var(--border)] px-2 py-[0.2rem]" style={{ color: "var(--muted)" }}>
            {TAG_LABEL[lesson.tag]}
          </div>

          {/* Harmony line in this key */}
          <div className="mt-3 font-mono text-[0.95rem] flex flex-wrap items-center gap-2">
            {harmony.map((c, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span style={{ color: "var(--faint)" }}>→</span>}
                <span className="font-display font-semibold" style={{ color: "var(--accent)" }}>{c}</span>
              </span>
            ))}
            <span className="font-mono text-[0.62rem] tracking-[0.1em] uppercase ml-1" style={{ color: "var(--muted)" }}>
              · key of {tonic}
            </span>
          </div>
        </div>

        {/* Concept + steps */}
        <div className="p-4 md:p-5 grid md:grid-cols-2 gap-x-8 gap-y-5">
          <div>
            <div className="text-[0.5rem] tracking-[0.18em] uppercase mb-2" style={{ color: "var(--muted)" }}>
              Concept
            </div>
            <p className="m-0 font-mono text-[0.74rem] leading-[1.7]" style={{ color: "var(--text)" }}>
              {lesson.concept}
            </p>
          </div>
          <div>
            <div className="text-[0.5rem] tracking-[0.18em] uppercase mb-2" style={{ color: "var(--muted)" }}>
              Practice — in {tonic}
            </div>
            <ol className="m-0 pl-4 flex flex-col gap-2">
              {lesson.steps.map((s, i) => (
                <li key={i} className="font-mono text-[0.72rem] leading-[1.6]" style={{ color: "var(--muted)" }}>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Diagrams — hidden by default */}
        <div className="px-4 md:px-5 pb-5">
          <div className="flex items-center justify-between gap-3 flex-wrap border-t border-[var(--border)] pt-4">
            <div className="text-[0.5rem] tracking-[0.18em] uppercase" style={{ color: "var(--muted)" }}>
              CAGED shapes — key of {tonic}
            </div>
            <CtrlButton
              label={revealed ? "Hide shapes" : "Reveal shapes"}
              active={revealed}
              onClick={() => setRevealed((v) => !v)}
              small
              normalCase
            />
          </div>

          {revealed ? (
            <div className="mt-4 flex flex-col gap-7">
              {zones.map((zone, zi) => (
                <div key={zi}>
                  <div className="font-mono text-[0.6rem] tracking-[0.04em] mb-3" style={{ color: "var(--muted)" }}>
                    {zone.label}
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-7">
                    {zone.cells.map((cell, ci) => (
                      <div key={ci} className="flex flex-col items-center gap-2">
                        <div className="text-center">
                          <div className="font-display font-semibold text-[0.82rem]" style={{ color: "var(--accent)" }}>
                            {cell.role}
                          </div>
                          <div className="font-mono text-[0.62rem]" style={{ color: "var(--muted)" }}>
                            {cell.chord}
                          </div>
                        </div>
                        <ChordDiagram voicing={cell.voicing} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="mt-4 flex items-center justify-center text-center border border-dashed border-[var(--border)] px-4 py-10 font-mono text-[0.68rem] leading-[1.6]"
              style={{ color: "var(--faint)" }}
            >
              Find the shapes in {tonic} yourself first — then reveal to check.
            </div>
          )}
        </div>

        {/* Canonical example — Guthrie's transcription, fixed in G */}
        {examples.length > 0 && (
          <div className="px-4 md:px-5 pb-5">
            <div className="flex items-center justify-between gap-3 flex-wrap border-t border-[var(--border)] pt-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[0.5rem] tracking-[0.18em] uppercase" style={{ color: "var(--muted)" }}>
                  Canonical example
                </span>
                <span
                  className="font-mono text-[0.5rem] tracking-[0.12em] uppercase px-2 py-[0.15rem] border"
                  style={{ color: "var(--accent)", borderColor: "var(--accent)" }}
                >
                  Key of G
                </span>
              </div>
              <CtrlButton
                label={showExample ? "Hide example" : "Show example"}
                active={showExample}
                onClick={() => setShowExample((v) => !v)}
                small
                normalCase
              />
            </div>

            {showExample && (
              <div className="mt-4">
                <p className="m-0 mb-3 font-mono text-[0.64rem] leading-[1.6]" style={{ color: "var(--muted)" }}>
                  Guthrie Trapp's transcription (by Marco Tafelli).
                  This tab is <b style={{ color: "var(--text)" }}>fixed in G</b>
                  {inExampleKey
                    ? " — your diagrams above match."
                    : ` — your diagrams above are in ${tonic}, so move these lines accordingly (or switch the key to G to match exactly).`}
                </p>
                <div className="flex flex-col gap-3">
                  {examples.map((src, i) => (
                    <div key={src} className="bg-white border border-[var(--border)] p-2 md:p-3">
                      <img
                        src={src}
                        alt={`${lesson.title} — canonical transcription in G, page ${i + 1} of ${examples.length}`}
                        className="block w-full h-auto"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
