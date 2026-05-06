import { Fragment, useMemo, useState, useEffect, useRef } from "react";
import { DARK_THEME, LIGHT_THEME } from "./scalePositions.theme";
import { Nav } from "./Nav";
import {
  KEY_NAMES,
  SCALE_TYPES,
  SCALE_TYPE_KEYS,
  buildScale,
  toVexNote,
  type ScaleNote,
  type ScaleType,
} from "./scaleBuilder.utils";

type PageMode = "reference" | "exercise";
type ViewMode = "names" | "staff";
type Feedback = "correct" | "wrong" | null;

const NATURAL_NOTES = ["E", "F", "G", "A", "B", "C", "D"] as const;
const ACCIDENTAL_NOTES = ["F#", "Ab", "Bb", "Db", "Eb"] as const;

// ── Chip ────────────────────────────────────────────────────────────────────
function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "font-display text-[0.68rem] tracking-[0.1em] uppercase border px-[0.75rem] py-[0.28rem] max-[700px]:py-[0.55rem] max-[700px]:px-[1rem] cursor-pointer transition-all",
        active
          ? "bg-[var(--text)] text-[var(--bg)] border-[var(--text)]"
          : "bg-transparent text-[var(--text)] border-[var(--border)] hover:border-[var(--text)]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

// ── NamesView (reference) ───────────────────────────────────────────────────
function NamesView({ notes, steps }: { notes: ScaleNote[]; steps: string[] }) {
  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-2 flex-nowrap py-6 px-1">
        {notes.map((n, i) => (
          <Fragment key={i}>
            <div
              className={[
                "font-display text-[0.9rem] tracking-[0.06em] uppercase border px-3 py-1 shrink-0",
                i === 0
                  ? "bg-[var(--accent)] text-[var(--bg)] border-[var(--accent)]"
                  : "bg-transparent text-[var(--text)] border-[var(--border)]",
              ].join(" ")}
            >
              {n.note}
            </div>
            {i < steps.length && (
              <span
                className="font-mono text-[0.6rem] shrink-0"
                style={{ color: "var(--muted)" }}
              >
                {steps[i]}
              </span>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

// ── ExerciseProgress ────────────────────────────────────────────────────────
function ExerciseProgress({
  notes,
  steps,
  filledNotes,
  currentSlot,
  feedback,
  completed,
}: {
  notes: ScaleNote[];
  steps: string[];
  filledNotes: (string | null)[];
  currentSlot: number;
  feedback: Feedback;
  completed: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-2 flex-nowrap py-4 px-1">
        {notes.map((_, i) => {
          const filled = filledNotes[i];
          const isCurrent = i === currentSlot && !completed;
          const justCorrect = feedback === "correct" && i === currentSlot;

          const chipCls = (() => {
            if (i === 0)
              return "bg-[var(--accent)] text-[var(--bg)] border-[var(--accent)]";
            if (justCorrect)
              return "border-[#2d8a40] bg-[#2d8a40] text-white";
            if (filled !== null)
              return "bg-[var(--text)] text-[var(--bg)] border-[var(--text)]";
            if (isCurrent && feedback === "wrong")
              return "border-[var(--accent)] text-[var(--accent)] bg-transparent";
            if (isCurrent)
              return "border-[var(--text)] text-[var(--text)] bg-transparent";
            return "border-[var(--border)] text-[var(--muted)] bg-transparent";
          })();

          const label = filled ?? (isCurrent ? "?" : "·");

          return (
            <Fragment key={i}>
              <div
                className={`font-display text-[0.9rem] tracking-[0.06em] uppercase border px-3 py-1 shrink-0 min-w-[2.5rem] text-center transition-colors duration-150 ${chipCls}`}
              >
                {label}
              </div>
              {i < steps.length && (
                <span
                  className="font-mono text-[0.6rem] shrink-0"
                  style={{ color: "var(--muted)" }}
                >
                  {steps[i]}
                </span>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ── NotePalette ─────────────────────────────────────────────────────────────
function NotePalette({
  onNote,
  feedback,
  wrongNote,
  disabled,
}: {
  onNote: (note: string) => void;
  feedback: Feedback;
  wrongNote: string | null;
  disabled: boolean;
}) {
  function btnCls(note: string) {
    const isWrong = feedback === "wrong" && note === wrongNote;
    return [
      "font-display text-[0.75rem] tracking-[0.08em] uppercase border px-3 py-[0.28rem] max-[700px]:py-[0.55rem] max-[700px]:px-4 transition-all",
      disabled && !isWrong
        ? "cursor-default opacity-60 bg-transparent text-[var(--text)] border-[var(--border)]"
        : isWrong
        ? "cursor-default bg-[var(--accent)] text-[var(--bg)] border-[var(--accent)]"
        : "cursor-pointer bg-transparent text-[var(--text)] border-[var(--border)] hover:border-[var(--text)]",
    ].join(" ");
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {NATURAL_NOTES.map((n) => (
          <button
            key={n}
            disabled={disabled}
            onClick={() => onNote(n)}
            className={btnCls(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ACCIDENTAL_NOTES.map((n) => (
          <button
            key={n}
            disabled={disabled}
            onClick={() => onNote(n)}
            className={btnCls(n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── StaffView ────────────────────────────────────────────────────────────────
// In reference mode: filledNotes is null → all notes render at full opacity.
// In exercise mode: filledNotes is an array; filled slots render fully, the
// current slot renders at ~40% opacity (target ghost), future slots at ~12%.
function StaffView({
  scaleNotes,
  isDark,
  filledNotes = null,
  currentSlot = 0,
  feedback = null,
  completed = false,
}: {
  scaleNotes: ScaleNote[];
  isDark: boolean;
  filledNotes?: (string | null)[] | null;
  currentSlot?: number;
  feedback?: Feedback;
  completed?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || containerWidth < 10) return;
    let cancelled = false;

    import("vexflow").then(
      ({ Renderer, Stave, StaveNote, Voice, Formatter, Accidental }) => {
        if (cancelled || !containerRef.current) return;
        el.innerHTML = "";

        const renderer = new Renderer(el, Renderer.Backends.SVG);
        renderer.resize(containerWidth, 200);
        const ctx = renderer.getContext();

        const textColor = isDark ? "#e8e0d0" : "#1a1612";
        ctx.setFillStyle(textColor);
        ctx.setStrokeStyle(textColor);

        const stave = new Stave(10, 40, containerWidth - 20);
        stave.addClef("treble");
        stave.setContext(ctx).draw();

        const isExercise = filledNotes !== null;

        const vexNotes = scaleNotes.map((sn, i) => {
          const { key, accidental } = toVexNote(sn);
          const note = new StaveNote({ keys: [key], duration: "q" });
          if (accidental) note.addModifier(new Accidental(accidental), 0);

          if (isExercise) {
            const filled = filledNotes![i];
            const isCurrent = i === currentSlot && !completed;
            const justCorrect = feedback === "correct" && i === currentSlot;

            if (filled !== null) {
              const color = justCorrect ? "#2d8a40" : textColor;
              note.setStyle({ fillStyle: color, strokeStyle: color });
            } else if (isCurrent) {
              const color =
                feedback === "wrong"
                  ? "#b03020"
                  : isDark
                  ? "rgba(232,224,208,0.42)"
                  : "rgba(26,22,18,0.38)";
              note.setStyle({ fillStyle: color, strokeStyle: color });
            } else {
              const ghost = isDark
                ? "rgba(232,224,208,0.12)"
                : "rgba(26,22,18,0.12)";
              note.setStyle({ fillStyle: ghost, strokeStyle: ghost });
            }
          }

          return note;
        });

        const voice = new Voice({ numBeats: vexNotes.length, beatValue: 4 });
        voice.setMode(Voice.Mode.SOFT);
        voice.addTickables(vexNotes);

        const noteAreaWidth =
          stave.getWidth() - (stave.getNoteStartX() - stave.getX()) - 10;
        new Formatter().joinVoices([voice]).format([voice], noteAreaWidth);
        voice.draw(ctx, stave);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [scaleNotes, isDark, containerWidth, filledNotes, currentSlot, feedback, completed]);

  return <div ref={containerRef} className="w-full" />;
}

// ── ScaleBuilder ─────────────────────────────────────────────────────────────
export function ScaleBuilder() {
  // ── Theme ──────────────────────────────────────────────────────────────────
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem("shred-dojo-dark") === "true";
    } catch {
      return false;
    }
  });

  // ── Key / scale ────────────────────────────────────────────────────────────
  const [keyIdx, setKeyIdx] = useState(() => {
    if (typeof window === "undefined") return 0;
    const n = Number(localStorage.getItem("shred-dojo-key") ?? NaN);
    return Number.isInteger(n) && n >= 0 && n < 12 ? n : 0;
  });
  const [scaleType, setScaleType] = useState<ScaleType>("major");

  // ── Mode ───────────────────────────────────────────────────────────────────
  const [pageMode, setPageMode] = useState<PageMode>("reference");
  const [viewMode, setViewMode] = useState<ViewMode>("names");

  // ── Exercise ───────────────────────────────────────────────────────────────
  const [filledNotes, setFilledNotes] = useState<(string | null)[]>([]);
  const [currentSlot, setCurrentSlot] = useState(1);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [wrongNote, setWrongNote] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  // ── Derived ────────────────────────────────────────────────────────────────
  const config = SCALE_TYPES[scaleType];
  const scaleNotes = useMemo(
    () => buildScale(KEY_NAMES[keyIdx], config.intervals),
    [keyIdx, config.intervals]
  );

  // ── Helpers ────────────────────────────────────────────────────────────────
  function toggleDark() {
    const next = !isDark;
    setIsDark(next);
    try {
      localStorage.setItem("shred-dojo-dark", String(next));
    } catch {}
  }

  function handleKeyIdx(i: number) {
    setKeyIdx(i);
    try {
      localStorage.setItem("shred-dojo-key", String(i));
    } catch {}
  }

  function initExercise(notes: ScaleNote[]) {
    setFilledNotes(notes.map((n, i) => (i === 0 ? n.note : null)));
    setCurrentSlot(1);
    setFeedback(null);
    setWrongNote(null);
    setCompleted(false);
  }

  // Reset exercise when entering exercise mode or when scale/key changes
  useEffect(() => {
    if (pageMode === "exercise") initExercise(scaleNotes);
    // scaleNotes reference changes when key or scale type changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageMode, scaleNotes]);

  function handleNoteAnswer(noteName: string) {
    if (feedback || completed) return;
    const correct = scaleNotes[currentSlot].note === noteName;

    if (correct) {
      const next = [...filledNotes];
      next[currentSlot] = noteName;
      setFilledNotes(next);
      setFeedback("correct");
      setTimeout(() => {
        setFeedback(null);
        const next = currentSlot + 1;
        if (next >= scaleNotes.length) setCompleted(true);
        else setCurrentSlot(next);
      }, 450);
    } else {
      setWrongNote(noteName);
      setFeedback("wrong");
      setTimeout(() => {
        setFeedback(null);
        setWrongNote(null);
      }, 600);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-dvh flex flex-col bg-[var(--bg)] text-[var(--text)] transition-colors duration-200"
      style={isDark ? DARK_THEME : LIGHT_THEME}
    >
      <Nav isDark={isDark} toggleDark={toggleDark} />
      <main className="flex-1 px-5 md:px-8 py-8 max-w-[760px] mx-auto w-full">
        <h1 className="font-display font-semibold text-[clamp(1.8rem,5vw,2.8rem)] tracking-[0.04em] uppercase leading-none mb-8">
          Scale <span style={{ color: "var(--accent)" }}>Builder</span>
        </h1>

        <div className="flex flex-col gap-6">
          {/* Key selector */}
          <div className="flex flex-col gap-2">
            <span
              className="text-[0.58rem] tracking-[0.16em] uppercase"
              style={{ color: "var(--muted)" }}
            >
              Key
            </span>
            <div className="flex flex-wrap gap-1.5">
              {KEY_NAMES.map((name, i) => (
                <Chip
                  key={name}
                  label={name}
                  active={keyIdx === i}
                  onClick={() => handleKeyIdx(i)}
                />
              ))}
            </div>
          </div>

          {/* Scale type selector */}
          <div className="flex flex-col gap-2">
            <span
              className="text-[0.58rem] tracking-[0.16em] uppercase"
              style={{ color: "var(--muted)" }}
            >
              Scale
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SCALE_TYPE_KEYS.map((k) => (
                <Chip
                  key={k}
                  label={SCALE_TYPES[k].label}
                  active={scaleType === k}
                  onClick={() => setScaleType(k)}
                />
              ))}
            </div>
          </div>

          {/* Formula */}
          <div className="flex flex-col gap-2">
            <span
              className="text-[0.58rem] tracking-[0.16em] uppercase"
              style={{ color: "var(--muted)" }}
            >
              Formula
            </span>
            <div className="flex items-center gap-1 flex-wrap font-mono text-[0.8rem]">
              {config.steps.map((step, i) => (
                <Fragment key={i}>
                  {i > 0 && <span style={{ color: "var(--faint)" }}>—</span>}
                  <span
                    className="font-semibold"
                    style={{ color: "var(--accent)" }}
                  >
                    {step}
                  </span>
                </Fragment>
              ))}
              <span
                className="ml-3 text-[0.65rem] tracking-[0.1em] font-display uppercase"
                style={{ color: "var(--muted)" }}
              >
                (W = whole · H = half · WH = whole + half)
              </span>
            </div>
          </div>

          {/* Mode + View toggles */}
          <div className="flex flex-wrap items-end gap-6">
            <div className="flex flex-col gap-2">
              <span
                className="text-[0.58rem] tracking-[0.16em] uppercase"
                style={{ color: "var(--muted)" }}
              >
                Mode
              </span>
              <div className="flex gap-1.5">
                <Chip
                  label="Reference"
                  active={pageMode === "reference"}
                  onClick={() => setPageMode("reference")}
                />
                <Chip
                  label="Exercise"
                  active={pageMode === "exercise"}
                  onClick={() => setPageMode("exercise")}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span
                className="text-[0.58rem] tracking-[0.16em] uppercase"
                style={{ color: "var(--muted)" }}
              >
                View
              </span>
              <div className="flex gap-1.5">
                <Chip
                  label="Names"
                  active={viewMode === "names"}
                  onClick={() => setViewMode("names")}
                />
                <Chip
                  label="Staff"
                  active={viewMode === "staff"}
                  onClick={() => setViewMode("staff")}
                />
              </div>
            </div>
          </div>

          {/* Output */}
          {pageMode === "reference" ? (
            <div
              className="border px-5 py-4"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              {viewMode === "names" ? (
                <NamesView notes={scaleNotes} steps={config.steps} />
              ) : (
                <StaffView scaleNotes={scaleNotes} isDark={isDark} />
              )}
            </div>
          ) : (
            /* ── Exercise mode ─────────────────────────────────────────── */
            <div className="flex flex-col gap-4">
              {/* Progress + optional staff */}
              <div
                className="border px-5 py-2"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <ExerciseProgress
                  notes={scaleNotes}
                  steps={config.steps}
                  filledNotes={filledNotes}
                  currentSlot={currentSlot}
                  feedback={feedback}
                  completed={completed}
                />
                {viewMode === "staff" && (
                  <div className="pb-2">
                    <StaffView
                      scaleNotes={scaleNotes}
                      isDark={isDark}
                      filledNotes={filledNotes}
                      currentSlot={currentSlot}
                      feedback={feedback}
                      completed={completed}
                    />
                  </div>
                )}
              </div>

              {/* Palette or completion */}
              {completed ? (
                <div
                  className="border px-5 py-4 flex items-center justify-between gap-4"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                >
                  <span
                    className="font-display text-[0.85rem] tracking-[0.08em] uppercase"
                    style={{ color: "#2d8a40" }}
                  >
                    Scale complete
                  </span>
                  <button
                    onClick={() => initExercise(scaleNotes)}
                    className="font-display text-[0.68rem] tracking-[0.1em] uppercase border px-[0.75rem] py-[0.28rem] max-[700px]:py-[0.55rem] max-[700px]:px-[1rem] cursor-pointer transition-all bg-transparent text-[var(--text)] border-[var(--border)] hover:border-[var(--text)]"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <span
                    className="text-[0.58rem] tracking-[0.16em] uppercase"
                    style={{ color: "var(--muted)" }}
                  >
                    {viewMode === "staff"
                      ? "Name the highlighted note"
                      : "Enter the next note"}
                  </span>
                  <NotePalette
                    onNote={handleNoteAnswer}
                    feedback={feedback}
                    wrongNote={wrongNote}
                    disabled={!!feedback}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
