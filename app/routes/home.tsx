import { Link, useLoaderData } from "react-router";
import { useState, useEffect } from "react";
import type { Route } from "./+types/home";
import { LIGHT_THEME, DARK_THEME } from "~/components/theme";
import { Nav } from "~/components/Nav";
import { useDarkMode } from "~/components/useDarkMode";

const DESCRIPTION =
  "Interactive fretboard tools for guitarists who want real scale command — scales, arpeggios, chord voicings, and note quizzes.";

export function meta({ data }: Route.MetaArgs) {
  const siteUrl = data?.siteUrl ?? "";
  return [
    { title: "Shred Dojo" },
    { name: "description", content: DESCRIPTION },
    { property: "og:title", content: "Shred Dojo" },
    { property: "og:description", content: DESCRIPTION },
    { property: "og:url", content: siteUrl },
    { property: "og:image", content: `${siteUrl}/og-image.png` },
    { name: "twitter:title", content: "Shred Dojo" },
    { name: "twitter:description", content: DESCRIPTION },
    { name: "twitter:image", content: `${siteUrl}/og-image.png` },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  return {
    preview: url.searchParams.get("preview") === "true",
    siteUrl: `${url.protocol}//${url.host}`,
  };
}

// ---------------------------------------------------------------------------
// Information architecture — mirrors Nav (Scales / Pentatonic / Harmony /
// Train / Drills). Each tool is a callout on the drawing.
// ---------------------------------------------------------------------------

type Tool = { to: string; title: string; body: string; featured?: true };
type Category = { label: string; tag: string; tools: Tool[] };

const TOOL_CATEGORIES: Category[] = [
  {
    label: "Scales",
    tag: "Reference",
    tools: [
      { to: "/shape-explorer", title: "Shape Explorer", body: "Focus on one shape or see them all in an overview grid. Pick a key and system — fret numbers reflect the real neck." },
      { to: "/scale-positions", title: "Systems", body: "The whole neck at once: all 7 positions across 3nps, CAGED, and symmetric systems, paired or merged into one view." },
      { to: "/wylde-scales", title: "Wylde", body: "Zakk Wylde's three-notes-per-string approach — each modal position paired with its pentatonic box." },
      { to: "/yngwie-scales", title: "Yngwie", body: "Two harmonic-minor shapes built around the raised 7th, for neoclassical runs." },
      { to: "/scale-builder", title: "Scale Builder", body: "Five scale formulas in any key — names or notation, with reference and exercise modes." },
    ],
  },
  {
    label: "Pentatonic",
    tag: "Reference",
    tools: [
      { to: "/pentatonic-triads", title: "Pentatonic Triads", body: "Triad intervals (root, 3rd, 5th) mapped across all 5 boxes — see how they connect over position boundaries." },
      { to: "/pentatonic-colors", title: "Pentatonic Colors", body: "Box 1 of the minor or major pentatonic, layered with color notes from Aeolian, Dorian, Phrygian, Lydian, and more." },
      { to: "/interval-shapes", title: "Interval Shapes", body: "The recurring two-string shapes inside every pentatonic position. Diagram and flashcard modes, major and minor." },
    ],
  },
  {
    label: "Harmony",
    tag: "Reference",
    tools: [
      { to: "/chord-voicings", title: "Chord Voicings", body: "All 5 CAGED shapes for major, minor, and seventh chords — root, 3rd, 5th, and 7th color-coded across every voicing." },
      { to: "/math-chords", title: "Math Chords", body: "An extended-voicing lab for math rock: movable maj7, m7, dom7, m7♭5 and nine-chords in any key, plus a progression builder you can hear." },
      { to: "/arpeggio-maps", title: "Arpeggio Maps", body: "Chord-tone positions for the 5 CAGED shapes — exactly where root, 3rd, 5th, and 7th land for each arpeggio." },
      { to: "/circle-of-fifths", title: "Circle of Fifths", body: "An interactive circle with diatonic chords for any key you land on." },
    ],
  },
  {
    label: "Train",
    tag: "Metered practice",
    tools: [
      { to: "/morning-coffee", title: "Morning Coffee", body: "Your daily routine: major scales, triads, pentatonics, and broken intervals across all 12 keys. Based on Alex Rockwell's method. Do it every day.", featured: true },
      { to: "/pentatonic-practice", title: "Pentatonic Practice", body: "A six-step routine for total pentatonic command — memorize, place, transpose, connect, then improvise. With metronome, timer, and key drone." },
      { to: "/caged-immersion", title: "CAGED Immersion", body: "Guthrie Trapp's CAGED / 1-4-5 method in two modules: the core concepts and seven transposable exercises. Pick a key, turn on the drone, and play." },
      { to: "/writing-scales", title: "Writing with Scales", body: "An interactive lesson on writing with scales: see the neck as octave chunks, find any root, target chord tones, and bend major into Lydian. Pick a key — every diagram follows it." },
      { to: "/metronome", title: "Metronome", body: "A standalone practice station: a big beat-dial metronome with tap tempo, a tempo trainer that ramps for you, a timer, and a key drone." },
      { to: "/lick-stash", title: "Lick Stash", body: "Curated lick packs by style and technique. Learn, loop, and internalize real vocabulary you can use on stage." },
      { to: "/practice-log", title: "Practice Log", body: "A running history of your practice, filled in automatically as the timer runs. Time per day, per tool, per section." },
    ],
  },
  {
    label: "Drills",
    tag: "Active recall",
    tools: [
      { to: "/note-recognition", title: "Note Recognition", body: "Name the highlighted fretboard note. Build instant recall across any string, fret range, and note type." },
      { to: "/staff-notes", title: "Staff Notes", body: "Read treble-clef notes on the staff, from C4 to B5 across naturals and accidentals." },
      { to: "/chord-tones", title: "Chord Tones", body: "Name the degree of each highlighted note in a scale shape — pentatonic boxes, blues, and diatonic positions." },
    ],
  },
];

const COMING_SOON_TOOLS = [
  { title: "Fretboard Fluency", body: "A structured course for internalizing the neck from the ground up — notes, intervals, and positions as one connected map." },
  { title: "Ear Training", body: "Interval recognition and melodic dictation, calibrated to your current level." },
];

// ---------------------------------------------------------------------------
// Neck blueprint — the signature. A measured drawing of the neck with
// logarithmically-spaced frets and inlay positions labeled (3·5·7·9·12).
// ---------------------------------------------------------------------------

const NUT_X = 46;
const END_X = 968;
const SCALE_LEN = 2 * (END_X - NUT_X); // so fret 12 lands at END_X
const fretX = (n: number) => NUT_X + SCALE_LEN * (1 - Math.pow(2, -n / 12));
const STRING_Y = [34, 52, 70, 88, 106, 124]; // high e → low E (top → bottom)
const STRING_W = [0.6, 0.8, 1, 1.3, 1.6, 2];
const INLAYS = [3, 5, 7, 9]; // single-dot positions
const inlayMid = (n: number) => (fretX(n - 1) + fretX(n)) / 2;
const DIM_Y = 152;

function NeckBlueprint({ shown, reduced }: { shown: boolean; reduced: boolean }) {
  const ease = reduced ? "none" : "opacity 700ms ease, transform 700ms ease";
  return (
    <svg
      viewBox="0 0 1000 188"
      width="100%"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <g
        style={{
          opacity: shown ? 1 : 0,
          transform: shown ? "translateY(0)" : "translateY(10px)",
          transition: ease,
        }}
      >
        {/* nut */}
        <line x1={NUT_X} y1={28} x2={NUT_X} y2={130} stroke="var(--muted)" strokeWidth={3} />
        {/* frets */}
        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
          <line key={n} x1={fretX(n)} y1={28} x2={fretX(n)} y2={130} stroke="var(--fret-bar)" strokeWidth={1} />
        ))}
        {/* strings */}
        {STRING_Y.map((y, s) => (
          <line key={s} x1={NUT_X} y1={y} x2={END_X} y2={y} stroke="var(--border)" strokeWidth={STRING_W[s]} />
        ))}
        {/* single inlays — fret 5 is the cyan "you are here" */}
        {INLAYS.map((n, i) => (
          <circle
            key={n}
            cx={inlayMid(n)}
            cy={79}
            r={5.5}
            fill={n === 5 ? "var(--accent)" : "var(--muted)"}
            style={{
              opacity: shown ? (n === 5 ? 1 : 0.55) : 0,
              transform: shown ? "scale(1)" : "scale(0)",
              transformBox: "fill-box",
              transformOrigin: "center",
              transition: reduced ? "none" : `opacity 300ms ease ${220 + i * 80}ms, transform 320ms cubic-bezier(.34,1.56,.64,1) ${220 + i * 80}ms`,
            }}
          />
        ))}
        {/* 12th-fret double inlay */}
        {[52, 106].map((cy, i) => (
          <circle
            key={cy}
            cx={inlayMid(12)}
            cy={cy}
            r={5.5}
            fill="var(--muted)"
            style={{
              opacity: shown ? 0.55 : 0,
              transform: shown ? "scale(1)" : "scale(0)",
              transformBox: "fill-box",
              transformOrigin: "center",
              transition: reduced ? "none" : `opacity 300ms ease ${540 + i * 80}ms, transform 320ms cubic-bezier(.34,1.56,.64,1) ${540 + i * 80}ms`,
            }}
          />
        ))}
        {/* dimension line + fret-number callouts */}
        <line x1={NUT_X} y1={DIM_Y} x2={fretX(12)} y2={DIM_Y} stroke="var(--border)" strokeWidth={1} />
        {[3, 5, 7, 9, 12].map((n) => (
          <g key={n}>
            <line x1={inlayMid(n)} y1={DIM_Y - 4} x2={inlayMid(n)} y2={DIM_Y + 4} stroke="var(--border)" strokeWidth={1} />
            <text
              x={inlayMid(n)}
              y={DIM_Y + 18}
              textAnchor="middle"
              fontFamily="'IBM Plex Mono', monospace"
              fontSize={11}
              fill={n === 5 ? "var(--accent)" : "var(--muted)"}
            >
              {n}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Home page
// ---------------------------------------------------------------------------

function useIntro() {
  const [shown, setShown] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    if (mq.matches) { setShown(true); return; }
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return { shown, reduced };
}

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
  const { shown, reduced } = useIntro();
  const introStyle = (delay: number) => ({
    opacity: shown ? 1 : 0,
    transform: shown ? "translateY(0)" : "translateY(8px)",
    transition: reduced ? "none" : `opacity 600ms ease ${delay}ms, transform 600ms ease ${delay}ms`,
  });

  return (
    <div
      className="min-h-screen flex flex-col font-mono bg-[var(--bg)] text-[var(--text)] transition-[background,color] duration-200"
      style={theme}
    >
      <Nav isDark={isDark} toggleDark={toggleDark} />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="relative z-[1] max-w-[1080px] mx-auto w-full px-5 md:px-8 pt-14 pb-10 md:pt-20 md:pb-14 [@media(max-height:500px)]:pt-5 [@media(max-height:500px)]:pb-4">
          <p
            className="font-mono text-[0.58rem] tracking-[0.28em] uppercase mb-6 [@media(max-height:500px)]:mb-3 flex items-center gap-2"
            style={{ color: "var(--accent)", ...introStyle(0) }}
          >
            <span className="inline-block w-4 h-px" style={{ backgroundColor: "var(--accent)" }} aria-hidden="true" />
            Fretboard atlas · electric guitar
          </p>

          <h1
            className="font-display font-semibold uppercase leading-[0.88] mb-7 [@media(max-height:500px)]:mb-3"
            style={introStyle(80)}
          >
            <span className="block text-[clamp(3.4rem,10vw,7.6rem)] [@media(max-height:500px)]:text-[clamp(2rem,7vh,3.2rem)] tracking-[0.01em]">
              Know
            </span>
            <span
              className="block text-[clamp(3.4rem,10vw,7.6rem)] [@media(max-height:500px)]:text-[clamp(2rem,7vh,3.2rem)] tracking-[0.01em]"
              style={{ color: "var(--accent)" }}
            >
              Every
            </span>
            <span className="block text-[clamp(3.4rem,10vw,7.6rem)] [@media(max-height:500px)]:text-[clamp(2rem,7vh,3.2rem)] tracking-[0.01em]">
              Note.
            </span>
          </h1>

          <p
            className="text-[0.8rem] leading-[1.9] text-[var(--muted)] mb-8 [@media(max-height:500px)]:hidden max-w-[460px]"
            style={introStyle(160)}
          >
            The whole neck as one connected map — scales, positions, and
            vocabulary in one place. Then metered routines and recall drills to
            make it second nature.
          </p>

          <div className="flex items-center flex-wrap gap-3" style={introStyle(240)}>
            <Link
              to="/scale-positions"
              className="font-display text-[0.72rem] tracking-[0.1em] uppercase border border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)] px-5 py-[0.6rem] no-underline hover:opacity-85 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
            >
              Explore Systems
            </Link>
            <Link
              to="/morning-coffee"
              className="font-display text-[0.72rem] tracking-[0.1em] uppercase border border-[var(--border)] text-[var(--text)] px-5 py-[0.6rem] no-underline hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
            >
              Daily Routine
            </Link>
          </div>
        </div>

        {/* Measured neck drawing */}
        <div
          className="max-w-[1080px] mx-auto w-full px-5 md:px-8 pb-6 [@media(max-height:500px)]:hidden"
          style={{ opacity: isDark ? 0.9 : 0.8 }}
        >
          <NeckBlueprint shown={shown} reduced={reduced} />
        </div>
      </section>

      {/* Nut/marker rule between hero and index */}
      <div className="w-full h-[2px] bg-[var(--border)]">
        <div className="h-full w-16 bg-[var(--accent)]" />
      </div>

      {/* ── Tool index ── */}
      <section className="max-w-[1080px] mx-auto w-full px-5 md:px-8 pt-14 pb-4 flex flex-col gap-9">
        {TOOL_CATEGORIES.map((cat) => (
          <div key={cat.label}>
            {/* Category callout */}
            <div className="flex items-center gap-3 mb-3">
              <span className="inline-block w-2.5 h-px shrink-0" style={{ backgroundColor: "var(--accent)" }} aria-hidden="true" />
              <span className="font-display text-[0.7rem] font-semibold tracking-[0.18em] uppercase shrink-0">
                {cat.label}
              </span>
              <span className="font-mono text-[0.5rem] tracking-[0.16em] uppercase shrink-0" style={{ color: "var(--muted)" }}>
                {cat.tag}
              </span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>

            {/* Callout cards — collapsed-border grid, featured spans full width */}
            <div className="grid grid-cols-2 max-[600px]:grid-cols-1">
              {cat.tools.map((tool) => {
                const isFeatured = !!tool.featured;
                const isLocked = tool.to === "/lick-stash" && !preview;
                const base =
                  "-mt-px -ml-px p-6 max-[700px]:p-5 border border-[var(--border)] flex flex-col relative " +
                  (isFeatured ? "col-span-2 max-[600px]:col-span-1 " : "");

                const Head = (
                  <div className="flex items-start justify-between mb-5">
                    <span
                      className="font-mono text-[0.5rem] tracking-[0.16em] uppercase"
                      style={{ color: isLocked ? "var(--muted)" : "var(--accent)" }}
                    >
                      {isLocked ? "Preview only" : isFeatured ? "Daily" : "Open"}
                    </span>
                    {!isLocked && (
                      <span className="text-[0.9rem] leading-none text-[var(--faint)] group-hover:text-[var(--accent)] group-hover:translate-x-1 transition-all duration-200">
                        →
                      </span>
                    )}
                  </div>
                );
                const Title = (
                  <h2 className={["font-display tracking-[0.05em] uppercase leading-tight mb-2", isFeatured ? "text-[1.15rem]" : "text-[1.02rem]"].join(" ")}>
                    {tool.title}
                  </h2>
                );
                const Body = <p className="text-[0.67rem] leading-[1.7] text-[var(--muted)]">{tool.body}</p>;

                if (isLocked) {
                  return (
                    <div key={tool.to} className={base + "opacity-40"} style={{ background: "var(--surface)" }}>
                      {Head}{Title}{Body}
                    </div>
                  );
                }
                return (
                  <Link
                    key={tool.to}
                    to={tool.to}
                    className={[
                      base,
                      "group no-underline text-[var(--text)] z-[1] hover:z-[2]",
                      "hover:bg-[var(--surface)] hover:border-[var(--accent)]",
                      isFeatured ? "shadow-[inset_3px_0_0_0_var(--accent)]" : "hover:shadow-[inset_3px_0_0_0_var(--accent)]",
                      "transition-all duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg)]",
                    ].join(" ")}
                  >
                    {Head}{Title}{Body}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* ── In development ── */}
      <section className="max-w-[1080px] mx-auto w-full px-5 md:px-8 pt-6 pb-20">
        <div className="border border-[var(--border)]">
          <div className="px-5 py-3 border-b border-[var(--border)] flex items-center gap-2" style={{ backgroundColor: "var(--surface)" }}>
            <span className="inline-block w-2.5 h-px" style={{ backgroundColor: "var(--muted)" }} aria-hidden="true" />
            <p className="font-mono text-[0.5rem] tracking-[0.18em] uppercase" style={{ color: "var(--muted)" }}>
              On the drawing board
            </p>
          </div>
          <div className="divide-y divide-[var(--border)] opacity-60">
            {COMING_SOON_TOOLS.map((item) => (
              <div key={item.title} className="px-6 py-5 flex items-baseline gap-4">
                <div className="shrink-0 w-1.5 h-1.5 mt-[0.35rem]" style={{ backgroundColor: "var(--border)" }} />
                <div>
                  <p className="font-display text-[0.82rem] tracking-[0.05em] uppercase mb-1">{item.title}</p>
                  <p className="text-[0.65rem] leading-[1.6] text-[var(--muted)]">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--border)] px-5 md:px-8 py-5 flex justify-between items-center flex-wrap gap-2">
        <span className="font-mono text-[0.6rem] text-[var(--faint)] tracking-[0.14em] uppercase">© Shred Dojo</span>
        <div className="flex items-center gap-5">
          <Link
            to="/scale-positions"
            className="text-[0.62rem] text-[var(--accent)] tracking-[0.1em] uppercase no-underline border-b border-[var(--accent)] pb-px hover:opacity-80 transition-opacity py-1"
          >
            Systems →
          </Link>
          <Link
            to="/metronome"
            className="text-[0.62rem] text-[var(--accent)] tracking-[0.1em] uppercase no-underline border-b border-[var(--accent)] pb-px hover:opacity-80 transition-opacity py-1"
          >
            Practice Station →
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
  const { isDark, toggleDark } = useDarkMode();
  return <HomePage isDark={isDark} toggleDark={toggleDark} preview={preview} />;
}
