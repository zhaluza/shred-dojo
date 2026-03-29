export type Degree = "R" | "2" | "b3" | "3" | "4" | "5" | "b6" | "6" | "b7" | "7";
export type ScaleMode = "minor" | "major";
export type NoteFilter = "all" | "penta" | "chord";
export type StringName = "E" | "A" | "D" | "G" | "B" | "e";
export type System = "3nps" | "sym" | "caged";
export type CagedShapeName = "C" | "A" | "G" | "E" | "D";

export interface ScaleNote {
  fret: number;
  deg: Degree;
  penta: boolean;
}

export interface ScaleString {
  name: StringName;
  notes: ScaleNote[];
}

export interface ScalePosition {
  scaletone: number;
  startDeg: Degree;
  system: System;
  strings: ScaleString[];
  twoNps: StringName | null;
  shapeName?: CagedShapeName;
  startFret: number; // rawMinFret % 12, used for cross-system fret alignment
}

export interface ScaleConfig {
  scale: Degree[];
  semi: Record<Degree, number>;
  penta: Set<Degree>;
  chordTones: Set<Degree>;
  diaLabel: string;
  title: string;
}
