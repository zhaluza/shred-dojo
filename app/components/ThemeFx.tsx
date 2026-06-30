import { useStoredDarkMode } from "./useStoredDarkMode";

// Global, non-interactive texture overlay — the "Dusk" haze. Rendered once at
// the App root (outside any themed div) so it covers EVERY page uniformly, not
// just the PageShell ones. Dark mode only: a top bloom, faint CRT scanlines, and
// fine film grain — all static (no animation) and kept near-invisible so they
// never reduce text contrast. Light ("Print") mode renders nothing.
//
// Hardcoded colors because this lives outside the themed CSS-variable tree
// (same reason MetronomeWidget hardcodes its chrome). Keep in sync with the
// DARK_THEME accent/ground in theme.ts.

// Fine fractal-noise grain as an inline SVG data URI.
const GRAIN_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function ThemeFx() {
  const isDark = useStoredDarkMode();
  if (!isDark) return null;

  return (
    <div className="fixed inset-0 z-[35] pointer-events-none" aria-hidden="true">
      {/* top-center neon bloom (additive) */}
      <div
        className="absolute inset-0"
        style={{
          mixBlendMode: "screen",
          backgroundImage:
            "radial-gradient(120% 70% at 50% -10%, rgba(255,93,143,0.14), rgba(84,224,214,0.05) 38%, transparent 64%)",
        }}
      />
      {/* CRT scanlines — kept light so they don't band over bright UI surfaces */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.22,
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(5,4,12,0.5) 0 1px, transparent 1px 3px)",
        }}
      />
      {/* film grain */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.045,
          mixBlendMode: "overlay",
          backgroundImage: GRAIN_URL,
          backgroundSize: "140px 140px",
        }}
      />
      {/* soft vignette to seat the haze */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(130% 130% at 50% 50%, transparent 62%, rgba(4,3,10,0.45) 100%)",
        }}
      />
    </div>
  );
}
