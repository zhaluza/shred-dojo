import { describe, it, expect } from "vitest";
import {
  QUALS,
  QBYID,
  DEGQUAL,
  ROMANS,
  transpose,
  chordNotes,
  chordWindow,
  readout,
  spellScale,
  mod12,
  type QualId,
} from "./mathChords.utils";

// Compact serializer: "deg:fret …" low→high, for readable assertions.
const fmt = (pat: (number | null)[], rootPc: number): string =>
  chordNotes(pat, rootPc)
    .map((n) => `${n.deg}:${n.fret}`)
    .join(" ");

describe("transpose", () => {
  it("moves A maj7 (native root 9) to C maj7", () => {
    const sh = QBYID.maj7.shapes[0]; // [5,null,6,6,5,null]
    const pat = transpose(sh, QBYID.maj7.root, 0);
    expect(pat).toEqual([8, null, 9, 9, 8, null]);
    expect(readout(chordNotes(pat, 0))).toBe("C B E G");
  });

  it("drops an octave when the lowest note lands above fret 12", () => {
    const sh = QBYID.maj7.shapes[1]; // [null,12,14,13,14,null]
    const pat = transpose(sh, QBYID.maj7.root, 0); // +3 → 15.. → −12
    expect(pat).toEqual([null, 3, 5, 4, 5, null]);
    expect(Math.min(...(pat.filter((f) => f !== null) as number[]))).toBeLessThanOrEqual(12);
  });

  it("honors a per-shape root override", () => {
    const sh = QBYID.m7.shapes[4]; // root 11, [7,5,7,null,null,null]
    const pat = transpose(sh, QBYID.m7.root, 11); // native already 11 → no shift
    expect(pat).toEqual([7, 5, 7, null, null, null]);
    expect(fmt(pat, 11)).toBe("R:7 ♭3:5 ♭7:7");
  });
});

describe("spellScale", () => {
  it("spells C major with all naturals", () => {
    expect(spellScale("C").map((d) => d.name)).toEqual([
      "C", "D", "E", "F", "G", "A", "B",
    ]);
  });
  it("spells F major with one flat", () => {
    expect(spellScale("F").map((d) => d.name)).toEqual([
      "F", "G", "A", "Bb", "C", "D", "E",
    ]);
  });
  it("spells G major with one sharp", () => {
    expect(spellScale("G").map((d) => d.name)).toEqual([
      "G", "A", "B", "C", "D", "E", "F#",
    ]);
  });
  it("spells F# major (six sharps) one letter per degree", () => {
    expect(spellScale("F#").map((d) => d.name)).toEqual([
      "F#", "G#", "A#", "B", "C#", "D#", "E#",
    ]);
  });
});

describe("chordWindow", () => {
  it("opens 5 frets from the lowest fingered fret, nut only at fret 1", () => {
    expect(chordWindow([5, null, 6, 6, 5, null])).toMatchObject({ lo: 5, start: 5, showNut: false });
    expect(chordWindow([1, null, 2, 2, 1, null]).showNut).toBe(true);
  });
});

describe("diatonic plan", () => {
  it("has 7 degrees aligned across romans + qualities", () => {
    expect(ROMANS).toHaveLength(7);
    expect(DEGQUAL).toHaveLength(7);
    expect(DEGQUAL[6][1]).toBeNull(); // vii° has no extended form
  });
});

// Allowed interval-classes per quality — the note-by-note validation.
const ALLOWED: Record<QualId, Set<number>> = {
  maj7: new Set([0, 4, 7, 11]),
  m7: new Set([0, 3, 7, 10]),
  dom7: new Set([0, 4, 7, 10]),
  dom9: new Set([0, 2, 4, 7, 10]),
  m7b5: new Set([0, 3, 6, 10]),
  maj9: new Set([0, 2, 4, 7, 11]),
  m9: new Set([0, 2, 3, 7, 10]),
};
// Qualities whose defining extension (the 9th) must actually be voiced.
const NINTHS: QualId[] = ["dom9", "maj9", "m9"];

describe("voicing data integrity (all shapes × all 12 roots)", () => {
  QUALS.forEach((q) => {
    it(`${q.id}: every tone is chord-legal, root present, frets in window`, () => {
      q.shapes.forEach((sh) => {
        for (let target = 0; target < 12; target++) {
          const pat = transpose(sh, q.root, target);
          const notes = chordNotes(pat, target);
          // every sounding note is a legal chord tone for this quality
          notes.forEach((n) => {
            expect(ALLOWED[q.id].has(n.iv), `${q.id} ${sh.tag} → ${SHARP_HINT(target)}: bad ${n.deg}`).toBe(true);
          });
          // the root is always voiced
          expect(notes.some((n) => n.iv === 0)).toBe(true);
          // ninth-chords actually contain the 9th
          if (NINTHS.includes(q.id)) {
            expect(notes.some((n) => n.iv === 2)).toBe(true);
          }
          // every fingered fret sits at or below fret 12 (drawable window)
          const fingered = pat.filter((f) => f !== null) as number[];
          expect(Math.min(...fingered)).toBeLessThanOrEqual(12);
          expect(Math.min(...fingered)).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });
});

// readable failure hint
function SHARP_HINT(pc: number): string {
  return ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"][mod12(pc)];
}
