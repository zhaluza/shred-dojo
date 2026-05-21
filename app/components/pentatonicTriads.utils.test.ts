import { describe, expect, it } from "vitest";
import {
  buildBox,
  bluesNotesForBox,
  adjustAdjacentFrets,
  STRING_NAMES,
  type BoxNote,
  type PentaDegree,
} from "./pentatonicTriads.utils";
import type { StringName } from "./scalePositions.types";

function fmtBox(notes: BoxNote[]): string {
  return STRING_NAMES.map((s) =>
    notes
      .filter((n) => n.string === s)
      .map((n) => `${n.deg}:${n.fret}`)
      .join(" ")
  ).join(" | ");
}

// Mirror BOX_DEGREES from the source to verify degree assignments
const MINOR_BOX_DEGREES: PentaDegree[][][] = [
  [["R","b3"],["4","5"],["b7","R"],["b3","4"],["5","b7"],["R","b3"]],
  [["b3","4"],["5","b7"],["R","b3"],["4","5"],["b7","R"],["b3","4"]],
  [["4","5"],["b7","R"],["b3","4"],["5","b7"],["R","b3"],["4","5"]],
  [["5","b7"],["R","b3"],["4","5"],["b7","R"],["b3","4"],["5","b7"]],
  [["b7","R"],["b3","4"],["5","b7"],["R","b3"],["4","5"],["b7","R"]],
];

const MAJOR_BOX_DEGREES: PentaDegree[][][] = [
  [["R","2"],["3","5"],["6","R"],["2","3"],["5","6"],["R","2"]],
  [["2","3"],["5","6"],["R","2"],["3","5"],["6","R"],["2","3"]],
  [["3","5"],["6","R"],["2","3"],["5","6"],["R","2"],["3","5"]],
  [["5","6"],["R","2"],["3","5"],["6","R"],["2","3"],["5","6"]],
  [["6","R"],["2","3"],["5","6"],["R","2"],["3","5"],["6","R"]],
];

// ---------------------------------------------------------------------------
// buildBox
// ---------------------------------------------------------------------------

