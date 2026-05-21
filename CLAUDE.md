# Shred Dojo

## Stack

- **React Router v7** in framework mode (SSR, file-based routing under `app/routes/`)
- **React 19**
- **TypeScript**
- **Tailwind CSS v4** (via `@tailwindcss/vite` plugin — no `tailwind.config.js`)
- **Vite**
- **AlphaTab** (`@coderline/alphatab` + `@coderline/alphatab-vite`) — music notation rendering and playback from Guitar Pro files
- **VexFlow** (`vexflow`) — treble clef staff rendering for the Scale Builder page

## Project structure

```
app/
  components/    # Shared components (co-locate .types.ts, .utils.ts, .theme.ts siblings)
    CtrlButton.tsx  # Shared button component — import this, never define local CtrlBtn/Chip
  routes/        # File-based routes (React Router v7 conventions)
  root.tsx       # Root layout, global error boundary
  app.css        # Tailwind entry point — keep minimal
  global.d.ts    # React.CSSProperties augmented to accept --${string} keys
public/
  tabs/          # Guitar Pro (.gp) files served for AlphaTab playback
  font/          # AlphaTab Bravura music font (copied by alphaTab vite plugin)
  soundfont/     # AlphaTab SONiVOX soundfont (copied by alphaTab vite plugin)
resources/       # Reference material (PDFs, source .gp files, etc.) — not served
react-router.config.ts
vite.config.ts
```

## Styling

Use **Tailwind utility classes exclusively** in JSX/TSX. Do not add custom CSS classes to `app.css` or any other stylesheet. The only content in `app.css` should be the Tailwind import and theme tokens (`@theme { ... }`).

### Design system / style guide

The app uses a warm aesthetic established in `app/components/theme.ts`. All pages should follow these conventions.

**Fonts** (loaded in `root.tsx`, registered in `app.css` `@theme`):
- `font-display` → Oswald (headings, labels, buttons)
- `font-mono` → Source Code Pro (body text, monospace)

**Theming approach** — CSS custom properties injected as inline `style` on the page root `<div>`, cascading to all children. The root div must also carry `bg-[var(--bg)] text-[var(--text)]` Tailwind classes — `style={theme}` injects variable definitions but does not apply background or color to the element itself; without the classes the page background falls through to the browser default (white) in dark mode. Dark mode is React state (not `dark:` Tailwind variant), toggled by swapping `LIGHT_THEME` / `DARK_THEME` objects.

**Color tokens** (defined in `theme.ts`):

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--bg` | `#fdf9f4` | `#141210` | Page background |
| `--surface` | `#f5ede0` | `#1e1a16` | Card / panel backgrounds |
| `--border` | `#ddd0bc` | `#352e24` | Borders, dividers |
| `--text` | `#100e0c` | `#e8e0d0` | Primary text |
| `--muted` | `#7a6e60` | `#6a6058` | Secondary / label text |
| `--accent` | `#b84a1a` | `#c8604a` | Highlights, active states |
| `--root-col` | `#c0392b` | `#c0392b` | Root note dots |
| `--faint` | `#cec0a8` | `#3a3228` | Fret numbers, ghost elements |
| `--fret-bar` | `#dcd0bc` | `#2a2418` | Fretboard bar lines |
| `--fifth-col` | `#4a6a8a` | `#6a9abf` | 5th degree dots (chord/arpeggio pages) |
| `--seventh-col` | `#6a4a7a` | `#9a6abf` | 7th degree dots (chord/arpeggio pages) |
| `--blues-col` | `#4a3aa8` | `#7a6ad8` | b5 "blue note" dots (blues scale mode) |
| `--third-col` | `#3a6a3a` | `#5a9a5a` | 3rd degree dots (pentatonic triads, interval shapes) |
| `--feedback-correct` | `#2d8a40` | `#2d8a40` | Correct-answer feedback state in all quiz components |
| `--feedback-wrong` | `#b03020` | `#b03020` | Wrong-answer feedback state in all quiz components |

**Typography scale** (Tailwind arbitrary values):
- H1: `font-display font-semibold text-[clamp(2rem,5vw,3.2rem)] tracking-[0.04em] uppercase leading-none`
- Section labels: `text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)]`
- Buttons: `font-display text-[0.75rem] tracking-[0.08em] uppercase border`
- Cell labels: `font-display text-[0.68rem] tracking-[0.13em] uppercase text-[var(--muted)]`
- Detail titles: `font-display text-[0.95rem] tracking-[0.1em] uppercase`

**Shared button component** — `app/components/CtrlButton.tsx` exports `CtrlButton`, the single shared implementation used across all page components. Props: `label`, `active`, `onClick`, `small?`, `disabled?`, `title?`, `normalCase?`, `className?`. Do not define local `CtrlBtn` / `ControlButton` / `Chip` variants in page components — import `CtrlButton` instead.

