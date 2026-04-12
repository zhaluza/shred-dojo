import { Fragment } from "react";
import { Link, useLocation } from "react-router";
import { PickIcon } from "./Logo";

const NAV_GROUPS = [
  {
    label: "Scales",
    links: [
      { to: "/shape-explorer", label: "Shape Explorer" },
      { to: "/scale-positions", label: "Systems" },
    ],
  },
  {
    label: "Pentatonic",
    links: [
      { to: "/pentatonic-triads", label: "Pentatonic Triads" },
      { to: "/interval-shapes", label: "Intervals" },
    ],
  },
  {
    label: "Harmony",
    links: [
      { to: "/chord-voicings", label: "Chords" },
      { to: "/arpeggio-maps", label: "Arpeggios" },
    ],
  },
  {
    label: "Vocabulary",
    links: [
      { to: "/lick-stash", label: "Lick Stash" },
    ],
  },
] as const;

export function Nav({
  isDark,
  toggleDark,
}: {
  isDark: boolean;
  toggleDark: () => void;
}) {
  const { pathname } = useLocation();

  function isActive(to: string): boolean {
    return to === "/lick-stash"
      ? pathname.startsWith("/lick-stash")
      : pathname === to;
  }

  return (
    <header className="px-6 md:px-8 pt-5 md:pt-6 pb-4 md:pb-5 flex items-center justify-between flex-wrap gap-4 border-b border-[var(--border)]">
      <div className="flex items-center gap-7 md:gap-9 flex-wrap">
        {/* Logo */}
        <Link
          to="/?preview=true"
          className="flex items-center gap-2 no-underline shrink-0"
          aria-label="Shred Dojo home"
        >
          <PickIcon width={20} />
          <span className="font-display font-semibold text-[0.88rem] tracking-[0.07em] uppercase leading-none text-[var(--text)]">
            Shred{" "}
            <em className="text-[var(--accent)] not-italic">Dojo</em>
          </span>
        </Link>

        {/* Nav groups */}
        <nav className="flex items-end gap-5 md:gap-7 flex-wrap" aria-label="Main navigation">
          {NAV_GROUPS.map((group, gi) => (
            <Fragment key={group.label}>
              {gi > 0 && (
                <div
                  className="w-px self-stretch mb-[3px] max-[700px]:hidden"
                  style={{ backgroundColor: "var(--border)" }}
                />
              )}
              <div className="flex flex-col gap-[6px]">
                {/* Category label */}
                <span
                  className="text-[0.52rem] md:text-[0.58rem] tracking-[0.18em] uppercase leading-none max-[700px]:hidden"
                  style={{ color: "var(--muted)" }}
                >
                  {group.label}
                </span>
                {/* Links */}
                <div className="flex items-center gap-3 md:gap-4">
                  {group.links.map(({ to, label }) => (
                    <Link
                      key={to}
                      to={to}
                      className={[
                        "font-display text-[0.7rem] md:text-[0.75rem] tracking-[0.09em] uppercase no-underline transition-colors whitespace-nowrap",
                        isActive(to)
                          ? "text-[var(--accent)] border-b border-[var(--accent)] pb-px"
                          : "text-[var(--muted)] hover:text-[var(--text)]",
                      ].join(" ")}
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            </Fragment>
          ))}
        </nav>
      </div>

      {/* Dark mode toggle */}
      <button
        onClick={toggleDark}
        className="font-display text-[0.65rem] md:text-[0.7rem] tracking-[0.1em] uppercase border border-[var(--border)] text-[var(--muted)] bg-transparent px-3 py-[0.35rem] hover:border-[var(--text)] hover:text-[var(--text)] transition-colors cursor-pointer shrink-0"
      >
        {isDark ? "Light" : "Dark"}
      </button>
    </header>
  );
}
