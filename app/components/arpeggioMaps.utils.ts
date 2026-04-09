import type { Degree, ScaleConfig, ScalePosition } from "./scalePositions.types";
import { buildCagedPositions, buildAllPositions, SCALES } from "./scalePositions.utils";
import { CHORD_TONES, type ChordType } from "./chordVoicings.types";

function cfgForChordType(chordType: ChordType): ScaleConfig {
  const tones = new Set<Degree>(CHORD_TONES[chordType]);
  switch (chordType) {
    case "maj":
      return { ...SCALES.major, chordTones: tones };
    case "min":
      return { ...SCALES.minor, chordTones: tones };
    case "dom7":
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

/**
 * Returns 5 CAGED arpeggio positions for the given chord type.
 * Each ScalePosition contains all diatonic notes; pass chordTones to the
 * Fretboard to show only arpeggio tones at render time.
 */
export function buildArpeggioPositions(chordType: ChordType): ScalePosition[] {
  const cfg = cfgForChordType(chordType);
  return buildCagedPositions(cfg);
}

/**
 * Returns 7 3nps arpeggio positions (one per scale degree) for the given chord type.
 */
export function buildArpeggio3npsPositions(chordType: ChordType): ScalePosition[] {
  const cfg = cfgForChordType(chordType);
  return buildAllPositions(cfg).filter((p) => p.system === "3nps");
}