**Button states:**
- Default: `bg-transparent text-[var(--text)] border-[var(--border)] hover:border-[var(--text)]`
- Active: `bg-[var(--text)] text-[var(--bg)] border-[var(--text)]`
- Focus: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg)]` (built into `CtrlButton`; apply manually to standalone buttons and links)
- Blues-mode active exception: blues toggle buttons use `bg-[var(--blues-col)] border-[var(--blues-col)] text-white` when active — keep these as standalone `<button>` elements with the focus classes applied directly.

**Mobile touch targets** — All interactive buttons add `max-[700px]:py-[0.55rem] max-[700px]:px-[1rem]` (small) or `max-[700px]:py-[0.6rem]` (normal) to meet the ~40px minimum height on mobile. Icon-only and narrow buttons also add `max-[700px]:min-h-[44px]`.

**Mobile nav** — Below 700px, the desktop nav row is hidden (`hidden min-[700px]:flex`) and replaced by a hamburger `☰` button (`min-[700px]:hidden`). Clicking it opens a right-side drawer (`fixed top-0 right-0 h-full w-[280px] z-[101]`) with full-width category groups, 48px-minimum-height links, and a dark-mode toggle at the bottom. Body scroll is locked while the drawer is open; the drawer auto-closes on route change.

**Landscape / short-viewport pattern** — Use `[@media(max-height:500px)]:` Tailwind arbitrary variant for landscape phone optimizations. This threshold (500px) targets phones in landscape (390–430px tall) without affecting portrait phones (~667px+) or desktop. Two conventions:
- **Nav**: header adds `[@media(max-height:500px)]:py-2` (shrinks from ~80px to ~40px); desktop nav gaps shrink to `gap-3`; category label spans (`Scales`, `Pentatonic`, etc.) add `[@media(max-height:500px)]:hidden` so only the link row shows
- **Page content**: every page's main content wrapper adds `[@media(max-height:500px)]:pt-3` (or `py-3`) to reduce the standard 32px top padding to 12px. The home hero also shrinks the H1 with `[@media(max-height:500px)]:text-[clamp(2rem,7vh,3.5rem)]` and hides the body copy paragraph.

**Large-screen containers** — Page content wrappers use `max-w-[NNNpx] mx-auto` to constrain layout width. Established limits by page type:
- `max-w-[1400px]` — WyldeScales (dual-column layout benefits from extra width)
- `max-w-[1300px]` — ShapeExplorer (wide Focus/Pair fretboards)
- `max-w-[1200px]` — ScalePositions, PentatonicTriads, ArpeggioMaps (multi-shape grids)
- `max-w-[1100px]` — PentatonicColors, IntervalShapes, ChordVoicings (single-fretboard or diagram pages)
- `max-w-[740px]` / `max-w-2xl` — quiz pages (FretboardNotes, ChordTones) — intentionally narrow for focused UX

Fretboard cells use `flex-1`, so they scale proportionally with the container — wider containers produce wider fret spacing, mirroring the natural feel of a guitar neck. Do not add explicit fret-cell widths; let flex handle it.

**Grid / cells** — `grid grid-cols-2 max-[560px]:grid-cols-1 gap-0` with cells using `-mt-px -ml-px` for collapsed borders. Selected cell adds `relative z-[2]`.

**Modal overlay pattern** — `fixed inset-0 z-50` backdrop with `rgba(10,8,6,0.82)` + `backdropFilter: blur(4px)`. Modal panel uses `--surface` bg, `border: 1px solid var(--border)`, `borderTop: 3px solid var(--accent)`. Lock body scroll with `document.body.style.overflow = 'hidden'` on mount, restore on unmount.

**Pseudo-element pattern** — never use `::before`/`::after` via CSS. Instead:
- Background gradients: `backgroundImage` inline style on the element itself
- Decorative lines: explicit `<div className="absolute ...">` with `height` + `backgroundColor` inline styles

## ScalePositions component architecture

The main component (`app/components/ScalePositions.tsx`) owns all state:

- `scaleMode` / `noteFilter` / `selectedSystems` / `keyIdx` — filter controls
- `selectedIdx` — which cell is highlighted in the grid (persists after modal closes)
- `modalIdx` — which position is open in the modal (`null` = closed); set on cell click, cleared on modal close or scale change
- `unifiedScaletones` — `Set<number>` of scaletones currently showing a unified (merged) fretboard view; cleared on system or scale change

**Scale systems** — three systems available: `"3nps"`, `"caged"`, and `"sym"`. Users can select 1 or 2 at a time via toggle buttons. The `selectedSystems` state is a `System[]` (length 1-2); when 2 are selected the remaining button is disabled — the user must deselect one before selecting another. Systems are always displayed in a consistent column order: 3nps < caged < sym.

**Grid layout** — when 2 systems are selected, positions are paired by scaletone (1-7) in a 2-column grid. CAGED has only 5 shapes, so 2 rows get empty placeholder cells (dashed border) for the missing scaletones. When 1 system is selected, positions flow naturally in the 2-column grid.

**CAGED system** — defined in `scalePositions.utils.ts` as `CAGED_SHAPES`, an array of 5 shape definitions (E, D, C, A, G in neck order). Each shape specifies interval patterns per string for both major and minor. The `buildCagedPositions()` function generates `ScalePosition` objects with `system: "caged"` and a `shapeName` field. CAGED scaletone mapping differs between major and minor (derived from the first interval on the E string).

**Cross-system fret alignment** — every `ScalePosition` has a `startFret: number` field equal to `rawMinFret % 12` (the absolute minimum fret before `toRelative()` normalization, mod 12). When two systems are paired in the grid, `gridItems` computes a `fretOffset` for each cell by comparing their `startFret` values: the position with the higher `startFret` gets `fretOffset = diff`, shifting its dots to the right so both fretboards show the same physical neck region. The offset is threaded as a prop through `PositionCell` → `Fretboard` → `StringRow`; `StringRow` uses `n.fret === f - fretOffset` for note lookup, and `Fretboard` expands `fretCount` by `fretOffset`. `ShapeModal` always uses `fretOffset=0` (single position, no alignment needed). For minor scale, CAGED shapes E, C, and G extend one fret lower than their paired 3nps/sym positions (offset=1); D and A are naturally aligned (offset=0). **CAGED fret-count matching** — when 3nps + CAGED are paired, `gridItems` also computes a `fretCount` override for each CAGED cell: `Math.max(naturalCAGED, natural3nps)`, ensuring both fretboards display the same number of frets. This is passed as an optional `fretCount` prop through `PositionCell` → `Fretboard`, where it overrides the locally-computed value.

**Key selection** — a 12-key selector (E through Eb) shifts all fretboard fret numbers to reflect the real guitar neck position for the chosen key. `keyIdx` state is persisted to `localStorage` under `"shred-dojo-key"` (lazy initializer, same pattern as `"shred-dojo-dark"`). `keyOffset = (keyFret - ROOT_FRET + 12) % 12`. For each `PositionCell`, `displayStartFret = pos.startFret + keyOffset + normShift + octaveShift - fretOffset`. For `UnifiedCell`, `displayStartFret = Math.min(posA.startFret, posB.startFret) + keyOffset + normShift + octaveShift`. Both `Fretboard` and `UnifiedFretboard` accept a `displayStartFret?: number` prop; when provided, fret numbers render as `f + displayStartFret` and fret inlay dot markers are drawn above the fret number row. `FRET_INLAYS` and `FRET_DOUBLE` sets are exported from `scalePositions.utils.ts` and shared with `ShapeExplorer.tsx`.

**Register toggle** — `octaveShift: 0 | 12` state (not persisted). Lower 12 = `octaveShift = 0`; Upper 12 = `octaveShift = 12`. Applied on top of key+normShift, so the same shape dots appear 12 frets higher on the neck.

**Lower-octave normalization (`normShift`)** — `gridItems` computes a `normShift: -12 | 0` per row (or per pair when 2 systems are selected). For a single system: `normShift = (pos.startFret + keyOffset) > 12 ? -12 : 0`. For a cross-system pair: both cells share the same `normShift`, computed from the reference position (the one with `fretOffset = 0`, i.e. the lower `startFret`). This keeps pair cells aligned while still preferring the lower octave. `normShift` is stored in each `gridItem` and threaded through `PositionCell` display and `UnifiedCell`.

**ShapeModal Full Neck panel** — at the bottom of `ShapeModal`, a **"▼ Full Neck"** toggle expands a `FullNeckFretboard` showing the selected position at its absolute neck location. A **"Show other shapes (dimmed)"** checkbox overlays all positions from the same system(s). Main position uses normalized + `octaveShift` display fret; dimmed positions use raw `pos.startFret + keyOffset` (no normalization) so each shape appears at its natural location across the full 24-fret neck.

**Fretboard size variants** — `Fretboard`, `StringRow`, and `Dot` accept a `large` boolean prop. When `large={true}`: string rows are `h-[42px]` (vs `29px`), dots are `w-7 h-7` (vs `w-5 h-5`), and text sizes scale up proportionally. Used by `ShapeModal` for the enlarged view.

**Unified view** — when 2 systems are selected, each scaletone separator row shows a "Unify" toggle button (hidden for scaletones where one system has no shape, e.g. CAGED scaletones 6-7). Clicking it merges both positions' notes onto a single full-width `UnifiedCell` fretboard, replacing the two side-by-side cells. The merge is handled by `mergePositions()` in `scalePositions.utils.ts`, which combines notes from both positions using their `fretOffset` values to compute absolute fret positions. Notes at the same fret+string from both systems produce a single `UnifiedNote` with `systems: [sysA, sysB]`. The `UnifiedDot` component renders a system-colored ring around each dot — solid for single-system notes, split-gradient for shared notes. Types `UnifiedNote` and `UnifiedString` are defined in `scalePositions.types.ts`. The unified fretboard uses `fretOffset=0` since notes are pre-resolved to absolute positions.

**Modal navigation** — `ShapeModal` cycles through positions sharing the same `system` as the initially clicked shape. Navigation updates both `modalIdx` and `selectedIdx` in sync.

## Pentatonic Triads feature

The Pentatonic Triads page (`/pentatonic-triads`) visualizes the triad intervals (root, 3rd, 5th) within and across the 5 standard pentatonic box shapes, rooted on G.

### Files

- `app/components/pentatonicTriads.utils.ts` — scale data and box construction
- `app/components/PentatonicTriads.tsx` — all component code
- `app/routes/pentatonic-triads.tsx` — route wrapper

### Data model

- `BOX_DEGREES` — hardcoded degree assignments per string per box (low E → high e), two degrees per string, for both major and minor pentatonic. There are 5 boxes each.
- `buildBox(boxIdx, scale)` — builds one box as a flat array of `BoxNote` (`{ string, fret, deg }`). Uses `closestFret()` to anchor each note near a reference fret, keeping the shape in the correct neck region.
- `bluesNotesForBox(boxNotes)` — derives b5 "blue note" positions algorithmically: any string whose two degrees are `[b3, 4]` or `[4, 5]` receives a b5 exactly 1 fret above the 4th. No hardcoded per-box data.
- `adjustAdjacentFrets(notes, currentMinF, currentMaxF, side)` — when boxes wrap around the neck (e.g. box 4 → box 0), shifts frets by ±12 so the adjacent box is physically adjacent in fret space. Filters out frets < 0 or > 24.

### Dot variants

- `solid` — filled dot, used for notes within the current shape
- `cross` — dashed outline, used for triad tones from adjacent shapes shown at the edge of the main fretboard
- `connector` — filled dot with accent ring (`boxShadow: 0 0 0 2.5px var(--bg), 0 0 0 4px var(--accent)`), used in the combined panoramic view for notes that cross the shape boundary

### Per-shape cross notes

For each shape, the component computes:
- `leftCross` — triad tones from the previous shape (`prevAdjusted`) whose fret is strictly less than `mainMinF`
- `rightCross` — triad tones from the next shape (`nextAdjusted`) whose fret is strictly greater than `mainMaxF`

These appear as `cross`-variant ghost dots at the left/right edges of the main fretboard, giving a quick visual hint that triad tones are reachable just outside the shape.

### Neck context / combined fretboard

Each shape card has a **"▼ Neck context"** toggle. When expanded, it renders a single `CombinedFretboard` showing the previous shape, current shape, and next shape on one continuous neck:

- **Zone labels** — `← Shape N` / `Shape X` (accent color) / `Shape N →` — positioned above fret columns using flex proportions (`flex: numFretsInZone`) so they align precisely with the fretboard.
- **Zone backgrounds** — a warm `var(--accent)` band at 10% opacity marks the current shape's fret range; outer zones have no background.
- **Dimming** — outer-zone notes (not cross notes) rendered at 32% opacity so the adjacent shape's structure is visible without competing for attention.
- **Cross notes in the combined view** — `leftCross`/`rightCross` notes rendered at full opacity with `connector` variant (accent ring), even though they sit in the dimmed outer zones. These are the key information: triad tones reachable from both shapes without a full position shift.
- **Priority** — when a fret+string appears in both the main shape and an adjacent shape, the main shape's note wins.

### Blues scale

Blues mode is minor-only; the toggle is hidden and auto-cleared when Scale switches to Major. b5 notes bypass the "Triad only" show-mode filter — they remain visible even when non-triad scale tones are hidden.

## Interval Shapes feature

The Interval Shapes page (`/interval-shapes`) teaches the recurring two-string interval shapes that appear within the 5 standard pentatonic box positions, rooted on G.

### Files

- `app/components/intervalShapes.utils.ts` — shape definitions, degree metadata
- `app/components/IntervalShapes.tsx` — all component code
- `app/routes/interval-shapes.tsx` — route wrapper

### Shapes breakdown

- **Standard shapes** (P4-tuned pairs, id does not contain "GB") — 4 recurring shapes for minor, 4 for major, each appearing 4× across boxes
- **G–B variants** (id contains "GB") — separate shapes for each box's G–B pair, where the minor-3rd tuning gap shifts the upper-string notes up by 1 fret

### Modes

- **Diagram** — grid of `ShapeCard` components showing all shapes at once, split into P4 and G–B sections. Dots are always revealed.
- **Flashcard** — one shape at a time; dots for non-root degrees are hidden (`?`) until the user taps to reveal. Navigation cycles through all shapes for the selected scale. Description appears below the card when revealed. `FlashcardPanel` is keyed on `scale` to reset index on scale change.

## Pentatonic Colors feature

The Pentatonic Colors page (`/pentatonic-colors`) shows Box 1 of the minor or major pentatonic (rooted on G) and lets the user layer "color notes" from related modes/scales onto the same fretboard. Pentatonic notes render in standard degree colors; color notes render as amber/gold dots labeled with their interval name (e.g. `b5`, `6`, `maj7`).

### Files

- `app/components/pentatonicColors.utils.ts` — types, mode configs, `buildColorNotes()`
- `app/components/PentatonicColors.tsx` — all component code
- `app/routes/pentatonic-colors.tsx` — route wrapper

### Color note computation

`buildColorNotes(boxNotes, config, displayMin, displayMax) → ColorNote[]` — for each string and each `{ semi, degLabel }` in the config, calls `_closestFret()` (a local duplicate of the unexported `closestFret` from `pentatonicTriads.utils.ts`). Includes the note only if its fret falls within `[displayMin, displayMax]` and doesn't collide with an existing pentatonic note. The `displayMin` / `displayMax` passed in are `boxMinFret - 1` / `boxMaxFret + 1` (one fret of padding each side).

**Color dots** (`ColorDot`) use amber: `var(--sys-caged)` (matches the CAGED system color, same hex); white text; interval label inside.

Mode configs: `MINOR_COLOR_MODES` has 5 entries (Aeolian, Blues, Dorian, Phrygian, Harmonic Minor); `MAJOR_COLOR_MODES` has 3 (Ionian, Lydian, Mixolydian). Scale toggle resets mode to first option on change.

## Shape Explorer feature

The Shape Explorer (`/shape-explorer`) is a scale shape visualizer with two complementary views: **Focus** (one shape at a time, full-width fretboard) and **Overview** (all shapes in a compact grid). Key selection makes fret numbers reflect the actual guitar neck for any of 12 keys.

### Files

- `app/components/ShapeExplorer.tsx` — all component code (self-contained, no sibling utils/types files)
- `app/routes/shape-explorer.tsx` — route wrapper

### What it does

- **System** — 3nps (7 positions), CAGED (5 shapes), or Penta (5 pentatonic boxes built from `buildBox()` in `pentatonicTriads.utils.ts`).
- **Blues** — visible only when System = Penta AND Scale = Minor. Resets automatically when switching System away from Penta or Scale to Major.
- **Show filter** — All / Penta / Chord (hidden when System = Penta).
- **Register** — Lower 12 / Upper 12; `octaveShift: 0 | 12`. `computeDisplayFret(startFret, keyOffset, octaveShift)` normalizes to lower octave first (`raw > 12 ? raw - 12 : raw`) then adds `octaveShift`. Used for card fretboards and the main layer in the neck panel; dimmed layers always use raw positions.
- **View** — Focus (single shape with navigator/pills/notes panel), Pair (two shapes overlaid on one fretboard), or Overview (compact grid of all shapes). Switching system always resets to Focus.

**Overview grid** — `OverviewGrid` sub-component. CSS grid `auto-fill minmax(220px, 1fr)`. Compact sizing: dots `w-4 h-4` (vs `w-8 h-8`), string rows `h-[28px]` (vs `h-[50px]`). Clicking a cell jumps to Focus.

**Pair view** — two independently selectable shapes (A and B) merged onto a single fretboard spanning their combined fret range. Merging is done by `buildCombinedStrings()` (defined locally), which converts both shapes to absolute frets, finds overall min/max, and produces `CombinedNote[]` with `which: "a" | "b" | "both"`. B's active pill uses `--fifth-col` (blue). `CombinedDot`: A-only = standard; B-only = `--fifth-col` fill; both = standard + blue ring (`boxShadow`).

### Key transposition

All shapes are built in G (ROOT_FRET = 3 on low E). For a chosen key K:

```
keyOffset = (keyFret - ROOT_FRET + 12) % 12
displayStartFret = computeDisplayFret(shape.startFret, keyOffset, octaveShift)
// where: raw = startFret + keyOffset; base = raw > 12 ? raw - 12 : raw; return base + octaveShift
```

### Full Neck panel

In **Focus view**, a **"▼ Full Neck"** toggle expands a `FullNeckFretboard`. **Main shape layer**: uses `computeDisplayFret` (normalized + `octaveShift`). **Dimmed layers**: use raw `shape.startFret + keyOffset` (no normalization, no `octaveShift`) so each shape appears at its natural position. Root notes in dimmed layers render at `var(--root-col)` (40% opacity).

### Pentatonic boxes

`buildBox(boxIdx, scale)` returns `BoxNote[]` (absolute frets in G). Converted to `ScaleString[]` via `boxNotesToScaleStrings()` (local), which normalizes to relative frets with `toRelative()` and records `startFret = minFret % 12`. When blues mode is active, `bluesNotesForBox()` is called on the raw `BoxNote[]` before conversion and its b5 results merged in. The `Dot` component checks `note.deg === "b5"` before the generic penta check and applies `var(--blues-col)`.

## Home page

`app/routes/home.tsx` — the public landing page at `/`. Always renders the full `HomePage` component (no coming-soon gate).

- **Loader** — returns `{ preview: boolean }` based on `?preview=true` in the URL. The component uses this to unlock Lick Stash entry points and writes `"shred-dojo-preview"` to localStorage when `preview=true`.
- **Lick Stash gating** — the "Browse Lick Stash" hero CTA and footer link are hidden when `!preview`. The Lick Stash tool card renders as a non-clickable `<div>` at 40% opacity (labeled "Preview only") when `!preview`.

## Nav component

`app/components/Nav.tsx` — persistent navigation bar rendered at the top of every page. Props: `isDark: boolean`, `toggleDark: () => void`. Each page owns its own dark-mode state and passes it in. Dark mode and preview state are persisted to localStorage. Preview-gated nav links render as a faint non-interactive `<span>` when not unlocked.

**Nav structure** (5 category groups with `|` separators):
- **Scales**: Systems → `/scale-positions`, Shape Explorer → `/shape-explorer`, Wylde → `/wylde-scales`
- **Pentatonic**: Triads → `/pentatonic-triads`, Colors → `/pentatonic-colors`, Intervals → `/interval-shapes`
- **Harmony**: Chords → `/chord-voicings`, Arpeggios → `/arpeggio-maps`, Circle of Fifths → `/circle-of-fifths`
- **Vocabulary**: Lick Stash → `/lick-stash` *(preview-gated)*
- **Practice**: Fretboard Notes → `/note-recognition`, Staff Notes → `/staff-notes`

## Fretboard Notes feature

The Fretboard Notes page (`/fretboard-notes`) is an interactive quiz for building instant note-recognition on the guitar neck. A dot is highlighted on a fretboard diagram; the user identifies the note name.

### Files

- `app/components/FretboardNotes.tsx` — all component code (self-contained)
- `app/routes/fretboard-notes.tsx` — route wrapper

### Question pool and scoring

`buildPool(cfg)` iterates every (string × fret 0..maxFret) combination, computes the note via `noteAt(string, fret)`, and filters by scope. `pickNext(pool, prev)` picks a random question, excluding the immediately previous one.

`highScore` — longest streak for the current settings, persisted to `localStorage` under `fn-hs-{sortedStrings}-{scope}-{maxFret}`.

### Quiz UX

- **Correct**: dot turns green, clicked button turns green, "Correct!" text → auto-advance after 550ms
- **Wrong**: dot turns red, clicked button turns red, "Try again" text → clears after 650ms, stays on same question
- Wrong answers do not reveal the correct note — active recall is required

### Fretboard layout

`QuizFretboard` renders a horizontal fretboard. `DISPLAY_STRINGS` order — `["e","B","G","D","A","E"]` (high e at top). Open string column (36px) left of nut (8px); fret cells 40px each; `overflow-x-auto`. Position markers: single dot above frets 3, 5, 7, 9; double dot above 12/24.

## Staff Notes feature

The Staff Notes page (`/staff-notes`) is a treble clef note-reading quiz. A whole note is displayed on a music staff SVG; the user identifies its name.

### Files

- `app/components/StaffNotes.tsx` — all component code (self-contained, no sibling files)
- `app/routes/staff-notes.tsx` — route wrapper

### Key implementation details

`FULL_POOL` — 24 static `PoolEntry` objects covering C4–B5 (not derived algorithmically). `pickNext(pool, prev)` deduplicates on `(noteName, octave)` — **not** `staffStep`, because e.g. B4 and Bb4 share the same staff line but are distinct questions.

`highScore` persisted under `sn-hs-{scope}-{range}` (4 distinct keys). `noteStyle` persisted separately under `sn-note-style`.

**Staff SVG** (`StaffDisplay`, `viewBox="0 0 280 110"`, `overflow="visible"`):
- Note head — two concentric ellipses at rotation −16°: outer filled in note color, inner filled in `var(--surface)`. This produces the standard engraved whole-note ring appearance.
- Ledger lines drawn for C4 (below staff) and A5/B5 (above staff).
- Note Y position: `noteY(step) = 73 - (step - 2) * 6` where `step` is the diatonic position from C4.

Quiz UX is the same pattern as Fretboard Notes (550ms correct advance, 650ms wrong feedback, no answer reveal).

## Chord Voicings feature

The Chord Voicings page (`/chord-voicings`) shows the 5 CAGED chord shapes for five chord types: Major, Minor, Dom 7, Maj 7, Min 7 — rooted on G.

### Files

- `app/components/chordVoicings.types.ts` — `ChordType`, `CHORD_TONES`, `CHORD_LABELS`, `CHORD_TYPES`, `ChordStringVoicing`, `ChordVoicingData`
- `app/components/chordVoicings.utils.ts` — `buildChordVoicings(chordType)` and `DEG_COLOR` (shared with ArpeggioMaps)
- `app/components/ChordVoicings.tsx` — all component code
- `app/routes/chord-voicings.tsx` — route wrapper

`buildChordVoicings(chordType)` — returns 5 `ChordVoicingData` objects (one per CAGED shape). For each string the best (lowest-fret) chord tone is selected; strings with no chord tones are marked muted.

`DEG_COLOR` maps degrees to CSS variables: Root → `var(--root-col)`, 3rd/b3 → `var(--sys-caged)`, 5th → `var(--fifth-col)`, 7th/b7 → `var(--seventh-col)`. Shared by both ChordVoicings and ArpeggioMaps.

## Arpeggio Maps feature

The Arpeggio Maps page (`/arpeggio-maps`) shows chord-tone positions across the neck for two systems — CAGED (5 shapes) or 3nps (7 positions) — and the same five chord types as Chord Voicings.

### Files

- `app/components/arpeggioMaps.utils.ts` — `buildArpeggioPositions(chordType)` (CAGED) and `buildArpeggio3npsPositions(chordType)` (3nps); both reuse existing builders from `scalePositions.utils.ts`
- `app/components/ArpeggioMaps.tsx` — all component code (shares `DEG_COLOR`, `CHORD_TONES`, `ChordType` from `chordVoicings.*`)
- `app/routes/arpeggio-maps.tsx` — route wrapper

Both builders use `cfgForChordType()` — dom7 uses a Mixolydian config so b7 appears in positions.

## Lick Stash feature

The Lick Stash (`/lick-stash`) provides curated "lick packs" — collections of Guitar Pro tabs that users can view, play, and loop. The route is publicly accessible but gated in the UI: the Nav link and home-page card are hidden/disabled unless the visitor has unlocked preview mode (see **Preview gating** below).

**Preview gating** — visiting any page with `?preview=true` writes `"shred-dojo-preview": "true"` to localStorage (done in both `HomePage` and `Nav`). Once set it persists across sessions.

### Routes

- `/lick-stash` (`routes/lick-stash.tsx`) — pack listing page. Available packs link to their detail page; disabled packs show at reduced opacity with "Coming soon".
- `/lick-stash/:packSlug` (`routes/lick-stash-pack.tsx`) — individual pack page with accordion-style lick cards. Only one lick open at a time to avoid competing AlphaTab instances.

Guitar Pro source files live in `resources/gp-tabs/`; servable copies go in `public/tabs/`.

### AlphaTab integration

- `AlphaTabPlayer.tsx` — client-only wrapper around `AlphaTabApi`. Uses dynamic `import("@coderline/alphatab")` inside `useEffect` to avoid SSR crashes (AlphaTab requires DOM, Web Workers, Web Audio).
- **Stave profile**: `StaveProfile.ScoreTab` — renders standard notation above guitar tablature so timing/rhythm information is visible.
- **Cursor**: AlphaTab injects `.at-cursor-bar` and `.at-cursor-beat` DOM elements during playback but ships no default CSS for them. Styles are injected via a `<style>` tag inside `AlphaTabPlayer.tsx` (the only place allowed to style third-party-generated class names that can't be reached with Tailwind utilities).
- **Looping — do not use `api.isLooping`**: AlphaTab's built-in loop is reactive — it waits for the audio buffer to drain before restarting, producing an audible gap. This is a known bug tracked in AlphaTab issue #2569, planned for v1.8.2. Instead, `AlphaTabPlayer` implements looping manually: `playerPositionChanged` watches `currentTick`, and when `currentTick >= endTick - 20`, jumps back via `api.tickPosition = 0` while the player is still running. At 960 PPQ this is ~1/48th of a beat — inaudible — but early enough to prevent the sequencer from stopping MIDI event dispatch and triggering the fade-out drain. A `playerFinished` handler calling `api.play()` directly acts as a fallback if the tick window is missed.
- **Cleanup**: `api.destroy()` is called in the `useEffect` cleanup to prevent memory leaks and detached DOM nodes.

## Wylde Scales feature

The Wylde Scales page (`/wylde-scales`) visualizes Zakk Wylde's 3-notes-per-string approach to the diatonic scale, pairing each of the 7 modal positions with its corresponding pentatonic box.

### Files

- `app/components/wyldeScales.utils.ts` — `buildWylde()`, `buildAllWyldePositions()`, mode names
- `app/components/WyldeScales.tsx` — all component code (self-contained)
- `app/routes/wylde-scales.tsx` — route wrapper

### How Wylde's 3nps differs from standard systems

**vs. `build3nps`**: On B string, Wylde resets the degree cursor to `(startDegIdx + 4) % 7` — one step back — instead of continuing sequentially. This repeats G string's last degree on B, keeping the shape in a compact 4–5 fret window. The `buildWylde` function is identical to `build3nps` except for one line: at `si === 4` (B string), `degCursor` is reset.

**vs. `buildSym`**: Sym drops G string to 2 notes so B can start cleanly. Wylde keeps G at 3 notes and deliberately overlaps the G→B transition.

### Fret coordinate system / octave normalization

Both the diatonic shape and the pentatonic box are built internally in G (ROOT_FRET = 3). **Critical**: the diatonic uses `startFret = rawMin % 12` (normalized), but penta boxes are built with raw absolute frets that can be at fret 12–15 for boxes near the octave boundary. Adding `keyOffset` directly to raw penta frets shifts them a full octave in the wrong direction.

The fix: penta display frets use the same normalization as diatonic:
```
pentaAbsStart = (pentaRawMin % 12) + keyOffset
pentaDisplayFret = (penta.fret - pentaRawMin) + pentaOffset
// where pentaOffset = pentaAbsStart - displayStartFret
```

`pentaRawMin` — the raw (non-normalized) minimum absolute fret of the matched penta box — is stored on `WyldePosition` for this purpose.

`rawNotesByPos` and `absNotesByPos` are separate `useMemo` arrays. `buildNeckLayers(cardIdx)` selects `absNotesByPos[i]` for the main card and `rawNotesByPos[i]` for all other (dimmed) cards in the Full Neck panel.

## FullNeckFretboard component

`app/components/FullNeckFretboard.tsx` — shared fretboard component that renders the full guitar neck (frets 0–24) with layered note overlays. Used by Shape Explorer, Scale Positions (ShapeModal), Wylde Scales, and Yngwie Scales.

- **`FullNeckLayer`** — `{ notes: FullNeckNote[], isMain: boolean }` — `isMain: true` = full degree colors; `isMain: false` = dimmed overlay. Main layer overrides dimmed at the same string:fret position.
- **Dimmed dot rendering** — root (`deg === "R"`) → `var(--root-col)` at 40% opacity; all others → `var(--border)` at 40% opacity. This keeps root note locations identifiable even in ghosted positions.
- **Raw vs. normalized positions** — callers pass dimmed layers using raw `startFret + keyOffset` (no lower-octave normalization, no `octaveShift`) so each shape appears at its natural location on the full 24-fret neck. Only the main layer uses the normalized + `octaveShift` position.
- `overflow-x-auto` with fixed min-width, scrollable horizontally on narrow screens.

## Yngwie Scales feature

The Yngwie Scales page (`/yngwie-scales`) visualizes two harmonic minor shapes favored by Yngwie Malmsteen, highlighting the raised 7th degree (leading tone).

### Files

- `app/components/yngwieScales.utils.ts` — `HARMONIC_MINOR_CFG`, `buildYngwieShapes()`, shape definitions
- `app/components/YngwieScales.tsx` — all component code (self-contained)
- `app/routes/yngwie-scales.tsx` — route wrapper

Two shapes: **Steeler Shape** (starts on 7th degree, the canonical Yngwie entry point) and **Little Savage Shape** (starts on 4th degree, higher neck position). Root dots use `var(--root-col)`; leading tone (`7`) uses `var(--seventh-col)` (purple).

`computeDisplayFret(startFret, keyOffset, octaveShift)` normalizes to lower octave (`raw > 12 ? raw - 12 : raw`) then adds `octaveShift`. Full Neck panel follows the same main/dimmed layer pattern as other pages.

## MetronomeWidget

`app/components/MetronomeWidget.tsx` — a persistent floating metronome rendered in `root.tsx`, fixed to the bottom-right corner of every page. Self-contained: no props, no context. Manages its own dark-mode sync by polling `localStorage` every 500ms.

**Mobile layout** — Tracks `windowWidth` and `windowHeight` via resize listener. On mobile (`windowWidth < 700`): panel width is `Math.min(windowWidth - 32, 280)`, drone grid is 4 columns instead of 6. On short viewports (`windowHeight < 500`), the expanded panel gets `maxHeight = windowHeight - 60` with `overflowY: "auto"`. BPM drag supports touch events with `touchAction: "none"` to prevent scroll conflict.

### Audio engine

Uses the Web Audio API look-ahead scheduler pattern: a `setTimeout` loop fires every `LOOKAHEAD_MS = 25ms` and schedules click events up to `SCHEDULE_AHEAD_S = 0.1s` ahead of `ctx.currentTime`. `AudioContext` is created lazily on first play to satisfy browser autoplay policies.

- **Click sound** — `OscillatorNode` (triangle wave). Downbeat: 1100 Hz, vol 0.45. Subdivision: 750 Hz, vol 0.25. Short exponential decay (~60ms).
- **Drone sound** — `OscillatorNode` (sine wave), sustained continuously; fades in/out over ~100ms on key change to avoid clicks. Base: `E2_HZ = 82.41` Hz, transposed as `82.41 * 2^(semitone / 12)`.

### BPM controls

- **Drag** — vertical mouse drag on the BPM number. A `dragMoved` flag (threshold: 3px) distinguishes drag from click.
- **Click to type** — clicking without dragging enters edit mode: the number becomes an `<input type="text" inputMode="numeric">`. Enter or blur commits; Escape cancels.
- **Tap tempo** — averages the last 4 tap intervals. Range: 40–240 BPM.

### Drone

6×2 grid of all 12 chromatic keys. Clicking a key starts the drone; clicking the same key stops it; clicking a different key crossfades. When active, the collapsed trigger button shows `~KEY` (e.g. `~A`).

## Circle of Fifths feature

The Circle of Fifths page (`/circle-of-fifths`) shows an interactive SVG diagram of the 12 keys arranged by perfect fifths.

### Files

- `app/components/circleOfFifths.utils.ts` — `FIFTHS` array (12 `KeyInfo` entries), `keySigLabel()`, `keySigShort()`
- `app/components/CircleOfFifths.tsx` — all component code (self-contained)
- `app/routes/circle-of-fifths.tsx` — route wrapper

`KeyInfo` — `{ major, minor, keySig, scaleNotes, diatonicChords, relatedMajors, relatedMinors }`. `FIFTHS` — 12 entries clockwise from C (top): C G D A E B F# Db Ab Eb Bb F. All data is hardcoded.

`CircleDiagram` renders a 560×560 SVG (center 280,280) with three concentric rings (major keys / key signature / relative minor) built from `arcSegmentPath()`. SVG fills use `style={{ fill: "var(--surface)" }}` (not presentation attributes) so CSS variables resolve correctly.

The `InfoPanel` below the SVG shows diatonic chords and clickable related-key pills when a key is selected.

## Scale Builder feature

The Scale Builder page (`/scale-builder`) lets users explore five common scale formulas in any of 12 root keys. Two view modes — **Names** and **Staff** — show the resulting notes as labeled chips or on a VexFlow treble clef staff.

### Files

- `app/components/scaleBuilder.utils.ts` — constants and pure functions (no React deps)
- `app/components/ScaleBuilder.tsx` — all component code (`ScaleBuilder`, `NamesView`, `ExerciseProgress`, `NotePalette`, `StaffView`)
- `app/routes/scale-builder.tsx` — route wrapper

### Data model

- `NOTES_FROM_C` — chromatic lookup ordered from C, used for octave-aware scale construction
- `buildScale(root, intervals) → ScaleNote[]` — MIDI arithmetic: `rootMidi = 60 + SEMI_FROM_C[root]`. Iterates `intervals.slice(0, -1)` (drops the return-to-root step), deriving `{ note, octave }` per step.
- `toVexNote(sn) → { key, accidental }` — flat detection: `n.length === 2 && n[1] === "b"` (correctly distinguishes "Bb" from "B").

### VexFlow integration (`StaffView`)

Uses the **VexFlow 5 low-level API** (not EasyScore) for full control over note count and spacing.

- **Dynamic import** inside `useEffect` to avoid SSR.
- **`ResizeObserver`** tracks `containerWidth`; the observer wraps measurements in `requestAnimationFrame` and reads `el.getBoundingClientRect().width` (actual rendered width) rather than `contentRect.width` (which can be stale during orientation change). A `window.addEventListener('resize', measure)` fallback guarantees at least one correct measurement. This prevents the stem-detachment bug where stems and note heads land at different X positions.
- **Cancellation flag** — each effect sets `let cancelled = false` and returns `() => { cancelled = true }`. `el.innerHTML = ""` cleared inside the `.then()` (after the cancelled check), not before the import — ensures only the winning render clears the container.
- **`Voice.Mode.SOFT`** — suppresses beat-count validation so 5, 6, or 7 quarter notes all work without a time signature.
- **Formatter width** derived from stave geometry: `stave.getWidth() - (stave.getNoteStartX() - stave.getX()) - 10` — ensures stems align with note heads.
- **Accidentals**: `note.addModifier(new Accidental(accidental), 0)` added explicitly (low-level API does not auto-render accidentals from the key string alone).

### Exercise mode

**`pageMode`** — `"reference" | "exercise"`. In exercise mode, `StaffView` renders ghost notes for future slots (correct pitch visible, turns exercise into note-name reading). Wrong answers are never revealed — active recall only. `initExercise(scaleNotes)` pre-fills index 0 with the root; a `useEffect` on `[pageMode, scaleNotes]` calls it whenever entering exercise mode or when key/scale type changes.

## Chord Tones feature

The Chord Tones page (`/chord-tones`) is an interactive quiz where the full scale shape is shown on a fretboard and the user must identify the interval/degree of one highlighted note at a time.

### Files

- `app/components/ChordTones.tsx` — all component + logic (self-contained, no sibling files)
- `app/routes/chord-tones.tsx` — route wrapper

### Pool building

- Pentatonic: `buildBox(boxIdx, scale)` from `pentatonicTriads.utils.ts`; normalize absolute frets to relative by subtracting `minFret`; `startFret = minFret % 12`
- Blues: minor penta pool + one `"b5"` note at `fret + 1` for every `"4"` note on the same string
- Diatonic 3nps: `buildAllPositions(cfg)` filtered to `system === "3nps"`, indexed by `shapeIdx`
- Diatonic CAGED: `buildCagedPositions(cfg)` indexed by `shapeIdx`

### Answer degrees per mode

| Scale | All Notes | Chord Tones |
|---|---|---|
| Minor Penta | R b3 4 5 b7 | R b3 5 |
| Major Penta | R 2 3 5 6 | R 3 5 |
| Blues | R b3 4 b5 5 b7 | R b3 5 |
| Minor | R 2 b3 4 5 b6 b7 | R b3 5 |
| Major | R 2 3 4 5 6 7 | R 3 5 |

### Note states and dot display

| State | Color | Label |
|---|---|---|
| `idle` | `var(--muted)` fill | none |
| `current` | `var(--text)` fill, pulsing | `?` |
| `correct` | `#2d8a40` green (550ms flash) | degree |
| `wrong` | `#b03020` red (650ms flash) | `?` |
| `answered` | `FULL_DEG_COLOR[deg]` (persists) | degree |

