import type { LickPack } from "./lickStash.types";

export const LICK_PACKS: LickPack[] = [
  {
    slug: "rock-blues-pentatonic",
    title: "Rock / Blues Pentatonic",
    subtitle: "Pack 01",
    description:
      "Essential vocabulary from the minor pentatonic box. Bends, hammer-ons, pull-offs, and classic phrasing patterns every rock and blues player needs.",
    available: true,
    licks: [
      {
        id: "rbp-01",
        title: "Box 1 Burner",
        description: "Fast 16th-note run through the Am pentatonic box 1.",
        file: "/tabs/sample_exercise.gp",
      },
      {
        id: "rbp-02",
        title: "BB King Vibrato Phrase",
        description:
          "Vocal-style phrasing with wide vibrato on the b3 and 5.",
        file: "/tabs/sample_exercise.gp",
      },
      {
        id: "rbp-03",
        title: "Hendrix Double-Stop Riff",
        description:
          "Unison bends and double-stops in the style of Jimi Hendrix.",
        file: "/tabs/sample_exercise.gp",
      },
      {
        id: "rbp-04",
        title: "Blues Turnaround in A",
        description:
          "Classic I-IV-V turnaround lick with chromatic approach tones.",
        file: "/tabs/sample_exercise.gp",
      },
      {
        id: "rbp-05",
        title: "Clapton Crossroads Run",
        description:
          "Rapid pentatonic descent inspired by Cream-era Clapton.",
        file: "/tabs/sample_exercise.gp",
      },
      {
        id: "rbp-06",
        title: "Hammer-On Cascade",
        description:
          "Ascending legato pattern across all six strings using pull-offs and hammer-ons.",
        file: "/tabs/sample_exercise.gp",
      },
      {
        id: "rbp-07",
        title: "Shuffle Pickup Lick",
        description:
          "Swung 8th-note pickup phrase leading into a 12-bar chorus.",
        file: "/tabs/sample_exercise.gp",
      },
      {
        id: "rbp-08",
        title: "Power Riff in E",
        description:
          "Open-string power chord riff with palm-muted 16th notes.",
        file: "/tabs/sample_exercise.gp",
      },
      {
        id: "rbp-09",
        title: "Pentatonic Run with Bends",
        description:
          "Ascending run punctuated by whole-step bends on the G and B strings.",
        file: "/tabs/sample_exercise.gp",
      },
      {
        id: "rbp-10",
        title: "Classic Rock Outro Solo",
        description:
          "8-bar solo phrase using call-and-response phrasing over a I-bVII-IV progression.",
        file: "/tabs/sample_exercise.gp",
      },
    ],
  },
  {
    slug: "country-hybrid-picking",
    title: "Country Bends & Hybrid Picking",
    subtitle: "Pack 02",
    description:
      "Chicken pickin', banjo rolls, and pedal steel bends. The techniques that define modern country lead guitar.",
    available: false,
    licks: [],
  },
  {
    slug: "neo-classical-sequences",
    title: "Neo-Classical Sequences",
    subtitle: "Pack 03",
    description:
      "Harmonic minor runs, diminished arpeggios, and Baroque-inspired sequences for the shred-curious.",
    available: false,
    licks: [],
  },
  {
    slug: "jazz-fusion-lines",
    title: "Jazz Fusion Lines",
    subtitle: "Pack 04",
    description:
      "Altered dominants, chromatic enclosures, and legato lines drawn from the jazz-rock tradition.",
    available: false,
    licks: [],
  },
  {
    slug: "sweep-picking-arpeggios",
    title: "Sweep Picking Arpeggios",
    subtitle: "Pack 05",
    description:
      "Three-, five-, and six-string sweep patterns across major, minor, and diminished shapes.",
    available: false,
    licks: [],
  },
];
