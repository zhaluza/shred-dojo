import type { CSSProperties } from "react";
import type { StringName } from "./scalePositions.types";

// ─── Shoegaze Blueprint palette ──────────────────────────────────────────────
// One structure, two skins. The hairline-grid / zero-radius / mono-numeric
// "blueprint" structure is shared; the mood diverges by mode:
//   • DARK = "Dusk" (shoegaze)  — deep indigo-black ground, lavender-white ink,
//     dusty rose-magenta accent + aqua secondary, soft neon bloom + faint
//     scanline/grain texture (the texture lives in ThemeFx, globally).
//   • LIGHT = "Print" (alternative/zine) — warm paper white, near-black ink,
//     one bold red accent (black = the secondary accent), crisp, no texture/glow.
// Functional tokens (degree / system / string / feedback) keep their semantics
// but are retuned to read on the new grounds and to stay distinct from --accent.
//
// Three cross-cutting tokens drive mode-aware effects without per-component
// branching: --accent-2 (secondary accent), --glow (active-control box-shadow),
// --text-glow (heading text-shadow). In LIGHT the glow tokens resolve to `none`.

export const LIGHT_THEME: CSSProperties = {
  // chrome — "ink on print stock"
  "--bg": "#f6f6f3",
  "--surface": "#ffffff",
  "--border": "#c9c9c4",
  "--text": "#111114",
  "--muted": "#565660",
  "--accent": "#d80a28", // alternative red — the single light accent
  "--accent-2": "#111114", // black ink = the secondary accent in print mode
  "--faint": "#9a9a96", // quiet but legible: fret numbers, inlay dots, faint labels
  "--fret-bar": "#d7d7d2",
  // mode-aware effects — off in print
  "--glow": "none",
  "--text-glow": "none",
  // systems
  "--sys-3nps": "#c2542a",
  "--sys-caged": "#9a7830",
  "--sys-sym": "#3f7a86",
  // strings — cool steels (low E darkest → high e lightest)
  "--str-E": "#8a96a0",
  "--str-A": "#97a3ad",
  "--str-D": "#a5b1ba",
  "--str-G": "#b3bfc7",
  "--str-Be": "#bcc7ce",
  // degrees / feedback — root is brick so it stays distinct from the red accent
  "--root-col": "#b0271d",
  "--fifth-col": "#3f6f96",
  "--seventh-col": "#6a4a7a",
  "--blues-col": "#4a3aa8",
  "--third-col": "#3a6a3a",
  "--feedback-correct": "#1f8a3b",
  "--feedback-wrong": "#c41f1f",
};

export const DARK_THEME: CSSProperties = {
  // chrome — "dusk on indigo"
  "--bg": "#0b0a12",
  "--surface": "#151320",
  "--border": "#292437",
  "--text": "#ece8f6",
  "--muted": "#8a85a6",
  "--accent": "#ff5d8f", // shoegaze rose-magenta
  "--accent-2": "#54e0d6", // aqua secondary
  "--faint": "#4b4660", // quiet but legible: fret numbers, inlay dots, faint labels
  "--fret-bar": "#1f1b2e",
  // mode-aware effects — neon bloom in dusk
  "--glow": "0 0 22px -6px var(--accent)",
  "--text-glow": "0 0 18px rgba(255,93,143,.45)",
  // systems
  "--sys-3nps": "#ff7a5c",
  "--sys-caged": "#e0b25a",
  "--sys-sym": "#54e0d6",
  // strings — violet-tinted steels (low E darkest → high e lightest)
  "--str-E": "#4a4660",
  "--str-A": "#56526e",
  "--str-D": "#63607c",
  "--str-G": "#716e8b",
  "--str-Be": "#5d5a76",
  // degrees / feedback — root warm-red, distinct from the magenta accent
  "--root-col": "#ff6b5a",
  "--fifth-col": "#6f9ec4",
  "--seventh-col": "#b07ad8",
  "--blues-col": "#7a8cff",
  "--third-col": "#5fc28a",
  "--feedback-correct": "#36c46a",
  "--feedback-wrong": "#ff4d5e",
};

export const STRING_LINE: Record<StringName, { height: string; colorVar: string }> = {
  E: { height: "2px", colorVar: "var(--str-E)" },
  A: { height: "1.5px", colorVar: "var(--str-A)" },
  D: { height: "1.5px", colorVar: "var(--str-D)" },
  G: { height: "1px", colorVar: "var(--str-G)" },
  B: { height: "1px", colorVar: "var(--str-Be)" },
  e: { height: "0.5px", colorVar: "var(--str-Be)" },
};

