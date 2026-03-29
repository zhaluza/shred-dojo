import { describe, expect, it } from "vitest";
import {
  SCALES,
  build3nps,
  buildSym,
  buildAllPositions,
  buildCagedPositions,
  symTwoNoteString,
  toRelative,
} from "./scalePositions.utils";
import type { CagedShapeName, ScaleConfig, ScaleString } from "./scalePositions.types";

/** Compact string for one position: "deg:fret deg:fret | deg:fret …" per string */
function fmt(strings: ScaleString[]): string {
  return strings
    .map((s) => s.notes.map((n) => `${n.deg}:${n.fret}`).join(" "))
    .join(" | ");
}

// ---------------------------------------------------------------------------
// Minor 3nps — verified against Pebber Brown minor PDF
// ---------------------------------------------------------------------------
const MINOR_3NPS: Record<number, string> = {
  1: "R:0 2:2 b3:3 | 4:0 5:2 6:3 | b7:0 R:2 2:4 | b3:0 4:2 5:4 | 6:1 b7:3 R:5 | 2:2 b3:3 4:5",
  2: "2:0 b3:1 4:3 | 5:0 6:1 b7:3 | R:0 2:2 b3:3 | 4:0 5:2 6:3 | b7:1 R:3 2:5 | b3:1 4:3 5:5",
  3: "b3:0 4:2 5:4 | 6:0 b7:2 R:4 | 2:1 b3:2 4:4 | 5:1 6:2 b7:4 | R:2 2:4 b3:5 | 4:2 5:4 6:5",
  4: "4:0 5:2 6:3 | b7:0 R:2 2:4 | b3:0 4:2 5:4 | 6:0 b7:2 R:4 | 2:2 b3:3 4:5 | 5:2 6:3 b7:5",
  5: "5:0 6:1 b7:3 | R:0 2:2 b3:3 | 4:0 5:2 6:3 | b7:0 R:2 2:4 | b3:1 4:3 5:5 | 6:1 b7:3 R:5",
  6: "6:0 b7:2 R:4 | 2:1 b3:2 4:4 | 5:1 6:2 b7:4 | R:1 2:3 b3:4 | 4:2 5:4 6:5 | b7:2 R:4 2:6",
  7: "b7:0 R:2 2:4 | b3:0 4:2 5:4 | 6:0 b7:2 R:4 | 2:1 b3:2 4:4 | 5:2 6:3 b7:5 | R:2 2:4 b3:5",
};

// ---------------------------------------------------------------------------
// Minor sym — verified against Pebber Brown minor PDF
// ---------------------------------------------------------------------------
const MINOR_SYM: Record<number, string> = {
  1: "R:0 2:2 b3:3 | 4:0 5:2 6:3 | b7:0 R:2 2:4 | b3:0 4:2 | 5:0 6:1 b7:3 | R:0 2:2 b3:3",
  2: "2:0 b3:1 4:3 | 5:0 6:1 b7:3 | R:0 2:2 b3:3 | 4:0 5:2 6:3 | b7:1 R:3 | 2:0 b3:1 4:3",
  3: "b3:0 4:2 5:4 | 6:0 b7:2 R:4 | 2:1 b3:2 4:4 | 5:1 6:2 b7:4 | R:2 2:4 | b3:0 4:2 5:4",
  4: "4:0 5:2 6:3 | b7:0 R:2 2:4 | b3:0 4:2 5:4 | 6:0 b7:2 | R:0 2:2 b3:3 | 4:0 5:2 6:3",
  5: "5:0 6:1 b7:3 | R:0 2:2 b3:3 | 4:0 5:2 6:3 | b7:0 R:2 | 2:0 b3:1 4:3 | 5:0 6:1 b7:3",
  6: "6:0 b7:2 R:4 | 2:1 b3:2 4:4 | 5:1 6:2 b7:4 | R:1 2:3 b3:4 | 4:2 5:4 | 6:0 b7:2 R:4",
  7: "b7:0 R:2 2:4 | b3:0 4:2 5:4 | 6:0 b7:2 R:4 | 2:1 b3:2 4:4 | 5:2 6:3 | b7:0 R:2 2:4",
};

