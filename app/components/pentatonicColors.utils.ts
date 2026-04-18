import type { StringName } from "./scalePositions.types";
import {
  OPEN_SEMITONES,
  STRING_NAMES,
  ROOT_FRET,
  type BoxNote,
} from "./pentatonicTriads.utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ColorDegreeLabel =
  | "b2"
  | "2"
  | "b5"
  | "b6"
  | "6"
  | "4"
  | "#4"
  | "b7"
  | "maj7";

export interface ColorNote {
  string: StringName;
  fret: number;
  degLabel: ColorDegreeLabel;
}

export interface ColorModeConfig {
  id: string;
  label: string;
  addedSemis: Array<{ semi: number; degLabel: ColorDegreeLabel }>;
  description: string;
}

// ─── Mode configurations ──────────────────────────────────────────────────────

export const MINOR_COLOR_MODES: ColorModeConfig[] = [
  {
    id: "aeolian",
    label: "Aeolian",
    addedSemis: [
      { semi: 2, degLabel: "2" },
      { semi: 8, degLabel: "b6" },
    ],
    description:
      "Aeolian (natural minor) adds the 2nd and ♭6 to the minor pentatonic. The 2nd fills in stepwise motion between root and ♭3; the ♭6 deepens the minor color below the 5th. Together they complete the full seven-note minor scale.",
  },
  {
    id: "blues",
    label: "Blues",
    addedSemis: [{ semi: 6, degLabel: "b5" }],
    description:
      "The blues scale adds one note to the minor pentatonic: the ♭5 (the blue note). Sitting between the 4th and 5th, it creates the defining tension of the blues. Use it as a chromatic passing tone or lean into it for raw expression.",
  },
  {
    id: "dorian",
    label: "Dorian",
    addedSemis: [{ semi: 9, degLabel: "6" }],
    description:
      "Dorian is a minor mode with a raised 6th. The major 6th brightens the minor pentatonic and gives it a slightly jazzy, modal quality. It's the foundation of countless rock and blues solos — from Santana to Gilmour.",
  },
  {
    id: "phrygian",
    label: "Phrygian",
    addedSemis: [{ semi: 1, degLabel: "b2" }],
    description:
      "Phrygian is defined by the ♭2, just one semitone above the root. Adding it to the minor pentatonic creates a dark, exotic color with a Spanish or metal edge. Maximum tension against the root makes it a powerful accent.",
  },
  {
    id: "harmonic-minor",
    label: "Harm. Minor",
    addedSemis: [
      { semi: 2, degLabel: "2" },
      { semi: 8, degLabel: "b6" },
      { semi: 11, degLabel: "maj7" },
    ],
    description:
      "Harmonic minor raises the 7th a half step from natural minor, producing a dramatic augmented 2nd between ♭6 and maj7. This interval gives it a classical and Middle Eastern sound. The leading tone resolves strongly back to the root.",
  },
];

export const MAJOR_COLOR_MODES: ColorModeConfig[] = [
  {
    id: "ionian",
    label: "Ionian",
    addedSemis: [
      { semi: 5, degLabel: "4" },
      { semi: 11, degLabel: "maj7" },
    ],
    description:
      "Ionian is the major scale. Adding the 4th and maj7 completes all seven tones. The 4th provides a stepwise bridge between 3rd and 5th; the maj7 is a bright leading tone that pulls back to the root.",
  },
  {
    id: "lydian",
    label: "Lydian",
    addedSemis: [
      { semi: 6, degLabel: "#4" },
      { semi: 11, degLabel: "maj7" },
    ],
    description:
      "Lydian's defining note is the ♯4 — a raised 4th that replaces the perfect 4th. The tritone above the root creates a dreamy, floating quality. Combined with the maj7, it has a bright, ethereal sound common in film scores and Vai/Satriani-style playing.",
  },
  {
    id: "mixolydian",
    label: "Mixolydian",
    addedSemis: [
      { semi: 5, degLabel: "4" },
      { semi: 10, degLabel: "b7" },
    ],
    description:
      "Mixolydian is a major scale with a ♭7 — the dominant mode. It's the home of blues-rock from Hendrix to the Allman Brothers. The ♭7 adds a bluesy unresolved tension over major chords, and is the go-to mode over dominant 7th chords.",
  },
];

// ─── Color note computation ───────────────────────────────────────────────────

function _closestFret(degSemi: number, stringIdx: number, refFret: number): number {
  const rootPitch = OPEN_SEMITONES[0] + ROOT_FRET;
  const notePitch = (rootPitch + degSemi) % 12;
  const openPitch = OPEN_SEMITONES[stringIdx] % 12;
  const base = (notePitch - openPitch + 12) % 12;
  const candidates = [base, base + 12, base + 24].filter((f) => f >= 0 && f <= 22);
  return candidates.reduce((best, f) =>
    Math.abs(f - refFret) <= Math.abs(best - refFret) ? f : best
  );
}

/**
 * Compute color (non-pentatonic) note positions for a given mode config.
 * Only notes within the displayed fret range [displayMin, displayMax] are returned.
 */
export function buildColorNotes(
  boxNotes: BoxNote[],
  config: ColorModeConfig,
  displayMin: number,
  displayMax: number
): ColorNote[] {
  const refFret = (displayMin + displayMax) / 2;
  const result: ColorNote[] = [];

  for (let si = 0; si < STRING_NAMES.length; si++) {
    const sname = STRING_NAMES[si];
    for (const { semi, degLabel } of config.addedSemis) {
      const fret = _closestFret(semi, si, refFret);
      if (fret < displayMin || fret > displayMax) continue;
      // Skip if a pentatonic note already occupies this string+fret
      if (boxNotes.some((n) => n.string === sname && n.fret === fret)) continue;
      result.push({ string: sname, fret, degLabel });
    }
  }

  return result;
}
