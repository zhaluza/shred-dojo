// Pentatonic Practice — music data and pure helpers.
// Adapted from the standalone pentatonic-practice prototype. No React deps.

export type PracticeKey = { maj: string; min: string; pc: number };
export type PracticeStep = {
  title: string;
  goal: string;
  desc: string;
  prompts: string[];
};
export type StringSet = { label: string; strings: [number, number] };

// Circle of fifths order. pc = pitch class (C = 0)
export const KEYS: PracticeKey[] = [
  { maj: "C", min: "Am", pc: 0 },
  { maj: "G", min: "Em", pc: 7 },
  { maj: "D", min: "Bm", pc: 2 },
  { maj: "A", min: "F♯m", pc: 9 },
  { maj: "E", min: "C♯m", pc: 4 },
  { maj: "B", min: "G♯m", pc: 11 },
  { maj: "F♯/G♭", min: "E♭m", pc: 6 },
  { maj: "D♭", min: "B♭m", pc: 1 },
  { maj: "A♭", min: "Fm", pc: 8 },
  { maj: "E♭", min: "Cm", pc: 3 },
  { maj: "B♭", min: "Gm", pc: 10 },
  { maj: "F", min: "Dm", pc: 5 },
];

export const NOTE_NAMES = [
  "C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B",
];

// Open-string pitch classes: low E, A, D, G, B, high e
export const OPEN_PCS = [4, 9, 2, 7, 11, 4];
export const STRING_NAMES = ["E", "A", "D", "G", "B", "e"];

// Low-E start fret of each shape, relative to the MINOR root fret
export const SHAPE_OFFSETS = [0, 3, 5, 7, 10]; // shapes 1–5

// Fret pairs per string (low E → high e), relative to the minor root fret.
// Transcribed from the A-minor reference (root fret 5).
export const SHAPES: number[][][] = [
  [[0, 3], [0, 2], [0, 2], [0, 2], [0, 3], [0, 3]], // Shape 1
  [[3, 5], [2, 5], [2, 5], [2, 4], [3, 5], [3, 5]], // Shape 2
  [[5, 7], [5, 7], [5, 7], [4, 7], [5, 8], [5, 7]], // Shape 3
  [[7, 10], [7, 10], [7, 9], [7, 9], [8, 10], [7, 10]], // Shape 4
  [[10, 12], [10, 12], [9, 12], [9, 12], [10, 12], [10, 12]], // Shape 5
];

// Lowest fret in each shape, relative to that shape's low-E start fret
export const SHAPE_MIN_REL = [0, -1, -1, 0, -1];

export const STRING_SETS: StringSet[] = [
  { label: "e + B", strings: [5, 4] },
  { label: "B + G", strings: [4, 3] },
  { label: "G + D", strings: [3, 2] },
  { label: "D + A", strings: [2, 1] },
  { label: "A + E", strings: [1, 0] },
];

export const mod12 = (n: number) => ((n % 12) + 12) % 12;
export const pcAt = (stringIdx: number, fret: number) =>
  mod12(OPEN_PCS[stringIdx] + fret);

// Fret of a pitch class on the low E string, in 1..12
export const rootFretLowE = (pc: number) => {
  const f = mod12(pc - 4);
  return f === 0 ? 12 : f;
};

export const STEPS: PracticeStep[] = [
  {
    title: "Parallel Placement",
    goal: "Shape memorization",
    desc: "Stay anchored in one spot. Every shape starts on the same low-E fret, so the key drifts — and that's fine. Just burn in the fingerings.",
    prompts: [
      "Play the shape ascending, then descending, in time with the click.",
      "Keep the first low-E note identical for every shape.",
      "When a shape feels automatic, advance to the next one.",
    ],
  },
  {
    title: "Key Placement",
    goal: "Diatonic internalization",
    desc: "One key, five positions. Walk the shapes up the neck where they actually live in this key.",
    prompts: [
      "Use the start fret shown for each shape — find it before you peek.",
      "Connect the top of one shape to the bottom of the next.",
      "Land on the root at the end of each shape to anchor your ear.",
    ],
  },
  {
    title: "Key Transposition",
    goal: "Seeing the key inside each shape",
    desc: "Same drill as Parallel Placement — anchored to one fret — but now you name the key out loud before revealing it.",
    prompts: [
      "Basic strategy: visualize where the root shape sits (Shape 1 for minor, Shape 2 for major) and read the key off the low-E root.",
      "Advanced: know the root locations inside the current shape itself.",
      "Say the key out loud, then tap Reveal to check.",
    ],
  },
  {
    title: "Lowest Available Shape",
    goal: "Instant whole-neck orientation",
    desc: "For the given key, find the lowest shape you can play in its entirety — then play it.",
    prompts: [
      "Work it out on the fretboard before revealing.",
      "Play the winning shape top to bottom once you've confirmed it.",
      "Cycle keys and keep your answers under a few seconds.",
    ],
  },
  {
    title: "Horizontal String Sets",
    goal: "Breaking out of the vertical boxes",
    desc: "Run the pentatonic along pairs of strings, the full length of the neck. Use the map below.",
    prompts: [
      "Ascend the neck on the pair, then descend.",
      "Watch for the roots — they're your landmarks across the neck.",
      "Cover all five pairs in each key before moving on.",
    ],
  },
  {
    title: "Improvisation",
    goal: "Making it music",
    desc: "Throw on a backing track in the key and improvise across all five shapes.",
    prompts: [
      "Deliberately spend time in your least familiar shapes.",
      "Try connecting two shapes horizontally mid-phrase.",
      "Target roots (and resolve to them) so the key stays audible.",
    ],
  },
];
