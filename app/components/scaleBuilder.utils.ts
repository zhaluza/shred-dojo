export const NOTES_FROM_C = [
  "C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B",
] as const;

export const SEMI_FROM_C: Record<string, number> = {
  C: 0, Db: 1, D: 2, Eb: 3, E: 4, F: 5, "F#": 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11,
};

export const KEY_NAMES = [
  "E", "F", "F#", "G", "Ab", "A", "Bb", "B", "C", "Db", "D", "Eb",
] as const;
export type KeyName = (typeof KEY_NAMES)[number];

export type ScaleType = "major" | "minor" | "majorPenta" | "minorPenta" | "blues";

export const SCALE_TYPES: Record<
  ScaleType,
  { label: string; intervals: number[]; steps: string[] }
> = {
  major:      { label: "Major",     intervals: [2,2,1,2,2,2,1], steps: ["W","W","H","W","W","W","H"] },
  minor:      { label: "Minor",     intervals: [2,1,2,2,1,2,2], steps: ["W","H","W","W","H","W","W"] },
  majorPenta: { label: "Maj Penta", intervals: [2,2,3,2,3],     steps: ["W","W","WH","W","WH"] },
  minorPenta: { label: "Min Penta", intervals: [3,2,2,3,2],     steps: ["WH","W","W","WH","W"] },
  blues:      { label: "Blues",     intervals: [3,2,1,1,3,2],   steps: ["WH","W","H","H","WH","W"] },
};

export const SCALE_TYPE_KEYS = Object.keys(SCALE_TYPES) as ScaleType[];

export interface ScaleNote {
  note: string;
  octave: number;
}

export function buildScale(root: string, intervals: number[]): ScaleNote[] {
  const rootSemi = SEMI_FROM_C[root] ?? 0;
  let midi = 60 + rootSemi;
  const result: ScaleNote[] = [{ note: root, octave: Math.floor(midi / 12) - 1 }];
  for (const interval of intervals.slice(0, -1)) {
    midi += interval;
    result.push({
      note: NOTES_FROM_C[midi % 12],
      octave: Math.floor(midi / 12) - 1,
    });
  }
  return result;
}

export interface VexNoteData {
  key: string;
  accidental: "#" | "b" | null;
}

export function toVexNote(sn: ScaleNote): VexNoteData {
  const n = sn.note;
  const isSharp = n.includes("#");
  const isFlat = n.length === 2 && n[1] === "b";
  const letter = n[0].toLowerCase();
  const acc = isSharp ? "#" : isFlat ? "b" : "";
  return {
    key: `${letter}${acc}/${sn.octave}`,
    accidental: isSharp ? "#" : isFlat ? "b" : null,
  };
}
