import { ROOT_FRET } from "./scalePositions.utils";

export const KEYS = [
  "C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F",
] as const;

export type MCKey = (typeof KEYS)[number];

export const RELATIVE_MINORS = [
  "Am", "Em", "Bm", "F#m", "C#m", "G#m", "D#m", "Bbm", "Fm", "Cm", "Gm", "Dm",
] as const;

// Fret on low E string for each key in circle-of-fifths order
const KEY_FRETS: Record<string, number> = {
  C: 8, G: 3, D: 10, A: 5, E: 0, B: 7,
  "F#": 2, Db: 9, Ab: 4, Eb: 11, Bb: 6, F: 1,
  // Enharmonic aliases for relative minor roots
  "C#": 9, "G#": 4, "D#": 11,
};

export function getKeyOffset(keyName: string): number {
  const fret = KEY_FRETS[keyName] ?? 0;
  return (fret - ROOT_FRET + 12) % 12;
}

// Strip the "m" suffix to get the root note name (e.g. "F#m" → "F#")
export function minorRootName(relMinor: string): string {
  return relMinor.replace(/m$/, "");
}

export type DrillMode = "major" | "minor";

export interface Drill {
  id: string;
  name: string;
  hint: string;
  mode: DrillMode;
  labelFor: (key: MCKey, keyIdx: number) => string;
}

export const DRILLS: Drill[] = [
  {
    id: "major-scale",
    name: "Major scales",
    mode: "major",
    hint: "Ascending then descending.",
    labelFor: (k) => `${k} major scale`,
  },
  {
    id: "major-triad",
    name: "Major triad arpeggios",
    mode: "major",
    hint: "Root to root, all six strings.",
    labelFor: (k) => `${k} major triad`,
  },
  {
    id: "major-pent",
    name: "Major pentatonic",
    mode: "major",
    hint: "Two notes per string box.",
    labelFor: (k) => `${k} major pentatonic`,
  },
  {
    id: "minor-triad",
    name: "Minor triad arpeggios",
    mode: "minor",
    hint: "Relative minor of the current key.",
    labelFor: (_, i) => `${RELATIVE_MINORS[i]} minor triad`,
  },
  {
    id: "minor-pent",
    name: "Minor pentatonic",
    mode: "minor",
    hint: "Relative minor, two notes per string.",
    labelFor: (_, i) => `${RELATIVE_MINORS[i]} minor pentatonic`,
  },
  {
    id: "broken-3rds",
    name: "Broken 3rds",
    mode: "major",
    hint: "Each tone + the 3rd above.",
    labelFor: (k) => `${k} — broken 3rds`,
  },
  {
    id: "broken-4ths",
    name: "Broken 4ths",
    mode: "major",
    hint: "Each tone + the 4th above.",
    labelFor: (k) => `${k} — broken 4ths`,
  },
  {
    id: "broken-5ths",
    name: "Broken 5ths",
    mode: "major",
    hint: "Each tone + the 5th above.",
    labelFor: (k) => `${k} — broken 5ths`,
  },
  {
    id: "broken-6ths",
    name: "Broken 6ths",
    mode: "major",
    hint: "Each tone + the 6th above.",
    labelFor: (k) => `${k} — broken 6ths`,
  },
  {
    id: "broken-7ths",
    name: "Broken 7ths",
    mode: "major",
    hint: "Each tone + the 7th above.",
    labelFor: (k) => `${k} — broken 7ths`,
  },
  {
    id: "broken-8vas",
    name: "Broken octaves",
    mode: "major",
    hint: "Each tone followed by its octave.",
    labelFor: (k) => `${k} — broken octaves`,
  },
  {
    id: "broken-9ths",
    name: "Broken 9ths",
    mode: "major",
    hint: "Each tone + the 9th above.",
    labelFor: (k) => `${k} — broken 9ths`,
  },
  {
    id: "broken-10ths",
    name: "Broken 10ths",
    mode: "major",
    hint: "Each tone + the 10th above.",
    labelFor: (k) => `${k} — broken 10ths`,
  },
  {
    id: "diatonic-7ths",
    name: "Diatonic 7th arpeggios",
    mode: "major",
    hint: "I maj7  ii m7  iii m7  IV maj7  V7  vi m7  vii°7.",
    labelFor: (k) => `${k} diatonic 7ths`,
  },
];

