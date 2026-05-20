import type { Degree, StringName } from "./scalePositions.types";
import { FRET_DOUBLE, FRET_INLAYS } from "./scalePositions.utils";
import { STRING_LINE } from "./scalePositions.theme";

const DISPLAY_STRINGS: StringName[] = ["e", "B", "G", "D", "A", "E"];
const NECK_FRETS = 24;
const CELL_W = 36;
const OPEN_W = 36;
const NUT_W = 8;
const LABEL_W = "2.2rem";

export interface FullNeckNote {
  string: StringName;
  absoluteFret: number; // 0 = open, 1–24
  deg: Degree;
  penta?: boolean;
}

export interface FullNeckLayer {
  notes: FullNeckNote[];
  isMain: boolean; // true = full degree colors; false = dimmed gray dot
}

function NeckDot({ deg, penta = false }: { deg: Degree; penta?: boolean }) {
  let bg: string, fg: string, border: string | undefined;
  if (deg === "R") {
    bg = "var(--root-col)"; fg = "#fff";
  } else if (deg === "b5" && penta) {
    bg = "var(--blues-col)"; fg = "#fff";
  } else if (penta) {
    bg = "var(--text)"; fg = "var(--bg)";
  } else {
    bg = "var(--bg)"; fg = "var(--text)"; border = "1.5px solid var(--text)";
  }
  return (
    <div
      className="w-4 h-4 rounded-full flex items-center justify-center font-display font-semibold text-[0.36rem] tracking-tight shrink-0 relative z-[2]"
      style={{ backgroundColor: bg, color: fg, border }}
    >
      {deg}
    </div>
  );
}

export function FullNeckFretboard({ layers }: { layers: FullNeckLayer[] }) {
  // Build position lookup: main layer overrides dimmed layers
  const lookup = new Map<string, { note: FullNeckNote; isMain: boolean }>();
  for (const layer of layers) {
    for (const note of layer.notes) {
      if (note.absoluteFret < 0 || note.absoluteFret > NECK_FRETS) continue;
      const k = `${note.string}:${note.absoluteFret}`;
      if (layer.isMain || !lookup.has(k)) {
        lookup.set(k, { note, isMain: layer.isMain });
      }
    }
  }

  const minW = `${OPEN_W + NUT_W + NECK_FRETS * CELL_W + 40}px`;

  return (
    <div className="overflow-x-auto select-none">
      <div style={{ minWidth: minW }}>
        {/* Inlay marker row */}
        <div className="flex h-[12px] mb-[2px]" style={{ paddingLeft: LABEL_W }}>
          <div className="shrink-0" style={{ width: OPEN_W }} />
          <div className="shrink-0" style={{ width: NUT_W }} />
          {Array.from({ length: NECK_FRETS }, (_, i) => {
            const f = i + 1;
            const isDouble = FRET_DOUBLE.has(f);
            const hasInlay = FRET_INLAYS.has(f);
            return (
              <div
                key={f}
                className="shrink-0 flex items-center justify-center flex-col gap-[2px]"
                style={{ width: CELL_W }}
              >
                {isDouble ? (
                  <>
                    <div className="w-[4px] h-[4px] rounded-full" style={{ backgroundColor: "var(--faint)" }} />
                    <div className="w-[4px] h-[4px] rounded-full" style={{ backgroundColor: "var(--faint)" }} />
                  </>
                ) : hasInlay ? (
                  <div className="w-[4px] h-[4px] rounded-full" style={{ backgroundColor: "var(--faint)" }} />
                ) : null}
              </div>
            );
          })}
        </div>

        {/* String rows */}
        {DISPLAY_STRINGS.map((sn) => {
          const line = STRING_LINE[sn];
          return (
            <div key={sn} className="flex relative h-[28px]">
              {/* String name label */}
              <div
                className="shrink-0 flex items-center justify-end pr-2 text-[0.44rem] font-mono"
                style={{ width: LABEL_W, color: "var(--muted)" }}
              >
                {sn}
              </div>
              {/* Horizontal string line */}
              <div
                className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                style={{
                  left: LABEL_W,
                  right: 0,
                  height: line.height,
                  backgroundColor: line.colorVar,
                }}
              />
              {/* Open string zone (fret 0) */}
              <div
                className="shrink-0 flex items-center justify-center relative z-[1]"
                style={{ width: OPEN_W }}
              >
                {(() => {
                  const entry = lookup.get(`${sn}:0`);
                  if (!entry) return null;
                  if (entry.isMain) return <NeckDot deg={entry.note.deg} penta={entry.note.penta} />;
                  return (
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{
                        backgroundColor: entry.note.deg === "R" ? "var(--root-col)" : "var(--border)",
                        opacity: 0.4,
                      }}
                    />
                  );
                })()}
              </div>
              {/* Nut */}
              <div
                className="shrink-0 h-full"
                style={{ width: NUT_W, backgroundColor: "var(--faint)" }}
              />
              {/* Fret cells 1–24 */}
              {Array.from({ length: NECK_FRETS }, (_, i) => {
                const f = i + 1;
                const entry = lookup.get(`${sn}:${f}`);
                return (
                  <div
                    key={f}
                    className="shrink-0 h-full flex items-center justify-center relative z-[1]"
                    style={{ width: CELL_W, borderRight: "1.5px solid var(--fret-bar)" }}
                  >
                    {entry?.isMain ? (
                      <NeckDot deg={entry.note.deg} penta={entry.note.penta} />
                    ) : entry ? (
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{
                          backgroundColor: entry.note.deg === "R" ? "var(--root-col)" : "var(--border)",
                          opacity: 0.4,
                        }}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Fret numbers row */}
        <div className="flex mt-[2px]" style={{ paddingLeft: LABEL_W }}>
          <div
            className="shrink-0 text-center text-[0.38rem] font-mono"
            style={{ width: OPEN_W, color: "var(--faint)" }}
          >
            0
          </div>
          <div className="shrink-0" style={{ width: NUT_W }} />
          {Array.from({ length: NECK_FRETS }, (_, i) => (
            <div
              key={i}
              className="shrink-0 text-center text-[0.38rem] font-mono"
              style={{ width: CELL_W, color: "var(--faint)" }}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