`FULL_DEG_COLOR` is `DEG_COLOR` from `intervalShapes.utils.ts` extended with `b6: "#7a5030"` and `"7": "#c07040"`.

### Round / scoring

When all notes in the pool have been answered once (`answeredKeys.size >= pool.length`), `answeredKeys` is cleared and the round restarts — streak continues unbroken. High scores persisted under `"ct-hs-${scale}-${system}-${shapeIdx}-${filter}"`.

## React Router v7 conventions

- Routes are explicitly registered in `app/routes.ts` (not auto-discovered). Add every new route there with `route("path", "routes/file.tsx")`.
- Use `loader` / `action` exports for data fetching and mutations
- Type route props with the generated types from `./+types/<route-name>`
- Use `<Link>`, `<Form>`, `useFetcher`, `useLoaderData`, etc. from `react-router`

## Testing

- **Vitest** — separate `vitest.config.ts` (avoids react-router plugin conflicts with `vite.config.ts`)
- Test files live alongside the source they cover (`*.utils.test.ts` next to `*.utils.ts`)
- Only `*.utils.ts` files have tests — React components are not tested

### Test files

| File | Covers |
|---|---|
| `scalePositions.utils.test.ts` | `build3nps`, `buildSym`, `buildCagedPositions`, `buildAllPositions`, `mergePositions` — verified against Pebber Brown's PDF reference in `resources/diatonic-scales/` |
| `wyldeScales.utils.test.ts` | `buildAllWyldePositions`, `pentaAbsoluteStart` — includes regression for the Lydian octave-squash bug |
| `pentatonicTriads.utils.test.ts` | `buildBox`, `bluesNotesForBox`, `adjustAdjacentFrets` — `closestFret` is not exported but covered indirectly through `buildBox` |
| `scaleBuilder.utils.test.ts` | `buildScale`, `toVexNote` |
| `chordVoicings.utils.test.ts` | `buildChordVoicings` |

### Testing patterns

- **Compact format strings** — a `fmt` / `fmtBox` helper serialises note arrays to `"deg:fret deg:fret | …"` for human-readable snapshot assertions
- **Spot checks** — a few known reference values (manually verified or checked against reference PDFs) anchor the expected output
- **Invariant loops** — iterate over all configurations (all 7 scaletones, all 5 boxes, all 5 chord types, all 12 keys) to cover the full parameter space without hand-coding every case
- **`buildScale` enharmonics** — uses `NOTES_FROM_C` which always returns flat enharmonics (Ab not G#, Db not C#); test expectations must reflect this

## Dev commands

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run typecheck  # Type check (also runs react-router typegen)
npm run test       # Run tests (vitest)
npm run test:watch # Run tests in watch mode
```
