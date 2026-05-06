import { Link, useParams } from "react-router";
import type { Route } from "./+types/lick-stash-pack";
import { LIGHT_THEME, DARK_THEME } from "~/components/scalePositions.theme";
import { Nav } from "~/components/Nav";
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
        style={{ minHeight: 200, backgroundColor: "#fff" }}
      >
        <span className="font-display text-[0.58rem] tracking-[0.14em] uppercase text-[var(--muted)]">
          Loading player…
        </span>
      </div>
    );
  }

  return <Player file={file} loop={loop} onToggleLoop={onToggleLoop} />;
}

function LickRow({
  lick,
  index,
  isOpen,
  onToggle,
}: {
  lick: Lick;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [loop, setLoop] = useState(true);
  const toggleLoop = useCallback(() => setLoop((prev) => !prev), []);

  return (
    <div
      className="relative"
      style={{
        borderLeft: isOpen ? "3px solid var(--accent)" : "3px solid transparent",
        transition: "border-color 0.15s",
      }}
    >
      {/* Row trigger */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-0 text-left cursor-pointer transition-colors"
        style={{
          border: "none",
          borderBottom: "1px solid var(--border)",
          backgroundColor: isOpen ? "var(--surface)" : "transparent",
          padding: 0,
        }}
      >
        {/* Track number */}
        <div
          className="shrink-0 w-14 flex items-center justify-center self-stretch"
          style={{
            borderRight: "1px solid var(--border)",
            backgroundColor: isOpen ? "var(--accent)" : "transparent",
          }}
        >
          <span
            className="font-display text-[0.68rem] tracking-[0.08em]"
            style={{
              color: isOpen ? "#fff" : "var(--muted)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        {/* Title + description */}
        <div className="flex-1 min-w-0 px-5 py-4">
          <span
            className="block font-display text-[0.85rem] tracking-[0.05em] uppercase leading-tight"
            style={{ color: isOpen ? "var(--accent)" : "var(--text)" }}
          >
            {lick.title}
          </span>
          <span
            className="block text-[0.62rem] leading-[1.5] mt-[0.2rem] truncate"
            style={{ color: "var(--muted)" }}
          >
            {lick.description}
          </span>
        </div>

        {/* Toggle caret */}
        <div className="shrink-0 px-5 flex items-center">
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{
              color: isOpen ? "var(--accent)" : "var(--muted)",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s, color 0.15s",
            }}
          >
            <polyline points="1,3 5,7 9,3" />
          </svg>
        </div>
      </button>

      {/* Expanded panel */}
      {isOpen && (
        <div
          className="px-0"
          style={{
            borderBottom: "1px solid var(--border)",
            backgroundColor: "var(--bg)",
          }}
        >
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
      <Nav isDark={isDark} toggleDark={toggleDark} />

      <main className="flex-1 max-w-[840px] mx-auto w-full px-8 pt-10 pb-16 [@media(max-height:500px)]:pt-4 [@media(max-height:500px)]:pb-6">
        {/* Breadcrumb */}
        <Link
          to="/lick-stash"
          className="font-display text-[0.55rem] tracking-[0.1em] uppercase text-[var(--muted)] no-underline hover:text-[var(--text)] transition-colors mb-8 inline-flex items-center gap-1.5"
        >
          <svg width="6" height="10" viewBox="0 0 6 10" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="5,1 1,5 5,9" />
          </svg>
          All Packs
        </Link>

        {/* Pack header */}
        <div className="mb-10">
          <span
            className="font-display text-[0.52rem] tracking-[0.18em] uppercase block mb-1.5"
            style={{ color: "var(--accent)" }}
          >
            {pack.subtitle}
          </span>
          <h1 className="font-display font-semibold text-[clamp(1.6rem,3.5vw,2.6rem)] tracking-[0.04em] uppercase leading-none mb-3">
            {pack.title}
          </h1>
          <p className="text-[0.72rem] leading-[1.75] max-w-[520px]" style={{ color: "var(--muted)" }}>
            {pack.description}
          </p>
        </div>

        {/* Lick list — full-bleed border treatment */}
        <div
          className="border border-[var(--border)]"
          style={{ overflow: "hidden" }}
        >
          {/* List header */}
          <div
            className="flex items-center gap-0 border-b border-[var(--border)]"
            style={{ backgroundColor: "var(--surface)" }}
          >
            <div
              className="shrink-0 w-[17px]"
              style={{ borderRight: "none" }}
            />
            <div className="shrink-0 w-14 flex items-center justify-center py-2.5" style={{ borderRight: "1px solid var(--border)" }}>
              <span className="font-display text-[0.48rem] tracking-[0.14em] uppercase" style={{ color: "var(--muted)" }}>#</span>
            </div>
            <div className="px-5 py-2.5">
              <span className="font-display text-[0.48rem] tracking-[0.14em] uppercase" style={{ color: "var(--muted)" }}>
                Lick — {pack.licks.length} in this pack
              </span>
            </div>
          </div>

          {pack.licks.map((lick, i) => (
            <LickRow
              key={lick.id}
              lick={lick}
              index={i}
              isOpen={openLickId === lick.id}
              onToggle={() =>
                setOpenLickId((prev) => (prev === lick.id ? null : lick.id))
              }
            />
          ))}
        </div>
      </main>

      <footer className="border-t border-[var(--border)] px-8 py-5 flex justify-between items-center flex-wrap gap-2">
        <span className="text-[0.55rem] tracking-[0.1em] uppercase" style={{ color: "var(--faint)" }}>
          &copy; Shred Dojo
        </span>
        <Link
          to="/lick-stash"
          className="text-[0.55rem] tracking-[0.1em] uppercase no-underline border-b pb-px hover:opacity-80 transition-opacity"
          style={{ color: "var(--accent)", borderColor: "var(--accent)" }}
        >
          &larr; All Packs
        </Link>
      </footer>
    </div>
  );
}
