import { describe, it, expect } from "vitest";
import {
  keyFretForPc,
  chordName,
  noteName,
  standaloneVoicing,
  cagedShapeRow,
  essentialSounds,
  resolveLessonZones,
  lessonHarmony,
  scaleNeckNotes,
  exampleImages,
  LESSONS,
} from "./cagedImmersion.utils";
import { KEYS, mod12 } from "./pentatonicPractice.utils";

describe("key bridge", () => {
  it("maps pitch class to low-E fret", () => {
    expect(keyFretForPc(7)).toBe(3); // G
    expect(keyFretForPc(9)).toBe(5); // A
    expect(keyFretForPc(4)).toBe(0); // E (open)
    expect(keyFretForPc(5)).toBe(1); // F
  });

  it("names notes and chords", () => {
    expect(noteName(7)).toBe("G");
    expect(chordName(7, "maj")).toBe("G");
    expect(chordName(0, "min")).toBe("Cm");
    expect(chordName(2, "dom7")).toBe("D7");
    expect(chordName(9, "maj7")).toBe("Amaj7");
    expect(chordName(4, "min7")).toBe("Em7");
  });
});

describe("voicing transposition", () => {
  it("keeps standalone voicings in the playable window and as movable shapes", () => {
    for (const k of KEYS) {
      for (const sound of essentialSounds(k.pc)) {
        const v = sound.voicing;
        expect(v.baseFret).toBeGreaterThanOrEqual(1);
        expect(v.baseFret).toBeLessThanOrEqual(12);
        expect(v.showNut).toBe(false);
        expect(v.strings.every((s) => !s.open)).toBe(true);
      }
    }
  });

  it("names the essential sounds for the key", () => {
    const sounds = essentialSounds(9); // A
    expect(sounds.map((s) => s.chord)).toEqual(["A", "Am", "A7"]);
    expect(sounds.map((s) => s.quality)).toEqual(["maj", "min", "dom7"]);
  });

  it("returns all five CAGED shapes for the I chord", () => {
    const row = cagedShapeRow(7, "major");
    expect(row.map((r) => r.shape)).toEqual(["C", "A", "G", "E", "D"]);
    const min = Math.min(...row.map((r) => r.voicing.baseFret));
    expect(min).toBeGreaterThanOrEqual(1);
    expect(min).toBeLessThanOrEqual(12);
    expect(standaloneVoicing("E", "maj", 7).baseFret).toBeGreaterThanOrEqual(1);
  });
});

describe("lessons", () => {
  it("has seven lessons A–G", () => {
    expect(LESSONS.map((l) => l.id)).toEqual(["A", "B", "C", "D", "E", "F", "G"]);
  });

  it("has at least one canonical (key of G) example image per lesson", () => {
    for (const lesson of LESSONS) {
      const imgs = exampleImages(lesson.id);
      expect(imgs.length).toBeGreaterThanOrEqual(1);
      expect(imgs.every((p) => p.startsWith("/tabs/caged/") && p.endsWith(".png"))).toBe(true);
    }
  });

  it("computes transposed harmony lines", () => {
    const lessonC = LESSONS.find((l) => l.id === "C")!;
    expect(lessonHarmony(lessonC, 7)).toEqual(["G", "C", "D"]); // key of G
    const lessonG = LESSONS.find((l) => l.id === "G")!;
    expect(lessonHarmony(lessonG, 9)).toEqual(["Am", "Dm", "E7"]); // key of A minor i-iv-V7
    const lessonB = LESSONS.find((l) => l.id === "B")!;
    expect(lessonHarmony(lessonB, 7)).toEqual(["G7", "C7"]); // I7 → IV7
  });

  it("resolves clustered, in-range zone diagrams for every lesson in every key", () => {
    for (const lesson of LESSONS) {
      for (const k of KEYS) {
        const zones = resolveLessonZones(lesson, k.pc);
        expect(zones.length).toBe(lesson.zones.length);
        zones.forEach((zone, zi) => {
          expect(zone.cells.length).toBe(lesson.zones[zi].cells.length);
          const frets = zone.cells.map((c) => c.voicing.baseFret);
          for (const f of frets) {
            expect(f).toBeGreaterThanOrEqual(1);
            expect(f).toBeLessThanOrEqual(18);
          }
          // Clustered within roughly an octave.
          expect(Math.max(...frets) - Math.min(...frets)).toBeLessThanOrEqual(12);
          // Chord names match the cell's interval + quality.
          zone.cells.forEach((c, ci) => {
            const spec = lesson.zones[zi].cells[ci];
            expect(c.chord).toBe(chordName(mod12(k.pc + spec.semis), spec.quality));
          });
        });
      }
    }
  });
});

describe("phrasing trick scale notes", () => {
  it("flags chord tones and includes the root in major", () => {
    const notes = scaleNeckNotes(0, "major"); // C major
    expect(notes.length).toBeGreaterThan(0);
    // open low E (pc 4) is the major 3rd of C → a chord tone
    const openLowE = notes.find((n) => n.string === "E" && n.absoluteFret === 0);
    expect(openLowE?.deg).toBe("3");
    expect(openLowE?.isChordTone).toBe(true);
    // every chord tone is one of R/3/5
    expect(notes.filter((n) => n.isChordTone).every((n) => ["R", "3", "5"].includes(n.deg))).toBe(true);
    expect(notes.some((n) => n.deg === "R")).toBe(true);
  });

  it("uses ♭3 / ♭7 chord tones in minor", () => {
    const notes = scaleNeckNotes(9, "minor"); // A minor
    expect(notes.filter((n) => n.isChordTone).every((n) => ["R", "b3", "5"].includes(n.deg))).toBe(true);
    expect(notes.some((n) => n.deg === "b3")).toBe(true);
  });
});
