// CAGED Immersion — pure music data + helpers (no React).
//
// Built on the existing CAGED engine (`buildChordVoicings` / `buildCagedPositions`
// in G, `ROOT_FRET = 3`). This module adds:
//   • the key bridge from a circle-of-fifths pitch class to the engine's fret math,
//   • transposing + octave-clustering of CAGED chord voicings to any root,
//   • the seven exercise lessons (pp. 12–26) and their I–IV–V → CAGED-shape zones,
//   • full-neck scale notes for the Phrasing Trick (pp. 10–11).

import type { CagedShapeName, Degree, StringName } from "./scalePositions.types";
import type { ChordType, ChordVoicingData } from "./chordVoicings.types";
import { buildChordVoicings } from "./chordVoicings.utils";
import { NOTE_NAMES, OPEN_PCS, STRING_NAMES, mod12 } from "./pentatonicPractice.utils";

export type ConceptMode = "major" | "minor";

// G is the root the engine builds every shape in (ROOT_FRET 3 on low E, pc 7).
const G_PC = 7;
const LOW_E_PC = OPEN_PCS[0]; // 4 (E)

export const I_SEMI = 0;
export const IV_SEMI = 5;
export const V_SEMI = 7;

// ─── Key bridge ──────────────────────────────────────────────────────────────
// CircleKeySelector works in circle-of-fifths KEYS index; the engine transposes by
// low-E fret. keyFret = mod12(pc - lowE); keyOffset is relative to G's ROOT_FRET.

export function keyFretForPc(pc: number): number {
  return mod12(pc - LOW_E_PC);
}

export function noteName(pc: number): string {
  return NOTE_NAMES[mod12(pc)];
}

export function chordName(pc: number, quality: ChordType): string {
  const n = noteName(pc);
  switch (quality) {
    case "maj":
      return n;
    case "min":
      return n + "m";
    case "dom7":
      return n + "7";
    case "maj7":
      return n + "maj7";
    case "min7":
      return n + "m7";
  }
}

// ─── Voicing transposition ─────────────────────────────────────────────────────
// A CAGED voicing's string frets are relative (rows 0–4); `baseFret` only labels
// the lowest row. Shifting `baseFret` by ±12 is the same movable shape an octave
// away — always valid — so we transpose by relabelling and treat the shapes as
// movable (no nut / open strings).

function shapeVoicing(
  shape: CagedShapeName,
  quality: ChordType,
  rootPc: number,
): ChordVoicingData {
  const base = buildChordVoicings(quality).find((v) => v.shapeName === shape)!;
  const delta = mod12(rootPc - G_PC);
  return {
    ...base,
    baseFret: base.baseFret + delta, // 0..23 before clustering
    showNut: false,
    strings: base.strings.map((s) => ({ ...s, open: false })),
  };
}

// Bring a baseFret into the playable window [1, 12].
function norm1to12(bf: number): number {
  const v = mod12(bf);
  return v === 0 ? 12 : v;
}

/** A single standalone CAGED shape (e.g. an essential sound), low on the neck. */
export function standaloneVoicing(
  shape: CagedShapeName,
  quality: ChordType,
  rootPc: number,
): ChordVoicingData {
  const v = shapeVoicing(shape, quality, rootPc);
  return { ...v, baseFret: norm1to12(v.baseFret) };
}

/** Shift a row of voicings uniformly so their lowest baseFret sits in [1, 12]. */
export function rowVoicings(
  shapes: CagedShapeName[],
  quality: ChordType,
  rootPc: number,
): { shape: CagedShapeName; voicing: ChordVoicingData }[] {
  const raw = shapes.map((shape) => shapeVoicing(shape, quality, rootPc));
  const min = Math.min(...raw.map((v) => v.baseFret));
  let shift = 0;
  let m = min;
  while (m > 12) { m -= 12; shift += 12; }
  while (m < 1) { m += 12; shift -= 12; }
  return raw.map((v, i) => ({
    shape: shapes[i],
    voicing: { ...v, baseFret: v.baseFret - shift },
  }));
}

// ─── Exercise lessons (pp. 12–26) ──────────────────────────────────────────────

export type HarmonyRole = { numeral: string; semis: number; quality: ChordType };
export type DiagramCell = {
  role: string;
  shape: CagedShapeName;
  semis: number;
  quality: ChordType;
};
export type DiagramZoneSpec = { label: string; cells: DiagramCell[] };

