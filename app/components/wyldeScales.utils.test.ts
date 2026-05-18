import { describe, expect, it } from "vitest";
import {
  buildAllWyldePositions,
  pentaAbsoluteStart,
  WYLDE_MODE_NAMES,
} from "./wyldeScales.utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Mirror the PositionCard fretboard-width calculation using pentaAbsoluteStart.
 *  A fretCount > 12 means the two shapes are too far apart and the board appears squashed. */
function computeFretCount(
  pos: ReturnType<typeof buildAllWyldePositions>[number],
  keyOffset: number
): number {
  const diaAbsStart = pos.startFret + keyOffset;
  const pentaStart = pentaAbsoluteStart(pos.pentaRawMin, diaAbsStart, keyOffset);

  const diaAbsFrets = pos.strings.flatMap((s) =>
    s.notes.map((n) => n.fret + diaAbsStart)
  );
  const pentaAbsFrets = pos.pentaBox.map(
    (n) => n.fret - pos.pentaRawMin + pentaStart
  );
  const allAbs = [...diaAbsFrets, ...pentaAbsFrets];
  return Math.max(...allAbs) - Math.min(...allAbs) + 3;
}

// ─── buildAllWyldePositions ───────────────────────────────────────────────────

describe("buildAllWyldePositions", () => {
  for (const scale of ["minor", "major"] as const) {
    describe(scale, () => {
      it("returns 7 positions", () => {
        expect(buildAllWyldePositions(scale)).toHaveLength(7);
      });

      it("mode names match expected order", () => {
        const positions = buildAllWyldePositions(scale);
        expect(positions.map((p) => p.modeName)).toEqual(WYLDE_MODE_NAMES[scale]);
      });

      it("degIdx matches array position", () => {
        buildAllWyldePositions(scale).forEach((p, i) =>
          expect(p.degIdx).toBe(i)
        );
      });

      it("startFret is in [0, 11]", () => {
        for (const pos of buildAllWyldePositions(scale)) {
          expect(pos.startFret).toBeGreaterThanOrEqual(0);
          expect(pos.startFret).toBeLessThanOrEqual(11);
        }
      });

      it("each diatonic shape has 6 strings with exactly 3 notes each", () => {
        for (const pos of buildAllWyldePositions(scale)) {
          expect(pos.strings).toHaveLength(6);
          for (const str of pos.strings) {
            expect(str.notes).toHaveLength(3);
          }
        }
      });

      it("high e string has the same degrees as low E string (B-string reset invariant)", () => {
        // Wylde resets the degree cursor at the B string so the e string cycles
        // back to the same 3 degrees as the low E string.
        for (const pos of buildAllWyldePositions(scale)) {
          const loE = pos.strings[0].notes.map((n) => n.deg);
          const hiE = pos.strings[5].notes.map((n) => n.deg);
          expect(hiE).toEqual(loE);
        }
      });

      it("pentaBoxIdx is in [0, 4]", () => {
        for (const pos of buildAllWyldePositions(scale)) {
          expect(pos.pentaBoxIdx).toBeGreaterThanOrEqual(0);
          expect(pos.pentaBoxIdx).toBeLessThanOrEqual(4);
        }
      });

      it("pentaBox contains notes from 6 strings", () => {
        const strings = new Set(["E", "A", "D", "G", "B", "e"]);
        for (const pos of buildAllWyldePositions(scale)) {
          const seen = new Set(pos.pentaBox.map((n) => n.string));
          expect(seen).toEqual(strings);
        }
      });
    });
  }
});

// ─── pentaAbsoluteStart ───────────────────────────────────────────────────────

describe("pentaAbsoluteStart", () => {
  it("returns (rawMin%12)+keyOffset unchanged when penta is already close to diatonic", () => {
    expect(pentaAbsoluteStart(3, 5, 0)).toBe(3);    // diff=2, no adjustment
    expect(pentaAbsoluteStart(10, 11, 0)).toBe(10); // diff=1, no adjustment
    expect(pentaAbsoluteStart(3, 5, 4)).toBe(7);    // with keyOffset: 3+4=7, diff=0
  });

  it("adds 12 when pentaRawMin=12 drops penta a full octave below the diatonic (Lydian regression)", () => {
    // Without this fix: (12%12)+0=0 lands 11 frets below diaAbsStart=11, producing a
    // 19-fret-wide squashed board. The fix detects the >6 gap and adds 12.
    expect(pentaAbsoluteStart(12, 11, 0)).toBe(12); // G key: 0+12=12, 1 fret from diatonic
    expect(pentaAbsoluteStart(12, 13, 2)).toBe(14); // A key: (0+2)+12=14, 1 fret from diatonic
  });

  it("result stays within 6 frets of diaAbsStart for all 12 keys (Lydian regression, all keys)", () => {
    for (let keyOffset = 0; keyOffset < 12; keyOffset++) {
      const diaAbsStart = 11 + keyOffset; // Lydian minor diatonic start for each key
      const result = pentaAbsoluteStart(12, diaAbsStart, keyOffset);
      expect(Math.abs(result - diaAbsStart)).toBeLessThanOrEqual(6);
    }
  });

  it("result is always within 6 frets of diaAbsStart across the realistic parameter space", () => {
    // diaAbsStart must be startFret + keyOffset (both bounded: [0,11]).
    // Iterating startFret and keyOffset separately prevents impossible combinations
    // like diaAbsStart=22 with keyOffset=0 (would require startFret=22).
    for (let rawMin = 0; rawMin <= 23; rawMin++) {
      for (let startFret = 0; startFret <= 11; startFret++) {
        for (let keyOffset = 0; keyOffset <= 11; keyOffset++) {
          const diaAbsStart = startFret + keyOffset;
          const result = pentaAbsoluteStart(rawMin, diaAbsStart, keyOffset);
          expect(Math.abs(result - diaAbsStart)).toBeLessThanOrEqual(6);
        }
      }
    }
  });
});

// ─── Fretboard width regression ───────────────────────────────────────────────

describe("fretboard width (fretCount ≤ 12) for all positions and keys", () => {
  // Regression for the Lydian squash bug (minor scale, position 6): Box 5 has
  // pentaRawMin=12, so 12%12=0 placed the penta 11 frets below the diatonic,
  // producing a 19-fret-wide board. pentaAbsoluteStart() fixes this with an
  // octave guard; this test will fail if the guard is removed or broken.
  for (const scale of ["minor", "major"] as const) {
    it(scale, () => {
      const positions = buildAllWyldePositions(scale);
      for (let keyOffset = 0; keyOffset < 12; keyOffset++) {
        for (const pos of positions) {
          const fretCount = computeFretCount(pos, keyOffset);
          expect(fretCount).toBeLessThanOrEqual(12);
        }
      }
    });
  }
});
