import { Link } from "react-router";
import type { Route } from "./+types/home";
import { Logo } from "~/components/Logo";
import { LIGHT_THEME } from "~/components/scalePositions.theme";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Shred Dojo — Coming Soon" },
    {
      name: "description",
      content:
        "A focused platform for guitarists who want real fretboard command.",
    },
  ];
}

const AMBER = "#c8a060";

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

export default function Home() {
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
              {/* String line — replaces ::after pseudo-element */}
              <div
                className="absolute inset-x-0 top-1/2 -translate-y-1/2"
                style={{ height: row.stringHeight, backgroundColor: row.stringColor }}
              />
              {/* Frets + dots */}
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

        {/* TODO: wire up email signup (needs backend/service — Resend, ConvertKit, etc.) */}
        {/* <p className="text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)] mb-[0.65rem]">
          Get notified when we launch
        </p>
        <div className="flex max-w-[420px]">
          <input
            type="email"
            placeholder="your@email.com"
            className="flex-1 bg-transparent border border-[var(--border)] border-r-0 text-[var(--text)] font-mono text-[0.72rem] px-[0.85rem] py-[0.55rem] outline-none placeholder-[var(--faint)] focus:border-[var(--text)] transition-colors"
          />
          <button className="bg-[var(--text)] border border-[var(--text)] text-[var(--bg)] font-display text-[0.72rem] tracking-[0.1em] uppercase px-[1.1rem] py-[0.55rem] cursor-pointer whitespace-nowrap hover:opacity-80 transition-opacity">
            Notify me
          </button>
        </div>
        <p className="mt-[0.65rem] text-[0.55rem] text-[var(--faint)] tracking-[0.06em]">
          No spam. One email when we&apos;re ready.
        </p> */}
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
