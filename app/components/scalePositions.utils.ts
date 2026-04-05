import type {
  CagedShapeName,
  Degree,
  ScaleConfig,
  ScaleMode,
  ScaleNote,
  ScalePosition,
  ScaleString,
  StringName,
  UnifiedNote,
  UnifiedString,
} from "./scalePositions.types";

export const OPEN: number[] = [0, 5, 10, 15, 19, 24];
export const SNAME: StringName[] = ["E", "A", "D", "G", "B", "e"];
export const ROOT_FRET = 3;

export const SCALES: Record<ScaleMode, ScaleConfig> = {
  minor: {
    scale: ["R", "2", "b3", "4", "5", "6", "b7"],
    semi: { R: 0, "2": 2, b3: 3, "3": 4, "4": 5, "5": 7, b6: 8, "6": 8, b7: 10, "7": 11 },
    penta: new Set<Degree>(["R", "b3", "4", "5", "b7"]),
    chordTones: new Set<Degree>(["R", "b3", "5"]),
    diaLabel: "Diatonic only (2, 6)",
    title: "Natural Minor",
  },
  major: {
    scale: ["R", "2", "3", "4", "5", "6", "7"],
    semi: { R: 0, "2": 2, b3: 3, "3": 4, "4": 5, "5": 7, b6: 8, "6": 9, b7: 10, "7": 11 },
    penta: new Set<Degree>(["R", "2", "3", "5", "6"]),
    chordTones: new Set<Degree>(["R", "3", "5"]),
    diaLabel: "Diatonic only (4, 7)",
    title: "Natural Major",
  },
};

export function findFret(
  degree: Degree,
  stringIdx: number,
  refFret: number,
  cfg: ScaleConfig
): number {
  const rootPitch = OPEN[0] + ROOT_FRET;
  const notePitch = (rootPitch + cfg.semi[degree]) % 12;
  const openPitch = OPEN[stringIdx] % 12;
  const baseFret = (notePitch - openPitch + 12) % 12;

  const candidates = [baseFret, baseFret + 12, baseFret + 24].filter(
    (f) => f >= 0 && f <= 22
  );

  return candidates.reduce((best, f) =>
    Math.abs(f - refFret) < Math.abs(best - refFret) ? f : best
  );
}

export function build3nps(startDegIdx: number, cfg: ScaleConfig): ScaleString[] {
  let degCursor = startDegIdx;
  let refFret = ROOT_FRET + cfg.semi[cfg.scale[startDegIdx]];

  return SNAME.map((name, si) => {
    const degrees = [0, 1, 2].map((i) => cfg.scale[(degCursor + i) % 7]);

    let ref = refFret;
    const notes: ScaleNote[] = degrees.map((deg) => {
      const fret = findFret(deg, si, ref, cfg);
      ref = fret + 1;
      return { fret, deg, penta: cfg.penta.has(deg) };
    });

    degCursor = (degCursor + 3) % 7;
    refFret = notes[notes.length - 1].fret + 1;

    return { name, notes };
  });
}

export function symTwoNoteString(startDegIdx: number, cfg: ScaleConfig): 3 | 4 {
  const gStart = (startDegIdx + 2) % 7;
  const deg0 = cfg.scale[gStart];
  const deg2 = cfg.scale[(gStart + 2) % 7];
  const span = (cfg.semi[deg2] - cfg.semi[deg0] + 12) % 12;
  return span === 4 ? 3 : 4;
}

export function buildSym(startDegIdx: number, cfg: ScaleConfig): ScaleString[] {
  const twoNoteIdx = symTwoNoteString(startDegIdx, cfg);
  let degCursor = startDegIdx;
  let refFret = ROOT_FRET + cfg.semi[cfg.scale[startDegIdx]];

  return SNAME.map((name, si) => {
    const noteCount = si === twoNoteIdx ? 2 : 3;

    if (si === 5) {
      degCursor = startDegIdx;
    }

    const degrees = Array.from({ length: noteCount }, (_, i) =>
      cfg.scale[(degCursor + i) % 7]
    );

    let ref = refFret;
    const notes: ScaleNote[] = degrees.map((deg) => {
      const fret = findFret(deg, si, ref, cfg);
      ref = fret + 1;
      return { fret, deg, penta: cfg.penta.has(deg) };
    });

    degCursor = (degCursor + noteCount) % 7;
    refFret = notes[notes.length - 1].fret + 1;

    return { name, notes };
  });
}

export function toRelative(strings: ScaleString[]): ScaleString[] {
  const minFret = Math.min(...strings.flatMap((s) => s.notes.map((n) => n.fret)));
  return strings.map((s) => ({
    ...s,
    notes: s.notes.map((n) => ({ ...n, fret: n.fret - minFret })),
  }));
}

// ─── CAGED shapes ────────────────────────────────────────────────────────────

interface CagedShapeDef {
  name: CagedShapeName;
  rootStrings: StringName[];
  major: number[][]; // intervals per string [E, A, D, G, B, e]
  minor: number[][];
}