export type Lesson = {
  id: string;
  title: string;
  pages: string;
  tag: "Major" | "Dominant" | "Minor";
  /** Which Phrasing-Trick / scale sound to study with this lesson. */
  sound: ConceptMode | "dominant";
  menu: string;
  concept: string;
  steps: string[];
  harmony: HarmonyRole[];
  zones: DiagramZoneSpec[];
};

// I–IV–V → CAGED-shape zone tables (from the course / the scratch prototype).
const ZONES_MAJOR: { I: CagedShapeName; IV: CagedShapeName; V: CagedShapeName }[] = [
  { I: "E", IV: "A", V: "C" },
  { I: "D", IV: "G", V: "A" },
  { I: "C", IV: "E", V: "G" },
  { I: "A", IV: "D", V: "E" },
  { I: "G", IV: "C", V: "D" },
];
const ZONES_MINOR: { i: CagedShapeName; iv: CagedShapeName; V: CagedShapeName }[] = [
  { i: "E", iv: "A", V: "C" },
  { i: "C", iv: "E", V: "G" },
  { i: "A", iv: "D", V: "E" },
];

function majorZones(): DiagramZoneSpec[] {
  return ZONES_MAJOR.map((z, i) => ({
    label: `Zone ${i + 1} · I ${z.I} · IV ${z.IV} · V ${z.V}`,
    cells: [
      { role: "I", shape: z.I, semis: I_SEMI, quality: "maj" },
      { role: "IV", shape: z.IV, semis: IV_SEMI, quality: "maj" },
      { role: "V", shape: z.V, semis: V_SEMI, quality: "maj" },
    ],
  }));
}

function domZones(): DiagramZoneSpec[] {
  // Course doesn't label shapes for the dominant lesson — reuse zones 1, 3, 5.
  return [ZONES_MAJOR[0], ZONES_MAJOR[2], ZONES_MAJOR[4]].map((z, i) => ({
    label: `Zone ${[1, 3, 5][i]} · I7 ${z.I} · IV7 ${z.IV} · V7 ${z.V}`,
    cells: [
      { role: "I7", shape: z.I, semis: I_SEMI, quality: "dom7" },
      { role: "IV7", shape: z.IV, semis: IV_SEMI, quality: "dom7" },
      { role: "V7", shape: z.V, semis: V_SEMI, quality: "dom7" },
    ],
  }));
}

function minorZones(): DiagramZoneSpec[] {
  return ZONES_MINOR.map((z, i) => ({
    label: `Exercise ${i + 1} · i ${z.i} · iv ${z.iv} · V7 ${z.V}`,
    cells: [
      { role: "i", shape: z.i, semis: I_SEMI, quality: "min" },
      { role: "iv", shape: z.iv, semis: IV_SEMI, quality: "min" },
      { role: "V7", shape: z.V, semis: V_SEMI, quality: "dom7" },
    ],
  }));
}

