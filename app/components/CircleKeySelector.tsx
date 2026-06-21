import { KEYS } from "./pentatonicPractice.utils";

// ─── Circle-of-fifths key selector ───────────────────────────────────────────
// Compact wheel for picking a key. Outer ring = majors, inner ring = minors;
// `mode` controls which ring reads as active. Shared by PentatonicPractice and
// the standalone Metronome "Practice Station". (Distinct from the full
// CircleOfFifths page, which is an info explorer rather than a picker.)

export function CircleKeySelector({
  keyIdx,
  mode,
  onSelect,
}: {
  keyIdx: number;
  mode: "minor" | "major";
  onSelect: (i: number) => void;
}) {
  const R = 130, cx = 150, cy = 150;
  const majorActive = mode === "major";
  return (
    <svg
      viewBox="0 0 300 300"
      style={{ width: "100%", maxWidth: 280 }}
      role="img"
      aria-label="Circle of fifths key selector"
    >
      {KEYS.map((k, i) => {
        const a0 = ((i - 0.5) / 12) * Math.PI * 2 - Math.PI / 2;
        const a1 = ((i + 0.5) / 12) * Math.PI * 2 - Math.PI / 2;
        const arc = (r: number, a: number): [number, number] => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
        const [x0, y0] = arc(R, a0);
        const [x1, y1] = arc(R, a1);
        const [x2, y2] = arc(46, a1);
        const [x3, y3] = arc(46, a0);
        const [bx0, by0] = arc(92, a0);
        const [bx1, by1] = arc(92, a1);
        const mid = (a0 + a1) / 2;
        const [mx, my] = arc(R - 24, mid);
        const [ix, iy] = arc(68, mid);
        const sel = i === keyIdx;
        return (
          <g key={k.maj} onClick={() => onSelect(i)} style={{ cursor: "pointer" }}>
            {/* outer (major) wedge */}
            <path
              d={`M ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1} L ${bx1} ${by1} A 92 92 0 0 0 ${bx0} ${by0} Z`}
              fill="var(--accent)"
              fillOpacity={sel && majorActive ? 0.16 : 0}
              stroke="var(--border)"
              strokeWidth="1"
            />
            {/* inner (minor) wedge */}
            <path
              d={`M ${bx0} ${by0} A 92 92 0 0 1 ${bx1} ${by1} L ${x2} ${y2} A 46 46 0 0 0 ${x3} ${y3} Z`}
              fill="var(--accent)"
              fillOpacity={sel && !majorActive ? 0.16 : 0}
              stroke="var(--border)"
              strokeWidth="1"
            />
            <text
              x={mx} y={my + 4}
              textAnchor="middle"
              fontSize={majorActive ? 15 : 12}
              fontWeight={sel && majorActive ? 700 : 500}
              fill={sel && majorActive ? "var(--accent)" : majorActive ? "var(--text)" : "var(--faint)"}
              fontFamily="'Oswald', sans-serif"
              style={{ pointerEvents: "none" }}
            >
              {k.maj}
            </text>
            <text
              x={ix} y={iy + 3}
              textAnchor="middle"
              fontSize={majorActive ? 9 : 12}
              fontWeight={sel && !majorActive ? 700 : 500}
              fill={sel && !majorActive ? "var(--accent)" : majorActive ? "var(--faint)" : "var(--text)"}
              fontFamily="'Oswald', sans-serif"
              style={{ pointerEvents: "none" }}
            >
              {k.min}
            </text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={46} fill="none" stroke="var(--border)" />
      <circle
        cx={cx} cy={cy} r={92}
        fill="none"
        stroke={majorActive ? "var(--border)" : "var(--accent)"}
        strokeOpacity={majorActive ? 1 : 0.55}
      />
      <circle
        cx={cx} cy={cy} r={R}
        fill="none"
        stroke={majorActive ? "var(--accent)" : "var(--border)"}
        strokeOpacity={majorActive ? 0.55 : 1}
      />
    </svg>
  );
}
