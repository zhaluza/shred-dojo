import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { DARK_THEME, LIGHT_THEME, STRING_LINE } from "./theme";
import { CtrlButton } from "./CtrlButton";
import { Nav } from "./Nav";
import type { StringName } from "./scalePositions.types";
import {
  buildAllPositions,
  buildCagedPositions,
  SCALES,
  FRET_INLAYS,
  FRET_DOUBLE,
  ROOT_FRET,
} from "./scalePositions.utils";
import { buildBox } from "./pentatonicTriads.utils";
import { DEG_COLOR } from "./intervalShapes.utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ScaleType = "minor_penta" | "major_penta" | "blues" | "minor" | "major";
type DiatonicSystem = "3nps" | "caged";
type FilterMode = "all" | "chord_tones";
type NoteState = "idle" | "current" | "correct" | "wrong" | "answered";

interface ChordTonesSettings {
  scale: ScaleType;
  system: DiatonicSystem;
  shapeIdx: number;
  filter: FilterMode;
}

interface QuizNote {
  string: StringName;
  fret: number;   // relative fret (0-based)
  deg: string;
  key: string;    // `${string}-${fret}`
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const KEY_NAMES = ["E", "F", "F#", "G", "Ab", "A", "Bb", "B", "C", "Db", "D", "Eb"] as const;
const KEY_FRETS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const DISPLAY_STRINGS: StringName[] = ["e", "B", "G", "D", "A", "E"];
const CAGED_SHAPE_NAMES = ["E", "D", "C", "A", "G"] as const;

const CHORD_TONES_SET: Record<ScaleType, Set<string>> = {
  minor_penta: new Set(["R", "b3", "5"]),
  major_penta: new Set(["R", "3", "5"]),
  blues:       new Set(["R", "b3", "5"]),
  minor:       new Set(["R", "b3", "5"]),
  major:       new Set(["R", "3",  "5"]),
};

const ANSWER_DEGREES: Record<ScaleType, { all: string[]; chord_tones: string[] }> = {
  minor_penta: { all: ["R", "b3", "4", "5", "b7"],         chord_tones: ["R", "b3", "5"] },
  major_penta: { all: ["R", "2",  "3", "5", "6"],          chord_tones: ["R", "3",  "5"] },
  blues:       { all: ["R", "b3", "4", "b5", "5", "b7"],   chord_tones: ["R", "b3", "5"] },
  minor:       { all: ["R", "2",  "b3", "4", "5", "b6", "b7"], chord_tones: ["R", "b3", "5"] },
  major:       { all: ["R", "2",  "3",  "4", "5", "6",  "7"],  chord_tones: ["R", "3",  "5"] },
};

const FULL_DEG_COLOR: Record<string, string> = {
  ...DEG_COLOR,
  b6: "#7a5030",
  "7": "#c07040",
};

const DEG_NAMES: Record<string, string> = {
  R:   "Root",
  "2": "Major 2nd",
  b3:  "Minor 3rd",
  "3": "Major 3rd",
  "4": "Perfect 4th",
  b5:  "Tritone",
  "5": "Perfect 5th",
  b6:  "Minor 6th",
  "6": "Major 6th",
  b7:  "Minor 7th",
  "7": "Major 7th",
};

const DEFAULT_SETTINGS: ChordTonesSettings = {
  scale: "minor_penta",
  system: "3nps",
  shapeIdx: 0,
  filter: "all",
};

const FRET_W = 52;
const STR_H = 44;
const DOT_SIZE = 26;
const INLAY_D = 8;
const INLAY_R = INLAY_D / 2;
const INLAY_Y_SINGLE = 3 * STR_H;
const INLAY_Y_DBL_TOP = 2 * STR_H;
const INLAY_Y_DBL_BOT = 4 * STR_H;

// ─── Data builders ─────────────────────────────────────────────────────────────

function buildPentaPool(boxIdx: number, scale: "minor" | "major"): { notes: QuizNote[]; startFret: number } {
  const raw = buildBox(boxIdx, scale);
  const minFret = Math.min(...raw.map((n) => n.fret));
  return {
    notes: raw.map((n) => ({
      string: n.string,
      fret: n.fret - minFret,
      deg: n.deg,
      key: `${n.string}-${n.fret - minFret}`,
    })),
    startFret: minFret % 12,
  };
}

function buildBluesPool(boxIdx: number): { notes: QuizNote[]; startFret: number } {
  const { notes: penta, startFret } = buildPentaPool(boxIdx, "minor");
  const out: QuizNote[] = [];
  for (const n of penta) {
    out.push(n);
    if (n.deg === "4") {
      const b5Fret = n.fret + 1;
      out.push({ string: n.string, fret: b5Fret, deg: "b5", key: `${n.string}-${b5Fret}` });
    }
  }
  return { notes: out, startFret };
}

function buildDiatonicPool(
  shapeIdx: number,
  scale: "minor" | "major",
  system: DiatonicSystem,
): { notes: QuizNote[]; startFret: number } {
  const cfg = SCALES[scale];
  const position =
    system === "3nps"
      ? buildAllPositions(cfg).filter((p) => p.system === "3nps")[shapeIdx]
      : buildCagedPositions(cfg)[shapeIdx];

  const notes: QuizNote[] = [];
  for (const str of position.strings) {
    for (const note of str.notes) {
      notes.push({ string: str.name, fret: note.fret, deg: note.deg, key: `${str.name}-${note.fret}` });
    }
  }
  return { notes, startFret: position.startFret };
}

function buildPool(settings: ChordTonesSettings): { notes: QuizNote[]; startFret: number } {
  let result: { notes: QuizNote[]; startFret: number };

  if (settings.scale === "minor_penta") {
    result = buildPentaPool(settings.shapeIdx, "minor");
  } else if (settings.scale === "major_penta") {
    result = buildPentaPool(settings.shapeIdx, "major");
  } else if (settings.scale === "blues") {
    result = buildBluesPool(settings.shapeIdx);
  } else {
    result = buildDiatonicPool(settings.shapeIdx, settings.scale, settings.system);
  }

  if (settings.filter === "chord_tones") {
    const ct = CHORD_TONES_SET[settings.scale];
    result = { ...result, notes: result.notes.filter((n) => ct.has(n.deg)) };
  }

  return result;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function pickNext(pool: QuizNote[], prev: QuizNote | null): QuizNote {
  if (pool.length === 1) return pool[0];
  const candidates = prev
    ? pool.filter((q) => q.key !== prev.key)
    : pool;
  const src = candidates.length > 0 ? candidates : pool;
  return src[Math.floor(Math.random() * src.length)];
}

function getShapeCount(scale: ScaleType, system: DiatonicSystem): number {
  if (scale === "minor" || scale === "major") return system === "3nps" ? 7 : 5;
  return 5; // penta + blues
}

function hsKey(s: ChordTonesSettings): string {
  return `ct-hs-${s.scale}-${s.system}-${s.shapeIdx}-${s.filter}`;
}

function loadHs(s: ChordTonesSettings): number {
  try { return parseInt(localStorage.getItem(hsKey(s)) ?? "0", 10) || 0; } catch { return 0; }
}

function saveHs(s: ChordTonesSettings, v: number): void {
  try { localStorage.setItem(hsKey(s), String(v)); } catch {}
}

function getNoteState(
  note: QuizNote,
  question: QuizNote | null,
  answeredKeys: Set<string>,
  feedback: "correct" | "wrong" | null,
): NoteState {
  if (question && note.key === question.key) {
    if (feedback === "correct") return "correct";
    if (feedback === "wrong") return "wrong";
    return "current";
  }
  if (answeredKeys.has(note.key)) return "answered";
  return "idle";
}

function playCorrect(ctx: AudioContext) {
  const freq = 440 * Math.pow(2, (69 - 69) / 12); // A4
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, now);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.28, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.9);
}