export const LESSONS: Lesson[] = [
  {
    id: "A",
    title: "1→5 Major Scale Ear Training",
    pages: "pp. 12–13",
    tag: "Major",
    sound: "major",
    menu: "Improvise major-scale lines over a I–V vamp; resolve onto chord tones.",
    concept:
      "Improvise major-scale lines (the demo leans on triplets) over a I–V vamp, resolving phrases onto chord tones. It is ear training because the goal is hearing how scale notes pull toward the I and the V. The three examples are the same idea in three neck positions.",
    steps: [
      "Loop a I → V7 backing in this key.",
      "Play the major scale in triplets, landing on a chord tone on each strong beat.",
      "Over the V7, lean on its 3rd and the leading tone to pull back to I.",
      "Move the same lines up to the next CAGED zone, then change key.",
    ],
    harmony: [
      { numeral: "I", semis: I_SEMI, quality: "maj" },
      { numeral: "V7", semis: V_SEMI, quality: "dom7" },
    ],
    zones: [
      {
        label: "I in the E shape · V7 in the A shape",
        cells: [
          { role: "I", shape: "E", semis: I_SEMI, quality: "maj" },
          { role: "V7", shape: "A", semis: V_SEMI, quality: "dom7" },
        ],
      },
    ],
  },
  {
    id: "B",
    title: "Dom7 to 4 Dom7",
    pages: "p. 14",
    tag: "Dominant",
    sound: "dominant",
    menu: "Bluesy I7→IV7 lines targeting each chord's 3 and ♭7.",
    concept:
      "Bluesy lines over the I7 → IV7 move (the core blues change). Use each chord's dominant-7 sound plus chromatic approach notes (the ♭3→3 slide), targeting each dominant chord's 3 and ♭7.",
    steps: [
      "Loop a I7 → IV7 vamp in this key.",
      "Over each chord use its dominant-7 scale / arpeggio.",
      "Connect the two chords with chromatic approaches into the 3rds and ♭7ths; add slides.",
      "Shift up a CAGED zone, then change key.",
    ],
    harmony: [
      { numeral: "I7", semis: I_SEMI, quality: "dom7" },
      { numeral: "IV7", semis: IV_SEMI, quality: "dom7" },
    ],
    zones: [
      {
        label: "I7 in the E shape · IV7 in the A shape",
        cells: [
          { role: "I7", shape: "E", semis: I_SEMI, quality: "dom7" },
          { role: "IV7", shape: "A", semis: IV_SEMI, quality: "dom7" },
        ],
      },
    ],
  },
  {
    id: "C",
    title: "Major CAGED Shapes & the 1-4-5",
    pages: "pp. 15–17",
    tag: "Major",
    sound: "major",
    menu: "Play the I-IV-V as CAGED chord shapes, zone by zone up the neck.",
    concept:
      "Play the I–IV–V staying inside one neck zone, where each chord falls under your fingers as a specific CAGED shape. Break each chord into a three-note major triad arpeggio — root–3rd–5th, ascending — then run I→IV→V→I and repeat an octave higher in the same zone. The five exercises walk the trio up through all five CAGED zones.",
    steps: [
      "Pick a zone. Strum the three CAGED chord shapes (I, IV, V) to lock in the position.",
      "Arpeggiate each chord root → 3rd → 5th, ascending — the three dots in each diagram.",
      "Run it I → IV → V → I, then repeat the same triads an octave higher in the zone.",
      "Move to the next zone, then change key — the shapes are identical, only the fret moves.",
    ],
    harmony: [
      { numeral: "I", semis: I_SEMI, quality: "maj" },
      { numeral: "IV", semis: IV_SEMI, quality: "maj" },
      { numeral: "V", semis: V_SEMI, quality: "maj" },
    ],
    zones: majorZones(),
  },
  {
    id: "D",
    title: "CAGED Scales, Arpeggios, 1-4-5",
    pages: "pp. 18–19",
    tag: "Major",
    sound: "major",
    menu: "Run flowing scale & arpeggio lines through the I-IV-V in position.",
    concept:
      "The melodic step up from the previous lesson. Where that one leapt through bare three-note triads, here you run flowing, mostly stepwise major-scale lines through the same I–IV–V while staying in one position, bending toward each chord's tones as it arrives. Same five CAGED zones — anchored on the I shape shown.",
    steps: [
      "Loop a I-IV-V backing.",
      "In one zone, play continuous major-scale lines that bend toward the current chord's tones.",
      "Land on chord tones at the change; pass through the rest.",
      "Repeat zone by zone, then change key.",
    ],
    harmony: [
      { numeral: "I", semis: I_SEMI, quality: "maj" },
      { numeral: "IV", semis: IV_SEMI, quality: "maj" },
      { numeral: "V", semis: V_SEMI, quality: "maj" },
    ],
    zones: [
      {
        label: "The five positions you run lines through — the I chord anchoring each CAGED zone",
        cells: (["C", "A", "G", "E", "D"] as CagedShapeName[]).map((shape) => ({
          role: "I",
          shape,
          semis: I_SEMI,
          quality: "maj" as ChordType,
        })),
      },
    ],
  },
  {
    id: "E",
    title: "Horizontally Through the 1-4-5",
    pages: "p. 20",
    tag: "Major",
    sound: "major",
    menu: "Connect the I-IV-V horizontally, climbing up the neck.",
    concept:
      "The same root–3rd–5th triad arpeggios as the CAGED-shapes lesson, but played horizontally instead of inside a box. Each repetition climbs to the next position up the neck, tracing the I–IV–V along the length of the strings. This trains you to connect the CAGED zones lengthwise rather than staying put.",
    steps: [
      "Loop a I-IV-V. Play the low root–3rd–5th triads of each chord in the first position.",
      "On the repeat, shift the same 1-3-5 triads up to the next position; keep climbing.",
      "Travel from the bottom of the neck to the top in one sweep, then reverse back down.",
      "Do it in several keys — only the starting fret changes.",
    ],
    harmony: [
      { numeral: "I", semis: I_SEMI, quality: "maj" },
      { numeral: "IV", semis: IV_SEMI, quality: "maj" },
      { numeral: "V", semis: V_SEMI, quality: "maj" },
    ],
    zones: [majorZones()[0], majorZones()[4]].map((z, i) => ({
      ...z,
      label: i === 0 ? "Start low · Zone 1" : "Travel up · Zone 5 (then keep climbing)",
    })),
  },
  {
    id: "F",
    title: "Dominant Scales, Arpeggios, 1-4-5",
    pages: "pp. 21–23",
    tag: "Dominant",
    sound: "dominant",
    menu: "The dominant/blues version: I7-IV7-V7 through the zones.",
    concept:
      "The scale/arpeggio lesson applied to an all-dominant (blues) progression: every chord is a dom7. Use each chord's dominant-7 scale and arpeggio (watch the ♭7s), flowing through the changes in each CAGED zone.",
    steps: [
      "Loop a I7-IV7-V7 vamp.",
      "Over each chord switch to its dominant-7 scale / arpeggio.",
      "Connect them in position, then move up a zone.",
      "Change key — this is the dominant/blues counterpart to the major lesson.",
    ],
    harmony: [
      { numeral: "I7", semis: I_SEMI, quality: "dom7" },
      { numeral: "IV7", semis: IV_SEMI, quality: "dom7" },
      { numeral: "V7", semis: V_SEMI, quality: "dom7" },
    ],
    zones: domZones(),
  },
  {
    id: "G",
    title: "Minor CAGED Shapes & the 1-4-5",
    pages: "pp. 24–26",
    tag: "Minor",
    sound: "minor",
    menu: "Minor i-iv with a dominant V7 — raise the 7th over the V.",
    concept:
      "The minor-key parallel. Block chords first, then each chord as a three-note triad arpeggio: the i and iv are minor triads — root–♭3rd–5th — but the V is dominant (its arpeggio uses the major 3rd, the raised 7th / leading tone) that pulls back to the i. Run i→iv→V7→i in each CAGED shape.",
    steps: [
      "Pick an exercise/zone. Strum the three shapes: minor i, minor iv, dominant V7.",
      "Arpeggiate i and iv root → ♭3rd → 5th; arpeggiate the V7 with its major 3rd to lead back.",
      "Run i → iv → V7 → i — minor sound over i and iv, dominant sound over the V7.",
      "Move zone by zone, then change key.",
    ],
    harmony: [
      { numeral: "i", semis: I_SEMI, quality: "min" },
      { numeral: "iv", semis: IV_SEMI, quality: "min" },
      { numeral: "V7", semis: V_SEMI, quality: "dom7" },
    ],
    zones: minorZones(),
  },
];