export interface DrillRef {
  title: string;
  tab?: string;
  pairs?: string;
  note: string;
}

// C-key reference content (shown only on the first key of each drill)
export const REFS: Record<string, DrillRef> = {
  "major-scale": {
    title: "C major scale — page 4",
    tab: "e |-7-8-10-|\nB |---8-10-|\nG |-7-9-10-|\nD |-7-9-10-|\nA |-7-8-10-|\nE |---8-10-|",
    note: "7th–10th fret position.",
  },
  "major-triad": {
    title: "C major triad arpeggio — page 7",
    tab: "e |-8-12-|\nB |-8-10-|\nG |---9--|\nD |-9-10-|\nA |--10--|\nE |---8--|",
    note: "8th-fret position, ascending then descending.",
  },
  "major-pent": {
    title: "C major pentatonic — page 10",
    tab: "e |-8-10-|\nB |-8-10-|\nG |-7--9-|\nD |-7-10-|\nA |-7-10-|\nE |-8-10-|",
    note: "7th–10th fret box.",
  },
  "minor-triad": {
    title: "Am triad arpeggio — page 13",
    tab: "e |-5-8-|\nB |-5-8-|\nG |--5--|\nD |-5-7-|\nA |--7--|\nE |--5--|",
    note: "5th-fret position.",
  },
  "minor-pent": {
    title: "Am pentatonic — page 16",
    tab: "e |-5-8-|\nB |-5-8-|\nG |-5-7-|\nD |-5-7-|\nA |-5-7-|\nE |-5-8-|",
    note: "5th-fret box.",
  },
  "broken-3rds": {
    title: "Broken 3rds — page 19",
    pairs: "C-E, D-F, E-G, F-A, G-B, A-C, B-D, C-E",
    note: "Each tone + 3rd above, then reverse.",
  },
  "broken-4ths": {
    title: "Broken 4ths — page 25",
    pairs: "C-F, D-G, E-A, F-B, G-C, A-D, B-E, C-F",
    note: "Each tone + 4th above, then reverse.",
  },
  "broken-5ths": {
    title: "Broken 5ths — page 31",
    pairs: "C-G, D-A, E-B, F-C, G-D, A-E, B-F, C-G",
    note: "Each tone + 5th above, then reverse.",
  },
  "broken-6ths": {
    title: "Broken 6ths — page 37",
    pairs: "C-A, D-B, E-C, F-D, G-E, A-F, B-G, C-A",
    note: "Each tone + 6th above, then reverse.",
  },
  "broken-7ths": {
    title: "Broken 7ths — page 43",
    pairs: "C-B, D-C, E-D, F-E, G-F, A-G, B-A, C-B",
    note: "Each tone + 7th above, then reverse.",
  },
  "broken-8vas": {
    title: "Broken octaves — page 49",
    pairs: "C-C, D-D, E-E, F-F, G-G, A-A, B-B, C-C",
    note: "Each tone + its octave.",
  },
  "broken-9ths": {
    title: "Broken 9ths — page 55",
    pairs: "C-D, D-E, E-F, F-G, G-A, A-B, B-C, C-D",
    note: "Each tone + 9th above.",
  },
  "broken-10ths": {
    title: "Broken 10ths — page 61",
    pairs: "C-E, D-F, E-G, F-A, G-B, A-C, B-D, C-E",
    note: "Each tone + 10th above.",
  },
  "diatonic-7ths": {
    title: "Diatonic 7th arpeggios — page 67",
    pairs: "Cmaj7 → Dm7 → Em7 → Fmaj7 → G7 → Am7 → Bm7♭5",
    note: "All seven diatonic 7th chords.",
  },
};

