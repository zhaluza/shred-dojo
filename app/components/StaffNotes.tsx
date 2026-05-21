import { useState, useMemo, useRef, useEffect } from "react";
import { DARK_THEME, LIGHT_THEME } from "./theme";
import { Nav } from "./Nav";

// ─── Data ──────────────────────────────────────────────────────────────────────

const NOTES = [
  "E", "F", "F#", "G", "Ab", "A", "Bb", "B", "C", "Db", "D", "Eb",
] as const;
type NoteName = (typeof NOTES)[number];

const NATURAL_NOTES: NoteName[] = ["C", "D", "E", "F", "G", "A", "B"];
const ACCIDENTAL_NOTES: NoteName[] = ["F#", "Ab", "Bb", "Db", "Eb"];
const NATURALS_SET = new Set<NoteName>(NATURAL_NOTES);

interface PoolEntry {
  noteName: NoteName;
  octave: 4 | 5;
  staffStep: number; // diatonic steps from C4: 0=C4, 1=D4, ..., 7=C5, ..., 13=B5
  midi: number;
}

// Static pool — 24 entries covering C4–B5 (naturals + accidentals)
// Accidentals sit on their letter-name's staff position with an accidental sign.
// E.g. Ab4 is on A's line/space (step 5) with a flat sign.
const FULL_POOL: PoolEntry[] = [
  // ── Octave 4 naturals ──
  { noteName: "C",  octave: 4, staffStep: 0,  midi: 60 },
  { noteName: "D",  octave: 4, staffStep: 1,  midi: 62 },
  { noteName: "E",  octave: 4, staffStep: 2,  midi: 64 },
  { noteName: "F",  octave: 4, staffStep: 3,  midi: 65 },
  { noteName: "G",  octave: 4, staffStep: 4,  midi: 67 },
  { noteName: "A",  octave: 4, staffStep: 5,  midi: 69 },
  { noteName: "B",  octave: 4, staffStep: 6,  midi: 71 },
  // ── Octave 4 accidentals ──
  { noteName: "Db", octave: 4, staffStep: 1,  midi: 61 },
  { noteName: "Eb", octave: 4, staffStep: 2,  midi: 63 },
  { noteName: "F#", octave: 4, staffStep: 3,  midi: 66 },
  { noteName: "Ab", octave: 4, staffStep: 5,  midi: 68 },
  { noteName: "Bb", octave: 4, staffStep: 6,  midi: 70 },
  // ── Octave 5 naturals ──
  { noteName: "C",  octave: 5, staffStep: 7,  midi: 72 },
  { noteName: "D",  octave: 5, staffStep: 8,  midi: 74 },
  { noteName: "E",  octave: 5, staffStep: 9,  midi: 76 },
  { noteName: "F",  octave: 5, staffStep: 10, midi: 77 },
  { noteName: "G",  octave: 5, staffStep: 11, midi: 79 },
  { noteName: "A",  octave: 5, staffStep: 12, midi: 81 },
  { noteName: "B",  octave: 5, staffStep: 13, midi: 83 },
  // ── Octave 5 accidentals ──
  { noteName: "Db", octave: 5, staffStep: 8,  midi: 73 },
  { noteName: "Eb", octave: 5, staffStep: 9,  midi: 75 },
  { noteName: "F#", octave: 5, staffStep: 10, midi: 78 },
  { noteName: "Ab", octave: 5, staffStep: 12, midi: 80 },
  { noteName: "Bb", octave: 5, staffStep: 13, midi: 82 },
];

// ─── Types ─────────────────────────────────────────────────────────────────────

type NoteScope = "naturals" | "both";
type NoteRange = 1 | 2; // 1 = C4–B4, 2 = C4–B5

interface StaffSettings {
  scope: NoteScope;
  range: NoteRange;
}

const DEFAULT_SETTINGS: StaffSettings = { scope: "naturals", range: 1 };

// ─── Helpers ───────────────────────────────────────────────────────────────────

