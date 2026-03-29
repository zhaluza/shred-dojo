import { describe, expect, it } from "vitest";
import {
  SCALES,
  build3nps,
  buildSym,
  buildAllPositions,
  symTwoNoteString,
  toRelative,
} from "./scalePositions.utils";
import type { ScaleConfig, ScaleString } from "./scalePositions.types";

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

describe("buildAllPositions", () => {
  it("produces 14 positions per mode (7 × 2 systems)", () => {
    const positions = buildAllPositions(SCALES.minor);
    expect(positions).toHaveLength(14);
    expect(positions.filter((p) => p.system === "3nps")).toHaveLength(7);
    expect(positions.filter((p) => p.system === "sym")).toHaveLength(7);
  });

  it("sym positions have twoNps matching symTwoNoteString", () => {
    for (const cfg of [SCALES.minor, SCALES.major]) {
      const positions = buildAllPositions(cfg);
      for (const p of positions) {
        if (p.system === "sym") {
          const expected = symTwoNoteString(p.scaletone - 1, cfg) === 3 ? "G" : "B";
          expect(p.twoNps).toBe(expected);
        } else {
          expect(p.twoNps).toBeNull();
        }
      }
    }
  });
});
