import { useState, useEffect, useCallback } from "react";

// Shared dark-mode state: reads/writes localStorage "shred-dojo-dark" and falls
// back to the OS preference. Replaces the identical block copy-pasted into every
// page component. SSR-safe (starts light, resolves in an effect on the client).
export function useDarkMode() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("shred-dojo-dark");
    if (stored !== null) {
      setIsDark(stored === "true");
    } else {
      setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  }, []);

  const toggleDark = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      try { localStorage.setItem("shred-dojo-dark", String(next)); } catch {}
      return next;
    });
  }, []);

  return { isDark, toggleDark };
}
