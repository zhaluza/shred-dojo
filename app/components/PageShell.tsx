import type { ReactNode } from "react";
import { Nav } from "./Nav";
import { LIGHT_THEME, DARK_THEME } from "./theme";
import { useDarkMode } from "./useDarkMode";

// Themed page wrapper: owns dark-mode state, applies the theme CSS-variable
// object, renders the Nav, and centers content in a width-capped container.
// Adopt this instead of repeating the root-div + Nav + dark-mode boilerplate.
export function PageShell({
  children,
  maxWidth = 1100,
  contentClassName = "",
}: {
  children: ReactNode;
  /** Container max-width in px. */
  maxWidth?: number;
  /** Extra classes for the inner content container. */
  contentClassName?: string;
}) {
  const { isDark, toggleDark } = useDarkMode();
  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  return (
    <div
      style={theme}
      className="min-h-screen font-mono bg-[var(--bg)] text-[var(--text)] transition-[background,color] duration-200"
    >
      <Nav isDark={isDark} toggleDark={toggleDark} />
      <div
        className={[
          "mx-auto w-full px-5 md:px-8 pt-8 pb-20 [@media(max-height:500px)]:pt-4",
          contentClassName,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ maxWidth }}
      >
        {children}
      </div>
    </div>
  );
}
