import type { Degree, ScaleConfig, ScaleString } from "./scalePositions.types";
import { build3nps, toRelative } from "./scalePositions.utils";

export const KEY_NAMES = [
  "E", "F", "F#", "G", "Ab", "A", "Bb", "B", "C", "Db", "D", "Eb",
] as const;

// Harmonic minor: same as natural minor but with raised 7th (leading tone = 11 semitones)
const HARMONIC_MINOR_CFG: ScaleConfig = {
  scale: ["R", "2", "b3", "4", "5", "b6", "7"],
  semi: { R: 0, "2": 2, b3: 3, "3": 4, "4": 5, "b5": 6, "5": 7, b6: 8, "6": 9, b7: 10, "7": 11 },
  penta: new Set<Degree>(["R", "b3", "4", "5", "b7"]),
  chordTones: new Set<Degree>(["R", "b3", "5"]),
  diaLabel: "Non-chord tones",
  title: "Harmonic Minor",
};

export interface YngwieShape {
  name: string;
  tagline: string;
  strings: ScaleString[];
  startFret: number;
}

const SHAPE_DEFS = [
  {
    name: "Steeler Shape",
    tagline: "Starts on the leading tone (7th degree) — the defining Yngwie entry point",
    startDegIdx: 6,
  },
  {
    name: "Little Savage Shape",
    tagline: "Starts on the 4th degree — higher neck position, same exotic sound",
    startDegIdx: 3,
  },
];

export function buildYngwieShapes(): YngwieShape[] {
  return SHAPE_DEFS.map(({ name, tagline, startDegIdx }) => {
    const raw = build3nps(startDegIdx, HARMONIC_MINOR_CFG);
    const rawMin = Math.min(...raw.flatMap((s) => s.notes.map((n) => n.fret)));
    return {
      name,
      tagline,
      strings: toRelative(raw),
      startFret: rawMin % 12,
    };
  });
}
