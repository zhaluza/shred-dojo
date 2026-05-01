export type DiatonicChord = {
  numeral: string;
  name: string;
  quality: "maj" | "min" | "dim";
};

export type KeyInfo = {
  major: string;
  minor: string;
  keySig: number; // >0 = sharps, <0 = flats, 0 = none
  scaleNotes: string[];
  diatonicChords: DiatonicChord[];
  relatedMajors: string[]; // [clockwise neighbor, counter-clockwise neighbor]
  relatedMinors: string[]; // relative minor + both neighbors' relative minors
};

const CHORDS: DiatonicChord[] = [
  { numeral: "I", name: "", quality: "maj" },
  { numeral: "ii", name: "", quality: "min" },
  { numeral: "iii", name: "", quality: "min" },
  { numeral: "IV", name: "", quality: "maj" },
  { numeral: "V", name: "", quality: "maj" },
  { numeral: "vi", name: "", quality: "min" },
  { numeral: "vii°", name: "", quality: "dim" },
];

function chords(notes: string[]): DiatonicChord[] {
  return CHORDS.map((c, i) => ({ ...c, name: notes[i] }));
}

// 12 entries clockwise from C (top of circle)
export const FIFTHS: KeyInfo[] = [
  {
    major: "C",
    minor: "Am",
    keySig: 0,
    scaleNotes: ["C", "D", "E", "F", "G", "A", "B"],
    diatonicChords: chords(["C", "Dm", "Em", "F", "G", "Am", "Bdim"]),
    relatedMajors: ["G", "F"],
    relatedMinors: ["Am", "Em", "Dm"],
  },
  {
    major: "G",
    minor: "Em",
    keySig: 1,
    scaleNotes: ["G", "A", "B", "C", "D", "E", "F#"],
    diatonicChords: chords(["G", "Am", "Bm", "C", "D", "Em", "F#dim"]),
    relatedMajors: ["D", "C"],
    relatedMinors: ["Em", "Bm", "Am"],
  },
  {
    major: "D",
    minor: "Bm",
    keySig: 2,
    scaleNotes: ["D", "E", "F#", "G", "A", "B", "C#"],
    diatonicChords: chords(["D", "Em", "F#m", "G", "A", "Bm", "C#dim"]),
    relatedMajors: ["A", "G"],
    relatedMinors: ["Bm", "F#m", "Em"],
  },
  {
    major: "A",
    minor: "F#m",
    keySig: 3,
    scaleNotes: ["A", "B", "C#", "D", "E", "F#", "G#"],
    diatonicChords: chords(["A", "Bm", "C#m", "D", "E", "F#m", "G#dim"]),
    relatedMajors: ["E", "D"],
    relatedMinors: ["F#m", "C#m", "Bm"],
  },
  {
    major: "E",
    minor: "C#m",
    keySig: 4,
    scaleNotes: ["E", "F#", "G#", "A", "B", "C#", "D#"],
    diatonicChords: chords(["E", "F#m", "G#m", "A", "B", "C#m", "D#dim"]),
    relatedMajors: ["B", "A"],
    relatedMinors: ["C#m", "G#m", "F#m"],
  },
  {
    major: "B",
    minor: "G#m",
    keySig: 5,
    scaleNotes: ["B", "C#", "D#", "E", "F#", "G#", "A#"],
    diatonicChords: chords(["B", "C#m", "D#m", "E", "F#", "G#m", "A#dim"]),
    relatedMajors: ["F#", "E"],
    relatedMinors: ["G#m", "D#m", "C#m"],
  },
  {
    major: "F#",
    minor: "D#m",
    keySig: 6,
    scaleNotes: ["F#", "G#", "A#", "B", "C#", "D#", "E#"],
    diatonicChords: chords(["F#", "G#m", "A#m", "B", "C#", "D#m", "E#dim"]),
    relatedMajors: ["Db", "B"],
    relatedMinors: ["D#m", "A#m", "G#m"],
  },
  {
    major: "Db",
    minor: "Bbm",
    keySig: -5,
    scaleNotes: ["Db", "Eb", "F", "Gb", "Ab", "Bb", "C"],
    diatonicChords: chords(["Db", "Ebm", "Fm", "Gb", "Ab", "Bbm", "Cdim"]),
    relatedMajors: ["Ab", "F#"],
    relatedMinors: ["Bbm", "Fm", "D#m"],
  },
  {
    major: "Ab",
    minor: "Fm",
    keySig: -4,
    scaleNotes: ["Ab", "Bb", "C", "Db", "Eb", "F", "G"],
    diatonicChords: chords(["Ab", "Bbm", "Cm", "Db", "Eb", "Fm", "Gdim"]),
    relatedMajors: ["Eb", "Db"],
    relatedMinors: ["Fm", "Cm", "Bbm"],
  },
  {
    major: "Eb",
    minor: "Cm",
    keySig: -3,
    scaleNotes: ["Eb", "F", "G", "Ab", "Bb", "C", "D"],
    diatonicChords: chords(["Eb", "Fm", "Gm", "Ab", "Bb", "Cm", "Ddim"]),
    relatedMajors: ["Bb", "Ab"],
    relatedMinors: ["Cm", "Gm", "Fm"],
  },
  {
    major: "Bb",
    minor: "Gm",
    keySig: -2,
    scaleNotes: ["Bb", "C", "D", "Eb", "F", "G", "A"],
    diatonicChords: chords(["Bb", "Cm", "Dm", "Eb", "F", "Gm", "Adim"]),
    relatedMajors: ["F", "Eb"],
    relatedMinors: ["Gm", "Dm", "Cm"],
  },
  {
    major: "F",
    minor: "Dm",
    keySig: -1,
    scaleNotes: ["F", "G", "A", "Bb", "C", "D", "E"],
    diatonicChords: chords(["F", "Gm", "Am", "Bb", "C", "Dm", "Edim"]),
    relatedMajors: ["C", "Bb"],
    relatedMinors: ["Dm", "Am", "Gm"],
  },
];

export function keySigLabel(keySig: number): string {
  if (keySig === 0) return "No sharps or flats";
  if (keySig > 0) return `${keySig} sharp${keySig > 1 ? "s" : ""}`;
  return `${Math.abs(keySig)} flat${Math.abs(keySig) > 1 ? "s" : ""}`;
}

export function keySigShort(keySig: number): string {
  if (keySig === 0) return "·";
  if (keySig > 0) return `${keySig}#`;
  return `${Math.abs(keySig)}♭`;
}
