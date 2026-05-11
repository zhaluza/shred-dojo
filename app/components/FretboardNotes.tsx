import { useState, useMemo, useRef, useEffect } from "react";
import { DARK_THEME, LIGHT_THEME, STRING_LINE } from "./scalePositions.theme";
import { Nav } from "./Nav";
import type { StringName } from "./scalePositions.types";

// ─── Data ──────────────────────────────────────────────────────────────────────

const NOTES = [
  "E", "F", "F#", "G", "Ab", "A", "Bb", "B", "C", "Db", "D", "Eb",
] as const;
type NoteName = (typeof NOTES)[number];

const OPEN_OFFSETS: Record<StringName, number> = {
  E: 0, A: 5, D: 10, G: 3, B: 7, e: 0,
};

const ALL_STRINGS: StringName[] = ["E", "A", "D", "G", "B", "e"];
// top to bottom — matches guitar perspective (high e at top)
const DISPLAY_STRINGS: StringName[] = ["e", "B", "G", "D", "A", "E"];

const NATURAL_NOTES: NoteName[] = ["E", "F", "G", "A", "B", "C", "D"];
const ACCIDENTAL_NOTES: NoteName[] = ["F#", "Ab", "Bb", "Db", "Eb"];
const NATURAL_IDXS = new Set([0, 1, 3, 5, 7, 8, 10]);

const FRET_DOTS = new Set([3, 5, 7, 9]);
const FRET_DOUBLE = new Set([12, 24]);

const STR_DISPLAY: Record<StringName, string> = {
  e: "1 (e)", B: "2 (B)", G: "3 (G)", D: "4 (D)", A: "5 (A)", E: "6 (E)",
};

// ─── Types ─────────────────────────────────────────────────────────────────────

type NoteScope = "naturals" | "accidentals" | "both";

interface QuizSettings {
  strings: StringName[];
  scope: NoteScope;
  maxFret: number;
}

interface Question {
  string: StringName;
  fret: number;
  note: NoteName;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function noteAt(s: StringName, fret: number): NoteName {
  return NOTES[(OPEN_OFFSETS[s] + fret) % 12];
}

function buildPool(cfg: QuizSettings): Question[] {
  const out: Question[] = [];
  for (const str of cfg.strings) {
    for (let f = 0; f <= cfg.maxFret; f++) {
      const note = noteAt(str, f);
      const isNatural = NATURAL_IDXS.has(NOTES.indexOf(note));
      if (cfg.scope === "naturals" && !isNatural) continue;
      if (cfg.scope === "accidentals" && isNatural) continue;
      out.push({ string: str, fret: f, note });
    }
  }
  return out;
}

function pickNext(pool: Question[], prev: Question | null): Question {
  if (pool.length === 1) return pool[0];
  const candidates = prev
    ? pool.filter(q => !(q.string === prev.string && q.fret === prev.fret))
    : pool;
  const src = candidates.length > 0 ? candidates : pool;
  return src[Math.floor(Math.random() * src.length)];
}

function hsKey(cfg: QuizSettings): string {
  return `fn-hs-${[...cfg.strings].sort().join("")}-${cfg.scope}-${cfg.maxFret}`;
}

function loadHs(cfg: QuizSettings): number {
  try { return parseInt(localStorage.getItem(hsKey(cfg)) ?? "0", 10) || 0; } catch { return 0; }
}

function saveHs(cfg: QuizSettings, v: number): void {
  try { localStorage.setItem(hsKey(cfg), String(v)); } catch {}
}

// ─── Audio ─────────────────────────────────────────────────────────────────────

// MIDI note number for each open string (standard tuning)
const OPEN_MIDI: Record<StringName, number> = {
  E: 40, A: 45, D: 50, G: 55, B: 59, e: 64,
};

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function playCorrectTone(ctx: AudioContext, string: StringName, fret: number) {
  const freq = midiToHz(OPEN_MIDI[string] + fret);
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.28, now + 0.008); // fast attack
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2); // natural decay

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 1.2);
}

// ─── Chip button ───────────────────────────────────────────────────────────────