// Canonical transcription scans (key of G) per lesson, cropped from the course
// PDF (pp. 12–26). These are the authoritative examples; the live diagrams above
// them transpose, but these tabs stay in G.
const EXAMPLE_IMAGES: Record<string, string[]> = {
  A: ["/tabs/caged/a-1.png", "/tabs/caged/a-2.png"],
  B: ["/tabs/caged/b-1.png"],
  C: ["/tabs/caged/c-1.png", "/tabs/caged/c-2.png", "/tabs/caged/c-3.png"],
  D: ["/tabs/caged/d-1.png", "/tabs/caged/d-2.png"],
  E: ["/tabs/caged/e-1.png"],
  F: ["/tabs/caged/f-1.png", "/tabs/caged/f-2.png", "/tabs/caged/f-3.png"],
  G: ["/tabs/caged/g-1.png", "/tabs/caged/g-2.png", "/tabs/caged/g-3.png"],
};

/** The canonical G-key transcription scans for a lesson. */
export function exampleImages(id: string): string[] {
  return EXAMPLE_IMAGES[id] ?? [];
}

/** Pitch class of the key the canonical examples are written in (G). */
export const EXAMPLE_KEY_PC = G_PC;

// ─── Per-key derived data for a lesson ─────────────────────────────────────────

