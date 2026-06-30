import { useState, useEffect } from "react";

// Read-only dark-mode detection for components that render OUTSIDE any themed
// page wrapper (MetronomeWidget, ThemeFx) and therefore can't read the page's
// CSS variables. Polls localStorage ("shred-dojo-dark") — the same key the
// themed `useDarkMode` hook writes — plus a `storage` listener for other tabs.
// SSR-safe: starts light, resolves on the client after mount.
export function useStoredDarkMode(pollMs = 500): boolean {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const sync = () => {
      try {
        setIsDark(localStorage.getItem("shred-dojo-dark") === "true");
      } catch {
        /* storage unavailable */
      }
    };
    sync();
    const id = setInterval(sync, pollMs);
    window.addEventListener("storage", sync);
    return () => {
      clearInterval(id);
      window.removeEventListener("storage", sync);
    };
  }, [pollMs]);

  return isDark;
}
