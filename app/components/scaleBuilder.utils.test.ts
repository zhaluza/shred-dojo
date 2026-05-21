import { describe, expect, it } from "vitest";
import { buildScale, toVexNote, SCALE_TYPES } from "./scaleBuilder.utils";

// ---------------------------------------------------------------------------
// buildScale
// ---------------------------------------------------------------------------

describe("buildScale", () => {
  it("G major: 7 notes with correct names and octaves", () => {
    const notes = buildScale("G", SCALE_TYPES.major.intervals);
    expect(notes.map((n) => n.note)).toEqual(["G","A","B","C","D","E","F#"]);
    expect(notes.map((n) => n.octave)).toEqual([4, 4, 4, 5, 5, 5, 5]);
  });

  it("G minor: 7 notes with correct names and octaves", () => {
    const notes = buildScale("G", SCALE_TYPES.minor.intervals);
    expect(notes.map((n) => n.note)).toEqual(["G","A","Bb","C","D","Eb","F"]);
    expect(notes.map((n) => n.octave)).toEqual([4, 4, 4, 5, 5, 5, 5]);
  });

  it("G minor pentatonic: 5 notes", () => {
    const notes = buildScale("G", SCALE_TYPES.minorPenta.intervals);
    expect(notes.map((n) => n.note)).toEqual(["G","Bb","C","D","F"]);
    expect(notes).toHaveLength(5);
  });

  it("G major pentatonic: 5 notes", () => {
    const notes = buildScale("G", SCALE_TYPES.majorPenta.intervals);
    expect(notes.map((n) => n.note)).toEqual(["G","A","B","D","E"]);
    expect(notes).toHaveLength(5);
  });

  it("G blues: 6 notes", () => {
    const notes = buildScale("G", SCALE_TYPES.blues.intervals);
    expect(notes.map((n) => n.note)).toEqual(["G","Bb","C","Db","D","F"]);
    expect(notes).toHaveLength(6);
  });

  it("C major: octave boundary — B stays in octave 4, not 5", () => {
    const notes = buildScale("C", SCALE_TYPES.major.intervals);
    expect(notes.map((n) => n.note)).toEqual(["C","D","E","F","G","A","B"]);
    // C4 through B4 — B should be octave 4, not 5
    expect(notes.map((n) => n.octave)).toEqual([4, 4, 4, 4, 4, 4, 4]);
  });

  it("result length equals intervals.length (root + one note per non-return step)", () => {
    // buildScale starts with the root then iterates intervals.slice(0,-1),
    // so total = 1 + (intervals.length - 1) = intervals.length
    for (const [, cfg] of Object.entries(SCALE_TYPES)) {
      const notes = buildScale("A", cfg.intervals);
      expect(notes).toHaveLength(cfg.intervals.length);
    }
  });

  it("first note is always the root", () => {
    for (const root of ["E","F","G","Ab","A","Bb","B","C","Db","D","Eb"]) {
      const notes = buildScale(root, SCALE_TYPES.major.intervals);
      expect(notes[0].note).toBe(root);
    }
  });

  it("E major: uses NOTES_FROM_C flat enharmonics for accidentals", () => {
    // buildScale looks up notes in NOTES_FROM_C which uses flats (Ab not G#, Db not C#, Eb not D#)
    const notes = buildScale("E", SCALE_TYPES.major.intervals);
    expect(notes.map((n) => n.note)).toEqual(["E","F#","Ab","A","B","Db","Eb"]);
  });

  it("Bb minor pentatonic: correct accidentals", () => {
    const notes = buildScale("Bb", SCALE_TYPES.minorPenta.intervals);
    expect(notes[0].note).toBe("Bb");
  });
});

// ---------------------------------------------------------------------------
// toVexNote
// ---------------------------------------------------------------------------

describe("toVexNote", () => {
  it("natural note: no accidental, lowercase key", () => {
    expect(toVexNote({ note: "C", octave: 4 })).toEqual({ key: "c/4", accidental: null });
    expect(toVexNote({ note: "E", octave: 4 })).toEqual({ key: "e/4", accidental: null });
    expect(toVexNote({ note: "G", octave: 5 })).toEqual({ key: "g/5", accidental: null });
  });

  it("sharp note: '#' accidental", () => {
    expect(toVexNote({ note: "F#", octave: 5 })).toEqual({ key: "f#/5", accidental: "#" });
    expect(toVexNote({ note: "C#", octave: 4 })).toEqual({ key: "c#/4", accidental: "#" });
  });

  it("flat note: 'b' accidental", () => {
    expect(toVexNote({ note: "Ab", octave: 4 })).toEqual({ key: "ab/4", accidental: "b" });
    expect(toVexNote({ note: "Db", octave: 5 })).toEqual({ key: "db/5", accidental: "b" });
    expect(toVexNote({ note: "Eb", octave: 4 })).toEqual({ key: "eb/4", accidental: "b" });
  });

  it("Bb is a flat (not confused with B natural)", () => {
    expect(toVexNote({ note: "Bb", octave: 4 })).toEqual({ key: "bb/4", accidental: "b" });
  });

  it("B natural is not a flat (not confused with Bb)", () => {
    expect(toVexNote({ note: "B", octave: 4 })).toEqual({ key: "b/4", accidental: null });
  });

  it("key format is always lowercase-letter + accidental + slash + octave", () => {
    expect(toVexNote({ note: "F#", octave: 4 }).key).toMatch(/^[a-g][#b]?\/\d$/);
    expect(toVexNote({ note: "C", octave: 5 }).key).toMatch(/^[a-g][#b]?\/\d$/);
    expect(toVexNote({ note: "Bb", octave: 4 }).key).toMatch(/^[a-g][#b]?\/\d$/);
  });
});
