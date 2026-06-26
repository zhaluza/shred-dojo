// Writing Ideas with Scales — pure music data and helpers (no React).
//
// Built on the shared music model: pitch classes / mod-12 math / key list come
// from pentatonicPractice.utils, so this page speaks the same language as the
// rest of the app (flats, circle-of-fifths KEYS, low-E-anchored string order).
// Strings are indexed low→high to match OPEN_PCS / STRING_NAMES:
//   0 = low E, 1 = A, 2 = D, 3 = G, 4 = B, 5 = high e.

import { mod12, OPEN_PCS } from "./pentatonicPractice.utils";

export { mod12, KEYS, NOTE_NAMES, OPEN_PCS } from "./pentatonicPractice.utils";

// ─── Tuning / audio ──────────────────────────────────────────────────────────
// MIDI of each open string, low→high (mirrors FretboardNotes' OPEN_MIDI but in
// the OPEN_PCS index order this page uses).
export const OPEN_MIDI = [40, 45, 50, 55, 59, 64];
export const NUM_FRETS = 12;

export function noteMidi(stringIdx: number, fret: number): number {
  return OPEN_MIDI[stringIdx] + fret;
}

export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Pitch class at a string/fret (low→high index).
export function pcAt(stringIdx: number, fret: number): number {
  return mod12(OPEN_PCS[stringIdx] + fret);
}

// ─── Scales (sections 1, 3, 4, 5, 6) ─────────────────────────────────────────
// `iv` = semitone intervals from the root; `deg` = degree labels; `char` = index
// into `iv` of the characteristic "colour" note (Lydian's ♯4), or -1 if none.
export interface ScaleDef {
  iv: number[];
  deg: string[];
  char: number;
}

export const SCALES: Record<"Major" | "Lydian", ScaleDef> = {
  Major: {
    iv: [0, 2, 4, 5, 7, 9, 11],
    deg: ["1", "2", "3", "4", "5", "6", "7"],
    char: -1,
  },
  Lydian: {
    iv: [0, 2, 4, 6, 7, 9, 11],
    deg: ["1", "2", "3", "♯4", "5", "6", "7"],
    char: 3,
  },
};

export type ScaleName = keyof typeof SCALES;

// Interval-name labels for the octave-chunk box (section 2). Indexed like the
// major scale's `iv`.
export const IVMAJ = ["R", "Δ2", "Δ3", "p4", "p5", "Δ6", "Δ7"];

// ─── Navigation scales (section 2b) ──────────────────────────────────────────
export interface NavScaleDef {
  iv: number[];
  deg: string[];
}

export const NAV_SCALES: Record<"Major" | "MajPent" | "MinPent", NavScaleDef> = {
  Major: { iv: [0, 2, 4, 5, 7, 9, 11], deg: ["R", "2", "3", "4", "5", "6", "7"] },
  MajPent: { iv: [0, 2, 4, 7, 9], deg: ["R", "2", "3", "5", "6"] },
  MinPent: { iv: [0, 3, 5, 7, 10], deg: ["R", "♭3", "4", "5", "♭7"] },
};

export type NavScaleName = keyof typeof NAV_SCALES;

// ─── Diatonic harmony (sections 4 & 6) ───────────────────────────────────────
export const MODES = [
  "Ionian", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Aeolian", "Locrian",
];
export const QUAL = ["maj7", "m7", "m7", "maj7", "7", "m7", "m7♭5"];
export const RN = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];

// The four chord-tones (1·3·5·7) of the diatonic chord rooted on scale degree
// `d` (0-based), expressed as indices into the 7-note major scale.
export function chordTarget(d: number): number[] {
  return [d, (d + 2) % 7, (d + 4) % 7, (d + 6) % 7];
}

// Index of a pitch class within a scale's interval set relative to a root pc, or
// -1 if the pitch class isn't in the scale.
export function relDegIndex(pc: number, rootPc: number, iv: number[]): number {
  return iv.indexOf(mod12(pc - rootPc));
}

// ─── Navigation root (section 2b) ────────────────────────────────────────────
export interface NavRoot {
  si: number; // string index (low→high)
  fret: number;
}

// Default the movable nav root to the key's root on the A string (si=1), the
// register the lesson anchors to. A-string open pc is 9, so fret = root - 9.
export function defaultNavRoot(rootPc: number): NavRoot {
  return { si: 1, fret: mod12(rootPc - OPEN_PCS[1]) };
}
