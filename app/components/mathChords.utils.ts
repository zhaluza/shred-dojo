// Pure music model for the Math Chords ("MATHGRID") voicing lab.
// Ported from a standalone HTML prototype (resources/math-chords.html); the
// SVG diagrams + audio live in MathChords.tsx, the testable logic lives here.

/** Open-string MIDI, s6..s1 (low E → high e), standard tuning. */
export const OPEN = [40, 45, 50, 55, 59, 64];

/** Chromatic note names (sharp spelling), pitch-class 0 = C. */
export const SHARP = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];

export const mod12 = (n: number): number => ((n % 12) + 12) % 12;

export const midiToHz = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

/** A single fingering. `pat` = [s6..s1] frets (null = muted) at this shape's
 *  native root; an optional per-shape `root` overrides the quality's root. */
export type Shape = { pat: (number | null)[]; tag: string; root?: number };
export type QualId = "maj7" | "m7" | "dom7" | "dom9" | "m7b5" | "maj9" | "m9";
export type Qual = { id: QualId; sym: string; root: number; shapes: Shape[] };

/* Voicings transcribed from the practice sheet, validated note-by-note
   (see the invariant test). `root` is the native root pitch-class (C = 0). */
export const QUALS: Qual[] = [
  {
    id: "maj7",
    sym: "maj7",
    root: 9,
    shapes: [
      { pat: [5, null, 6, 6, 5, null], tag: "5fr · full" },
      { pat: [null, 12, 14, 13, 14, null], tag: "12fr · full" },
      { pat: [null, null, 7, 9, 9, 9], tag: "7fr · full" },
      { pat: [5, 4, 6, null, null, null], tag: "4fr · shell" },
      { pat: [null, 12, 11, 13, null, null], tag: "11fr · shell" },
      { pat: [null, null, 7, 6, 9, null], tag: "6fr · shell" },
    ],
  },
  {
    id: "m7",
    sym: "m7",
    root: 6,
    shapes: [
      { pat: [2, null, 2, 2, 2, null], tag: "2fr · full", root: 6 },
      { pat: [null, 9, 11, 9, 10, null], tag: "9fr · full", root: 6 },
      { pat: [null, 9, 7, 9, 10, null], tag: "7fr · full", root: 6 },
      { pat: [null, null, 4, 6, 5, 5], tag: "4fr · full", root: 6 },
      { pat: [7, 5, 7, null, null, null], tag: "5fr · shell", root: 11 },
      { pat: [null, 14, 12, 14, null, null], tag: "12fr · shell", root: 11 },
      { pat: [null, null, 9, 7, 10, null], tag: "7fr · shell", root: 11 },
    ],
  },
  {
    id: "dom7",
    sym: "7",
    root: 7,
    shapes: [
      { pat: [3, null, 3, 4, 3, null], tag: "3fr · full" },
      { pat: [null, 10, 12, 10, 12, null], tag: "10fr · full" },
      { pat: [null, null, 5, 7, 6, 7], tag: "5fr · full" },
      { pat: [3, 2, 3, null, null, null], tag: "2fr · shell" },
      { pat: [null, 10, 9, 10, null, null], tag: "9fr · shell" },
      { pat: [null, null, 5, 4, 6, null], tag: "4fr · shell" },
    ],
  },
  {
    id: "dom9",
    sym: "9",
    root: 7,
    shapes: [{ pat: [null, 10, 9, 10, 10, null], tag: "9fr · full" }],
  },
  {
    id: "m7b5",
    sym: "m7♭5",
    root: 8,
    shapes: [
      { pat: [4, null, 4, 4, 3, null], tag: "3fr" },
      { pat: [null, 11, 12, 11, 12, null], tag: "10fr" },
      { pat: [null, null, 6, 7, 7, 7], tag: "5fr" },
    ],
  },
  {
    id: "maj9",
    sym: "maj9",
    root: 9,
    shapes: [
      { pat: [5, 4, 6, 4, null, null], tag: "4fr" },
      { pat: [null, 12, 11, 13, 12, null], tag: "11fr" },
      { pat: [null, null, 7, 6, 9, 7], tag: "6fr" },
    ],
  },
  {
    id: "m9",
    sym: "m9",
    root: 11,
    shapes: [
      { pat: [7, 5, 7, 6, null, null], tag: "5fr" },
      { pat: [null, 14, 12, 14, 14, null], tag: "12fr" },
      { pat: [null, null, 9, 7, 10, 9], tag: "7fr" },
    ],
  },
];