export const CS_DRILLS: Drill[] = [
  { id: "cs-minor-scale", name: "Minor scales", mode: "minor",
    hint: "Ascending then descending.", labelFor: (_, i) => `${RELATIVE_MINORS[i]} minor scale` },
  { id: "cs-harmonic-minor", name: "Harmonic minor scales", mode: "minor",
    hint: "Raised 7th degree.", labelFor: (_, i) => `${RELATIVE_MINORS[i]} harmonic minor` },
  { id: "cs-melodic-minor", name: "Melodic minor scales", mode: "minor",
    hint: "Raised 6th and 7th ascending, natural descending.", labelFor: (_, i) => `${RELATIVE_MINORS[i]} melodic minor` },
  { id: "cs-melodic-minor-asc", name: "Melodic minor (ascending)", mode: "minor",
    hint: "Raised 6th and 7th both directions (jazz melodic minor).", labelFor: (_, i) => `${RELATIVE_MINORS[i]} jazz melodic minor` },
  { id: "cs-harmonic-major", name: "Harmonic major scales", mode: "major",
    hint: "Major scale with lowered 6th.", labelFor: (k) => `${k} harmonic major` },
  { id: "cs-double-harmonic", name: "Double harmonic major", mode: "major",
    hint: "Lowered 2nd and 6th (Byzantine scale).", labelFor: (k) => `${k} double harmonic major` },
  { id: "cs-minor-broken-3rds", name: "Minor broken 3rds", mode: "minor",
    hint: "Each tone + the 3rd above.", labelFor: (_, i) => `${RELATIVE_MINORS[i]} — broken 3rds` },
  { id: "cs-minor-broken-4ths", name: "Minor broken 4ths", mode: "minor",
    hint: "Each tone + the 4th above.", labelFor: (_, i) => `${RELATIVE_MINORS[i]} — broken 4ths` },
  { id: "cs-minor-broken-5ths", name: "Minor broken 5ths", mode: "minor",
    hint: "Each tone + the 5th above.", labelFor: (_, i) => `${RELATIVE_MINORS[i]} — broken 5ths` },
  { id: "cs-minor-broken-6ths", name: "Minor broken 6ths", mode: "minor",
    hint: "Each tone + the 6th above.", labelFor: (_, i) => `${RELATIVE_MINORS[i]} — broken 6ths` },
  { id: "cs-minor-broken-7ths", name: "Minor broken 7ths", mode: "minor",
    hint: "Each tone + the 7th above.", labelFor: (_, i) => `${RELATIVE_MINORS[i]} — broken 7ths` },
  { id: "cs-minor-broken-8vas", name: "Minor broken octaves", mode: "minor",
    hint: "Each tone followed by its octave.", labelFor: (_, i) => `${RELATIVE_MINORS[i]} — broken octaves` },
  { id: "cs-minor-broken-9ths", name: "Minor broken 9ths", mode: "minor",
    hint: "Each tone + the 9th above.", labelFor: (_, i) => `${RELATIVE_MINORS[i]} — broken 9ths` },
  { id: "cs-minor-broken-10ths", name: "Minor broken 10ths", mode: "minor",
    hint: "Each tone + the 10th above.", labelFor: (_, i) => `${RELATIVE_MINORS[i]} — broken 10ths` },
  { id: "cs-dim7", name: "Diminished 7th arpeggios", mode: "minor",
    hint: "Four-note symmetrical arpeggio, minor context.", labelFor: (_, i) => `${RELATIVE_MINORS[i]} — dim7 arpeggio` },
  { id: "cs-aug", name: "Augmented arpeggios", mode: "major",
    hint: "Three-note symmetrical arpeggio, major context.", labelFor: (k) => `${k} — augmented arpeggio` },
];

