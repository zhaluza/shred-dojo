import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/home";
import { Logo } from "~/components/Logo";
import { LIGHT_THEME, DARK_THEME } from "~/components/scalePositions.theme";
import { useState, useEffect } from "react";

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

const DECO_ROWS: Array<{
  stringHeight: string;
  stringColor: string;
  dots: Array<{ left: number; root?: boolean }>;
}> = [
  {
    stringHeight: "1.5px",
    stringColor: "var(--border)",
    dots: [{ left: 180 }, { left: 300 }, { left: 360 }],
  },
  {
    stringHeight: "1px",
    stringColor: "var(--border)",
    dots: [{ left: 60 }, { left: 240 }, { left: 300, root: true }],
  },
  {
    stringHeight: "1px",
    stringColor: "var(--border)",
    dots: [{ left: 0 }, { left: 120 }, { left: 180 }],
  },
  {
    stringHeight: "1.5px",
    stringColor: "var(--border)",
    dots: [{ left: 0 }, { left: 120 }, { left: 240 }],
  },
  {
    stringHeight: "2px",
    stringColor: AMBER,
    dots: [{ left: 60 }, { left: 180, root: true }, { left: 300 }],
  },
  {
    stringHeight: "2px",
    stringColor: "var(--border)",
    dots: [{ left: 0, root: true }, { left: 120 }, { left: 180 }],
  },
];

const FEATURES: Array<{ label: string; live?: boolean; title: string; body: string }> = [
  {
    label: "Live",
    live: true,
    title: "Scale Position System",
    body: "All 7 diatonic positions across major and minor — 3nps, CAGED, and symmetric systems mapped side by side so you can see exactly how they relate on the neck.",
  },
  {
    label: "Soon",
    title: "Fretboard Fluency",
    body: "A structured course for internalizing the neck from the ground up. Notes, intervals, and positions as a single connected map — not isolated shapes.",
  },
  {
    label: "Live",
    live: true,
    title: "Lick Stash",
    body: "Curated lick packs organized by style and technique. Learn, loop, and internalize real vocabulary you can use on stage.",
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

        {/* Decorative fretboard */}
        <div className="mb-12 opacity-35 pointer-events-none select-none" aria-hidden="true">
          {DECO_ROWS.map((row, i) => (
            <div key={i} className="h-[18px] flex items-center relative">
              <div
                className="absolute inset-x-0 top-1/2 -translate-y-1/2"
                style={{ height: row.stringHeight, backgroundColor: row.stringColor }}
              />
              <div
                className="flex-1 h-full relative"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(to right, transparent 0px, transparent 59px, var(--border) 59px, var(--border) 60px)",
                }}
              >
                {row.dots.map((dot, j) => (
                  <div
                    key={j}
                    className="w-[13px] h-[13px] rounded-full absolute top-1/2 -translate-y-1/2 z-[2]"
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
                style={{ color: f.live ? "var(--accent)" : AMBER }}
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

      <footer className="relative z-[1] border-t border-[var(--border)] px-8 py-5 flex justify-between items-center flex-wrap gap-2">
        <span className="text-[0.55rem] text-[var(--faint)] tracking-[0.1em] uppercase">
          © Shred Dojo
        </span>
        <div className="flex items-center gap-4">
          <Link
            to="/scale-positions"
            className="text-[0.55rem] text-[var(--accent)] tracking-[0.1em] uppercase no-underline border-b border-[var(--accent)] pb-px hover:opacity-80 transition-opacity"
          >
            Scale Positions →
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

const TOOLS: Array<{
  label: string;
  live: boolean;
  to: string;
  title: string;
  body: string;
  tag: string;
}> = [
  {
    label: "Live",
    live: true,
    to: "/scale-positions",
    title: "Scale Positions",
    tag: "Theory",
    body: "All 7 diatonic positions across major and minor — 3nps, CAGED, and symmetric systems mapped side by side.",
  },
  {
    label: "Live",
    live: true,
    to: "/lick-stash",
    title: "Lick Stash",
    tag: "Vocabulary",
    body: "Curated lick packs organized by style and technique. Learn, loop, and internalize real vocabulary for the stage.",
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
      {/* ── Header ── */}
      <header className="px-8 pt-7 pb-5 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-7">
          <Logo pickWidth={26} />
          <nav className="flex items-center gap-5">
            <Link
              to="/scale-positions"
              className="font-display text-[0.65rem] tracking-[0.1em] uppercase text-[var(--muted)] no-underline hover:text-[var(--text)] transition-colors"
            >
              Scales
            </Link>
            <Link
              to="/lick-stash"
              className="font-display text-[0.65rem] tracking-[0.1em] uppercase text-[var(--muted)] no-underline hover:text-[var(--text)] transition-colors"
            >
              Lick Stash
            </Link>
          </nav>
        </div>
        <button
          onClick={toggleDark}
          className="font-display text-[0.6rem] tracking-[0.12em] uppercase border border-[var(--border)] text-[var(--muted)] bg-transparent px-3 py-[0.35rem] hover:border-[var(--text)] hover:text-[var(--text)] transition-colors cursor-pointer"
        >
          {isDark ? "Light" : "Dark"}
        </button>
      </header>

      <div className="w-full h-px bg-[var(--border)]" />

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
              Explore Scales
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
      <section className="max-w-[900px] mx-auto w-full px-8 pt-16 pb-4">
        <p className="text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)] mb-6">
          Available Now
        </p>

        <div className="grid grid-cols-2 max-[600px]:grid-cols-1 border border-[var(--border)]">
          {TOOLS.map((tool, i) => (
            <Link
              key={tool.to}
              to={tool.to}
              className={[
                "no-underline text-[var(--text)] p-7 hover:bg-[var(--surface)] transition-colors group",
                i === 0 ? "border-r border-[var(--border)] max-[600px]:border-r-0 max-[600px]:border-b" : "",
              ].join(" ")}
            >
              {/* Card top row */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <span
                    className="text-[0.48rem] tracking-[0.12em] uppercase block mb-1"
                    style={{ color: "var(--accent)" }}
                  >
                    {tool.label}
                  </span>
                  <span
                    className="text-[0.48rem] tracking-[0.12em] uppercase"
                    style={{ color: AMBER }}
                  >
                    {tool.tag}
                  </span>
                </div>
                <span className="text-[0.9rem] text-[var(--faint)] group-hover:text-[var(--muted)] transition-colors leading-none">
                  →
                </span>
              </div>

              {/* Card title */}
              <h2 className="font-display text-[1.05rem] tracking-[0.06em] uppercase leading-tight mb-3">
                {tool.title}
              </h2>

              {/* Card body */}
              <p className="text-[0.67rem] leading-[1.75] text-[var(--muted)]">
                {tool.body}
              </p>
            </Link>
          ))}
        </div>
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
            Scale Positions →
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