export const QBYID: Record<QualId, Qual> = Object.fromEntries(
  QUALS.map((q) => [q.id, q]),
) as Record<QualId, Qual>;

export const QLABEL: Record<QualId, string> = {
  maj7: "Major 7",
  m7: "Minor 7",
  dom7: "Dominant 7",
  dom9: "Dominant 9",
  m7b5: "Minor 7♭5",
  maj9: "Major 9",
  m9: "Minor 9",
};

/** Degree label keyed by interval semitones above the root. */
export const DEG: Record<number, string> = {
  0: "R", 1: "♭9", 2: "9", 3: "♭3", 4: "3", 5: "11",
  6: "♭5", 7: "5", 8: "♯5", 9: "13", 10: "♭7", 11: "7",
};

/** Transpose a shape to a target root pitch-class, keeping the lowest fingered
 *  fret in a comfortable window (drop an octave while it sits above fret 12). */
export function transpose(shape: Shape, qRoot: number, targetPc: number): (number | null)[] {
  const native = shape.root ?? qRoot;
  const shift = mod12(targetPc - native);
  let pat = shape.pat.map((f) => (f === null ? null : f + shift));
  let lo = Math.min(...(pat.filter((f) => f !== null) as number[]));
  while (lo > 12) {
    pat = pat.map((f) => (f === null ? null : f - 12));
    lo -= 12;
  }
  return pat;
}

export type ChordNote = {
  string: number; // 0..5, low E → high e
  fret: number;
  pc: number;
  iv: number; // interval semitones above root
  deg: string;
  name: string;
};

/** The sounding notes of a fingering, low → high, with degree + name. */
export function chordNotes(pat: (number | null)[], rootPc: number): ChordNote[] {
  const out: ChordNote[] = [];
  for (let i = 0; i < 6; i++) {
    const f = pat[i];
    if (f === null) continue;
    const pc = (OPEN[i] + f) % 12;
    const iv = mod12(pc - rootPc);
    out.push({ string: i, fret: f, pc, iv, deg: DEG[iv] ?? "?", name: SHARP[pc] });
  }
  return out;
}

/** Note-name readout, low → high. */
export const readout = (notes: ChordNote[]): string => notes.map((n) => n.name).join(" ");

/** Fret window for a diagram: 5 frets from the lowest fingered fret. */
export function chordWindow(pat: (number | null)[]): {
  lo: number; hi: number; start: number; showNut: boolean;
} {
  const fingered = pat.filter((f) => f !== null) as number[];
  const lo = Math.min(...fingered);
  const hi = Math.max(...fingered);
  return { lo, hi, start: lo, showNut: lo === 1 };
}

/* ── Progression: diatonic plan for a major key ───────────────────────────── */

/** Major keys for the progression builder, by tonic name + pitch-class. */
export const KEYS: { n: string; pc: number }[] = [
  { n: "C", pc: 0 }, { n: "G", pc: 7 }, { n: "D", pc: 2 }, { n: "A", pc: 9 },
  { n: "E", pc: 4 }, { n: "B", pc: 11 }, { n: "F#", pc: 6 }, { n: "Db", pc: 1 },
  { n: "Ab", pc: 8 }, { n: "Eb", pc: 3 }, { n: "Bb", pc: 10 }, { n: "F", pc: 5 },
];

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Spell a major scale from a tonic name, preserving one letter per degree. */
export function spellScale(tonic: string): { name: string; pc: number }[] {
  const baseL = tonic[0];
  const acc = tonic.slice(1);
  let pc = mod12(LETTER_PC[baseL] + (acc === "#" ? 1 : acc === "b" ? -1 : 0));
  const steps = [2, 2, 1, 2, 2, 2, 1];
  const li = LETTERS.indexOf(baseL);
  const out: { name: string; pc: number }[] = [];
  for (let d = 0; d < 7; d++) {
    const letter = LETTERS[(li + d) % 7];
    const nat = LETTER_PC[letter];
    let diff = mod12(pc - nat);
    if (diff > 6) diff -= 12;
    const acc2 = diff === 0 ? "" : diff > 0 ? "#".repeat(diff) : "b".repeat(-diff);
    out.push({ name: letter + acc2, pc });
    pc = (pc + steps[d]) % 12;
  }
  return out;
}

export const ROMANS = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];

/** Per scale-degree [base quality, extended quality | null]. */
export const DEGQUAL: [QualId, QualId | null][] = [
  ["maj7", "maj9"],
  ["m7", "m9"],
  ["m7", "m9"],
  ["maj7", "maj9"],
  ["dom7", "dom9"],
  ["m7", "m9"],
  ["m7b5", null],
];
