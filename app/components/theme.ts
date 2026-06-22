import type { CSSProperties } from "react";
import type { StringName } from "./scalePositions.types";

// ─── Fretboard Blueprint palette ─────────────────────────────────────────────
// Chrome tokens read like a draftsman's drawing: cool slate ground, hairline
// ink lines, a single cyan accent. Functional tokens (degree / system / string
// / feedback colors) carry meaning inside diagrams and are tuned to sit on the
// new grounds without changing their semantics.

export const LIGHT_THEME: CSSProperties = {
  // chrome — "ink on drafting bond"
  "--bg": "#eef2f4",
  "--surface": "#e4eaec",
  "--border": "#c2ccd1",
  "--text": "#0e1316",
  "--muted": "#5e6a70",
  "--accent": "#0e7c96", // blueprint cyan, deepened for contrast on paper
  "--faint": "#d3dbde",
  "--fret-bar": "#cad3d7",
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
  // degrees / feedback
  "--root-col": "#c0392b",
  "--fifth-col": "#3f6f96",
  "--seventh-col": "#6a4a7a",
  "--blues-col": "#4a3aa8",
  "--third-col": "#3a6a3a",
  "--feedback-correct": "#2d8a40",
  "--feedback-wrong": "#b03020",
};

export const DARK_THEME: CSSProperties = {
  // chrome — "blueprint on slate"
  "--bg": "#101619",
  "--surface": "#161d22",
  "--border": "#2a363d",
  "--text": "#e6eef2",
  "--muted": "#7e8c94",
  "--accent": "#4fd0e6", // blueprint cyan
  "--faint": "#1c262c",
  "--fret-bar": "#222e34",
  // systems
  "--sys-3nps": "#d6705a",
  "--sys-caged": "#c8a060",
  "--sys-sym": "#5fb6c2",
  // strings — cool steels (low E darkest → high e lightest)
  "--str-E": "#4a5560",
  "--str-A": "#56626d",
  "--str-D": "#63707b",
  "--str-G": "#71808b",
  "--str-Be": "#5d6a73",
  // degrees / feedback
  "--root-col": "#d2473a",
  "--fifth-col": "#6f9ec4",
  "--seventh-col": "#9a6abf",
  "--blues-col": "#7a6ad8",
  "--third-col": "#5a9a5a",
  "--feedback-correct": "#2d8a40",
  "--feedback-wrong": "#b03020",
};

export const STRING_LINE: Record<StringName, { height: string; colorVar: string }> = {
  E: { height: "2px", colorVar: "var(--str-E)" },
  A: { height: "1.5px", colorVar: "var(--str-A)" },
  D: { height: "1.5px", colorVar: "var(--str-D)" },
  G: { height: "1px", colorVar: "var(--str-G)" },
  B: { height: "1px", colorVar: "var(--str-Be)" },
  e: { height: "0.5px", colorVar: "var(--str-Be)" },
};