// ---------------------------------------------------------------------------
// Major 3nps — verified against Pebber Brown major PDF
// ---------------------------------------------------------------------------
const MAJOR_3NPS: Record<number, string> = {
  1: "R:0 2:2 3:4 | 4:0 5:2 6:4 | 7:1 R:2 2:4 | 3:1 4:2 5:4 | 6:2 7:4 R:5 | 2:2 3:4 4:5",
  2: "2:0 3:2 4:3 | 5:0 6:2 7:4 | R:0 2:2 3:4 | 4:0 5:2 6:4 | 7:2 R:3 2:5 | 3:2 4:3 5:5",
  3: "3:0 4:1 5:3 | 6:0 7:2 R:3 | 2:0 3:2 4:3 | 5:0 6:2 7:4 | R:1 2:3 3:5 | 4:1 5:3 6:5",
  4: "4:0 5:2 6:4 | 7:1 R:2 2:4 | 3:1 4:2 5:4 | 6:1 7:3 R:4 | 2:2 3:4 4:5 | 5:2 6:4 7:6",
  5: "5:0 6:2 7:4 | R:0 2:2 3:4 | 4:0 5:2 6:4 | 7:1 R:2 2:4 | 3:2 4:3 5:5 | 6:2 7:4 R:5",
  6: "6:0 7:2 R:3 | 2:0 3:2 4:3 | 5:0 6:2 7:4 | R:0 2:2 3:4 | 4:1 5:3 6:5 | 7:2 R:3 2:5",
  7: "7:0 R:1 2:3 | 3:0 4:1 5:3 | 6:0 7:2 R:3 | 2:0 3:2 4:3 | 5:1 6:3 7:5 | R:1 2:3 3:5",
};

// ---------------------------------------------------------------------------
// Major sym — verified against Pebber Brown major PDF
// ---------------------------------------------------------------------------
const MAJOR_SYM: Record<number, string> = {
  1: "R:0 2:2 3:4 | 4:0 5:2 6:4 | 7:1 R:2 2:4 | 3:1 4:2 5:4 | 6:2 7:4 | R:0 2:2 3:4",
  2: "2:0 3:2 4:3 | 5:0 6:2 7:4 | R:0 2:2 3:4 | 4:0 5:2 | 6:0 7:2 R:3 | 2:0 3:2 4:3",
  3: "3:0 4:1 5:3 | 6:0 7:2 R:3 | 2:0 3:2 4:3 | 5:0 6:2 | 7:0 R:1 2:3 | 3:0 4:1 5:3",
  4: "4:0 5:2 6:4 | 7:1 R:2 2:4 | 3:1 4:2 5:4 | 6:1 7:3 R:4 | 2:2 3:4 | 4:0 5:2 6:4",
  5: "5:0 6:2 7:4 | R:0 2:2 3:4 | 4:0 5:2 6:4 | 7:1 R:2 2:4 | 3:2 4:3 | 5:0 6:2 7:4",
  6: "6:0 7:2 R:3 | 2:0 3:2 4:3 | 5:0 6:2 7:4 | R:0 2:2 | 3:0 4:1 5:3 | 6:0 7:2 R:3",
  7: "7:0 R:1 2:3 | 3:0 4:1 5:3 | 6:0 7:2 R:3 | 2:0 3:2 4:3 | 5:1 6:3 | 7:0 R:1 2:3",
};

describe("build3nps", () => {
  const minCfg = SCALES.minor;
  const majCfg = SCALES.major;

  describe("minor", () => {
    for (let st = 1; st <= 7; st++) {
      it(`scaletone ${st}`, () => {
        const result = toRelative(build3nps(st - 1, minCfg));
        expect(fmt(result)).toBe(MINOR_3NPS[st]);
      });
    }
  });

  describe("major", () => {
    for (let st = 1; st <= 7; st++) {
      it(`scaletone ${st}`, () => {
        const result = toRelative(build3nps(st - 1, majCfg));
        expect(fmt(result)).toBe(MAJOR_3NPS[st]);
      });
    }
  });

  it("every string has exactly 3 notes", () => {
    for (const cfg of [minCfg, majCfg]) {
      for (let st = 0; st < 7; st++) {
        const strings = build3nps(st, cfg);
        for (const s of strings) {
          expect(s.notes).toHaveLength(3);
        }
      }
    }
  });
});

