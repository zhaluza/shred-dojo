import { Link, useLocation } from "react-router";
import { PickIcon } from "./Logo";

const NAV_LINKS = [
  { to: "/scale-positions", label: "Scales" },
  { to: "/lick-stash", label: "Lick Stash" },
  { to: "/pentatonic-triads", label: "Triads" },
  { to: "/interval-shapes", label: "Intervals" },
  { to: "/shape-explorer", label: "Shape Explorer" },
  { to: "/chord-voicings", label: "Chords" },
  { to: "/arpeggio-maps", label: "Arpeggios" },
] as const;

export function Nav({
  isDark,
  toggleDark,
}: {
  isDark: boolean;
  toggleDark: () => void;
}) {
  const { pathname } = useLocation();

  return (
    <header className="px-6 pt-5 pb-4 flex items-center justify-between flex-wrap gap-3 border-b border-[var(--border)]">
      <div className="flex items-center gap-6">
        <Link
          to="/?preview=true"
          className="flex items-center gap-2 no-underline"
          aria-label="Shred Dojo home"
        >
          <PickIcon width={18} />
          <span className="font-display font-semibold text-[0.78rem] tracking-[0.08em] uppercase leading-none text-[var(--text)]">
            Shred{" "}
            <em className="text-[var(--accent)] not-italic">Dojo</em>
          </span>
        </Link>

        <nav className="flex items-center gap-4 flex-wrap" aria-label="Main navigation">
          {NAV_LINKS.map(({ to, label }) => {
            const active =
              to === "/lick-stash"
                ? pathname.startsWith("/lick-stash")
                : pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={[
                  "font-display text-[0.6rem] tracking-[0.1em] uppercase no-underline transition-colors",
                  active
                    ? "text-[var(--accent)] border-b border-[var(--accent)] pb-px"
                    : "text-[var(--muted)] hover:text-[var(--text)]",
                ].join(" ")}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <button
        onClick={toggleDark}
        className="font-display text-[0.6rem] tracking-[0.12em] uppercase border border-[var(--border)] text-[var(--muted)] bg-transparent px-3 py-[0.3rem] hover:border-[var(--text)] hover:text-[var(--text)] transition-colors cursor-pointer"
      >
        {isDark ? "Light" : "Dark"}
      </button>
    </header>
  );
}
