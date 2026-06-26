import { describe, it, expect } from "vitest";
import {
  SCALES,
  NAV_SCALES,
  IVMAJ,
  RN,
  QUAL,
  MODES,
  chordTarget,
  relDegIndex,
  defaultNavRoot,
  noteMidi,
  midiToHz,
  pcAt,
  mod12,
  KEYS,
  OPEN_PCS,
} from "./writingScales.utils";

describe("scale definitions", () => {
  it("major is the 7-note diatonic set with no colour note", () => {
    expect(SCALES.Major.iv).toEqual([0, 2, 4, 5, 7, 9, 11]);
    expect(SCALES.Major.deg).toHaveLength(7);
    expect(SCALES.Major.char).toBe(-1);
  });

  it("lydian raises the 4th and flags it as the characteristic note", () => {
    expect(SCALES.Lydian.iv).toEqual([0, 2, 4, 6, 7, 9, 11]);
    // char index points at the ♯4 (semitone 6)
    expect(SCALES.Lydian.iv[SCALES.Lydian.char]).toBe(6);
    expect(SCALES.Lydian.deg[SCALES.Lydian.char]).toBe("♯4");
  });

  it("interval-name labels line up with the major scale", () => {
    expect(IVMAJ).toHaveLength(SCALES.Major.iv.length);
    expect(IVMAJ[0]).toBe("R");
    expect(IVMAJ[3]).toBe("p4");
  });

  it("nav scales have matching iv / deg lengths", () => {
    for (const sc of Object.values(NAV_SCALES)) {
      expect(sc.iv.length).toBe(sc.deg.length);
      expect(sc.iv[0]).toBe(0);
      expect(sc.deg[0]).toBe("R");
    }
    expect(NAV_SCALES.MinPent.iv).toEqual([0, 3, 5, 7, 10]);
    expect(NAV_SCALES.MajPent.iv).toEqual([0, 2, 4, 7, 9]);
  });
});

describe("diatonic harmony tables", () => {
  it("Roman numerals, qualities and modes are all 7 long and aligned", () => {
    expect(RN).toHaveLength(7);
    expect(QUAL).toHaveLength(7);
    expect(MODES).toHaveLength(7);
    expect(RN[4]).toBe("V");
    expect(QUAL[4]).toBe("7"); // V is dominant
    expect(MODES[4]).toBe("Mixolydian");
    expect(QUAL[6]).toBe("m7♭5"); // vii° half-diminished
  });
});

describe("chordTarget", () => {
  it("stacks 1·3·5·7 by thirds and wraps within the scale", () => {
    expect(chordTarget(0)).toEqual([0, 2, 4, 6]); // I
    expect(chordTarget(4)).toEqual([4, 6, 1, 3]); // V wraps past the octave
    expect(chordTarget(6)).toEqual([6, 1, 3, 5]); // vii°
  });
});

describe("relDegIndex", () => {
  it("finds the degree of a pitch class in every key", () => {
    for (const { pc } of KEYS) {
      // the root maps to index 0
      expect(relDegIndex(pc, pc, SCALES.Major.iv)).toBe(0);
      // the major third is two scale steps up (index 2)
      expect(relDegIndex(mod12(pc + 4), pc, SCALES.Major.iv)).toBe(2);
      // a non-diatonic note (minor third) is absent
      expect(relDegIndex(mod12(pc + 3), pc, SCALES.Major.iv)).toBe(-1);
    }
  });
});

describe("defaultNavRoot", () => {
  it("anchors the movable root to the key root on the A string", () => {
    for (const { pc } of KEYS) {
      const nr = defaultNavRoot(pc);
      expect(nr.si).toBe(1); // A string
      expect(pcAt(nr.si, nr.fret)).toBe(pc);
      expect(nr.fret).toBeGreaterThanOrEqual(0);
      expect(nr.fret).toBeLessThan(12);
    }
  });
});

describe("audio mapping", () => {
  it("noteMidi follows standard tuning (low E open = 40)", () => {
    expect(noteMidi(0, 0)).toBe(40); // low E
    expect(noteMidi(5, 0)).toBe(64); // high e
    expect(noteMidi(0, 5)).toBe(noteMidi(1, 0)); // E + 5 frets = A open
    expect(OPEN_PCS[0]).toBe(4); // low E pitch class
  });

  it("midiToHz anchors A4 (midi 69) to 440 Hz", () => {
    expect(midiToHz(69)).toBeCloseTo(440, 5);
    expect(midiToHz(81)).toBeCloseTo(880, 5); // one octave up
    expect(midiToHz(57)).toBeCloseTo(220, 5); // one octave down
  });
});
