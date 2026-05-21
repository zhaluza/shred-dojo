import { describe, expect, it } from "vitest";
import { buildChordVoicings } from "./chordVoicings.utils";
import { CHORD_TYPES, CHORD_TONES } from "./chordVoicings.types";
import { buildCagedPositions, SCALES } from "./scalePositions.utils";

// ---------------------------------------------------------------------------
// buildChordVoicings
// ---------------------------------------------------------------------------

describe("buildChordVoicings", () => {
  it("returns exactly 5 voicings for every chord type", () => {
    for (const chordType of CHORD_TYPES) {
      expect(buildChordVoicings(chordType)).toHaveLength(5);
    }
  });

  it("shape names are E, D, C, A, G in neck order for every chord type", () => {
    for (const chordType of CHORD_TYPES) {
      const names = buildChordVoicings(chordType).map((v) => v.shapeName);
      expect(names).toEqual(["E", "D", "C", "A", "G"]);
    }
  });

  it("all non-muted string degrees are valid chord tones", () => {
    for (const chordType of CHORD_TYPES) {
      const tones = new Set(CHORD_TONES[chordType]);
      for (const voicing of buildChordVoicings(chordType)) {
        for (const str of voicing.strings) {
          if (!str.muted) {
            expect(str.deg).not.toBeNull();
            expect(tones.has(str.deg!)).toBe(true);
          }
        }
      }
    }
  });

  it("muted strings have fret: null and deg: null", () => {
    for (const chordType of CHORD_TYPES) {
      for (const voicing of buildChordVoicings(chordType)) {
        for (const str of voicing.strings) {
          if (str.muted) {
            expect(str.fret).toBeNull();
            expect(str.deg).toBeNull();
          }
        }
      }
    }
  });

  it("showNut is true only when baseFret ≤ 1", () => {
    for (const chordType of CHORD_TYPES) {
      for (const voicing of buildChordVoicings(chordType)) {
        if (voicing.showNut) {
          expect(voicing.baseFret).toBeLessThanOrEqual(1);
        } else {
          expect(voicing.baseFret).toBeGreaterThan(1);
        }
      }
    }
  });

  it("open strings (open: true) only occur when showNut is true and fret is 0", () => {
    for (const chordType of CHORD_TYPES) {
      for (const voicing of buildChordVoicings(chordType)) {
        for (const str of voicing.strings) {
          if (str.open) {
            expect(voicing.showNut).toBe(true);
            expect(str.fret).toBe(0);
          }
        }
      }
    }
  });

  it("maj voicings contain no minor or 7th degrees", () => {
    for (const voicing of buildChordVoicings("maj")) {
      for (const str of voicing.strings) {
        expect(str.deg).not.toBe("b3");
        expect(str.deg).not.toBe("b7");
        expect(str.deg).not.toBe("7");
      }
    }
  });

  it("min voicings contain no major 3rd or 7th degrees", () => {
    for (const voicing of buildChordVoicings("min")) {
      for (const str of voicing.strings) {
        expect(str.deg).not.toBe("3");
        expect(str.deg).not.toBe("7");
        expect(str.deg).not.toBe("b7");
      }
    }
  });

  it("dom7 voicings contain b7 in every shape", () => {
    for (const voicing of buildChordVoicings("dom7")) {
      const degs = voicing.strings.filter((s) => !s.muted).map((s) => s.deg);
      expect(degs).toContain("b7");
    }
  });

  it("maj7 voicings contain 7 in every shape", () => {
    for (const voicing of buildChordVoicings("maj7")) {
      const degs = voicing.strings.filter((s) => !s.muted).map((s) => s.deg);
      expect(degs).toContain("7");
    }
  });

  it("min7 voicings contain b7 in every shape", () => {
    for (const voicing of buildChordVoicings("min7")) {
      const degs = voicing.strings.filter((s) => !s.muted).map((s) => s.deg);
      expect(degs).toContain("b7");
    }
  });

  it("selects the lowest-fret chord tone per string (maj)", () => {
    const tones = new Set(CHORD_TONES["maj"]);
    const positions = buildCagedPositions(SCALES.major);
    const voicings = buildChordVoicings("maj");

    for (let i = 0; i < 5; i++) {
      for (let si = 0; si < 6; si++) {
        const chordNotes = positions[i].strings[si].notes.filter((n) =>
          tones.has(n.deg)
        );
        if (chordNotes.length === 0) {
          expect(voicings[i].strings[si].muted).toBe(true);
        } else {
          const minFret = Math.min(...chordNotes.map((n) => n.fret));
          expect(voicings[i].strings[si].fret).toBe(minFret);
        }
      }
    }
  });

  it("selects the lowest-fret chord tone per string (min)", () => {
    const tones = new Set(CHORD_TONES["min"]);
    const positions = buildCagedPositions(SCALES.minor);
    const voicings = buildChordVoicings("min");

    for (let i = 0; i < 5; i++) {
      for (let si = 0; si < 6; si++) {
        const chordNotes = positions[i].strings[si].notes.filter((n) =>
          tones.has(n.deg)
        );
        if (chordNotes.length === 0) {
          expect(voicings[i].strings[si].muted).toBe(true);
        } else {
          const minFret = Math.min(...chordNotes.map((n) => n.fret));
          expect(voicings[i].strings[si].fret).toBe(minFret);
        }
      }
    }
  });

  it("every shape has at least one non-muted string", () => {
    for (const chordType of CHORD_TYPES) {
      for (const voicing of buildChordVoicings(chordType)) {
        const played = voicing.strings.filter((s) => !s.muted);
        expect(played.length).toBeGreaterThan(0);
      }
    }
  });
});