export const CS_REFS: Record<string, DrillRef> = {
  "cs-minor-scale": {
    title: "Am minor scale — page 3",
    tab: "e |-5-7-8-|\nB |-5-7-8-|\nG |-5-6-8-|\nD |-5-7-8-|\nA |-5-7-8-|\nE |-5-7-8-|",
    note: "5th-fret position.",
  },
  "cs-harmonic-minor": {
    title: "Am harmonic minor — page 6",
    tab: "e |-5-6-8-|\nB |-4-5-7-|\nG |-5-6-7-|\nD |-5-7-8-|\nA |-5-7-8-|\nE |-5-7-8-|",
    note: "5th-fret position, raised 7th (G#).",
  },
  "cs-melodic-minor": {
    title: "Am melodic minor — page 9",
    tab: "e |-5-7-8-|\nB |-5-6-8-|\nG |-5-6-8-|\nD |-5-7-8-|\nA |-5-7-8-|\nE |-5-7-8-|",
    note: "5th-fret, raised 6th+7th ascending, natural descending.",
  },
  "cs-melodic-minor-asc": {
    title: "Am jazz melodic minor — page 12",
    tab: "e |-5-7-8-|\nB |-5-7-8-|\nG |-5-7-8-|\nD |-5-7-8-|\nA |-5-7-8-|\nE |-5-7-8-|",
    note: "Raised 6th and 7th both ascending and descending.",
  },
  "cs-harmonic-major": {
    title: "C harmonic major — page 15",
    note: "Major scale with lowered 6th (Ab).",
  },
  "cs-double-harmonic": {
    title: "C double harmonic major — page 18",
    note: "Lowered 2nd (Db) and lowered 6th (Ab).",
  },
  "cs-minor-broken-3rds": {
    title: "Am broken 3rds — page 21",
    pairs: "A-C, B-D, C-E, D-F, E-G, F-A, G-B, A-C",
    note: "Each tone + 3rd above, then reverse.",
  },
  "cs-minor-broken-4ths": {
    title: "Am broken 4ths — page 27",
    pairs: "A-D, B-E, C-F, D-G, E-A, F-B, G-C, A-D",
    note: "Each tone + 4th above, then reverse.",
  },
  "cs-minor-broken-5ths": {
    title: "Am broken 5ths — page 33",
    pairs: "A-E, B-F, C-G, D-A, E-B, F-C, G-D, A-E",
    note: "Each tone + 5th above, then reverse.",
  },
  "cs-minor-broken-6ths": {
    title: "Am broken 6ths — page 39",
    pairs: "A-F, B-G, C-A, D-B, E-C, F-D, G-E, A-F",
    note: "Each tone + 6th above, then reverse.",
  },
  "cs-minor-broken-7ths": {
    title: "Am broken 7ths — page 45",
    pairs: "A-G, B-A, C-B, D-C, E-D, F-E, G-F, A-G",
    note: "Each tone + 7th above, then reverse.",
  },
  "cs-minor-broken-8vas": {
    title: "Am broken octaves — page 51",
    pairs: "A-A, B-B, C-C, D-D, E-E, F-F, G-G, A-A",
    note: "Each tone + its octave.",
  },
  "cs-minor-broken-9ths": {
    title: "Am broken 9ths — page 57",
    pairs: "A-B, B-C, C-D, D-E, E-F, F-G, G-A, A-B",
    note: "Each tone + 9th above.",
  },
  "cs-minor-broken-10ths": {
    title: "Am broken 10ths — page 63",
    pairs: "A-C, B-D, C-E, D-F, E-G, F-A, G-B, A-C",
    note: "Each tone + 10th above.",
  },
  "cs-dim7": {
    title: "Diminished 7th arpeggios — page 69",
    pairs: "G°7 → Bb°7 → Db°7 → E°7 (all enharmonic groups)",
    note: "4 distinct dim7 chords × 3 enharmonic roots = 12 arpeggios.",
  },
  "cs-aug": {
    title: "Augmented arpeggios — page 72",
    pairs: "Bb+ → D+ → Gb+ (group 1 of 4)",
    note: "4 distinct augmented chords × 3 enharmonic roots = 12 arpeggios.",
  },
};
