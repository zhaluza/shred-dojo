import { Link } from "react-router";
import type { Route } from "./+types/lick-stash";
import { LIGHT_THEME, DARK_THEME } from "~/components/theme";
import { LICK_PACKS } from "~/components/lickStash.data";
import { Nav } from "~/components/Nav";
import { PageHeader } from "~/components/PageHeader";
import { useState, useEffect } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Lick Stash — Shred Dojo" },
    {
      name: "description",
      content:
        "Curated lick packs for guitar — learn, loop, and internalize real vocabulary.",
    },
  ];
}

export default function LickStash() {
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

  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  return (
    <div
      className="min-h-screen flex flex-col font-mono bg-[var(--bg)] text-[var(--text)]"
      style={theme}
    >
      <Nav isDark={isDark} toggleDark={toggleDark} />

      <main className="flex-1 max-w-[760px] mx-auto w-full px-8 pt-12 pb-16 [@media(max-height:500px)]:pt-4 [@media(max-height:500px)]:pb-6">
        <PageHeader
          eyebrow="Train"
          title="Lick Stash"
          subtitle="Curated packs of licks organized by style and technique. Learn them, loop them, transpose them — build real vocabulary you can use on stage."
        />

        {/* Pack grid */}
        <div className="flex flex-col gap-0 border-t border-[var(--border)]">
          {LICK_PACKS.map((pack) => {
            const inner = (
              <div
                className="flex items-start gap-5 py-5 border-b border-[var(--border)]"
                style={{ opacity: pack.available ? 1 : 0.45 }}
              >
                {/* Pack number */}
                <div className="shrink-0 w-14 text-right pt-[0.15rem]">
                  <span
                    className="text-[0.5rem] tracking-[0.12em] uppercase"
                    style={{
                      color: pack.available ? "var(--accent)" : "var(--muted)",
                    }}
                  >
                    {pack.subtitle}
                  </span>
                </div>

                {/* Pack info */}
                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-[0.95rem] tracking-[0.06em] uppercase leading-tight mb-[0.3rem]">
                    {pack.title}
                  </h2>
                  <p className="text-[0.68rem] leading-[1.6] text-[var(--muted)]">
                    {pack.description}
                  </p>
                  {pack.available && (
                    <span className="inline-block mt-2 text-[0.55rem] tracking-[0.1em] uppercase text-[var(--accent)]">
                      {pack.licks.length} licks →
                    </span>
                  )}
                  {!pack.available && (
                    <span className="inline-block mt-2 text-[0.55rem] tracking-[0.1em] uppercase text-[var(--faint)]">
                      Coming soon
                    </span>
                  )}
                </div>
              </div>
            );

            if (pack.available) {
              return (
                <Link
                  key={pack.slug}
                  to={`/lick-stash/${pack.slug}`}
                  className="no-underline text-[var(--text)] hover:bg-[var(--surface)] transition-colors"
                >
                  {inner}
                </Link>
              );
            }

            return (
              <div key={pack.slug} className="cursor-not-allowed">
                {inner}
              </div>
            );
          })}
        </div>
      </main>

      <footer className="border-t border-[var(--border)] px-8 py-5 flex justify-between items-center flex-wrap gap-2">
        <span className="text-[0.55rem] text-[var(--faint)] tracking-[0.1em] uppercase">
          &copy; Shred Dojo
        </span>
        <Link
          to="/"
          className="text-[0.55rem] text-[var(--accent)] tracking-[0.1em] uppercase no-underline border-b border-[var(--accent)] pb-px hover:opacity-80 transition-opacity"
        >
          &larr; Home
        </Link>
      </footer>
    </div>
  );
}