function buildPool(settings: StaffSettings): PoolEntry[] {
  return FULL_POOL.filter(
    e =>
      (settings.scope === "both" || NATURALS_SET.has(e.noteName)) &&
      (settings.range === 2 || e.octave === 4)
  );
}

// Dedup key is (noteName, octave) — NOT staffStep.
// B4 and Bb4 share staffStep=6 but are distinct questions.
function pickNext(pool: PoolEntry[], prev: PoolEntry | null): PoolEntry {
  if (pool.length === 1) return pool[0];
  const cands = prev
    ? pool.filter(q => !(q.noteName === prev.noteName && q.octave === prev.octave))
    : pool;
  const src = cands.length > 0 ? cands : pool;
  return src[Math.floor(Math.random() * src.length)];
}

function hsKey(cfg: StaffSettings): string {
  return `sn-hs-${cfg.scope}-${cfg.range}`;
}

function loadHs(cfg: StaffSettings): number {
  try { return parseInt(localStorage.getItem(hsKey(cfg)) ?? "0", 10) || 0; } catch { return 0; }
}

function saveHs(cfg: StaffSettings, v: number): void {
  try { localStorage.setItem(hsKey(cfg), String(v)); } catch {}
}

function getAccidental(name: NoteName): "♯" | "♭" | null {
  if (name.includes("#")) return "♯";
  if (name.length > 1 && name[1] === "b") return "♭";
  return null;
}

// ─── Audio ─────────────────────────────────────────────────────────────────────

function playNote(ctx: AudioContext, midi: number) {
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, now);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.28, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 1.2);
}

// ─── Chip button ───────────────────────────────────────────────────────────────