// ─── Shape fretboard ───────────────────────────────────────────────────────────

interface NoteDisplay {
  string: StringName;
  fret: number;
  deg: string;
  state: NoteState;
}

function ShapeQuizFretboard({
  notes, fretCount, displayStartFret,
}: {
  notes: NoteDisplay[];
  fretCount: number;
  displayStartFret: number;
}) {
  const frets = Array.from({ length: fretCount }, (_, i) => i);
  const showNut = displayStartFret <= 1;

  return (
    <div className="w-full overflow-x-auto">
      <div style={{ minWidth: fretCount * FRET_W + (showNut ? 6 : 0) }}>
        <div
          className="relative"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderLeft: showNut ? "6px solid var(--faint)" : "1px solid var(--border)",
          }}
        >
          {/* Inlay dots */}
          <div className="absolute inset-0 pointer-events-none">
            {frets.map((f) => {
              const absF = f + displayStartFret;
              if (!FRET_INLAYS.has(absF)) return null;
              const cx = f * FRET_W + FRET_W / 2;
              const x = cx - INLAY_R;
              if (FRET_DOUBLE.has(absF)) {
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

          {/* String rows */}
          {DISPLAY_STRINGS.map((str) => {
            const { height: sh, colorVar } = STRING_LINE[str];
            const stringNotes = notes.filter((n) => n.string === str);

            return (
              <div key={str} className="relative flex items-center" style={{ height: STR_H }}>
                {frets.map((f) => {
                  const noteHere = stringNotes.find((n) => n.fret === f);
                  const state = noteHere?.state ?? "empty";

                  let dotBg = "transparent";
                  let dotBorder = "transparent";
                  let dotLabel = "";
                  let dotShadow = "none";
                  let isPulsing = false;

                  if (state === "idle") {
                    dotBg = "var(--muted)";
                    dotBorder = "transparent";
                  } else if (state === "current") {
                    dotBg = "var(--text)";
                    dotShadow = "0 0 8px rgba(0,0,0,0.3)";
                    dotLabel = "?";
                    isPulsing = true;
                  } else if (state === "correct") {
                    dotBg = "var(--feedback-correct)";
                    dotShadow = "0 0 10px rgba(50,200,80,0.5)";
                    dotLabel = noteHere?.deg ?? "";
                  } else if (state === "wrong") {
                    dotBg = "var(--feedback-wrong)";
                    dotShadow = "0 0 10px rgba(200,60,30,0.5)";
                    dotLabel = "?";
                  } else if (state === "answered") {
                    dotBg = FULL_DEG_COLOR[noteHere?.deg ?? ""] ?? "var(--muted)";
                    dotLabel = noteHere?.deg ?? "";
                  }

                  return (
                    <div
                      key={f}
                      className="relative shrink-0 flex items-center justify-center"
                      style={{ width: FRET_W, height: STR_H }}
                    >
                      <div
                        className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ height: sh, background: colorVar }}
                      />
                      <div
                        className="absolute right-0 top-0 bottom-0"
                        style={{ width: 1.5, background: "var(--fret-bar)" }}
                      />
                      {noteHere && state !== "empty" && (
                        <div
                          className={[
                            "rounded-full relative z-[2] flex items-center justify-center transition-all duration-200",
                            isPulsing ? "animate-pulse" : "",
                          ].join(" ")}
                          style={{
                            width: DOT_SIZE,
                            height: DOT_SIZE,
                            background: dotBg,
                            border: dotBorder !== "transparent" ? `2px solid ${dotBorder}` : undefined,
                            boxShadow: dotShadow,
                            color: state === "current" ? "var(--bg)" : "#fff",
                            fontSize: dotLabel.length > 2 ? "0.5rem" : "0.6rem",
                            fontFamily: "var(--font-display, sans-serif)",
                            letterSpacing: "0.04em",
                            fontWeight: 600,
                          }}
                        >
                          {dotLabel}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Fret number row */}
        <div className="flex" style={{ paddingLeft: showNut ? 5 : 0 }}>
          {frets.map((f) => (
            <div
              key={f}
              className="shrink-0 flex items-center justify-center font-mono"
              style={{ width: FRET_W, fontSize: "0.55rem", color: "var(--faint)", paddingTop: 3 }}
            >
              {f + displayStartFret}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Answer button ─────────────────────────────────────────────────────────────

function AnswerBtn({ deg, onClick, state }: {
  deg: string;
  onClick: () => void;
  state: "correct" | "wrong" | "idle";
}) {
  return (
    <button
      onClick={onClick}
      title={DEG_NAMES[deg] ?? deg}
      className="font-display text-[0.85rem] tracking-[0.06em] uppercase border transition-all duration-150 cursor-pointer min-w-[52px] py-[0.48rem] px-3 hover:border-[var(--text)]"
      style={{
        background:
          state === "correct" ? "var(--feedback-correct)" :
          state === "wrong"   ? "rgba(180,50,30,0.18)" :
          "transparent",
        borderColor:
          state === "correct" ? "var(--feedback-correct)" :
          state === "wrong"   ? "var(--feedback-wrong)" :
          "var(--border)",
        color:
          state === "correct" ? "#fff" :
          state === "wrong"   ? "var(--feedback-wrong)" :
          "var(--text)",
      }}
    >
      {deg}
    </button>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ChordTones() {
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem("shred-dojo-dark") === "true"; } catch { return false; }
  });
  const [keyIdx, setKeyIdx] = useState(() => {
    try { return parseInt(localStorage.getItem("shred-dojo-key") ?? "0", 10) || 0; } catch { return 0; }
  });

  const [settings, setSettings] = useState<ChordTonesSettings>(DEFAULT_SETTINGS);
  const [active, setActive] = useState(false);
  const [question, setQuestion] = useState<QuizNote | null>(null);
  const [answeredKeys, setAnsweredKeys] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [flashDeg, setFlashDeg] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(() => loadHs(DEFAULT_SETTINGS));

  const prevQ = useRef<QuizNote | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { notes: pool, startFret } = useMemo(() => buildPool(settings), [settings]);

  const keyOffset = (KEY_FRETS[keyIdx] - ROOT_FRET + 12) % 12;
  const displayStartFret = startFret + keyOffset;
  const fretCount = pool.length > 0 ? Math.max(...pool.map((n) => n.fret)) + 1 : 4;
  const answerDegrees = ANSWER_DEGREES[settings.scale][settings.filter];
  const isDiatonic = settings.scale === "minor" || settings.scale === "major";

  useEffect(() => {
    return () => {
      audioCtx.current?.close();
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

  function updateKey(idx: number) {
    setKeyIdx(idx);
    try { localStorage.setItem("shred-dojo-key", String(idx)); } catch {}
  }

  function updateSettings(patch: Partial<ChordTonesSettings>) {
    const next = { ...settings, ...patch };
    if (patch.scale !== undefined) {
      const isDia = patch.scale === "minor" || patch.scale === "major";
      const wasntDia = settings.scale !== "minor" && settings.scale !== "major";
      const maxShapes = getShapeCount(next.scale, next.system);
      if (next.shapeIdx >= maxShapes) next.shapeIdx = 0;
      if (!isDia) { next.filter = "all"; next.system = "3nps"; }
      if (isDia && wasntDia) next.shapeIdx = 0;
    }
    if (patch.system !== undefined) {
      const maxShapes = getShapeCount(next.scale, next.system);
      if (next.shapeIdx >= maxShapes) next.shapeIdx = 0;
    }
    setSettings(next);
    setHighScore(loadHs(next));
  }

  const startQuiz = useCallback(() => {
    if (pool.length === 0) return;
    const q = pickNext(pool, null);
    prevQ.current = q;
    setQuestion(q);
    setAnsweredKeys(new Set());
    setFeedback(null);
    setFlashDeg(null);
    setCorrect(0);
    setTotal(0);
    setStreak(0);
    setHighScore(loadHs(settings));
    setActive(true);
  }, [pool, settings]);

  function handleAnswer(deg: string) {
    if (feedback !== null || !question) return;

    setFlashDeg(deg);
    setTotal((t) => t + 1);

    if (deg === question.deg) {
      const newStreak = streak + 1;
      const newCorrect = correct + 1;
      setStreak(newStreak);
      setCorrect(newCorrect);
      setFeedback("correct");

      if (newStreak > highScore) {
        setHighScore(newStreak);
        saveHs(settings, newStreak);
      }

      if (!audioCtx.current) audioCtx.current = new AudioContext();
      playCorrect(audioCtx.current);

      feedbackTimer.current = setTimeout(() => {
        const newAnswered = new Set(answeredKeys).add(question.key);

        let nextPool = pool;
        let nextAnswered = newAnswered;

        if (newAnswered.size >= pool.length) {
          nextAnswered = new Set();
        }

        const remaining = nextPool.filter((n) => !nextAnswered.has(n.key));
        const src = remaining.length > 0 ? remaining : nextPool;
        const nextQ = src.length === 1 ? src[0] : src.filter((n) => n.key !== question.key)[Math.floor(Math.random() * (src.length - 1))] ?? src[0];

        prevQ.current = nextQ;
        setAnsweredKeys(nextAnswered);
        setQuestion(nextQ);
        setFeedback(null);
        setFlashDeg(null);
      }, 550);
    } else {
      setStreak(0);
      setFeedback("wrong");

      feedbackTimer.current = setTimeout(() => {
        setFeedback(null);
        setFlashDeg(null);
      }, 650);
    }
  }

  function quit() {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setActive(false);
    setQuestion(null);
    setAnsweredKeys(new Set());
    setFeedback(null);
    setFlashDeg(null);
  }

  const noteDisplays: NoteDisplay[] = pool.map((n) => ({
    ...n,
    state: getNoteState(n, question, answeredKeys, feedback),
  }));

  const shapeCount = getShapeCount(settings.scale, settings.system);
  const progressDone = answeredKeys.size;
  const progressTotal = pool.length;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text)]" style={isDark ? DARK_THEME : LIGHT_THEME}>
      <Nav isDark={isDark} toggleDark={() => {
        const next = !isDark;
        setIsDark(next);
        try { localStorage.setItem("shred-dojo-dark", String(next)); } catch {}
      }} />

      <main className="flex-1 flex flex-col items-center px-4 py-8 [@media(max-height:500px)]:py-3 max-w-2xl mx-auto w-full">
        <div className="w-full mb-6">
          <h1 className="font-display font-semibold text-[clamp(1.8rem,5vw,2.6rem)] tracking-[0.04em] uppercase leading-none text-[var(--text)]">
            Chord Tones
          </h1>
          <p className="font-mono text-[0.78rem] text-[var(--muted)] mt-1">
            Identify each interval within the shape.
          </p>
        </div>

        {!active ? (
          /* ── Settings panel ── */
          <div className="w-full flex flex-col gap-5">

            {/* Scale */}
            <div>
              <div className="text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)] mb-2 font-display">Scale</div>
              <div className="flex flex-wrap gap-2">
                {(["minor_penta", "major_penta", "blues", "minor", "major"] as ScaleType[]).map((s) => (
                  <CtrlButton
                    key={s}
                    label={s === "minor_penta" ? "Minor Penta" : s === "major_penta" ? "Major Penta" : s === "blues" ? "Blues" : s === "minor" ? "Minor" : "Major"}
                    active={settings.scale === s}
                    onClick={() => updateSettings({ scale: s })}
                  />
                ))}
              </div>
            </div>

            {/* System (diatonic only) */}
            {isDiatonic && (
              <div>
                <div className="text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)] mb-2 font-display">System</div>
                <div className="flex flex-wrap gap-2">
                  <CtrlButton label="3nps" active={settings.system === "3nps"} onClick={() => updateSettings({ system: "3nps" })} />
                  <CtrlButton label="CAGED" active={settings.system === "caged"} onClick={() => updateSettings({ system: "caged" })} />
                </div>
              </div>
            )}

            {/* Shape */}
            <div>
              <div className="text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)] mb-2 font-display">Shape</div>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: shapeCount }, (_, i) => {
                  let label: string;
                  if (isDiatonic && settings.system === "caged") {
                    label = CAGED_SHAPE_NAMES[i];
                  } else if (isDiatonic) {
                    label = `Pos ${i + 1}`;
                  } else {
                    label = `Box ${i + 1}`;
                  }
                  return (
                    <CtrlButton
                      key={i}
                      label={label}
                      active={settings.shapeIdx === i}
                      onClick={() => updateSettings({ shapeIdx: i })}
                    />
                  );
                })}
              </div>
            </div>

            {/* Filter */}
            <div>
              <div className="text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)] mb-2 font-display">Notes</div>
              <div className="flex flex-wrap gap-2">
                <CtrlButton label="All Notes" active={settings.filter === "all"} onClick={() => updateSettings({ filter: "all" })} />
                <CtrlButton label="Chord Tones" active={settings.filter === "chord_tones"} onClick={() => updateSettings({ filter: "chord_tones" })} />
              </div>
            </div>

            {/* Key */}
            <div>
              <div className="text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)] mb-2 font-display">Key</div>
              <div className="flex flex-wrap gap-2">
                {KEY_NAMES.map((k, i) => (
                  <CtrlButton key={k} label={k} active={keyIdx === i} onClick={() => updateKey(i)} />
                ))}
              </div>
            </div>

            {/* Pool size + start */}
            <div className="flex items-center justify-between mt-2 pt-4 border-t border-[var(--border)]">
              <div className="font-mono text-[0.72rem] text-[var(--muted)]">
                {pool.length} note{pool.length !== 1 ? "s" : ""} in pool
                {highScore > 0 && <span className="ml-3">Best streak: <span className="text-[var(--accent)]">{highScore}</span></span>}
              </div>
              <button
                onClick={startQuiz}
                disabled={pool.length === 0}
                className="font-display text-[0.75rem] tracking-[0.08em] uppercase border px-5 py-2 cursor-pointer transition-all bg-[var(--text)] text-[var(--bg)] border-[var(--text)] hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Start Quiz
              </button>
            </div>
          </div>
        ) : (
          /* ── Active quiz ── */
          <div className="w-full flex flex-col gap-4">

            {/* Score bar */}
            <div className="flex items-center justify-between text-[0.68rem] font-mono text-[var(--muted)] border-b border-[var(--border)] pb-3">
              <div className="flex gap-4">
                <span>
                  Score: <span className="text-[var(--text)]">{correct}/{total}</span>
                  {total > 0 && <span className="ml-1">({Math.round((correct / total) * 100)}%)</span>}
                </span>
                <span>Streak: <span className="text-[var(--text)]">{streak}</span></span>
                <span>Best: <span className="text-[var(--accent)]">{highScore}</span></span>
              </div>
              <button
                onClick={quit}
                className="font-display text-[0.65rem] tracking-[0.1em] uppercase border border-[var(--border)] px-3 py-1 cursor-pointer hover:border-[var(--text)] transition-all"
              >
                Quit
              </button>
            </div>

            {/* Progress + prompt */}
            <div className="flex items-center justify-between">
              <div className="font-mono text-[0.68rem] text-[var(--muted)]">
                {progressDone} / {progressTotal} this round
              </div>
              <div
                className="font-mono text-[0.72rem] text-center"
                style={{
                  color: feedback === "correct" ? "var(--feedback-correct)" : feedback === "wrong" ? "var(--feedback-wrong)" : "var(--muted)",
                  minHeight: "1.1em",
                }}
              >
                {feedback === "correct" ? `Correct! — ${question?.deg} (${DEG_NAMES[question?.deg ?? ""] ?? ""})` :
                 feedback === "wrong"   ? "Try again" : "What interval is this note?"}
              </div>
            </div>

            {/* Fretboard */}
            <ShapeQuizFretboard
              notes={noteDisplays}
              fretCount={fretCount}
              displayStartFret={displayStartFret}
            />

            {/* Answer buttons */}
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {answerDegrees.map((deg) => {
                const btnState =
                  flashDeg === deg && feedback === "correct" ? "correct" :
                  flashDeg === deg && feedback === "wrong"   ? "wrong" :
                  "idle";
                return (
                  <AnswerBtn key={deg} deg={deg} onClick={() => handleAnswer(deg)} state={btnState} />
                );
              })}
            </div>

            {/* Degree legend (answered notes) */}
            {answeredKeys.size > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 justify-center">
                {[...new Set([...answeredKeys].map((k) => {
                  const n = pool.find((p) => p.key === k);
                  return n?.deg;
                }).filter(Boolean))].map((deg) => (
                  <div key={deg} className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full" style={{ background: FULL_DEG_COLOR[deg!] ?? "var(--muted)" }} />
                    <span className="font-mono text-[0.6rem] text-[var(--muted)]">{deg} — {DEG_NAMES[deg!] ?? ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
