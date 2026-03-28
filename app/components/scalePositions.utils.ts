import type {
  Degree,
  ScaleConfig,
  ScaleMode,
  ScaleNote,
  ScalePosition,
  ScaleString,
  StringName,
} from "./scalePositions.types";

export const OPEN: number[] = [0, 5, 10, 15, 19, 24];
export const SNAME: StringName[] = ["E", "A", "D", "G", "B", "e"];
export const ROOT_FRET = 3;

export const SCALES: Record<ScaleMode, ScaleConfig> = {
  minor: {
    scale: ["R", "2", "b3", "4", "5", "6", "b7"],
    semi: { R: 0, "2": 2, b3: 3, "3": 4, "4": 5, "5": 7, b6: 8, "6": 8, b7: 10, "7": 11 },
    penta: new Set<Degree>(["R", "b3", "4", "5", "b7"]),
    diaLabel: "Diatonic only (2, 6)",
    title: "Natural Minor",
  },
  major: {
    scale: ["R", "2", "3", "4", "5", "6", "7"],
    semi: { R: 0, "2": 2, b3: 3, "3": 4, "4": 5, "5": 7, b6: 8, "6": 9, b7: 10, "7": 11 },
    penta: new Set<Degree>(["R", "2", "3", "5", "6"]),
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

export function buildSym(startDegIdx: number, cfg: ScaleConfig): ScaleString[] {
  const strings = build3nps(startDegIdx, cfg);
  strings[4].notes = strings[4].notes.slice(0, 2);
  strings[5].notes = strings[0].notes.map((n) => ({ ...n }));
  return strings;
}

export function toRelative(strings: ScaleString[]): ScaleString[] {
  const minFret = Math.min(...strings.flatMap((s) => s.notes.map((n) => n.fret)));
  return strings.map((s) => ({
    ...s,
    notes: s.notes.map((n) => ({ ...n, fret: n.fret - minFret })),
  }));
}

export function buildAllPositions(cfg: ScaleConfig): ScalePosition[] {
  const positions: ScalePosition[] = [];
  for (let st = 0; st < 7; st++) {
    positions.push({
      scaletone: st + 1,
      startDeg: cfg.scale[st],
      system: "3nps",
      strings: toRelative(build3nps(st, cfg)),
      twoNps: null,
    });
    positions.push({
      scaletone: st + 1,
      startDeg: cfg.scale[st],
      system: "sym",
      strings: toRelative(buildSym(st, cfg)),
      twoNps: "B",
    });
  }
  return positions;
}