export type ResolvedCell = {
  role: string;
  shape: CagedShapeName;
  chord: string;
  voicing: ChordVoicingData;
};
export type ResolvedZone = { label: string; cells: ResolvedCell[] };

/** Cluster a zone's cells so their baseFrets sit near the first cell's. */
function clusterZone(cells: DiagramCell[], tonicPc: number): ResolvedCell[] {
  const raw = cells.map((c) => ({
    cell: c,
    voicing: shapeVoicing(c.shape, c.quality, mod12(tonicPc + c.semis)),
  }));
  const anchor = norm1to12(raw[0].voicing.baseFret);
  return raw.map(({ cell, voicing }) => {
    let bf = voicing.baseFret;
    while (bf - anchor > 6) bf -= 12;
    while (anchor - bf > 6) bf += 12;
    if (bf < 1) bf += 12;
    return {
      role: cell.role,
      shape: cell.shape,
      chord: chordName(mod12(tonicPc + cell.semis), cell.quality),
      voicing: { ...voicing, baseFret: bf },
    };
  });
}

export function resolveLessonZones(lesson: Lesson, tonicPc: number): ResolvedZone[] {
  return lesson.zones.map((z) => ({
    label: z.label,
    cells: clusterZone(z.cells, tonicPc),
  }));
}

/** The chord-name harmony line for a lesson in a given key, e.g. "G → C → D". */
export function lessonHarmony(lesson: Lesson, tonicPc: number): string[] {
  return lesson.harmony.map((r) => chordName(mod12(tonicPc + r.semis), r.quality));
}

// ─── Concepts data ─────────────────────────────────────────────────────────────

export type EssentialSound = {
  quality: ChordType;
  label: string;
  chord: string;
  voicing: ChordVoicingData;
};

/** Major / minor / dominant-7 as a single representative (E-shape) voicing. */
export function essentialSounds(tonicPc: number): EssentialSound[] {
  const specs: { quality: ChordType; label: string }[] = [
    { quality: "maj", label: "Major" },
    { quality: "min", label: "Minor" },
    { quality: "dom7", label: "Dominant 7" },
  ];
  return specs.map(({ quality, label }) => ({
    quality,
    label,
    chord: chordName(tonicPc, quality),
    voicing: standaloneVoicing("E", quality, tonicPc),
  }));
}

/** The I chord as all five CAGED shapes (C-A-G-E-D), transposed to the key. */
export function cagedShapeRow(
  tonicPc: number,
  mode: ConceptMode,
): { shape: CagedShapeName; voicing: ChordVoicingData }[] {
  const quality: ChordType = mode === "major" ? "maj" : "min";
  return rowVoicings(["C", "A", "G", "E", "D"], quality, tonicPc);
}

// ─── Phrasing Trick — full-neck scale notes (pp. 10–11) ────────────────────────

const MAJOR_DEGREES: Record<number, Degree> = { 0: "R", 2: "2", 4: "3", 5: "4", 7: "5", 9: "6", 11: "7" };
const MINOR_DEGREES: Record<number, Degree> = { 0: "R", 2: "2", 3: "b3", 5: "4", 7: "5", 8: "b6", 10: "b7" };
const MAJOR_CHORD = new Set([0, 4, 7]);
const MINOR_CHORD = new Set([0, 3, 7]);

export type NeckScaleNote = {
  string: StringName;
  absoluteFret: number;
  deg: Degree;
  isChordTone: boolean;
};

/** Every scale tone across the 24-fret neck, flagged as chord tone (landing) or
 *  passing tone — the data behind the Phrasing-Trick diagram. */
export function scaleNeckNotes(tonicPc: number, mode: ConceptMode): NeckScaleNote[] {
  const degrees = mode === "major" ? MAJOR_DEGREES : MINOR_DEGREES;
  const chord = mode === "major" ? MAJOR_CHORD : MINOR_CHORD;
  const notes: NeckScaleNote[] = [];
  for (let si = 0; si < 6; si++) {
    for (let f = 0; f <= 24; f++) {
      const interval = mod12(OPEN_PCS[si] + f - tonicPc);
      const deg = degrees[interval];
      if (!deg) continue;
      notes.push({
        string: STRING_NAMES[si] as StringName,
        absoluteFret: f,
        deg,
        isChordTone: chord.has(interval),
      });
    }
  }
  return notes;
}
