import { Fragment, useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { PickIcon } from "./Logo";

type NavLink = { to: string; label: string; preview?: true };
type NavGroup = { label: string; links: NavLink[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Scales",
    links: [
      { to: "/shape-explorer", label: "Shape Explorer" },
      { to: "/scale-positions", label: "Systems" },
      { to: "/wylde-scales", label: "Wylde" },
      { to: "/yngwie-scales", label: "Yngwie" },
      { to: "/scale-builder", label: "Scale Builder" },
    ],
  },
  {
    label: "Pentatonic",
    links: [
      { to: "/pentatonic-triads", label: "Pentatonic Triads" },
      { to: "/pentatonic-colors", label: "Colors" },
      { to: "/interval-shapes", label: "Intervals" },
    ],
  },
  {
    label: "Harmony",
    links: [
      { to: "/chord-voicings", label: "Chords" },
      { to: "/arpeggio-maps", label: "Arpeggios" },
      { to: "/circle-of-fifths", label: "Circle of Fifths" },
    ],
  },
  {
    label: "Vocabulary",
    links: [
      { to: "/lick-stash", label: "Lick Stash", preview: true },
    ],
  },
  {
    label: "Practice",
    links: [
      { to: "/morning-coffee", label: "Morning Coffee" },
      { to: "/note-recognition", label: "Note Recognition" },
      { to: "/staff-notes", label: "Staff Notes" },
      { to: "/chord-tones", label: "Chord Tones" },
    ],
  },
];

export function Nav({
  isDark,
  toggleDark,
}: {
  isDark: boolean;
  toggleDark: () => void;
}) {
  const { pathname, search } = useLocation();
  const [isPreview, setIsPreview] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(search).get("preview") === "true") {
      localStorage.setItem("shred-dojo-preview", "true");
    }
    setIsPreview(localStorage.getItem("shred-dojo-preview") === "true");
  }, [search]);

  // Close drawer on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  function isActive(to: string): boolean {
    return to === "/lick-stash"
      ? pathname.startsWith("/lick-stash")
      : pathname === to;
  }

  return (
    <header className="px-5 md:px-8 pt-5 md:pt-6 pb-4 md:pb-5 [@media(max-height:500px)]:py-2 [@media(max-height:500px)]:px-4 flex items-center justify-between border-b border-[var(--border)]">
      <div className="flex items-center gap-7 md:gap-9">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 no-underline shrink-0"
          aria-label="Shred Dojo home"
        >
          <PickIcon width={20} />
          <span className="font-display font-semibold text-[0.88rem] tracking-[0.07em] uppercase leading-none text-[var(--text)]">
            Shred{" "}
            <em className="text-[var(--accent)] not-italic">Dojo</em>
          </span>
        </Link>

        {/* Desktop nav groups — hidden below 700px */}
        <nav className="hidden min-[700px]:flex items-end gap-5 md:gap-7 [@media(max-height:500px)]:gap-3 flex-wrap" aria-label="Main navigation">
          {NAV_GROUPS.map((group, gi) => (
            <Fragment key={group.label}>
              {gi > 0 && (
                <div
                  className="w-px self-stretch mb-[3px]"
                  style={{ backgroundColor: "var(--border)" }}
                />
              )}
              <div className="flex flex-col gap-[6px]">
                <span
                  className="text-[0.52rem] md:text-[0.58rem] tracking-[0.18em] uppercase leading-none [@media(max-height:500px)]:hidden"
                  style={{ color: "var(--muted)" }}
                >
                  {group.label}
                </span>
                <div className="flex items-center gap-3 md:gap-4">
                  {group.links.map(({ to, label, preview: requiresPreview }) => {
                    if (requiresPreview && !isPreview) {
                      return (
                        <span
                          key={to}
                          className="font-display text-[0.7rem] md:text-[0.75rem] tracking-[0.09em] uppercase whitespace-nowrap cursor-default select-none"
                          style={{ color: "var(--faint)" }}
                          title="Preview only"
                        >
                          {label}
                        </span>
                      );
                    }
                    return (
                      <Link
                        key={to}
                        to={to}
                        className={[
                          "font-display text-[0.7rem] md:text-[0.75rem] tracking-[0.09em] uppercase no-underline transition-colors whitespace-nowrap",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg)]",
                          isActive(to)
                            ? "text-[var(--accent)] border-b-2 border-[var(--accent)] pb-px"
                            : "text-[var(--muted)] hover:text-[var(--text)]",
                        ].join(" ")}
                      >
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </Fragment>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {/* Dark mode toggle — desktop */}
        <button
          onClick={toggleDark}
          className="hidden min-[700px]:block font-display text-[0.65rem] md:text-[0.7rem] tracking-[0.1em] uppercase border border-[var(--border)] text-[var(--muted)] bg-transparent px-3 py-[0.35rem] hover:border-[var(--text)] hover:text-[var(--text)] transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg)]"
        >
          {isDark ? "Light" : "Dark"}
        </button>

        {/* Hamburger button — mobile only */}
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
          aria-expanded={isOpen}
          className="min-[700px]:hidden flex items-center justify-center w-10 h-10 text-[var(--text)] border border-[var(--border)] bg-transparent cursor-pointer hover:border-[var(--text)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg)]"
        >
          <span className="text-[1.2rem] leading-none">☰</span>
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[100] min-[700px]:hidden"
            style={{ backgroundColor: "rgba(10,8,6,0.82)", backdropFilter: "blur(4px)" }}
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <div
            className="fixed top-0 right-0 h-full w-[280px] z-[101] flex flex-col min-[700px]:hidden overflow-y-auto"
            style={{
              backgroundColor: "var(--surface)",
              borderLeft: "1px solid var(--border)",
            }}
          >
            {/* Drawer header */}
            <div
              className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <Link
                to="/"
                className="flex items-center gap-2 no-underline"
                onClick={() => setIsOpen(false)}
              >
                <PickIcon width={18} />
                <span className="font-display font-semibold text-[0.85rem] tracking-[0.07em] uppercase leading-none text-[var(--text)]">
                  Shred <em className="text-[var(--accent)] not-italic">Dojo</em>
                </span>
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close menu"
                className="flex items-center justify-center w-10 h-10 text-[var(--muted)] hover:text-[var(--text)] bg-transparent border-none cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg)]"
              >
                <span className="text-[1.1rem] leading-none">✕</span>
              </button>
            </div>

            {/* Nav groups */}
            <nav className="flex-1 py-2" aria-label="Mobile navigation">
              {NAV_GROUPS.map((group) => (
                <div key={group.label} className="py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span
                    className="block px-5 pb-2 text-[0.5rem] tracking-[0.2em] uppercase"
                    style={{ color: "var(--muted)" }}
                  >
                    {group.label}
                  </span>
                  {group.links.map(({ to, label, preview: requiresPreview }) => {
                    if (requiresPreview && !isPreview) {
                      return (
                        <span
                          key={to}
                          className="flex items-center px-5 min-h-[48px] font-display text-[0.82rem] tracking-[0.07em] uppercase cursor-default select-none"
                          style={{ color: "var(--faint)" }}
                        >
                          {label}
                          <span className="ml-2 text-[0.5rem] tracking-[0.1em]" style={{ color: "var(--faint)" }}>
                            (preview)
                          </span>
                        </span>
                      );
                    }
                    const active = isActive(to);
                    return (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => setIsOpen(false)}
                        className={[
                          "flex items-center px-5 min-h-[48px] font-display text-[0.82rem] tracking-[0.07em] uppercase no-underline transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg)]",
                          active
                            ? "text-[var(--accent)]"
                            : "text-[var(--text)] hover:text-[var(--accent)]",
                        ].join(" ")}
                        style={active ? { borderLeft: "3px solid var(--accent)" } : { borderLeft: "3px solid transparent" }}
                      >
                        {label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            {/* Drawer footer — dark mode toggle */}
            <div
              className="px-5 py-4 shrink-0 flex items-center justify-between"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <span className="text-[0.5rem] tracking-[0.16em] uppercase" style={{ color: "var(--muted)" }}>
                Appearance
              </span>
              <button
                onClick={toggleDark}
                className="font-display text-[0.72rem] tracking-[0.1em] uppercase border border-[var(--border)] text-[var(--muted)] bg-transparent px-4 py-2 min-h-[40px] hover:border-[var(--text)] hover:text-[var(--text)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg)]"
              >
                {isDark ? "Light Mode" : "Dark Mode"}
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
