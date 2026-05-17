import type { ScaleConfig, ScaleMode, ScaleNote, ScaleString } from "./scalePositions.types";
import { findFret, ROOT_FRET, SNAME, SCALES, toRelative } from "./scalePositions.utils";
import { buildBox, type PentaScaleMode, type BoxNote } from "./pentatonicTriads.utils";

export const WYLDE_MODE_NAMES: Record<ScaleMode, string[]> = {
  minor: ["Aeolian", "Locrian", "Ionian", "Dorian", "Phrygian", "Lydian", "Mixolydian"],
  major: ["Ionian", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Aeolian", "Locrian"],
};

export interface WyldePosition {
  degIdx: number;
  modeName: string;
  strings: ScaleString[];
  startFret: number; // rawMinFret % 12 — used for key transposition
  pentaBoxIdx: number;
  pentaBox: BoxNote[];
  pentaRawMin: number; // raw min fret of penta box — needed for octave normalization
}

// Wylde's 3nps variant: identical to standard 3nps on E/A/D/G strings,
// but B string resets degCursor to (startDegIdx+4)%7 — one step back from
// where standard 3nps would begin B string. This repeats G's last degree on B,
// keeping the shape in a compact 4-5 fret window and causing e string to
// naturally cycle back to the same 3 degrees as the low E string.
function buildWylde(startDegIdx: number, cfg: ScaleConfig): ScaleString[] {
  let degCursor = startDegIdx;
  let refFret = ROOT_FRET + cfg.semi[cfg.scale[startDegIdx]];

  return SNAME.map((name, si) => {
    if (si === 4) {
      degCursor = (startDegIdx + 4) % 7;
    }

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

export function buildAllWyldePositions(scale: ScaleMode): WyldePosition[] {
  const cfg = SCALES[scale];
  const pentaScale = scale as PentaScaleMode;
  const boxes = Array.from({ length: 5 }, (_, i) => buildBox(i, pentaScale));
  const boxRawMins = boxes.map((b) => Math.min(...b.map((n) => n.fret)));
  // Match by E string start fret for better positional alignment
  const boxEStarts = boxes.map((b) => b.find((n) => n.string === "E")!.fret);

  return Array.from({ length: 7 }, (_, degIdx) => {
    const raw = buildWylde(degIdx, cfg);
    const rawMin = Math.min(...raw.flatMap((s) => s.notes.map((n) => n.fret)));
    const eStart = ROOT_FRET + cfg.semi[cfg.scale[degIdx]];

    let bestBox = 0;
    let bestDist = Infinity;
    // Prefer boxes whose E string start is >= diatonic shape start so the
    // penta box sits within the diatonic shape rather than starting before it.
    for (let i = 0; i < 5; i++) {
      const d = boxEStarts[i] - eStart;
      if (d >= 0 && d < bestDist) {
        bestDist = d;
        bestBox = i;
      }
    }
    // Fall back to absolute proximity when no box starts at or after eStart.
    if (bestDist === Infinity) {
      for (let i = 0; i < 5; i++) {
        const d = Math.abs(eStart - boxEStarts[i]);
        if (d < bestDist) {
          bestDist = d;
          bestBox = i;
        }
      }
    }

    return {
      degIdx,
      modeName: WYLDE_MODE_NAMES[scale][degIdx],
      strings: toRelative(raw),
      startFret: rawMin % 12,
      pentaBoxIdx: bestBox,
      pentaBox: boxes[bestBox],
      pentaRawMin: boxRawMins[bestBox],
    };
  });
}
