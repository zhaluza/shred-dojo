import type { Degree, ScaleConfig } from "./scalePositions.types";
import { buildCagedPositions, SCALES } from "./scalePositions.utils";
import {
  CHORD_TONES,
  type ChordType,
  type ChordStringVoicing,
  type ChordVoicingData,
} from "./chordVoicings.types";

// Degree color map for chord diagrams and legend
export const DEG_COLOR: Record<Degree, string> = {
  R:    "var(--root-col)",
  "2":  "var(--muted)",
  b3:   "var(--sys-caged)",
  "3":  "var(--sys-caged)",
  "4":  "var(--muted)",
  "b5": "var(--blues-col)",
  "5":  "var(--fifth-col)",
  b6:   "var(--muted)",
  "6":  "var(--muted)",
  b7:   "var(--seventh-col)",
  "7":  "var(--seventh-col)",
};

function cfgForChordType(chordType: ChordType): ScaleConfig {
  const tones = new Set<Degree>(CHORD_TONES[chordType]);
  switch (chordType) {
    case "maj":
      return { ...SCALES.major, chordTones: tones };
    case "min":
      return { ...SCALES.minor, chordTones: tones };
    case "dom7":
      // Mixolydian: same geometry as major but scale[6] = b7
      return {
        scale: ["R", "2", "3", "4", "5", "6", "b7"],
        semi: SCALES.major.semi,
        penta: SCALES.major.penta,
        chordTones: tones,
        diaLabel: "Dom 7",
        title: "Dominant 7",
      };
    case "maj7":
      return { ...SCALES.major, chordTones: tones };
    case "min7":
      return { ...SCALES.minor, chordTones: tones };
  }
}

export function buildChordVoicings(chordType: ChordType): ChordVoicingData[] {
  const cfg = cfgForChordType(chordType);
  const positions = buildCagedPositions(cfg);
  const tones = new Set(CHORD_TONES[chordType]);

  return positions.map((pos) => {
    const baseFret = pos.startFret;
    const showNut = baseFret <= 1;

    const strings: ChordStringVoicing[] = pos.strings.map((str) => {
      const chordNotes = str.notes.filter((n) => tones.has(n.deg));

      if (chordNotes.length === 0) {
        return { open: false, muted: true, fret: null, deg: null };
      }

      // Pick the lowest-fret chord tone — closest to hand position
      const best = chordNotes.reduce((a, b) => (a.fret <= b.fret ? a : b));

      return {
        open: showNut && best.fret === 0,
        muted: false,
        fret: best.fret,
        deg: best.deg,
      };
    });

    return { shapeName: pos.shapeName!, baseFret, showNut, strings };
  });
}
