import { Link, useParams } from "react-router";
import type { Route } from "./+types/lick-stash-pack";
import { Logo } from "~/components/Logo";
import { LIGHT_THEME, DARK_THEME } from "~/components/scalePositions.theme";
import { LICK_PACKS } from "~/components/lickStash.data";
import type { Lick } from "~/components/lickStash.types";
import { useState, useEffect, useCallback } from "react";

export function meta({ params }: Route.MetaArgs) {
  const pack = LICK_PACKS.find((p) => p.slug === params.packSlug);
  const title = pack ? `${pack.title} — Lick Stash` : "Lick Pack";
  return [
    { title: `${title} — Shred Dojo` },
    {
      name: "description",
      content: pack?.description ?? "Guitar lick pack",
    },
  ];
}

function ClientOnlyPlayer({
  file,
  loop,
  onToggleLoop,
}: {
  file: string;
  loop: boolean;
  onToggleLoop: () => void;
}) {
  const [Player, setPlayer] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    import("~/components/AlphaTabPlayer").then((mod) => {
      setPlayer(() => mod.AlphaTabPlayer);
    });
  }, []);

  if (!Player) {
    return (
      <div
        className="border border-[var(--border)] flex items-center justify-center"
        style={{ minHeight: 160 }}
      >
        <span className="text-[0.6rem] tracking-[0.1em] uppercase text-[var(--muted)]">
          Loading player...
        </span>
      </div>
    );
  }

  return <Player file={file} loop={loop} onToggleLoop={onToggleLoop} />;
}

function LickCard({
  lick,
  isOpen,
  onToggle,
}: {
  lick: Lick;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [loop, setLoop] = useState(true);
  const toggleLoop = useCallback(() => setLoop((prev) => !prev), []);

  return (
    <div className="border-b border-[var(--border)]">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 py-4 px-0 bg-transparent text-left cursor-pointer hover:bg-[var(--surface)] transition-colors"
        style={{ border: "none" }}
      >
        <span className="shrink-0 w-8 text-right font-display text-[0.65rem] tracking-[0.08em] text-[var(--muted)]">
          {lick.id.split("-").pop()}
        </span>
        <div className="flex-1 min-w-0">
          <span className="font-display text-[0.82rem] tracking-[0.06em] uppercase text-[var(--text)]">
            {lick.title}
          </span>
        </div>
        <span
          className="shrink-0 font-display text-[0.65rem] tracking-[0.08em] uppercase transition-colors"
          style={{ color: isOpen ? "var(--accent)" : "var(--muted)" }}
        >
          {isOpen ? "Close" : "Open"}
        </span>
      </button>

      {isOpen && (
        <div className="pb-5 pl-12 pr-2">
          <p className="text-[0.68rem] leading-[1.6] text-[var(--muted)] mb-4">
            {lick.description}
          </p>
          <ClientOnlyPlayer
            file={lick.file}
            loop={loop}
            onToggleLoop={toggleLoop}
          />
        </div>
      )}
    </div>
  );
}

export default function LickStashPack() {
  const { packSlug } = useParams();
  const pack = LICK_PACKS.find((p) => p.slug === packSlug);

  const [isDark, setIsDark] = useState(false);
  const [openLickId, setOpenLickId] = useState<string | null>(null);

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

  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  if (!pack || !pack.available) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center font-mono bg-[var(--bg)] text-[var(--text)]"
        style={theme}
      >
        <p className="font-display text-[1.2rem] tracking-[0.08em] uppercase mb-4">
          Pack not found
        </p>
        <Link
          to="/lick-stash"
          className="text-[0.65rem] text-[var(--accent)] tracking-[0.1em] uppercase no-underline border-b border-[var(--accent)] pb-px"
        >
          &larr; Back to Lick Stash
        </Link>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col font-mono bg-[var(--bg)] text-[var(--text)]"
      style={theme}
    >
      {/* Header */}
      <header className="px-8 pt-8 pb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="no-underline">
            <Logo pickWidth={28} />
          </Link>
          <nav className="flex items-center gap-4">
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
          className="font-display text-[0.6rem] tracking-[0.12em] uppercase border border-[var(--border)] text-[var(--muted)] bg-transparent px-3 py-1 hover:border-[var(--text)] hover:text-[var(--text)] transition-colors cursor-pointer"
        >
          {isDark ? "Light" : "Dark"}
        </button>
      </header>

      {/* Divider */}
      <div className="w-full h-px bg-[var(--border)]" />

      <main className="flex-1 max-w-[760px] mx-auto w-full px-8 pt-10 pb-16">
        {/* Breadcrumb */}
        <Link
          to="/lick-stash"
          className="text-[0.55rem] tracking-[0.1em] uppercase text-[var(--muted)] no-underline hover:text-[var(--text)] transition-colors mb-6 inline-block"
        >
          &larr; All Packs
        </Link>

        {/* Pack header */}
        <div className="mb-8">
          <span className="text-[0.5rem] tracking-[0.12em] uppercase text-[var(--accent)] block mb-1">
            {pack.subtitle}
          </span>
          <h1 className="font-display font-semibold text-[clamp(1.6rem,3.5vw,2.4rem)] tracking-[0.04em] uppercase leading-none mb-3">
            {pack.title}
          </h1>
          <p className="text-[0.72rem] leading-[1.7] text-[var(--muted)] max-w-[520px]">
            {pack.description}
          </p>
        </div>

        {/* Accent bar */}
        <div
          className="w-full h-[3px] mb-0"
          style={{ backgroundColor: "var(--accent)" }}
        />

        {/* Lick list */}
        <div className="border-t border-[var(--border)]">
          {pack.licks.map((lick) => (
            <LickCard
              key={lick.id}
              lick={lick}
              isOpen={openLickId === lick.id}
              onToggle={() =>
                setOpenLickId((prev) =>
                  prev === lick.id ? null : lick.id
                )
              }
            />
          ))}
        </div>
      </main>

      <footer className="border-t border-[var(--border)] px-8 py-5 flex justify-between items-center flex-wrap gap-2">
        <span className="text-[0.55rem] text-[var(--faint)] tracking-[0.1em] uppercase">
          &copy; Shred Dojo
        </span>
        <Link
          to="/lick-stash"
          className="text-[0.55rem] text-[var(--accent)] tracking-[0.1em] uppercase no-underline border-b border-[var(--accent)] pb-px hover:opacity-80 transition-opacity"
        >
          &larr; All Packs
        </Link>
      </footer>
    </div>
  );
}