describe("buildBox", () => {
  it("minor box 0 (G root) matches expected fret positions", () => {
    expect(fmtBox(buildBox(0, "minor"))).toBe(
      "R:3 b3:6 | 4:3 5:5 | b7:3 R:5 | b3:3 4:5 | 5:3 b7:6 | R:3 b3:6"
    );
  });

  it("major box 0 (G root) matches expected fret positions", () => {
    expect(fmtBox(buildBox(0, "major"))).toBe(
      "R:3 2:5 | 3:2 5:5 | 6:2 R:5 | 2:2 3:4 | 5:3 6:5 | R:3 2:5"
    );
  });

  it("returns exactly 12 notes (2 per string) for every box/scale", () => {
    for (const scale of ["minor", "major"] as const) {
      for (let i = 0; i < 5; i++) {
        const notes = buildBox(i, scale);
        expect(notes).toHaveLength(12);
        for (const str of STRING_NAMES) {
          expect(notes.filter((n) => n.string === str)).toHaveLength(2);
        }
      }
    }
  });

  it("degrees match BOX_DEGREES for every box/scale", () => {
    for (let i = 0; i < 5; i++) {
      const minNotes = buildBox(i, "minor");
      const majNotes = buildBox(i, "major");
      for (let si = 0; si < 6; si++) {
        const str = STRING_NAMES[si];
        const minDegs = minNotes.filter((n) => n.string === str).map((n) => n.deg);
        const majDegs = majNotes.filter((n) => n.string === str).map((n) => n.deg);
        expect(minDegs).toEqual(MINOR_BOX_DEGREES[i][si]);
        expect(majDegs).toEqual(MAJOR_BOX_DEGREES[i][si]);
      }
    }
  });

  it("all frets are in [0, 22]", () => {
    for (const scale of ["minor", "major"] as const) {
      for (let i = 0; i < 5; i++) {
        for (const note of buildBox(i, scale)) {
          expect(note.fret).toBeGreaterThanOrEqual(0);
          expect(note.fret).toBeLessThanOrEqual(22);
        }
      }
    }
  });

  it("fret span per box is ≤ 5", () => {
    for (const scale of ["minor", "major"] as const) {
      for (let i = 0; i < 5; i++) {
        const frets = buildBox(i, scale).map((n) => n.fret);
        const span = Math.max(...frets) - Math.min(...frets);
        expect(span).toBeLessThanOrEqual(5);
      }
    }
  });

  it("low E and high e strings have the same degrees", () => {
    for (const scale of ["minor", "major"] as const) {
      for (let i = 0; i < 5; i++) {
        const notes = buildBox(i, scale);
        const loE = notes.filter((n) => n.string === "E").map((n) => n.deg);
        const hiE = notes.filter((n) => n.string === "e").map((n) => n.deg);
        expect(hiE).toEqual(loE);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// bluesNotesForBox
// ---------------------------------------------------------------------------

describe("bluesNotesForBox", () => {
  // Derived from scanning MINOR_BOX_DEGREES: strings with [b3,4] or [4,5] each
  // produce one b5 note. Minor only — major has no such pairs.
  const EXPECTED_B5_COUNTS = [2, 3, 3, 2, 2];

  it("produces the correct number of b5 notes per minor box", () => {
    for (let i = 0; i < 5; i++) {
      const blues = bluesNotesForBox(buildBox(i, "minor"));
      expect(blues).toHaveLength(EXPECTED_B5_COUNTS[i]);
    }
  });

  it("all returned notes have deg 'b5'", () => {
    for (let i = 0; i < 5; i++) {
      for (const note of bluesNotesForBox(buildBox(i, "minor"))) {
        expect(note.deg).toBe("b5");
      }
    }
  });

  it("b5 fret is exactly the 4th fret + 1 on the same string", () => {
    for (let i = 0; i < 5; i++) {
      const boxNotes = buildBox(i, "minor");
      for (const b5 of bluesNotesForBox(boxNotes)) {
        const fourth = boxNotes.find((n) => n.string === b5.string && n.deg === "4");
        expect(fourth).toBeDefined();
        expect(b5.fret).toBe(fourth!.fret + 1);
      }
    }
  });

  it("returns empty array for all major boxes (no qualifying degree pairs)", () => {
    for (let i = 0; i < 5; i++) {
      expect(bluesNotesForBox(buildBox(i, "major"))).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// adjustAdjacentFrets
// ---------------------------------------------------------------------------

describe("adjustAdjacentFrets", () => {
  const makeNotes = (frets: number[], str: StringName = "E"): BoxNote[] =>
    frets.map((fret) => ({ string: str, fret, deg: "R" as PentaDegree }));

  it("returns empty array for empty input", () => {
    expect(adjustAdjacentFrets([], 3, 8, "prev")).toEqual([]);
    expect(adjustAdjacentFrets([], 3, 8, "next")).toEqual([]);
  });

  it("no-op when prev box is already to the left of current", () => {
    const adj = makeNotes([0, 3]);
    expect(adjustAdjacentFrets(adj, 5, 9, "prev").map((n) => n.fret)).toEqual([0, 3]);
  });

  it("no-op when next box is already to the right of current", () => {
    const adj = makeNotes([12, 15]);
    expect(adjustAdjacentFrets(adj, 5, 9, "next").map((n) => n.fret)).toEqual([12, 15]);
  });

  it("shifts prev box down 12 when adjMin > currentMaxF + 4", () => {
    // Prev at 15-18, current at 3-6: 15 > 6+4=10 → shift -12
    const adj = makeNotes([15, 18]);
    const result = adjustAdjacentFrets(adj, 3, 6, "prev");
    expect(result.map((n) => n.fret)).toEqual([3, 6]);
  });

  it("shifts next box up 12 when adjMax < currentMinF - 4", () => {
    // Next at 3-6, current at 15-18: 6 < 15-4=11 → shift +12
    const adj = makeNotes([3, 6]);
    const result = adjustAdjacentFrets(adj, 15, 18, "next");
    expect(result.map((n) => n.fret)).toEqual([15, 18]);
  });

  it("filters notes with fret < 0 after -12 shift", () => {
    // adjMin=11 > 6+4=10 → shift -12; fret 11→-1 (filtered), fret 13→1 (kept)
    const adj = makeNotes([13, 11]);
    const result = adjustAdjacentFrets(adj, 3, 6, "prev");
    expect(result).toHaveLength(1);
    expect(result[0].fret).toBe(1);
  });

  it("preserves string and deg fields unchanged", () => {
    const adj: BoxNote[] = [
      { string: "A", fret: 15, deg: "5" },
      { string: "D", fret: 17, deg: "b7" },
    ];
    const result = adjustAdjacentFrets(adj, 3, 6, "prev");
    expect(result[0].string).toBe("A");
    expect(result[0].deg).toBe("5");
    expect(result[1].string).toBe("D");
    expect(result[1].deg).toBe("b7");
  });
});
