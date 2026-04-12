import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/home";
import { Logo } from "~/components/Logo";
import { LIGHT_THEME, DARK_THEME } from "~/components/scalePositions.theme";
import { Nav } from "~/components/Nav";
import { useState, useEffect, useRef } from "react";

export function meta({ data }: Route.MetaArgs) {
  const isPreview = (data as { preview: boolean } | undefined)?.preview;
  return [
    { title: isPreview ? "Shred Dojo" : "Shred Dojo — Coming Soon" },
    {
      name: "description",
      content:
        "A focused platform for guitarists who want real fretboard command.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  return { preview: url.searchParams.get("preview") === "true" };
}

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const AMBER = "#c8a060";

// ---------------------------------------------------------------------------
// Coming Soon page (existing, shown to regular visitors)
// ---------------------------------------------------------------------------

// ── Morphing fretboard ───────────────────────────────────────────────────────

type DotType = "root" | "triad" | "note";
interface MorphDot { s: number; f: number; type: DotType }
interface MorphPattern { name: string; sub: string; dots: MorphDot[] }

const MORPH_PATTERNS: MorphPattern[] = [
  {
    name: "Minor Pentatonic",
    sub: "Box 1",
    dots: [
      { s: 0, f: 0, type: "root" }, { s: 0, f: 3, type: "note" },
      { s: 1, f: 0, type: "note" }, { s: 1, f: 3, type: "note" },
      { s: 2, f: 0, type: "note" }, { s: 2, f: 2, type: "note" },
      { s: 3, f: 0, type: "note" }, { s: 3, f: 2, type: "note" },
      { s: 4, f: 0, type: "note" }, { s: 4, f: 2, type: "note" },
      { s: 5, f: 0, type: "root" }, { s: 5, f: 3, type: "note" },
    ],
  },
  {
    name: "Pentatonic Triads",
    sub: "Root · 3rd · 5th",
    dots: [
      { s: 0, f: 0, type: "root" }, { s: 0, f: 3, type: "triad" },
      { s: 1, f: 0, type: "triad" }, { s: 1, f: 3, type: "note" },
      { s: 2, f: 0, type: "note" }, { s: 2, f: 2, type: "triad" },
      { s: 3, f: 0, type: "triad" }, { s: 3, f: 2, type: "root" },
      { s: 4, f: 0, type: "note" }, { s: 4, f: 2, type: "triad" },
      { s: 5, f: 0, type: "root" }, { s: 5, f: 3, type: "triad" },
    ],
  },
  {
    name: "3nps Diatonic",
    sub: "Position 1",
    dots: [
      { s: 0, f: 0, type: "root" }, { s: 0, f: 2, type: "note" }, { s: 0, f: 3, type: "note" },
      { s: 1, f: 0, type: "note" }, { s: 1, f: 2, type: "note" }, { s: 1, f: 4, type: "note" },
      { s: 2, f: 0, type: "note" }, { s: 2, f: 2, type: "note" }, { s: 2, f: 4, type: "root" },
      { s: 3, f: 0, type: "note" }, { s: 3, f: 1, type: "note" }, { s: 3, f: 3, type: "note" },
      { s: 4, f: 0, type: "note" }, { s: 4, f: 2, type: "note" }, { s: 4, f: 3, type: "note" },
      { s: 5, f: 0, type: "root" }, { s: 5, f: 2, type: "note" }, { s: 5, f: 3, type: "note" },
    ],
  },
  {
    name: "CAGED",
    sub: "E Shape",
    dots: [
      { s: 0, f: 0, type: "root" }, { s: 0, f: 2, type: "note" }, { s: 0, f: 4, type: "note" },
      { s: 1, f: 0, type: "note" }, { s: 1, f: 2, type: "note" }, { s: 1, f: 3, type: "note" },
      { s: 2, f: 0, type: "note" }, { s: 2, f: 2, type: "note" }, { s: 2, f: 4, type: "root" },
      { s: 3, f: 0, type: "note" }, { s: 3, f: 1, type: "note" }, { s: 3, f: 4, type: "note" },
      { s: 4, f: 0, type: "root" }, { s: 4, f: 2, type: "note" }, { s: 4, f: 4, type: "note" },
      { s: 5, f: 0, type: "root" }, { s: 5, f: 2, type: "note" }, { s: 5, f: 4, type: "note" },
    ],
  },
];

const FRET_COUNT = 5;
const MORPH_STRING_HEIGHTS = ["0.7px", "0.8px", "1px", "1.3px", "1.8px", "2.2px"];
const MORPH_STRING_COLORS = [
  "var(--border)", "var(--border)", "var(--border)", "var(--border)", AMBER, "var(--border)",
];

function MorphingFretboard() {
  const [patternIdx, setPatternIdx] = useState(0);
  const [showing, setShowing] = useState(true);
  const scanRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cycle = setInterval(() => {
      setShowing(false);

      const scan = scanRef.current;
      if (scan) {
        scan.style.transition = "none";
        scan.style.left = "-2px";
        scan.style.opacity = "0.9";
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            scan.style.transition = "left 0.4s cubic-bezier(0.4, 0, 0.6, 1)";
            scan.style.left = "100%";
            setTimeout(() => {
              if (scanRef.current) scanRef.current.style.opacity = "0";
            }, 400);
          });
        });
      }

      setTimeout(() => {
        setPatternIdx((i) => (i + 1) % MORPH_PATTERNS.length);
        setShowing(true);
      }, 400);
    }, 4200);

    return () => clearInterval(cycle);
  }, []);

  const pattern = MORPH_PATTERNS[patternIdx];

  const getDotBg = (type: DotType) =>
    type === "root" ? "var(--accent)" : type === "triad" ? AMBER : "var(--text)";

  const getDotGlow = (type: DotType) =>
    type === "root"
      ? "0 0 9px var(--accent)"
      : type === "triad"
        ? `0 0 7px ${AMBER}`
        : "none";

  return (
    <div className="mb-12 select-none pointer-events-none" aria-hidden="true">
      {/* Label row */}
      <div
        className="flex items-center justify-between mb-3"
        style={{ opacity: showing ? 0.55 : 0, transition: "opacity 0.3s ease" }}
      >
        <span className="text-[0.44rem] tracking-[0.18em] uppercase" style={{ color: AMBER }}>
          {pattern.name}
          <span className="ml-[0.5em]" style={{ color: "var(--muted)" }}>
            — {pattern.sub}
          </span>
        </span>
        {/* Progress pills */}
        <div className="flex gap-[5px] items-center">
          {MORPH_PATTERNS.map((_, i) => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width: i === patternIdx ? 14 : 4,
                height: 4,
                backgroundColor: i === patternIdx ? AMBER : "var(--border)",
                transition: "width 0.35s ease, background-color 0.35s ease",
              }}
            />
          ))}
        </div>
      </div>

      {/* Fretboard */}
      <div className="relative overflow-hidden">
        {/* Scan line */}
        <div
          ref={scanRef}
          className="absolute inset-y-0 z-10 pointer-events-none"
          style={{
            width: 1,
            left: "-2px",
            opacity: 0,
            backgroundColor: AMBER,
            boxShadow: `0 0 6px ${AMBER}, 0 0 14px ${AMBER}60`,
          }}
        />

        {Array.from({ length: 6 }, (_, si) => {
          const rowDots = pattern.dots.filter((d) => d.s === si);
          return (
            <div key={si} className="h-[20px] relative">
              {/* String */}
              <div
                className="absolute inset-x-0"
                style={{
                  top: "calc(50% - 1px)",
                  height: MORPH_STRING_HEIGHTS[si],
                  backgroundColor: MORPH_STRING_COLORS[si],
                  opacity: 0.45,
                }}
              />
              {/* Fret bars */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `repeating-linear-gradient(
                    to right,
                    transparent 0px,
                    transparent calc(${100 / FRET_COUNT}% - 1px),
                    var(--border) calc(${100 / FRET_COUNT}% - 1px),
                    var(--border) ${100 / FRET_COUNT}%
                  )`,
                  opacity: 0.3,
                }}
              />
              {/* Dots */}
              {Array.from({ length: FRET_COUNT }, (_, fi) => {
                const dot = rowDots.find((d) => d.f === fi);
                const isOn = showing && !!dot;
                const delay = showing ? fi * 0.052 : 0;
                return (
                  <div
                    key={fi}
                    className="absolute rounded-full"
                    style={{
                      width: 12,
                      height: 12,
                      left: `calc(${((fi + 0.5) / FRET_COUNT) * 100}% - 6px)`,
                      top: "50%",
                      marginTop: -6,
                      backgroundColor: dot ? getDotBg(dot.type) : "var(--text)",
                      opacity: isOn ? (dot.type === "note" ? 0.72 : 1) : 0,
                      transform: `scale(${isOn ? 1 : 0.2})`,
                      transition: [
                        `opacity ${showing ? "0.32s" : "0.15s"} ease ${delay}s`,
                        `transform ${showing ? "0.38s" : "0.15s"} cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}s`,
                      ].join(", "),
                      boxShadow: isOn && dot ? getDotGlow(dot.type) : "none",
                      zIndex: 2,
                    }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const FEATURES: Array<{ label: string; title: string; body: string }> = [
  {
    label: "Soon",
    title: "Scale Position System",
    body: "All 7 diatonic positions across major and minor — 3nps, CAGED, and symmetric systems mapped side by side so you can see exactly how they relate on the neck.",
  },
  {
    label: "Soon",
    title: "Lick Stash",
    body: "Curated lick packs organized by style and technique. Learn, loop, and internalize real vocabulary you can use on stage.",
  },
  {
    label: "Soon",
    title: "Pentatonic Triads",
    body: "Triad intervals mapped across all 5 pentatonic shapes — see how roots, 3rds, and 5ths connect across position boundaries.",
  },
  {
    label: "Soon",
    title: "Fretboard Fluency",
    body: "A structured course for internalizing the neck from the ground up. Notes, intervals, and positions as a single connected map — not isolated shapes.",
  },
];

function ComingSoonPage() {
  return (
    <div
      className="min-h-screen flex flex-col font-mono bg-[var(--bg)] text-[var(--text)]"
      style={{ ...LIGHT_THEME, "--amber": AMBER } as React.CSSProperties}
    >
      {/* Decorative fretboard stripe */}
      <div
        className="w-full h-[6px] opacity-60 relative z-[1]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            to right,
            ${AMBER} 0px,
            ${AMBER} 1px,
            transparent 1px,
            transparent 80px
          )`,
        }}
      />

      <main className="relative z-[1] flex-1 max-w-[680px] mx-auto w-full px-8 pt-20 pb-16 flex flex-col">
        {/* Eyebrow */}
        <p
          className="text-[0.6rem] tracking-[0.22em] uppercase mb-5"
          style={{ color: AMBER }}
        >
          Coming Soon
        </p>

        {/* Logo */}
        <Logo as="h1" pickWidth={38} className="mb-[0.2rem]" />

        {/* Sub-heading */}
        <p className="font-display font-light text-[clamp(1rem,3vw,1.5rem)] tracking-[0.12em] uppercase text-[var(--muted)] mb-12">
          Guitar Learning Platform
        </p>

        {/* Rule */}
        <div className="w-full h-[2px] bg-[var(--text)] mb-10" />

        {/* Morphing fretboard visualization */}
        <MorphingFretboard />

        {/* Description */}
        <p className="text-[0.78rem] leading-[1.9] text-[var(--muted)] mb-12 max-w-[480px]">
          Built for{" "}
          <strong className="text-[var(--text)] font-normal">guitarists</strong>{" "}
          who want to actually know the neck — not just navigate it.{" "}
          Start with the{" "}
          <strong className="text-[var(--text)] font-normal">
            complete scale position system
          </strong>
          , then put it to work with structured courses built around real playing.
        </p>

        {/* Feature list */}
        <div className="flex flex-col mb-14 border-t border-[var(--border)]">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex items-baseline gap-4 py-[0.85rem] border-b border-[var(--border)]"
            >
              <div
                className="text-[0.5rem] tracking-[0.1em] uppercase shrink-0 pt-[0.1rem] w-14 text-right"
                style={{ color: AMBER }}
              >
                {f.label}
              </div>
              <div className="text-[0.72rem] text-[var(--muted)] leading-[1.6]">
                <strong className="block text-[0.75rem] text-[var(--text)] font-normal mb-[0.1rem] tracking-[0.02em]">
                  {f.title}
                </strong>
                {f.body}
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="relative z-[1] border-t border-[var(--border)] px-8 py-5">
        <span className="text-[0.55rem] text-[var(--faint)] tracking-[0.1em] uppercase">
          © Shred Dojo
        </span>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Full Home page (shown when ?preview=true)
// ---------------------------------------------------------------------------

const HERO_DECO_ROWS: Array<{
  stringHeight: string;
  stringColor: string;
  dots: Array<{ left: string; root?: boolean }>;
}> = [
  {
    stringHeight: "1.5px",
    stringColor: "var(--border)",
    dots: [{ left: "8%" }, { left: "22%" }, { left: "38%" }, { left: "55%" }, { left: "72%" }, { left: "89%" }],
  },
  {
    stringHeight: "1px",
    stringColor: "var(--border)",
    dots: [{ left: "5%" }, { left: "15%", root: true }, { left: "31%" }, { left: "47%" }, { left: "62%" }, { left: "80%" }],
  },
  {
    stringHeight: "1px",
    stringColor: "var(--border)",
    dots: [{ left: "12%" }, { left: "28%" }, { left: "44%", root: true }, { left: "60%" }, { left: "76%" }],
  },
  {
    stringHeight: "1.5px",
    stringColor: AMBER,
    dots: [{ left: "3%" }, { left: "19%" }, { left: "35%" }, { left: "52%", root: true }, { left: "68%" }, { left: "85%" }],
  },
  {
    stringHeight: "2px",
    stringColor: "var(--border)",
    dots: [{ left: "9%" }, { left: "25%" }, { left: "41%" }, { left: "57%", root: true }, { left: "74%" }, { left: "91%" }],
  },
  {
    stringHeight: "2px",
    stringColor: "var(--border)",
    dots: [{ left: "6%", root: true }, { left: "22%" }, { left: "38%" }, { left: "54%" }, { left: "70%" }, { left: "87%" }],
  },
];

const TOOL_CATEGORIES: Array<{
  label: string;
  tools: Array<{ to: string; title: string; body: string }>;
}> = [
  {
    label: "Scales",
    tools: [
      {
        to: "/shape-explorer",
        title: "Shape Explorer",
        body: "Focus on one shape at a time or see all shapes in an overview grid. Pick your key and system — fret numbers reflect the real neck.",
      },
      {
        to: "/scale-positions",
        title: "Systems",
        body: "See the full neck at once — all 7 positions across 3nps, CAGED, and symmetric systems, paired side by side or merged into a unified view. In any key.",
      },
    ],
  },
  {
    label: "Pentatonic",
    tools: [
      {
        to: "/pentatonic-triads",
        title: "Pentatonic Triads",
        body: "Triad intervals (root, 3rd, 5th) mapped across all 5 pentatonic boxes — see how they connect across position boundaries.",
      },
      {
        to: "/interval-shapes",
        title: "Interval Shapes",
        body: "The recurring two-string shapes that make up every pentatonic position. Diagram and flashcard modes for major and minor.",
      },
    ],
  },
  {
    label: "Harmony",
    tools: [
      {
        to: "/chord-voicings",
        title: "Chord Voicings",
        body: "All 5 CAGED chord shapes for major, minor, and seventh chord types — root, 3rd, 5th, and 7th color-coded across every voicing.",
      },
      {
        to: "/arpeggio-maps",
        title: "Arpeggio Maps",
        body: "Chord-tone positions for the 5 CAGED shapes — see exactly where root, 3rd, 5th, and 7th land for major, minor, and seventh arpeggios.",
      },
    ],
  },
  {
    label: "Vocabulary",
    tools: [
      {
        to: "/lick-stash",
        title: "Lick Stash",
        body: "Curated lick packs organized by style and technique. Learn, loop, and internalize real vocabulary you can use on stage.",
      },
    ],
  },
];

const COMING_SOON_TOOLS = [
  {
    title: "Fretboard Fluency",
    body: "A structured course for internalizing the neck from the ground up — notes, intervals, and positions as a single connected map.",
  },
  {
    title: "Ear Training",
    body: "Interval recognition and melodic dictation exercises calibrated to your current level.",
  },
];

function HomePage({ isDark, toggleDark }: { isDark: boolean; toggleDark: () => void }) {
  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  return (
    <div
      className="min-h-screen flex flex-col font-mono bg-[var(--bg)] text-[var(--text)]"
      style={{ ...theme, "--amber": AMBER } as React.CSSProperties}
    >
      <Nav isDark={isDark} toggleDark={toggleDark} />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Decorative fretboard — full width background */}
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none select-none"
          style={{ opacity: isDark ? 0.12 : 0.08 }}
          aria-hidden="true"
        >
          {HERO_DECO_ROWS.map((row, i) => (
            <div key={i} className="h-[26px] flex items-center relative">
              <div
                className="absolute inset-x-0 top-1/2 -translate-y-1/2"
                style={{ height: row.stringHeight, backgroundColor: row.stringColor }}
              />
              <div
                className="flex-1 h-full relative"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(to right, transparent 0px, transparent 7.69%, var(--border) 7.69%, var(--border) calc(7.69% + 1px))",
                }}
              >
                {row.dots.map((dot, j) => (
                  <div
                    key={j}
                    className="w-[16px] h-[16px] rounded-full absolute top-1/2 -translate-y-1/2 z-[2]"
                    style={{
                      left: dot.left,
                      backgroundColor: dot.root ? "var(--accent)" : "var(--text)",
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Hero content */}
        <div className="relative z-[1] max-w-[900px] mx-auto w-full px-8 pt-20 pb-24">
          <p
            className="text-[0.58rem] tracking-[0.24em] uppercase mb-7"
            style={{ color: AMBER }}
          >
            Guitar Learning Platform
          </p>

          <h1 className="font-display font-semibold uppercase leading-[0.9] mb-10">
            <span
              className="block text-[clamp(4rem,11vw,8.5rem)] tracking-[0.02em]"
            >
              Know
            </span>
            <span
              className="block text-[clamp(4rem,11vw,8.5rem)] tracking-[0.02em]"
              style={{ color: "var(--accent)" }}
            >
              Every
            </span>
            <span
              className="block text-[clamp(4rem,11vw,8.5rem)] tracking-[0.02em]"
            >
              Note.
            </span>
          </h1>

          {/* Rule */}
          <div className="flex items-center mb-8 max-w-[460px]">
            <div className="h-[2px] w-10 bg-[var(--accent)]" />
            <div className="h-[2px] flex-1 bg-[var(--border)] ml-2" />
          </div>

          <p className="text-[0.8rem] leading-[1.95] text-[var(--muted)] mb-10 max-w-[480px]">
            A focused platform for guitarists who want real fretboard command —
            not just shapes to memorize, but a complete understanding of how scales,
            positions, and vocabulary connect across the entire neck.
          </p>

          <div className="flex items-center flex-wrap gap-3">
            <Link
              to="/scale-positions"
              className="font-display text-[0.72rem] tracking-[0.1em] uppercase border border-[var(--text)] bg-[var(--text)] text-[var(--bg)] px-5 py-[0.6rem] no-underline hover:opacity-80 transition-opacity"
            >
              Explore Systems
            </Link>
            <Link
              to="/lick-stash"
              className="font-display text-[0.72rem] tracking-[0.1em] uppercase border border-[var(--border)] text-[var(--text)] px-5 py-[0.6rem] no-underline hover:border-[var(--text)] transition-colors"
            >
              Browse Lick Stash
            </Link>
          </div>
        </div>
      </section>

      {/* Thick accent bar — mimics a nut/fret marker */}
      <div className="w-full h-[3px] bg-[var(--border)]">
        <div className="h-full w-[3px] bg-[var(--accent)]" />
      </div>

      {/* ── Tools ── */}
      <section className="max-w-[900px] mx-auto w-full px-8 pt-16 pb-4 flex flex-col gap-10">
        {TOOL_CATEGORIES.map((cat) => (
          <div key={cat.label}>
            {/* Category header */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[0.52rem] tracking-[0.22em] uppercase text-[var(--muted)] shrink-0">
                {cat.label}
              </span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>

            {/* Tool cards */}
            <div className={[
              "border border-[var(--border)]",
              cat.tools.length === 1 ? "" : "grid grid-cols-2 max-[600px]:grid-cols-1",
            ].join(" ")}>
              {cat.tools.map((tool, i) => {
                const isLeft = i % 2 === 0;
                const hasRight = i + 1 < cat.tools.length;
                const isLast = i === cat.tools.length - 1;
                return (
                  <Link
                    key={tool.to}
                    to={tool.to}
                    className={[
                      "no-underline text-[var(--text)] p-7 hover:bg-[var(--surface)] transition-colors group block",
                      isLeft && hasRight ? "border-r border-[var(--border)] max-[600px]:border-r-0 max-[600px]:border-b max-[600px]:border-[var(--border)]" : "",
                      !isLast && cat.tools.length > 2 ? "border-b border-[var(--border)]" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between mb-6">
                      <span
                        className="text-[0.48rem] tracking-[0.12em] uppercase"
                        style={{ color: "var(--accent)" }}
                      >
                        Live
                      </span>
                      <span className="text-[0.9rem] text-[var(--faint)] group-hover:text-[var(--muted)] transition-colors leading-none">
                        →
                      </span>
                    </div>
                    <h2 className="font-display text-[1.05rem] tracking-[0.06em] uppercase leading-tight mb-3">
                      {tool.title}
                    </h2>
                    <p className="text-[0.67rem] leading-[1.75] text-[var(--muted)]">
                      {tool.body}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* ── Coming Soon ── */}
      <section className="max-w-[900px] mx-auto w-full px-8 pt-4 pb-20">
        <div className="border border-t-0 border-[var(--border)]">
          <div
            className="px-5 py-3 border-b border-[var(--border)]"
            style={{ backgroundColor: "var(--surface)" }}
          >
            <p
              className="text-[0.48rem] tracking-[0.16em] uppercase"
              style={{ color: AMBER }}
            >
              In Development
            </p>
          </div>

          <div className="divide-y divide-[var(--border)] opacity-50">
            {COMING_SOON_TOOLS.map((item) => (
              <div key={item.title} className="px-7 py-5 flex items-baseline gap-5">
                <div
                  className="shrink-0 w-1.5 h-1.5 rounded-full mt-[0.3rem]"
                  style={{ backgroundColor: "var(--border)" }}
                />
                <div>
                  <p className="font-display text-[0.82rem] tracking-[0.06em] uppercase mb-1">
                    {item.title}
                  </p>
                  <p className="text-[0.65rem] leading-[1.65] text-[var(--muted)]">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--border)] px-8 py-5 flex justify-between items-center flex-wrap gap-2">
        <span className="text-[0.55rem] text-[var(--faint)] tracking-[0.1em] uppercase">
          © Shred Dojo
        </span>
        <div className="flex items-center gap-4">
          <Link
            to="/scale-positions"
            className="text-[0.55rem] text-[var(--accent)] tracking-[0.1em] uppercase no-underline border-b border-[var(--accent)] pb-px hover:opacity-80 transition-opacity"
          >
            Systems →
          </Link>
          <Link
            to="/lick-stash"
            className="text-[0.55rem] text-[var(--accent)] tracking-[0.1em] uppercase no-underline border-b border-[var(--accent)] pb-px hover:opacity-80 transition-opacity"
          >
            Lick Stash →
          </Link>
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Route default export
// ---------------------------------------------------------------------------

export default function Home() {
  const { preview } = useLoaderData<typeof loader>();

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("shred-dojo-dark");
    if (stored === "true") setIsDark(true);
  }, []);

  const toggleDark = () => {
    setIsDark((prev) => {
      localStorage.setItem("shred-dojo-dark", String(!prev));
      return !prev;
    });
  };

  if (preview) {
    return <HomePage isDark={isDark} toggleDark={toggleDark} />;
  }

  return <ComingSoonPage />;
}
