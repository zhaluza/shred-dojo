import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/home";
import { LIGHT_THEME, DARK_THEME } from "~/components/scalePositions.theme";
import { Nav } from "~/components/Nav";
import { useState, useEffect } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Shred Dojo" },
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
// Home page
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
        to: "/pentatonic-colors",
        title: "Pentatonic Colors",
        body: "Take Box 1 of the minor or major pentatonic and add color notes from modes like Aeolian, Dorian, Phrygian, Lydian, and more.",
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
  {
    label: "Practice",
    tools: [
      {
        to: "/note-recognition",
        title: "Note Recognition",
        body: "Identify the highlighted fretboard note. Build instant recall across any string, fret range, and note type.",
      },
      {
        to: "/staff-notes",
        title: "Staff Notes",
        body: "Read treble clef notes on a music staff. Identify notes from C4 to B5 across naturals and accidentals.",
      },
      {
        to: "/chord-tones",
        title: "Chord Tones",
        body: "Identify the interval of each highlighted note within a scale shape. Works across pentatonic boxes, blues scale, and diatonic 3nps/CAGED positions.",
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

function HomePage({
  isDark,
  toggleDark,
  preview,
}: {
  isDark: boolean;
  toggleDark: () => void;
  preview: boolean;
}) {
  useEffect(() => {
    if (preview) localStorage.setItem("shred-dojo-preview", "true");
  }, [preview]);

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
          className="absolute inset-x-0 bottom-0 pointer-events-none select-none max-[600px]:hidden"
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
        <div className="relative z-[1] max-w-[900px] mx-auto w-full px-5 md:px-8 pt-12 pb-16 md:pt-20 md:pb-24 [@media(max-height:500px)]:pt-4 [@media(max-height:500px)]:pb-6">
          <p
            className="text-[0.58rem] tracking-[0.24em] uppercase mb-7 [@media(max-height:500px)]:mb-3"
            style={{ color: AMBER }}
          >
            Guitar Learning Platform
          </p>

          <h1 className="font-display font-semibold uppercase leading-[0.9] mb-10 [@media(max-height:500px)]:mb-4">
            <span
              className="block text-[clamp(4rem,11vw,8.5rem)] [@media(max-height:500px)]:text-[clamp(2rem,7vh,3.5rem)] tracking-[0.02em]"
            >
              Know
            </span>
            <span
              className="block text-[clamp(4rem,11vw,8.5rem)] [@media(max-height:500px)]:text-[clamp(2rem,7vh,3.5rem)] tracking-[0.02em]"
              style={{ color: "var(--accent)" }}
            >
              Every
            </span>
            <span
              className="block text-[clamp(4rem,11vw,8.5rem)] [@media(max-height:500px)]:text-[clamp(2rem,7vh,3.5rem)] tracking-[0.02em]"
            >
              Note.
            </span>
          </h1>

          {/* Rule */}
          <div className="flex items-center mb-8 [@media(max-height:500px)]:mb-3 max-w-[460px]">
            <div className="h-[2px] w-10 bg-[var(--accent)]" />
            <div className="h-[2px] flex-1 bg-[var(--border)] ml-2" />
          </div>

          <p className="text-[0.8rem] leading-[1.95] text-[var(--muted)] mb-10 [@media(max-height:500px)]:hidden max-w-[480px]">
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
            {preview && (
              <Link
                to="/lick-stash"
                className="font-display text-[0.72rem] tracking-[0.1em] uppercase border border-[var(--border)] text-[var(--text)] px-5 py-[0.6rem] no-underline hover:border-[var(--text)] transition-colors"
              >
                Browse Lick Stash
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Thick accent bar — mimics a nut/fret marker */}
      <div className="w-full h-[3px] bg-[var(--border)]">
        <div className="h-full w-[3px] bg-[var(--accent)]" />
      </div>

      {/* ── Tools ── */}
      <section className="max-w-[900px] mx-auto w-full px-5 md:px-8 pt-16 pb-4 flex flex-col gap-10">
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
                const isLocked = tool.to === "/lick-stash" && !preview;
                const sharedClass = [
                  "p-7 block",
                  isLeft && hasRight ? "border-r border-[var(--border)] max-[600px]:border-r-0 max-[600px]:border-b max-[600px]:border-[var(--border)]" : "",
                  !isLast && cat.tools.length > 2 ? "border-b border-[var(--border)]" : "",
                ].join(" ");
                return isLocked ? (
                  <div key={tool.to} className={sharedClass + " opacity-40 cursor-default"}>
                    <div className="flex items-start justify-between mb-6">
                      <span className="text-[0.48rem] tracking-[0.12em] uppercase" style={{ color: "var(--muted)" }}>
                        Preview only
                      </span>
                    </div>
                    <h2 className="font-display text-[1.05rem] tracking-[0.06em] uppercase leading-tight mb-3 text-[var(--text)]">
                      {tool.title}
                    </h2>
                    <p className="text-[0.67rem] leading-[1.75] text-[var(--muted)]">
                      {tool.body}
                    </p>
                  </div>
                ) : (
                  <Link
                    key={tool.to}
                    to={tool.to}
                    className={[
                      "no-underline text-[var(--text)] hover:bg-[var(--surface)] transition-colors group",
                      sharedClass,
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
      <section className="max-w-[900px] mx-auto w-full px-5 md:px-8 pt-4 pb-20">
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
      <footer className="border-t border-[var(--border)] px-5 md:px-8 py-5 flex justify-between items-center flex-wrap gap-2">
        <span className="text-[0.65rem] text-[var(--faint)] tracking-[0.1em] uppercase">
          © Shred Dojo
        </span>
        <div className="flex items-center gap-4">
          <Link
            to="/scale-positions"
            className="text-[0.65rem] text-[var(--accent)] tracking-[0.1em] uppercase no-underline border-b border-[var(--accent)] pb-px hover:opacity-80 transition-opacity py-1"
          >
            Systems →
          </Link>
          {preview && (
            <Link
              to="/lick-stash"
              className="text-[0.65rem] text-[var(--accent)] tracking-[0.1em] uppercase no-underline border-b border-[var(--accent)] pb-px hover:opacity-80 transition-opacity py-1"
            >
              Lick Stash →
            </Link>
          )}
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

  return <HomePage isDark={isDark} toggleDark={toggleDark} preview={preview} />;
}