function Chip({
  label, active, onClick,
}: {
  label: string; active: boolean; onClick: () => void;
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

// ─── Staff display ─────────────────────────────────────────────────────────────

// SVG geometry constants
const SVG_W = 280;
const SVG_H = 110;
const LINE_GAP = 12;
const STAFF_TOP_Y = 25;   // F5 (top staff line)
const STAFF_BOT_Y = 73;   // E4 (bottom staff line) = STAFF_TOP_Y + 4 * LINE_GAP
const NOTE_X = 170;
const STAFF_LINES = [25, 37, 49, 61, 73]; // F5, D5, B4, G4, E4

function staffNoteY(step: number): number {
  return STAFF_BOT_Y - (step - 2) * (LINE_GAP / 2);
}

function StaffDisplay({
  entry,
  feedback,
  noteStyle,
}: {
  entry: PoolEntry | null;
  feedback: "correct" | "wrong" | null;
  noteStyle: "standard" | "color";
}) {
  const idleColor = noteStyle === "color" ? "var(--accent)" : "var(--text)";
  const strokeColor =
    feedback === "correct" ? "var(--feedback-correct)" :
    feedback === "wrong"   ? "var(--feedback-wrong)" :
    idleColor;

  const cy = entry ? staffNoteY(entry.staffStep) : STAFF_BOT_Y - (6 - 2) * 6; // default B4

  const accidental = entry ? getAccidental(entry.noteName) : null;

  // C4 (step ≤ 0) needs a ledger line below the staff
  const showLowerLedger = entry !== null && entry.staffStep <= 0;
  // A5/B5 (step ≥ 12) need a ledger line above the staff
  const showUpperLedger = entry !== null && entry.staffStep >= 12;

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      width={SVG_W}
      height={SVG_H}
      overflow="visible"
      aria-hidden="true"
      style={{ display: "block", margin: "0 auto" }}
    >
      {/* 5 staff lines */}
      {STAFF_LINES.map(y => (
        <line
          key={y}
          x1={18} y1={y} x2={260} y2={y}
          stroke="var(--text)"
          strokeWidth={1}
          opacity={0.45}
        />
      ))}

      {/* Treble clef — Unicode G-clef. The curl is calibrated to wrap around G4 (y=61).
          Font rendering varies by OS; y=93 is the baseline, adjust ±4px if needed. */}
      <text
        x={4}
        y={93}
        fontSize={70}
        fontFamily="'Times New Roman', Georgia, serif"
        fill="var(--text)"
        opacity={0.65}
      >
        {"𝄞"}
      </text>

      {entry && (
        <>
          {/* Lower ledger line for C4 */}
          {showLowerLedger && (
            <line
              x1={NOTE_X - 13} y1={STAFF_BOT_Y + LINE_GAP}
              x2={NOTE_X + 13} y2={STAFF_BOT_Y + LINE_GAP}
              stroke="var(--text)"
              strokeWidth={1.5}
              opacity={0.5}
            />
          )}

          {/* Upper ledger line for A5/B5 */}
          {showUpperLedger && (
            <line
              x1={NOTE_X - 13} y1={STAFF_TOP_Y - LINE_GAP}
              x2={NOTE_X + 13} y2={STAFF_TOP_Y - LINE_GAP}
              stroke="var(--text)"
              strokeWidth={1.5}
              opacity={0.5}
            />
          )}

          {/* Accidental sign (♯ or ♭) */}
          {accidental && (
            <text
              x={NOTE_X - 17}
              y={cy + 5}
              fontSize={14}
              fontFamily="'Times New Roman', Georgia, serif"
              fill={strokeColor}
              textAnchor="middle"
            >
              {accidental}
            </text>
          )}

          {/* Whole note head — outer filled ellipse + inner oval hole rotated the same
              direction, forming a concentric ring like standard engraved notation */}
          <ellipse
            cx={NOTE_X}
            cy={cy}
            rx={11}
            ry={7}
            fill={strokeColor}
            stroke="none"
            transform={`rotate(-16,${NOTE_X},${cy})`}
          />
          <ellipse
            cx={NOTE_X}
            cy={cy}
            rx={7}
            ry={4.5}
            fill="var(--surface)"
            stroke="none"
            transform={`rotate(-16,${NOTE_X},${cy})`}
          />
        </>
      )}
    </svg>
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

export function StaffNotes() {
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem("shred-dojo-dark") === "true"; } catch { return false; }
  });

  const [noteStyle, setNoteStyle] = useState<"standard" | "color">(() => {
    try { return (localStorage.getItem("sn-note-style") as "standard" | "color") ?? "standard"; } catch { return "standard"; }
  });

  const [settings, setSettings] = useState<StaffSettings>(DEFAULT_SETTINGS);
  const [active, setActive] = useState(false);
  const [question, setQuestion] = useState<PoolEntry | null>(null);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(() => loadHs(DEFAULT_SETTINGS));
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [flashNote, setFlashNote] = useState<NoteName | null>(null);

  const prevQ = useRef<PoolEntry | null>(null);
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

  function patchSettings(patch: Partial<StaffSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    setHighScore(loadHs(next));
  }

  function setNoteStyleAndPersist(style: "standard" | "color") {
    setNoteStyle(style);
    try { localStorage.setItem("sn-note-style", style); } catch {}
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

    const isCorrect = note === question.noteName;
    setTotal(t => t + 1);
    setFlashNote(note);

    if (isCorrect) {
      const newStreak = streak + 1;
      setCorrect(c => c + 1);
      setStreak(newStreak);
      setFeedback("correct");
      try {
        if (!audioCtx.current) audioCtx.current = new AudioContext();
        playNote(audioCtx.current, question.midi);
      } catch {}
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

      <main className="flex-1 px-5 md:px-8 py-8 [@media(max-height:500px)]:py-3 max-w-[640px] mx-auto w-full">
        {/* Header */}
        <div className="mb-7">
          <h1 className="font-display font-semibold text-[clamp(1.7rem,5vw,2.6rem)] tracking-[0.04em] uppercase leading-none">
            Staff{" "}
            <span style={{ color: "var(--accent)" }}>Notes</span>
          </h1>
          <p
            className="mt-[6px] font-mono text-[0.8rem] leading-relaxed max-w-md"
            style={{ color: "var(--muted)" }}
          >
            Identify notes on the treble clef staff. Build instant music reading fluency.
          </p>
        </div>

        {/* Score bar (quiz active) */}
        {active && (
          <div
            className="mb-5 px-5 py-3 border border-[var(--border)] flex items-center gap-6 flex-wrap"
            style={{ background: "var(--surface)" }}
          >
            <div>
              <div className="text-[0.5rem] tracking-[0.18em] uppercase mb-[3px]" style={{ color: "var(--muted)" }}>
                Score
              </div>
              <div className="font-display text-[1rem] tracking-[0.04em]">
                {correct}/{total}
                {accuracy !== null && (
                  <span className="ml-[6px] text-[0.72rem]" style={{ color: "var(--muted)" }}>
                    {accuracy}%
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="text-[0.5rem] tracking-[0.18em] uppercase mb-[3px]" style={{ color: "var(--muted)" }}>
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
              <div className="text-[0.5rem] tracking-[0.18em] uppercase mb-[3px]" style={{ color: "var(--muted)" }}>
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
            <div className="text-[0.52rem] tracking-[0.18em] uppercase mb-4" style={{ color: "var(--muted)" }}>
              Settings
            </div>

            {/* Notes scope */}
            <div className="mb-4">
              <div className="text-[0.52rem] tracking-[0.14em] uppercase mb-2" style={{ color: "var(--muted)" }}>
                Notes
              </div>
              <div className="flex gap-[6px] flex-wrap">
                <Chip label="Naturals" active={settings.scope === "naturals"} onClick={() => patchSettings({ scope: "naturals" })} />
                <Chip label="Naturals + Accidentals" active={settings.scope === "both"} onClick={() => patchSettings({ scope: "both" })} />
              </div>
            </div>

            {/* Range */}
            <div className="mb-4">
              <div className="text-[0.52rem] tracking-[0.14em] uppercase mb-2" style={{ color: "var(--muted)" }}>
                Range
              </div>
              <div className="flex gap-[6px]">
                <Chip label="C4 – B4" active={settings.range === 1} onClick={() => patchSettings({ range: 1 })} />
                <Chip label="C4 – B5" active={settings.range === 2} onClick={() => patchSettings({ range: 2 })} />
              </div>
            </div>

            {/* Note style */}
            <div className="mb-5">
              <div className="text-[0.52rem] tracking-[0.14em] uppercase mb-2" style={{ color: "var(--muted)" }}>
                Note Style
              </div>
              <div className="flex gap-[6px]">
                <Chip label="Standard" active={noteStyle === "standard"} onClick={() => setNoteStyleAndPersist("standard")} />
                <Chip label="Color" active={noteStyle === "color"} onClick={() => setNoteStyleAndPersist("color")} />
              </div>
            </div>

            {/* Start row */}
            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={start}
                disabled={pool.length === 0}
                className="font-display text-[0.75rem] tracking-[0.1em] uppercase border px-6 py-[0.42rem] cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "var(--text)", borderColor: "var(--text)", color: "var(--bg)" }}
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
            {/* Staff */}
            <div
              className="mb-8 py-6 border border-[var(--border)]"
              style={{ background: "var(--surface)" }}
            >
              <StaffDisplay entry={question} feedback={feedback} noteStyle={noteStyle} />
            </div>

            {/* Answer buttons */}
            <div className="flex flex-col items-center gap-[10px]">
              {/* Naturals row — always shown */}
              <div className="flex gap-2 flex-wrap justify-center">
                {NATURAL_NOTES.map(note => {
                  const isFlash = flashNote === note;
                  const state =
                    isFlash && feedback === "correct" ? "correct" :
                    isFlash && feedback === "wrong"   ? "wrong" :
                    "idle";
                  return (
                    <AnswerBtn key={note} note={note} onClick={() => answer(note)} state={state} />
                  );
                })}
              </div>

              {/* Accidentals row — only when scope=both */}
              {settings.scope === "both" && (
                <div className="flex gap-2 flex-wrap justify-center">
                  {ACCIDENTAL_NOTES.map(note => {
                    const isFlash = flashNote === note;
                    const state =
                      isFlash && feedback === "correct" ? "correct" :
                      isFlash && feedback === "wrong"   ? "wrong" :
                      "idle";
                    return (
                      <AnswerBtn key={note} note={note} onClick={() => answer(note)} state={state} />
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
