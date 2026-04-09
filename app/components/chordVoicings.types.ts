import type { CagedShapeName, Degree } from "./scalePositions.types";

export type ChordType = "maj" | "min" | "dom7" | "maj7" | "min7";

export const CHORD_TONES: Record<ChordType, Degree[]> = {
  maj:  ["R", "3", "5"],
  min:  ["R", "b3", "5"],
  dom7: ["R", "3", "5", "b7"],
  maj7: ["R", "3", "5", "7"],
  min7: ["R", "b3", "5", "b7"],
};

export const CHORD_LABELS: Record<ChordType, string> = {
  maj:  "Maj",
  min:  "Min",
  dom7: "Dom 7",
  maj7: "Maj 7",
  min7: "Min 7",
};

export const CHORD_TYPES: ChordType[] = ["maj", "min", "dom7", "maj7", "min7"];

export interface ChordStringVoicing {
  open: boolean;
  muted: boolean;
  fret: number | null; // relative fret within the shape (0 = lowest fret)
  deg: Degree | null;
}

export interface ChordVoicingData {
  shapeName: CagedShapeName;
  baseFret: number; // lowest fret on the actual neck (shown when > 1)
  showNut: boolean; // show thick nut line when baseFret <= 1
  strings: ChordStringVoicing[]; // index 0 = low E, index 5 = high e
}
