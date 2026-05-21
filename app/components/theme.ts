import type { CSSProperties } from "react";
import type { StringName } from "./scalePositions.types";

export const LIGHT_THEME: CSSProperties = {
  "--bg": "#fdf9f4",
  "--surface": "#f5ede0",
  "--border": "#ddd0bc",
  "--text": "#100e0c",
  "--muted": "#7a6e60",
  "--accent": "#b84a1a",
  "--root-col": "#c0392b",
  "--faint": "#cec0a8",
  "--fret-bar": "#dcd0bc",
  "--sys-3nps": "#b84a1a",
  "--sys-caged": "#9a7830",
  "--sys-sym": "#4a7a5a",
  "--str-E": "#8a7a58",
  "--str-A": "#a09060",
  "--str-D": "#b0a878",
  "--str-G": "#c0b898",
  "--str-Be": "#c8bfaa",
  "--fifth-col": "#4a6a8a",
  "--seventh-col": "#6a4a7a",
  "--blues-col": "#4a3aa8",
  "--third-col": "#3a6a3a",
  "--feedback-correct": "#2d8a40",
  "--feedback-wrong": "#b03020",
};

export const DARK_THEME: CSSProperties = {
  "--bg": "#141210",
  "--surface": "#1e1a16",
  "--border": "#352e24",
  "--text": "#e8e0d0",
  "--muted": "#6a6058",
  "--accent": "#c8604a",
  "--root-col": "#c0392b",
  "--faint": "#3a3228",
  "--fret-bar": "#2a2418",
  "--sys-3nps": "#c8604a",
  "--sys-caged": "#c8a060",
  "--sys-sym": "#6aaa7a",
  "--str-E": "#5a5040",
  "--str-A": "#6a6048",
  "--str-D": "#7a7058",
  "--str-G": "#8a8068",
  "--str-Be": "#6a6258",
  "--fifth-col": "#6a9abf",
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

