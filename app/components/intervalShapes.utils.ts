import type { PentaDegree, PentaScaleMode } from "./pentatonicTriads.utils";

export type { PentaDegree, PentaScaleMode };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShapeOccurrence {
  box: number;
  pair: string; // e.g. "E–A" (lo–hi)
}

export interface IntervalShape {
  id: string;
  title: string;
  subtitle: string;
  loDegs: [PentaDegree, PentaDegree];
  loOff: number; // fret offset of lower string's first note from shape's min fret
  loSpan: number; // fret distance between lower string's two notes
  hiDegs: [PentaDegree, PentaDegree];
  hiOff: number; // fret offset of upper string's first note from shape's min fret
  hiSpan: number; // fret distance between upper string's two notes
  occurrences: ShapeOccurrence[];
  description: string;
}

// ─── Degree colors & names ────────────────────────────────────────────────────

// Mode-independent degree fills (white label sits on each). Brightened a touch
// so they read on the darker "Dusk" indigo ground while staying legible on the
// "Print" white. Semantic hues preserved (3 & 5 share green, as before).
export const DEG_COLOR: Record<PentaDegree, string> = {
  R: "#cf4434",
  b3: "#6485c4",
  "4": "#a07434",
  "b5": "#7060c8",
  "5": "#3f8a48",
  b7: "#9450a0",
  "2": "#5f9494",
  "3": "#3f8a48",
  "6": "#a08a3c",
};

export const DEG_NAMES: Record<PentaDegree, string> = {
  R: "Root",
  b3: "Minor 3rd",
  "4": "Perfect 4th",
  "b5": "Flat 5th (Blue Note)",
  "5": "Perfect 5th",
  b7: "Minor 7th",
  "2": "Major 2nd",
  "3": "Major 3rd",
  "6": "Major 6th",
};

export const SCALE_DEGREES: Record<PentaScaleMode, PentaDegree[]> = {
  minor: ["R", "b3", "4", "5", "b7"],
  major: ["R", "2", "3", "5", "6"],
};

// ─── Shape definitions ────────────────────────────────────────────────────────
// Each shape describes the two-string interval pattern for a string pair.
// loDegs/hiDegs: degrees on the lower/upper string (lo = lower-pitched string).
// loOff/hiOff: how many frets in from the shape's leftmost note the first note sits.
// loSpan/hiSpan: fret distance between the two notes on that string.