// Ordered E → D → C → A → G (low-to-high on the neck)
const CAGED_SHAPES: CagedShapeDef[] = [
  {
    name: "E",
    rootStrings: ["E", "D", "e"],
    major: [[7, 1, 2], [3, 4, 5], [6, 7, 1], [2, 3, 4], [5, 6], [7, 1, 2]],
    minor: [[1, 2, 3], [4, 5, 6], [7, 1], [2, 3, 4], [5, 6, 7], [1, 2, 3]],
  },
  {
    name: "D",
    rootStrings: ["D", "B"],
    major: [[2, 3, 4], [5, 6], [7, 1, 2], [3, 4, 5], [6, 7, 1], [2, 3, 4]],
    minor: [[2, 3, 4], [5, 6, 7], [1, 2, 3], [4, 5, 6], [7, 1], [2, 3, 4]],
  },
  {
    name: "C",
    rootStrings: ["A", "B"],
    major: [[3, 4, 5], [6, 7, 1], [2, 3, 4], [5, 6], [7, 1, 2], [3, 4, 5]],
    minor: [[4, 5, 6], [7, 1], [2, 3, 4], [5, 6, 7], [1, 2, 3], [4, 5, 6]],
  },
  {
    name: "A",
    rootStrings: ["A", "G"],
    major: [[5, 6], [7, 1, 2], [3, 4, 5], [6, 7, 1], [2, 3, 4], [5, 6]],
    minor: [[5, 6, 7], [1, 2, 3], [4, 5, 6], [7, 1], [2, 3, 4], [5, 6, 7]],
  },
  {
    name: "G",
    rootStrings: ["E", "G", "e"],
    major: [[6, 7, 1], [2, 3, 4], [5, 6], [7, 1, 2], [3, 4, 5], [6, 7, 1]],
    minor: [[7, 1], [2, 3, 4], [5, 6, 7], [1, 2, 3], [4, 5, 6], [7, 1]],
  },
];

function buildCagedShape(shape: CagedShapeDef, cfg: ScaleConfig): ScaleString[] {
  const isMajor = cfg.scale.includes("3" as Degree);
  const intervals = isMajor ? shape.major : shape.minor;

  // Start at fret 14 so shapes have room to cluster without notes being
  // forced to a wrong octave. Propagate ref between strings to keep
  // all notes in the same fret region. Shapes are normalized by toRelative.
  let prevRef = 14;

  return SNAME.map((name, si) => {
    const degrees = intervals[si].map((n) => cfg.scale[n - 1]);

    let ref = prevRef;
    const notes: ScaleNote[] = degrees.map((deg) => {
      const fret = findFret(deg, si, ref, cfg);
      ref = fret + 1;
      return { fret, deg, penta: cfg.penta.has(deg) };
    });

    prevRef = notes[0].fret;
    return { name, notes };
  });
}

export function buildCagedPositions(cfg: ScaleConfig): ScalePosition[] {
  return CAGED_SHAPES.map((shape) => {
    const isMajor = cfg.scale.includes("3" as Degree);
    const intervals = isMajor ? shape.major : shape.minor;
    const scaletone = intervals[0][0]; // first degree on E string
    const rawStrings = buildCagedShape(shape, cfg);
    const rawMinFret = Math.min(...rawStrings.flatMap((s) => s.notes.map((n) => n.fret)));

    return {
      scaletone,
      startDeg: cfg.scale[scaletone - 1],
      system: "caged" as const,
      strings: toRelative(rawStrings),
      shapeName: shape.name,
      startFret: rawMinFret % 12,
    };
  });
}

export function buildAllPositions(cfg: ScaleConfig): ScalePosition[] {
  const positions: ScalePosition[] = [];
  for (let st = 0; st < 7; st++) {
    const raw3nps = build3nps(st, cfg);
    const rawMin3nps = Math.min(...raw3nps.flatMap((s) => s.notes.map((n) => n.fret)));
    positions.push({
      scaletone: st + 1,
      startDeg: cfg.scale[st],
      system: "3nps",
      strings: toRelative(raw3nps),
      startFret: rawMin3nps % 12,
    });

    const rawSym = buildSym(st, cfg);
    const rawMinSym = Math.min(...rawSym.flatMap((s) => s.notes.map((n) => n.fret)));
    positions.push({
      scaletone: st + 1,
      startDeg: cfg.scale[st],
      system: "sym",
      strings: toRelative(rawSym),
      startFret: rawMinSym % 12,
    });
  }
  return positions;
}

/**
 * Merge two positions' strings into a unified representation with absolute fret
 * positions. Notes at the same fret+string from both systems are combined into
 * a single UnifiedNote with both systems listed.
 */
export function mergePositions(
  posA: ScalePosition,
  posB: ScalePosition,
  fretOffsetA: number,
  fretOffsetB: number,
): UnifiedString[] {
  return SNAME.map((name, si) => {
    const strA = posA.strings[si];
    const strB = posB.strings[si];
    const noteMap = new Map<number, UnifiedNote>();

    for (const n of strA.notes) {
      const absFret = n.fret + fretOffsetA;
      noteMap.set(absFret, {
        fret: absFret,
        deg: n.deg,
        penta: n.penta,
        systems: [posA.system],
      });
    }

    for (const n of strB.notes) {
      const absFret = n.fret + fretOffsetB;
      const existing = noteMap.get(absFret);
      if (existing) {
        if (!existing.systems.includes(posB.system)) {
          existing.systems.push(posB.system);
        }
      } else {
        noteMap.set(absFret, {
          fret: absFret,
          deg: n.deg,
          penta: n.penta,
          systems: [posB.system],
        });
      }
    }

    return {
      name,
      notes: Array.from(noteMap.values()).sort((a, b) => a.fret - b.fret),
    };
  });
}