function Chip({
  label, active, onClick, disabled,
}: {
  label: string; active: boolean; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "font-display text-[0.68rem] tracking-[0.1em] uppercase border px-[0.75rem] py-[0.28rem] max-[700px]:py-[0.55rem] max-[700px]:px-[1rem] cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed",
        active
          ? "bg-[var(--text)] text-[var(--bg)] border-[var(--text)]"
          : "bg-transparent text-[var(--text)] border-[var(--border)] hover:border-[var(--text)]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

// ─── Fretboard ─────────────────────────────────────────────────────────────────

const OPEN_W = 36;
const NUT_W = 8;
const FRET_W = 40;
const STR_H = 38;

function QuizFretboard({
  question, maxFret, feedback,
}: {
  question: Question | null;
  maxFret: number;
  feedback: "correct" | "wrong" | null;
}) {
  const frets = Array.from({ length: maxFret }, (_, i) => i + 1);

  const dotBg =
    feedback === "correct" ? "var(--feedback-correct)" :
    feedback === "wrong"   ? "var(--feedback-wrong)" :
    "var(--accent)";

  const dotShadow =
    feedback === "correct" ? "0 0 10px rgba(50,200,80,0.45)" :
    feedback === "wrong"   ? "0 0 10px rgba(200,60,30,0.45)" :
    "0 2px 8px rgba(0,0,0,0.3)";

  // Inlay dot geometry — positions between specific string pairs
  // Row indices (top→bottom): e=0, B=1, G=2, D=3, A=4, E=5
  // Midpoint between rows i and i+1 = (i+1)*STR_H
  const INLAY_D = 8;
  const INLAY_R = INLAY_D / 2;
  const INLAY_Y_SINGLE = 3 * STR_H; // between G(2) and D(3)
  const INLAY_Y_DBL_TOP = 2 * STR_H; // between B(1) and G(2)
  const INLAY_Y_DBL_BOT = 4 * STR_H; // between D(3) and A(4)

  return (
    <div className="w-full overflow-x-auto">
      <div style={{ minWidth: OPEN_W + NUT_W + frets.length * FRET_W }}>
        {/* Fretboard body */}
        <div className="border border-[var(--border)] relative" style={{ background: "var(--surface)" }}>
          {/* Fret inlay markers — rendered on the fretboard surface */}
          <div className="absolute inset-0 pointer-events-none">
            {frets.map(f => {
              if (!FRET_DOTS.has(f) && !FRET_DOUBLE.has(f)) return null;
              const cx = OPEN_W + NUT_W + (f - 1) * FRET_W + FRET_W / 2;
              const x = cx - INLAY_R;
              if (FRET_DOUBLE.has(f)) {
                return (
                  <div key={f}>
                    <div className="absolute rounded-full" style={{ width: INLAY_D, height: INLAY_D, left: x, top: INLAY_Y_DBL_TOP - INLAY_R, background: "var(--faint)" }} />
                    <div className="absolute rounded-full" style={{ width: INLAY_D, height: INLAY_D, left: x, top: INLAY_Y_DBL_BOT - INLAY_R, background: "var(--faint)" }} />
                  </div>
                );
              }
              return (
                <div key={f} className="absolute rounded-full" style={{ width: INLAY_D, height: INLAY_D, left: x, top: INLAY_Y_SINGLE - INLAY_R, background: "var(--faint)" }} />
              );
            })}
          </div>
          {DISPLAY_STRINGS.map(str => {
            const { height: sh, colorVar } = STRING_LINE[str];
            const isTarget = question?.string === str;

            return (
              <div key={str} className="relative flex items-center" style={{ height: STR_H }}>
                {/* Open string cell (fret 0) */}
                <div
                  className="relative shrink-0 flex items-center justify-center"
                  style={{ width: OPEN_W, height: STR_H }}
                >
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none" style={{ height: sh, background: colorVar }} />
                  {isTarget && question.fret === 0 && (
                    <div
                      className="w-[22px] h-[22px] rounded-full relative z-[2] transition-all duration-200 animate-pulse"
                      style={{ background: dotBg, boxShadow: dotShadow, animationPlayState: feedback ? "paused" : "running" }}
                    />
                  )}
                </div>

                {/* Nut */}
                <div
                  className="shrink-0 relative z-[1]"
                  style={{ width: NUT_W, height: STR_H, background: "var(--faint)" }}
                />

                {/* Fret cells */}
                {frets.map(f => {
                  const isDot = isTarget && question?.fret === f;
                  return (
                    <div
                      key={f}
                      className="relative shrink-0 flex items-center justify-center"
                      style={{ width: FRET_W, height: STR_H }}
                    >
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none" style={{ height: sh, background: colorVar }} />
                      <div className="absolute right-0 top-0 bottom-0" style={{ width: 1.5, background: "var(--fret-bar)" }} />
                      {isDot && (
                        <div
                          className="w-[22px] h-[22px] rounded-full relative z-[2] transition-all duration-200 animate-pulse"
                          style={{ background: dotBg, boxShadow: dotShadow, animationPlayState: feedback ? "paused" : "running" }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

// ─── Answer button ─────────────────────────────────────────────────────────────

function AnswerBtn({
  note, onClick, state,
}: {
  note: NoteName;
  onClick: () => void;
  state: "correct" | "wrong" | "idle";
}) {
  return (
    <button
      onClick={onClick}
      className="font-display text-[0.85rem] tracking-[0.06em] uppercase border transition-all duration-150 cursor-pointer min-w-[52px] py-[0.48rem] px-3 hover:border-[var(--text)]"
      style={{
        background:
          state === "correct" ? "var(--accent)" :
          state === "wrong"   ? "rgba(180,50,30,0.18)" :
          "transparent",
        borderColor:
          state === "correct" ? "var(--accent)" :
          state === "wrong"   ? "var(--feedback-wrong)" :
          "var(--border)",
        color:
          state === "correct" ? "var(--bg)" :
          state === "wrong"   ? "var(--feedback-wrong)" :
          "var(--text)",
      }}
    >
      {note}
    </button>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: QuizSettings = {
  strings: [...ALL_STRINGS],
  scope: "naturals",
  maxFret: 12,
};

export function FretboardNotes() {
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem("shred-dojo-dark") === "true"; } catch { return false; }
  });

  const [settings, setSettings] = useState<QuizSettings>(DEFAULT_SETTINGS);
  const [active, setActive] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(() => loadHs(DEFAULT_SETTINGS));
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [flashNote, setFlashNote] = useState<NoteName | null>(null);

  const prevQ = useRef<Question | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const pool = useMemo(() => buildPool(settings), [settings]);

  useEffect(() => {
    return () => { audioCtx.current?.close(); };
  }, []);

  function toggleDark() {
    const next = !isDark;
    setIsDark(next);
    try { localStorage.setItem("shred-dojo-dark", String(next)); } catch {}
  }

  function patchSettings(patch: Partial<QuizSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    setHighScore(loadHs(next));
  }

  function toggleString(str: StringName) {
    const has = settings.strings.includes(str);
    if (has && settings.strings.length === 1) return;
    patchSettings({
      strings: has
        ? settings.strings.filter(s => s !== str)
        : [...settings.strings, str],
    });
  }

  function start() {
    if (pool.length === 0) return;
    const q = pickNext(pool, null);
    prevQ.current = q;
    setQuestion(q);
    setCorrect(0);
    setTotal(0);
    setStreak(0);
    setFeedback(null);
    setFlashNote(null);
    setHighScore(loadHs(settings));
    setActive(true);
  }

  function quit() {
    setActive(false);
    setQuestion(null);
    setFeedback(null);
    setFlashNote(null);
  }

  function answer(note: NoteName) {
    if (!question || feedback !== null) return;

    const isCorrect = note === question.note;
    setTotal(t => t + 1);
    setFlashNote(note);

    if (isCorrect) {
      const newStreak = streak + 1;
      setCorrect(c => c + 1);
      setStreak(newStreak);
      setFeedback("correct");
      try {
        if (!audioCtx.current) audioCtx.current = new AudioContext();
        playCorrectTone(audioCtx.current, question.string, question.fret);
      } catch {};
      if (newStreak > highScore) {
        setHighScore(newStreak);
        saveHs(settings, newStreak);
      }
      setTimeout(() => {
        const q = pickNext(pool, question);
        prevQ.current = q;
        setQuestion(q);
        setFeedback(null);
        setFlashNote(null);
      }, 550);
    } else {
      setStreak(0);
      setFeedback("wrong");
      setTimeout(() => {
        setFeedback(null);
        setFlashNote(null);
      }, 650);
    }
  }

  const accuracy = total > 0 ? Math.round((correct / total) * 100) : null;

  return (
    <div
      className="min-h-dvh flex flex-col bg-[var(--bg)] text-[var(--text)] transition-colors duration-200"
      style={isDark ? DARK_THEME : LIGHT_THEME}
    >
      <Nav isDark={isDark} toggleDark={toggleDark} />

      <main className="flex-1 px-5 md:px-8 py-8 [@media(max-height:500px)]:py-3 max-w-[740px] mx-auto w-full">
        {/* Header */}
        <div className="mb-7">
          <h1 className="font-display font-semibold text-[clamp(1.7rem,5vw,2.6rem)] tracking-[0.04em] uppercase leading-none">
            Note{" "}
            <span style={{ color: "var(--accent)" }}>Recognition</span>
          </h1>
          <p
            className="mt-[6px] font-mono text-[0.8rem] leading-relaxed max-w-md"
            style={{ color: "var(--muted)" }}
          >
            Identify the highlighted note. Build instant recognition one fret at a time.
          </p>
        </div>

        {/* Score bar (quiz active) */}
        {active && (
          <div
            className="mb-5 px-5 py-3 border border-[var(--border)] flex items-center gap-6 flex-wrap"
            style={{ background: "var(--surface)" }}
          >
            <div>
              <div
                className="text-[0.5rem] tracking-[0.18em] uppercase mb-[3px]"
                style={{ color: "var(--muted)" }}
              >
                Score
              </div>
              <div className="font-display text-[1rem] tracking-[0.04em]">
                {correct}/{total}
                {accuracy !== null && (
                  <span
                    className="ml-[6px] text-[0.72rem]"
                    style={{ color: "var(--muted)" }}
                  >
                    {accuracy}%
                  </span>
                )}
              </div>
            </div>

            <div>
              <div
                className="text-[0.5rem] tracking-[0.18em] uppercase mb-[3px]"
                style={{ color: "var(--muted)" }}
              >
                Streak
              </div>
              <div
                className="font-display text-[1rem] tracking-[0.04em] transition-colors"
                style={{ color: streak > 0 ? "var(--accent)" : "var(--text)" }}
              >
                {streak}
              </div>
            </div>

            <div>
              <div
                className="text-[0.5rem] tracking-[0.18em] uppercase mb-[3px]"
                style={{ color: "var(--muted)" }}
              >
                Best Streak
              </div>
              <div className="font-display text-[1rem] tracking-[0.04em]">{highScore}</div>
            </div>

            <button
              onClick={quit}
              className="ml-auto font-display text-[0.62rem] tracking-[0.1em] uppercase border border-[var(--border)] bg-transparent px-3 py-[0.28rem] max-[700px]:py-[0.55rem] max-[700px]:px-4 max-[700px]:min-h-[40px] cursor-pointer hover:border-[var(--text)] transition-colors"
              style={{ color: "var(--muted)" }}
            >
              Quit
            </button>
          </div>
        )}

        {/* Settings panel (before quiz) */}
        {!active && (
          <div
            className="mb-7 p-5 border border-[var(--border)]"
            style={{ background: "var(--surface)" }}
          >
            <div
              className="text-[0.52rem] tracking-[0.18em] uppercase mb-4"
              style={{ color: "var(--muted)" }}
            >
              Settings
            </div>

            {/* Strings */}
            <div className="mb-4">
              <div
                className="text-[0.52rem] tracking-[0.14em] uppercase mb-2"
                style={{ color: "var(--muted)" }}
              >
                Strings
              </div>
              <div className="flex gap-[6px] flex-wrap">
                {(["e", "B", "G", "D", "A", "E"] as StringName[]).map(str => (
                  <Chip
                    key={str}
                    label={STR_DISPLAY[str]}
                    active={settings.strings.includes(str)}
                    onClick={() => toggleString(str)}
                  />
                ))}
              </div>
            </div>

            {/* Note scope */}
            <div className="mb-4">
              <div
                className="text-[0.52rem] tracking-[0.14em] uppercase mb-2"
                style={{ color: "var(--muted)" }}
              >
                Notes
              </div>
              <div className="flex gap-[6px] flex-wrap">
                {(["naturals", "accidentals", "both"] as NoteScope[]).map(s => (
                  <Chip
                    key={s}
                    label={s === "naturals" ? "Naturals" : s === "accidentals" ? "Accidentals" : "Both"}
                    active={settings.scope === s}
                    onClick={() => patchSettings({ scope: s })}
                  />
                ))}
              </div>
            </div>

            {/* Fret range */}
            <div className="mb-5">
              <div
                className="text-[0.52rem] tracking-[0.14em] uppercase mb-2"
                style={{ color: "var(--muted)" }}
              >
                Fret Range
              </div>
              <div className="flex gap-[6px]">
                {([12, 22] as const).map(mf => (
                  <Chip
                    key={mf}
                    label={`0 – ${mf}`}
                    active={settings.maxFret === mf}
                    onClick={() => patchSettings({ maxFret: mf })}
                  />
                ))}
              </div>
            </div>

            {/* Start row */}
            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={start}
                disabled={pool.length === 0}
                className="font-display text-[0.75rem] tracking-[0.1em] uppercase border px-6 py-[0.42rem] cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "var(--text)",
                  borderColor: "var(--text)",
                  color: "var(--bg)",
                }}
              >
                Start Quiz
              </button>
              <span className="font-mono text-[0.7rem]" style={{ color: "var(--muted)" }}>
                {pool.length} note{pool.length !== 1 ? "s" : ""} in pool
              </span>
              {highScore > 0 && (
                <span className="font-mono text-[0.7rem] ml-auto" style={{ color: "var(--muted)" }}>
                  Best streak:{" "}
                  <span style={{ color: "var(--accent)" }}>{highScore}</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Quiz area */}
        {active && question && (
          <>
            {/* Fretboard */}
            <div className="mb-6">
              <QuizFretboard
                question={question}
                maxFret={settings.maxFret}
                feedback={feedback}
              />
            </div>

            {/* Answer buttons */}
            <div className="flex flex-col items-center gap-[10px]">
              {settings.scope !== "accidentals" && (
                <div className="flex gap-2 flex-wrap justify-center">
                  {NATURAL_NOTES.map(note => {
                    const isFlash = flashNote === note;
                    const state =
                      isFlash && feedback === "correct" ? "correct" :
                      isFlash && feedback === "wrong"   ? "wrong" :
                      "idle";
                    return (
                      <AnswerBtn
                        key={note}
                        note={note}
                        onClick={() => answer(note)}
                        state={state}
                      />
                    );
                  })}
                </div>
              )}

              {settings.scope !== "naturals" && (
                <div className="flex gap-2 flex-wrap justify-center">
                  {ACCIDENTAL_NOTES.map(note => {
                    const isFlash = flashNote === note;
                    const state =
                      isFlash && feedback === "correct" ? "correct" :
                      isFlash && feedback === "wrong"   ? "wrong" :
                      "idle";
                    return (
                      <AnswerBtn
                        key={note}
                        note={note}
                        onClick={() => answer(note)}
                        state={state}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Feedback line */}
            <div className="mt-4 h-7 flex items-center justify-center">
              {feedback === "correct" && (
                <span
                  className="font-display text-[0.72rem] tracking-[0.12em] uppercase"
                  style={{ color: "var(--accent)" }}
                >
                  Correct!
                </span>
              )}
              {feedback === "wrong" && (
                <span
                  className="font-display text-[0.72rem] tracking-[0.12em] uppercase"
                  style={{ color: "var(--muted)" }}
                >
                  Try again
                </span>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