describe("buildSym", () => {
  const minCfg = SCALES.minor;
  const majCfg = SCALES.major;

  describe("minor", () => {
    for (let st = 1; st <= 7; st++) {
      it(`scaletone ${st}`, () => {
        const result = toRelative(buildSym(st - 1, minCfg));
        expect(fmt(result)).toBe(MINOR_SYM[st]);
      });
    }
  });

  describe("major", () => {
    for (let st = 1; st <= 7; st++) {
      it(`scaletone ${st}`, () => {
        const result = toRelative(buildSym(st - 1, majCfg));
        expect(fmt(result)).toBe(MAJOR_SYM[st]);
      });
    }
  });

  it("exactly one string (G or B) has 2 notes, all others have 3", () => {
    for (const cfg of [minCfg, majCfg]) {
      for (let st = 0; st < 7; st++) {
        const strings = buildSym(st, cfg);
        const twoIdx = symTwoNoteString(st, cfg);
        expect(twoIdx === 3 || twoIdx === 4).toBe(true);
        for (let i = 0; i < 6; i++) {
          expect(strings[i].notes).toHaveLength(i === twoIdx ? 2 : 3);
        }
      }
    }
  });

  it("minor: 2-note string is G for ST 1,4,5 and B for ST 2,3,6,7", () => {
    const cfg = minCfg;
    expect(symTwoNoteString(0, cfg)).toBe(3); // G
    expect(symTwoNoteString(1, cfg)).toBe(4); // B
    expect(symTwoNoteString(2, cfg)).toBe(4); // B
    expect(symTwoNoteString(3, cfg)).toBe(3); // G
    expect(symTwoNoteString(4, cfg)).toBe(3); // G
    expect(symTwoNoteString(5, cfg)).toBe(4); // B
    expect(symTwoNoteString(6, cfg)).toBe(4); // B
  });

  it("major: 2-note string is G for ST 2,3,6 and B for ST 1,4,5,7", () => {
    const cfg = majCfg;
    expect(symTwoNoteString(0, cfg)).toBe(4); // B
    expect(symTwoNoteString(1, cfg)).toBe(3); // G
    expect(symTwoNoteString(2, cfg)).toBe(3); // G
    expect(symTwoNoteString(3, cfg)).toBe(4); // B
    expect(symTwoNoteString(4, cfg)).toBe(4); // B
    expect(symTwoNoteString(5, cfg)).toBe(3); // G
    expect(symTwoNoteString(6, cfg)).toBe(4); // B
  });

  it("high e string has the same degrees as low E string", () => {
    for (const cfg of [minCfg, majCfg]) {
      for (let st = 0; st < 7; st++) {
        const strings = buildSym(st, cfg);
        const eDegrees = strings[0].notes.map((n) => n.deg);
        const highEDegrees = strings[5].notes.map((n) => n.deg);
        expect(highEDegrees).toEqual(eDegrees);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// CAGED positions
// ---------------------------------------------------------------------------

describe("buildCagedPositions", () => {
  it("produces 5 positions per mode", () => {
    for (const cfg of [SCALES.minor, SCALES.major]) {
      const positions = buildCagedPositions(cfg);
      expect(positions).toHaveLength(5);
    }
  });

  it("all positions have system 'caged' and a shapeName", () => {
    for (const cfg of [SCALES.minor, SCALES.major]) {
      const positions = buildCagedPositions(cfg);
      for (const p of positions) {
        expect(p.system).toBe("caged");
        expect(p.shapeName).toBeDefined();
      }
    }
  });

  it("shape names are E, D, C, A, G in neck order", () => {
    const positions = buildCagedPositions(SCALES.major);
    const names = positions.map((p) => p.shapeName);
    expect(names).toEqual(["E", "D", "C", "A", "G"]);
  });

  it("major scaletones: E=7, D=2, C=3, A=5, G=6", () => {
    const positions = buildCagedPositions(SCALES.major);
    const mapping: Record<string, number> = {};
    for (const p of positions) {
      mapping[p.shapeName!] = p.scaletone;
    }
    expect(mapping).toEqual({ E: 7, D: 2, C: 3, A: 5, G: 6 });
  });

  it("minor scaletones: E=1, D=2, C=4, A=5, G=7", () => {
    const positions = buildCagedPositions(SCALES.minor);
    const mapping: Record<string, number> = {};
    for (const p of positions) {
      mapping[p.shapeName!] = p.scaletone;
    }
    expect(mapping).toEqual({ E: 1, D: 2, C: 4, A: 5, G: 7 });
  });

  it("each shape has correct note counts per string", () => {
    // Note counts per string from specification [E, A, D, G, B, e]
    const MAJOR_COUNTS: Record<string, number[]> = {
      E: [3, 3, 3, 3, 2, 3],
      D: [3, 2, 3, 3, 3, 3],
      C: [3, 3, 3, 2, 3, 3],
      A: [2, 3, 3, 3, 3, 2],
      G: [3, 3, 2, 3, 3, 3],
    };
    const MINOR_COUNTS: Record<string, number[]> = {
      E: [3, 3, 2, 3, 3, 3],
      D: [3, 3, 3, 3, 2, 3],
      C: [3, 2, 3, 3, 3, 3],
      A: [3, 3, 3, 2, 3, 3],
      G: [2, 3, 3, 3, 3, 2],
    };

    const majPositions = buildCagedPositions(SCALES.major);
    for (const p of majPositions) {
      const counts = p.strings.map((s) => s.notes.length);
      expect(counts).toEqual(MAJOR_COUNTS[p.shapeName!]);
    }

    const minPositions = buildCagedPositions(SCALES.minor);
    for (const p of minPositions) {
      const counts = p.strings.map((s) => s.notes.length);
      expect(counts).toEqual(MINOR_COUNTS[p.shapeName!]);
    }
  });

  it("each shape's intervals match specification (major)", () => {
    const positions = buildCagedPositions(SCALES.major);
    const degreesByShape: Record<string, string[][]> = {};
    for (const p of positions) {
      degreesByShape[p.shapeName!] = p.strings.map((s) =>
        s.notes.map((n) => n.deg)
      );
    }

    // E Shape major: E=[7,R,2], A=[3,4,5], D=[6,7,R], G=[2,3,4], B=[5,6], e=[7,R,2]
    expect(degreesByShape["E"][0]).toEqual(["7", "R", "2"]);
    expect(degreesByShape["E"][1]).toEqual(["3", "4", "5"]);
    expect(degreesByShape["E"][2]).toEqual(["6", "7", "R"]);
    expect(degreesByShape["E"][3]).toEqual(["2", "3", "4"]);
    expect(degreesByShape["E"][4]).toEqual(["5", "6"]);
    expect(degreesByShape["E"][5]).toEqual(["7", "R", "2"]);

    // C Shape major: E=[3,4,5], A=[6,7,R], D=[2,3,4], G=[5,6], B=[7,R,2], e=[3,4,5]
    expect(degreesByShape["C"][0]).toEqual(["3", "4", "5"]);
    expect(degreesByShape["C"][1]).toEqual(["6", "7", "R"]);
    expect(degreesByShape["C"][2]).toEqual(["2", "3", "4"]);
    expect(degreesByShape["C"][3]).toEqual(["5", "6"]);
    expect(degreesByShape["C"][4]).toEqual(["7", "R", "2"]);
    expect(degreesByShape["C"][5]).toEqual(["3", "4", "5"]);
  });

  it("each shape's intervals match specification (minor)", () => {
    const positions = buildCagedPositions(SCALES.minor);
    const degreesByShape: Record<string, string[][]> = {};
    for (const p of positions) {
      degreesByShape[p.shapeName!] = p.strings.map((s) =>
        s.notes.map((n) => n.deg)
      );
    }

    // E Shape minor: E=[R,2,b3], A=[4,5,6], D=[b7,R], G=[2,b3,4], B=[5,6,b7], e=[R,2,b3]
    expect(degreesByShape["E"][0]).toEqual(["R", "2", "b3"]);
    expect(degreesByShape["E"][1]).toEqual(["4", "5", "6"]);
    expect(degreesByShape["E"][2]).toEqual(["b7", "R"]);
    expect(degreesByShape["E"][3]).toEqual(["2", "b3", "4"]);
    expect(degreesByShape["E"][4]).toEqual(["5", "6", "b7"]);
    expect(degreesByShape["E"][5]).toEqual(["R", "2", "b3"]);

    // A Shape minor: E=[5,6,b7], A=[R,2,b3], D=[4,5,6], G=[b7,R], B=[2,b3,4], e=[5,6,b7]
    expect(degreesByShape["A"][0]).toEqual(["5", "6", "b7"]);
    expect(degreesByShape["A"][1]).toEqual(["R", "2", "b3"]);
    expect(degreesByShape["A"][2]).toEqual(["4", "5", "6"]);
    expect(degreesByShape["A"][3]).toEqual(["b7", "R"]);
    expect(degreesByShape["A"][4]).toEqual(["2", "b3", "4"]);
    expect(degreesByShape["A"][5]).toEqual(["5", "6", "b7"]);
  });

  it("fret span per shape does not exceed 6 frets", () => {
    for (const cfg of [SCALES.minor, SCALES.major]) {
      const positions = buildCagedPositions(cfg);
      for (const p of positions) {
        const frets = p.strings.flatMap((s) => s.notes.map((n) => n.fret));
        const span = Math.max(...frets) - Math.min(...frets);
        expect(span).toBeLessThanOrEqual(6);
      }
    }
  });
});

describe("buildAllPositions", () => {
  it("produces 14 positions per mode (7 × 2 systems)", () => {
    const positions = buildAllPositions(SCALES.minor);
    expect(positions).toHaveLength(14);
    expect(positions.filter((p) => p.system === "3nps")).toHaveLength(7);
    expect(positions.filter((p) => p.system === "sym")).toHaveLength(7);
  });


});
