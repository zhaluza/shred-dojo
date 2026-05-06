import type { StringName } from "./scalePositions.types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PentaScaleMode = "minor" | "major";
export type PentaDegree = "R" | "b3" | "4" | "b5" | "5" | "b7" | "2" | "3" | "6";

export interface BoxNote {
  string: StringName;
  fret: number; // absolute fret number
  deg: PentaDegree;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const OPEN_SEMITONES = [0, 5, 10, 15, 19, 24]; // semitones above low E open
export const STRING_NAMES: StringName[] = ["E", "A", "D", "G", "B", "e"];
export const ROOT_FRET = 3; // G on low E string

export const SEMI: Record<PentaScaleMode, Record<PentaDegree, number>> = {
  minor: { R: 0, b3: 3, "4": 5, "b5": 6, "5": 7, b7: 10, "2": -1, "3": -1, "6": -1 },
  major: { R: 0, "2": 2, "3": 4, "b5": -1, "5": 7, "6": 9, b3: -1, "4": -1, b7: -1 },
};

export const TRIAD_DEGREES: Record<PentaScaleMode, Set<PentaDegree>> = {
  minor: new Set(["R", "b3", "5"]),
  major: new Set(["R", "3", "5"]),
};

export const THIRD_DEG: Record<PentaScaleMode, PentaDegree> = {
  minor: "b3",
  major: "3",
};

export const THIRD_LABEL: Record<PentaScaleMode, string> = {
  minor: "Minor 3rd",
  major: "Major 3rd",
};

export const INTRO: Record<PentaScaleMode, string> = {
  major:
    "The major pentatonic triad is built from the root (R), major 3rd (3), and perfect 5th (5). These three notes appear in every shape. Dashed outlines show triad tones from adjacent shapes — reachable with a small position shift.",
  minor:
    "The minor pentatonic triad is built from the root (R), minor 3rd (b3), and perfect 5th (5). All three appear in every shape. Dashed outlines show triad tones from adjacent shapes — worth knowing for connecting positions.",
};

export const SHAPE_NOTES: Record<PentaScaleMode, string[]> = {
  major: [
    "Root on low E and high e. The 3rd appears early on A and G strings — easy to target on the way down.",
    "Root moves to the D and B strings. The 3rd and 5th cluster on G and high e — a natural double-stop position.",
    "Root on A and B strings. All three triad tones sit in a tight vertical window — good for vertical chord-tone targeting.",
    "Root on A and G strings. The 3rd and 5th on D and B form the classic two-string triad voicing.",
    "Root returns to E and e. Mirrors shape 1 an octave higher — same fingering logic.",
  ],
  minor: [
    "Root on low E and high e. The b3 appears on both E strings and the G string — multiple places to enter a lick.",
    "Root on D and B strings. The b3 and 5 sit close on the upper strings — ideal for bends up to the 5th.",
    "Root on A and B strings. The b3 bridges shapes 2 and 3 here, connecting the two positions.",
    "Root on A and G strings. The 5th appears on three strings — easy to find the stable tone in this box.",
    "Root back on E and e. The b3 on G is the classic box 5 bend target.",
  ],
};

// ─── Box degree assignments ───────────────────────────────────────────────────
// Each entry: [low E, A, D, G, B, high e], with two degrees per string

const BOX_DEGREES: Record<PentaScaleMode, PentaDegree[][][]> = {
  minor: [
    [["R", "b3"], ["4", "5"],  ["b7", "R"], ["b3", "4"], ["5", "b7"], ["R",  "b3"]],
    [["b3", "4"], ["5", "b7"], ["R",  "b3"], ["4",  "5"], ["b7", "R"], ["b3", "4" ]],
    [["4",  "5"], ["b7", "R"], ["b3", "4"], ["5",  "b7"], ["R",  "b3"], ["4",  "5" ]],
    [["5",  "b7"], ["R", "b3"], ["4",  "5"], ["b7", "R"], ["b3", "4"], ["5",  "b7"]],
    [["b7", "R"], ["b3", "4"], ["5",  "b7"], ["R",  "b3"], ["4",  "5"], ["b7", "R" ]],
  ],
  major: [
    [["R",  "2"], ["3",  "5"], ["6",  "R"], ["2",  "3"], ["5",  "6"], ["R",  "2" ]],
    [["2",  "3"], ["5",  "6"], ["R",  "2"], ["3",  "5"], ["6",  "R"], ["2",  "3" ]],
    [["3",  "5"], ["6",  "R"], ["2",  "3"], ["5",  "6"], ["R",  "2"], ["3",  "5" ]],
    [["5",  "6"], ["R",  "2"], ["3",  "5"], ["6",  "R"], ["2",  "3"], ["5",  "6" ]],
    [["6",  "R"], ["2",  "3"], ["5",  "6"], ["R",  "2"], ["3",  "5"], ["6",  "R" ]],
  ],
};

// ─── Box construction ─────────────────────────────────────────────────────────

function closestFret(
  degSemi: number,
  stringIdx: number,
  refFret: number
): number {
  const rootPitch = OPEN_SEMITONES[0] + ROOT_FRET;
  const notePitch = (rootPitch + degSemi) % 12;
  const openPitch = OPEN_SEMITONES[stringIdx] % 12;
  const base = (notePitch - openPitch + 12) % 12;
  const candidates = [base, base + 12, base + 24].filter(
    (f) => f >= 0 && f <= 22
  );
  return candidates.reduce((best, f) =>
    Math.abs(f - refFret) <= Math.abs(best - refFret) ? f : best
  );
}

export function buildBox(boxIdx: number, scale: PentaScaleMode): BoxNote[] {
  const semiMap = SEMI[scale];
  const degAssign = BOX_DEGREES[scale][boxIdx];
  const anchorDeg = degAssign[0][0];
  const anchorFret = closestFret(
    semiMap[anchorDeg],
    0,
    ROOT_FRET + semiMap[anchorDeg]
  );

  const notes: BoxNote[] = [];
  for (let si = 0; si < 6; si++) {
    const [d1, d2] = degAssign[si];
    const f1 = closestFret(semiMap[d1], si, anchorFret);
    const f2 = closestFret(semiMap[d2], si, f1 + 1);
    notes.push({ string: STRING_NAMES[si], fret: f1, deg: d1 });
    notes.push({ string: STRING_NAMES[si], fret: f2, deg: d2 });
  }
  return notes;
}

export function buildAllBoxes(scale: PentaScaleMode): BoxNote[][] {
  return Array.from({ length: 5 }, (_, i) => buildBox(i, scale));
}

// ─── Blues scale ──────────────────────────────────────────────────────────────
// Returns the b5 "blue note" positions for a given pentatonic box.
// Rule: strings with [b3, 4] get b5 after the 4th; strings with [4, 5] get b5
// between them. Both cases place b5 exactly 1 fret above the 4th.
export function bluesNotesForBox(boxNotes: BoxNote[]): BoxNote[] {
  const byString = new Map<StringName, BoxNote[]>();
  for (const n of boxNotes) {
    const arr = byString.get(n.string) ?? [];
    arr.push(n);
    byString.set(n.string, arr);
  }
  const blues: BoxNote[] = [];
  for (const notes of byString.values()) {
    const degs = notes.map((n) => n.deg);
    if (
      (degs.includes("4") && degs.includes("5")) ||
      (degs.includes("b3") && degs.includes("4"))
    ) {
      const note4 = notes.find((n) => n.deg === "4")!;
      blues.push({ string: note4.string, fret: note4.fret + 1, deg: "b5" });
    }
  }
  return blues;
}

// ─── Adjacent fret adjustment ─────────────────────────────────────────────────
// When boxes wrap around the neck (e.g., box 4 → box 0), shift by ±12
// so the adjacent box is physically adjacent in fret space.

export function adjustAdjacentFrets(
  adjacentNotes: BoxNote[],
  currentMinF: number,
  currentMaxF: number,
  side: "prev" | "next"
): BoxNote[] {
  if (adjacentNotes.length === 0) return [];
  const adjMin = Math.min(...adjacentNotes.map((n) => n.fret));
  const adjMax = Math.max(...adjacentNotes.map((n) => n.fret));

  let offset = 0;
  if (side === "prev") {
    // Prev shape should be to the left (lower frets); if it's higher, shift down
    if (adjMin > currentMaxF + 4) offset = -12;
  } else {
    // Next shape should be to the right (higher frets); if it's lower, shift up
    if (adjMax < currentMinF - 4) offset = 12;
  }

  return adjacentNotes
    .map((n) => ({ ...n, fret: n.fret + offset }))
    .filter((n) => n.fret >= 0 && n.fret <= 24);
}