export const SHAPES: Record<PentaScaleMode, IntervalShape[]> = {
  minor: [
    {
      id: "min-A",
      title: "Root–b3 / 4–5",
      subtitle: "4× on P4 pairs",
      loDegs: ["R", "b3"],
      loOff: 0,
      loSpan: 3,
      hiDegs: ["4", "5"],
      hiOff: 0,
      hiSpan: 2,
      occurrences: [
        { box: 1, pair: "E–A" },
        { box: 2, pair: "D–G" },
        { box: 3, pair: "B–e" },
        { box: 4, pair: "A–D" },
      ],
      description:
        "Root and b3 span 3 frets on the lower string. 4th and 5th start at the same fret as the root on the upper string, 2 frets apart.",
    },
    {
      id: "min-B",
      title: "b7–Root / b3–4",
      subtitle: "4× on P4 pairs",
      loDegs: ["b7", "R"],
      loOff: 0,
      loSpan: 2,
      hiDegs: ["b3", "4"],
      hiOff: 0,
      hiSpan: 2,
      occurrences: [
        { box: 1, pair: "D–G" },
        { box: 2, pair: "B–e" },
        { box: 3, pair: "A–D" },
        { box: 5, pair: "E–A" },
      ],
      description:
        "Both strings span 2 frets, starting at the same fret. The most compact shape — two whole-step pairs stacked vertically.",
    },
    {
      id: "min-C",
      title: "5–b7 / Root–b3",
      subtitle: "4× on P4 pairs",
      loDegs: ["5", "b7"],
      loOff: 0,
      loSpan: 3,
      hiDegs: ["R", "b3"],
      hiOff: 0,
      hiSpan: 3,
      occurrences: [
        { box: 1, pair: "B–e" },
        { box: 2, pair: "A–D" },
        { box: 4, pair: "E–A" },
        { box: 5, pair: "D–G" },
      ],
      description:
        "Both strings span 3 frets, starting at the same fret. Root on the upper string — the 5th below leads into it.",
    },
    {
      id: "min-D",
      title: "b3–4 / 5–b7",
      subtitle: "4× on P4 pairs",
      loDegs: ["b3", "4"],
      loOff: 1,
      loSpan: 2,
      hiDegs: ["5", "b7"],
      hiOff: 0,
      hiSpan: 3,
      occurrences: [
        { box: 2, pair: "E–A" },
        { box: 3, pair: "D–G" },
        { box: 4, pair: "B–e" },
        { box: 5, pair: "A–D" },
      ],
      description:
        "The 5th is the lowest note. Lower string starts 1 fret in. No root in this shape — it sits between root positions.",
    },
    {
      id: "min-GB1",
      title: "b3–4 / 5–b7 (G–B)",
      subtitle: "Box 1 G–B only",
      loDegs: ["b3", "4"],
      loOff: 0,
      loSpan: 2,
      hiDegs: ["5", "b7"],
      hiOff: 0,
      hiSpan: 3,
      occurrences: [{ box: 1, pair: "G–B" }],
      description:
        "G: b3–4 (2 frets). B: 5–b7 (3 frets), same start fret. B string spans wider due to the G→B tuning gap.",
    },
    {
      id: "min-GB24",
      title: "4–5 / b7–Root (G–B)",
      subtitle: "Box 2 & 4 G–B",
      loDegs: ["4", "5"],
      loOff: 0,
      loSpan: 2,
      hiDegs: ["b7", "R"],
      hiOff: 1,
      hiSpan: 2,
      occurrences: [
        { box: 2, pair: "G–B" },
        { box: 4, pair: "G–B" },
      ],
      description:
        "G: 4–5 (2 frets). B: b7–Root (2 frets), starting 1 fret higher. Root lands at the top of the B string.",
    },
    {
      id: "min-GB3",
      title: "5–b7 / Root–b3 (G–B)",
      subtitle: "Box 3 G–B only",
      loDegs: ["5", "b7"],
      loOff: 0,
      loSpan: 3,
      hiDegs: ["R", "b3"],
      hiOff: 1,
      hiSpan: 3,
      occurrences: [{ box: 3, pair: "G–B" }],
      description:
        "G: 5–b7 (3 frets). B: Root–b3 (3 frets), starting 1 fret higher. Widest G–B shape — 4 frets total.",
    },
    {
      id: "min-GB5",
      title: "Root–b3 / 4–5 (G–B)",
      subtitle: "Box 5 G–B only",
      loDegs: ["R", "b3"],
      loOff: 0,
      loSpan: 3,
      hiDegs: ["4", "5"],
      hiOff: 1,
      hiSpan: 2,
      occurrences: [{ box: 5, pair: "G–B" }],
      description:
        "G: Root–b3 (3 frets). B: 4–5 (2 frets), starting 1 fret higher than the root.",
    },
  ],
  major: [
    {
      id: "maj-A",
      title: "Root–2 / 3–5",
      subtitle: "4× on P4 pairs",
      loDegs: ["R", "2"],
      loOff: 1,
      loSpan: 2,
      hiDegs: ["3", "5"],
      hiOff: 0,
      hiSpan: 3,
      occurrences: [
        { box: 1, pair: "E–A" },
        { box: 2, pair: "D–G" },
        { box: 3, pair: "B–e" },
        { box: 4, pair: "A–D" },
      ],
      description:
        "The 3rd sits 1 fret below the root on the upper string. Root and 2nd are on the lower string 2 frets apart. The 3rd — the defining major colour — flanks the root.",
    },
    {
      id: "maj-B",
      title: "5–6 / Root–2",
      subtitle: "4× on P4 pairs",
      loDegs: ["5", "6"],
      loOff: 0,
      loSpan: 2,
      hiDegs: ["R", "2"],
      hiOff: 0,
      hiSpan: 2,
      occurrences: [
        { box: 1, pair: "B–e" },
        { box: 2, pair: "A–D" },
        { box: 4, pair: "E–A" },
        { box: 5, pair: "D–G" },
      ],
      description:
        "Both strings span 2 frets, starting at the same fret. Root on the upper string, 5th on the lower. Most compact major shape.",
    },
    {
      id: "maj-C",
      title: "6–Root / 2–3",
      subtitle: "4× on P4 pairs",
      loDegs: ["6", "R"],
      loOff: 0,
      loSpan: 3,
      hiDegs: ["2", "3"],
      hiOff: 0,
      hiSpan: 2,
      occurrences: [
        { box: 1, pair: "D–G" },
        { box: 2, pair: "B–e" },
        { box: 3, pair: "A–D" },
        { box: 5, pair: "E–A" },
      ],
      description:
        "Root on the lower string, 3 frets above the 6th. 2nd and 3rd on the upper string start at the same fret as the 6th, spanning 2 frets.",
    },
    {
      id: "maj-D",
      title: "3–5 / 6–Root",
      subtitle: "4× on P4 pairs",
      loDegs: ["3", "5"],
      loOff: 0,
      loSpan: 3,
      hiDegs: ["6", "R"],
      hiOff: 0,
      hiSpan: 3,
      occurrences: [
        { box: 1, pair: "A–D" },
        { box: 3, pair: "E–A" },
        { box: 4, pair: "D–G" },
        { box: 5, pair: "B–e" },
      ],
      description:
        "Both strings span 3 frets, starting at the same fret. Root on upper string, 3rd on lower. Widest and most symmetrical major shape.",
    },
    {
      id: "maj-GB13",
      title: "2–3 / 5–6 (G–B)",
      subtitle: "Box 1 & 3 G–B",
      loDegs: ["2", "3"],
      loOff: 0,
      loSpan: 2,
      hiDegs: ["5", "6"],
      hiOff: 1,
      hiSpan: 2,
      occurrences: [
        { box: 1, pair: "G–B" },
        { box: 3, pair: "G–B" },
      ],
      description: "G: 2–3 (2 frets). B: 5–6 (2 frets), starting 1 fret higher.",
    },
    {
      id: "maj-GB2",
      title: "3–5 / 6–Root (G–B)",
      subtitle: "Box 2 G–B only",
      loDegs: ["3", "5"],
      loOff: 0,
      loSpan: 3,
      hiDegs: ["6", "R"],
      hiOff: 1,
      hiSpan: 3,
      occurrences: [{ box: 2, pair: "G–B" }],
      description:
        "G: 3–5 (3 frets). B: 6–Root (3 frets), starting 1 fret higher. Root at the top — widest major G–B shape.",
    },
    {
      id: "maj-GB4",
      title: "6–Root / 2–3 (G–B)",
      subtitle: "Box 4 G–B only",
      loDegs: ["6", "R"],
      loOff: 0,
      loSpan: 3,
      hiDegs: ["2", "3"],
      hiOff: 1,
      hiSpan: 2,
      occurrences: [{ box: 4, pair: "G–B" }],
      description:
        "G: 6–Root (3 frets). B: 2–3 (2 frets), starting 1 fret higher than the 6th.",
    },
    {
      id: "maj-GB5",
      title: "Root–2 / 3–5 (G–B)",
      subtitle: "Box 5 G–B only",
      loDegs: ["R", "2"],
      loOff: 0,
      loSpan: 2,
      hiDegs: ["3", "5"],
      hiOff: 0,
      hiSpan: 3,
      occurrences: [{ box: 5, pair: "G–B" }],
      description:
        "G: Root–2 (2 frets). B: 3–5 (3 frets), starting at the same fret as the root.",
    },
  ],
};
