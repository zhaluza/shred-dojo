# Shred Dojo

## Stack

- **React Router v7** in framework mode (SSR, file-based routing under `app/routes/`)
- **React 19**
- **TypeScript**
- **Tailwind CSS v4** (via `@tailwindcss/vite` plugin — no `tailwind.config.js`)
- **Vite**
- **AlphaTab** (`@coderline/alphatab` + `@coderline/alphatab-vite`) — music notation rendering and playback from Guitar Pro files

## Project structure

```
app/
  components/    # Shared components (co-locate .types.ts, .utils.ts, .theme.ts siblings)
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

The app uses a warm parchment aesthetic established in `app/components/scalePositions.theme.ts`. All pages should follow these conventions.

**Fonts** (loaded in `root.tsx`, registered in `app.css` `@theme`):
- `font-display` → Oswald (headings, labels, buttons)
- `font-mono` → Source Code Pro (body text, monospace)

**Theming approach** — CSS custom properties injected as inline `style` on the page root `<div>`, cascading to all children. Use Tailwind arbitrary value utilities to reference them: `bg-[var(--bg)]`, `text-[var(--text)]`, etc. Dark mode is React state (not `dark:` Tailwind variant), toggled by swapping `LIGHT_THEME` / `DARK_THEME` objects.

**Color tokens** (defined in `scalePositions.theme.ts`):

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--bg` | `#f5f0e8` | `#141210` | Page background |
| `--surface` | `#ede8dc` | `#1e1a16` | Card / panel backgrounds |
| `--border` | `#c8bfaa` | `#352e24` | Borders, dividers |
| `--text` | `#1a1612` | `#e8e0d0` | Primary text |
| `--muted` | `#8a8070` | `#6a6058` | Secondary / label text |
| `--accent` | `#8b1a1a` | `#c8604a` | Highlights, active states |
| `--root-col` | `#c0392b` | `#c0392b` | Root note dots |
| `--faint` | `#c8bfaa` | `#3a3228` | Fret numbers, ghost elements |
| `--fret-bar` | `#d8cebb` | `#2a2418` | Fretboard bar lines |
| `--fifth-col` | `#4a6a8a` | `#6a9abf` | 5th degree dots (chord/arpeggio pages) |
| `--seventh-col` | `#6a4a7a` | `#9a6abf` | 7th degree dots (chord/arpeggio pages) |

**Typography scale** (Tailwind arbitrary values):
- H1: `font-display font-semibold text-[clamp(2rem,5vw,3.2rem)] tracking-[0.04em] uppercase leading-none`
- Section labels: `text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)]`
- Buttons: `font-display text-[0.75rem] tracking-[0.08em] uppercase border`
- Cell labels: `font-display text-[0.68rem] tracking-[0.13em] uppercase text-[var(--muted)]`
- Detail titles: `font-display text-[0.95rem] tracking-[0.1em] uppercase`

**Button states:**
- Default: `bg-transparent text-[var(--text)] border-[var(--border)] hover:border-[var(--text)]`
- Active: `bg-[var(--text)] text-[var(--bg)] border-[var(--text)]`

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

**Key selection** — a 12-key selector (E through Eb) shifts all fretboard fret numbers to reflect the real guitar neck position for the chosen key. `keyIdx` state is persisted to `localStorage` under `"shred-dojo-key"` (lazy initializer, same pattern as `"shred-dojo-dark"`). `keyOffset = (keyFret - ROOT_FRET + 12) % 12`. For each `PositionCell`, `displayStartFret = pos.startFret + keyOffset - fretOffset` (subtracting `fretOffset` keeps column 0 aligned when positions are shifted for comparison). For `UnifiedCell`, `displayStartFret = Math.min(posA.startFret, posB.startFret) + keyOffset`. Both `Fretboard` and `UnifiedFretboard` accept a `displayStartFret?: number` prop; when provided, fret numbers render as `f + displayStartFret` and fret inlay dot markers are drawn above the fret number row. `FRET_INLAYS` and `FRET_DOUBLE` sets are exported from `scalePositions.utils.ts` and shared with `ShapeExplorer.tsx`.

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
- `SEMI` — semitone offsets per degree per scale type, used to compute absolute fret numbers.
- `buildBox(boxIdx, scale)` — builds one box as a flat array of `BoxNote` (`{ string, fret, deg }`). Uses `closestFret()` to anchor each note near a reference fret, keeping the shape in the correct neck region.
- `buildAllBoxes(scale)` — returns all 5 boxes.
- `adjustAdjacentFrets(notes, currentMinF, currentMaxF, side)` — when boxes wrap around the neck (e.g. box 4 → box 0), shifts frets by ±12 so the adjacent box is physically adjacent in fret space. Filters out frets < 0 or > 24.

### Triad dot colors

| Role | Light | Dark |
|---|---|---|
| Root | `#c0392b` | `#c0392b` |
| 3rd | `#3a6a3a` | `#5a9a5a` |
| 5th | `#3a5a8a` | `#5a7aaa` |
| Scale tone | `var(--text)` / `var(--bg)` | same |

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
- **Zone separators** — 1px `var(--accent)` lines at 35% opacity mark the zone boundaries.
- **Fret numbers** — current zone numbers rendered in `var(--text)`; outer zone in `var(--faint)`.
- **Dimming** — outer-zone notes (not cross notes) rendered at 32% opacity so the adjacent shape's structure is visible without competing for attention.
- **Cross notes in the combined view** — `leftCross`/`rightCross` notes rendered at full opacity with `connector` variant (accent ring), even though they sit in the dimmed outer zones. These are the key information: triad tones reachable from both shapes without a full position shift.
- **Priority** — when a fret+string appears in both the main shape and an adjacent shape, the main shape's note wins.

### Controls

- **Scale** — Minor / Major toggle (clears expanded state on change)
- **Show** — All notes / Triad only (hides non-triad scale tones in all fretboard views)

## Interval Shapes feature

The Interval Shapes page (`/interval-shapes`) teaches the recurring two-string interval shapes that appear within the 5 standard pentatonic box positions, rooted on G.

### Files

- `app/components/intervalShapes.utils.ts` — shape definitions, degree metadata
- `app/components/IntervalShapes.tsx` — all component code
- `app/routes/interval-shapes.tsx` — route wrapper

### Data model

- `SHAPES` — `Record<PentaScaleMode, IntervalShape[]>` with entries for `"minor"` and `"major"`. Each `IntervalShape` describes a two-string pattern:
  - `loDegs` / `hiDegs` — `[PentaDegree, PentaDegree]` for the lower / upper string
  - `loOff` / `hiOff` — fret offset of the first note from the shape's leftmost position
  - `loSpan` / `hiSpan` — fret distance between the two notes on that string
  - `occurrences` — list of `{ box, pair }` (e.g. `{ box: 1, pair: "E–A" }`)
  - `description` — prose explanation shown in diagram cards and flashcard reveal
- `DEG_COLOR` — color per `PentaDegree` (roots red, 3rds blue/green, etc.)
- `DEG_NAMES` — readable name per degree
- `SCALE_DEGREES` — ordered degree arrays per scale mode

### Shapes breakdown

- **Standard shapes** (P4-tuned pairs, id does not contain "GB") — 4 recurring shapes for minor, 4 for major, each appearing 4× across boxes
- **G–B variants** (id contains "GB") — separate shapes for each box's G–B pair, where the minor-3rd tuning gap shifts the upper-string notes up by 1 fret

### Modes

- **Diagram** — grid of `ShapeCard` components showing all shapes at once, split into P4 and G–B sections. Dots are always revealed.
- **Flashcard** — one shape at a time; dots for non-root degrees are hidden (`?`) until the user taps to reveal. Navigation cycles through all shapes for the selected scale. Description appears below the card when revealed.

### Controls

- **Scale** — Minor / Major (re-renders both panels; `FlashcardPanel` is keyed on `scale` to reset index)
- **Mode** — Diagram / Flashcard

## Pentatonic Colors feature

The Pentatonic Colors page (`/pentatonic-colors`) shows Box 1 of the minor or major pentatonic (rooted on G) and lets the user layer "color notes" from related modes/scales onto the same fretboard. Pentatonic notes render in standard degree colors; color notes render as amber/gold dots labeled with their interval name (e.g. `b5`, `6`, `maj7`).

### Files

- `app/components/pentatonicColors.utils.ts` — types, mode configs, `buildColorNotes()`
- `app/components/PentatonicColors.tsx` — all component code
- `app/routes/pentatonic-colors.tsx` — route wrapper

### Data model

- `ColorDegreeLabel` — union of all color-note interval names: `"b2" | "2" | "b5" | "b6" | "6" | "4" | "#4" | "b7" | "maj7"`
- `ColorNote` — `{ string: StringName, fret: number, degLabel: ColorDegreeLabel }`
- `ColorModeConfig` — `{ id, label, addedSemis: Array<{ semi, degLabel }>, description }`
- `MINOR_COLOR_MODES` — 5 configs: Aeolian (`2`+`b6`), Blues (`b5`), Dorian (`6`), Phrygian (`b2`), Harmonic Minor (`2`+`b6`+`maj7`)
- `MAJOR_COLOR_MODES` — 3 configs: Ionian (`4`+`maj7`), Lydian (`#4`+`maj7`), Mixolydian (`4`+`b7`)

### Color note computation

`buildColorNotes(boxNotes, config, displayMin, displayMax) → ColorNote[]`:
1. Computes `refFret = (displayMin + displayMax) / 2`
2. For each string and each `{ semi, degLabel }` in the config, calls `_closestFret(semi, stringIdx, refFret)` — a local duplicate of the unexported `closestFret` from `pentatonicTriads.utils.ts`
3. Includes the note only if its fret falls within `[displayMin, displayMax]` and doesn't collide with an existing pentatonic note

The `displayMin` / `displayMax` passed in are `boxMinFret - 1` / `boxMaxFret + 1` (one fret of padding each side), so color notes at the edges of the box region are visible.

### Dot colors

- **Pentatonic dots** (`PentaDot`) — same root/3rd/5th colors as the Pentatonic Triads feature; other scale tones use `var(--text)` fill
- **Color dots** (`ColorDot`) — amber: `#c8a060` (dark) / `#9a7830` (light); white text; interval label inside

### Controls

- **Scale** toggle — Minor / Major (resets mode to first option on change)
- **Color** toggle — mode options change based on selected scale

## Shape Explorer feature

The Shape Explorer (`/shape-explorer`) is a scale shape visualizer with two complementary views: **Focus** (one shape at a time, full-width fretboard) and **Overview** (all shapes in a compact grid). Key selection makes fret numbers reflect the actual guitar neck for any of 12 keys.

### Files

- `app/components/ShapeExplorer.tsx` — all component code (self-contained, no sibling utils/types files)
- `app/routes/shape-explorer.tsx` — route wrapper

### What it does

Unlike the Scale Patterns page (which emphasizes side-by-side system comparison), Shape Explorer can show either one shape in depth or all shapes at a glance:

- **Key selector** — 12 chromatic keys (E through Eb). Fret numbers on the fretboard shift to show the real neck position for the chosen key.
- **System** — 3nps (7 positions), CAGED (5 shapes), or Penta (5 pentatonic boxes built from `buildBox()` in `pentatonicTriads.utils.ts`).
- **Scale** — Minor / Major.
- **Show filter** — All / Penta / Chord (hidden when System = Penta, which is implicitly penta-only).
- **View** — Focus (single shape with navigator/pills/notes panel), Pair (two shapes overlaid on one fretboard), or Overview (compact grid of all shapes). Switching system always resets to Focus. Clicking a cell in Overview jumps to Focus for that shape.
- **Shape navigator** — (Focus and Pair modes) Prev/Next buttons plus labeled pills (1–7 for 3nps, E/D/C/A/G for CAGED, B1–B5 for pentatonic).

**Overview grid** — rendered by `OverviewGrid` sub-component. Uses CSS grid `auto-fill minmax(220px, 1fr)`. Each cell shows a compact fretboard (`compact` prop on `ExplorerFretboard`, `StringRow`, and `Dot`) with correct `displayStartFret` for the selected key. The currently selected shape gets `border-[var(--text)]`. Compact sizing: dots `w-4 h-4` (vs `w-8 h-8`), string rows `h-[28px]` (vs `h-[50px]`).

**Pair view** — shows two independently selectable shapes (A and B) merged onto a single fretboard spanning their combined fret range on the neck. Shape selectors for both A and B have their own prev/next buttons and labeled pills; B's active pill uses `--fifth-col` (blue) to distinguish from A's standard styling. Merging is done by `buildCombinedStrings()` (defined locally in `ShapeExplorer.tsx`), which converts both shapes to absolute frets (relative fret + `displayStartFret`), finds the overall min/max fret, and produces `CombinedString[]` / `CombinedNote[]` with a `which: "a" | "b" | "both"` field. The `CombinedDot` component renders: A-only = standard appearance; B-only = `--fifth-col` blue fill; both = standard appearance + blue ring (`boxShadow`); root in B or shared = `--root-col` + blue ring. All note filters (All / Penta / Chord) apply to both shapes. Switching system resets `pairIdx` to 1.

### Key transposition

All shapes are built in G (ROOT_FRET = 3 on low E). For a chosen key K:

```
keyOffset = (keyFret - ROOT_FRET + 12) % 12
displayStartFret = shape.startFret + keyOffset
```

Fret labels on the fretboard are rendered as `f + displayStartFret` (absolute guitar frets), so the shape dots stay at relative positions 0..N while the numbers reflect the real neck position. Fret inlay dots (single at 3, 5, 7, 9; double at 12, 24) are drawn based on the absolute fret value.

### Pentatonic boxes

Pentatonic shapes use `buildBox(boxIdx, scale)` from `pentatonicTriads.utils.ts`, returning `BoxNote[]` (absolute frets in G). These are converted to `ScaleString[]` via `boxNotesToScaleStrings()` (defined locally in `ShapeExplorer.tsx`), which normalizes to relative frets with `toRelative()` and records `startFret = minFret % 12`. All pentatonic notes have `penta: true`; only the root gets the red dot treatment.

### Notes panel

Below the fretboard, each degree in the shape is shown as a color-coded chip with its interval label (e.g. `b3`) and the actual note name for the selected key (e.g. `C` for A minor). Chips dim when their degree is hidden by the active filter.

## Home page

`app/routes/home.tsx` — the public landing page at `/`. Always renders the full `HomePage` component (no coming-soon gate).

- **Loader** — returns `{ preview: boolean }` based on `?preview=true` in the URL. The component uses this to unlock Lick Stash entry points and writes `"shred-dojo-preview"` to localStorage when `preview=true`.
- **Lick Stash gating** — the "Browse Lick Stash" hero CTA and footer link are hidden when `!preview`. The Lick Stash tool card renders as a non-clickable `<div>` at 40% opacity (labeled "Preview only") when `!preview`.
- **Tool cards** — the `TOOL_CATEGORIES` array drives the tools grid. Cards render as `<Link>` by default; cards with `to === "/lick-stash"` render as a locked `<div>` when not in preview. Categories: Scales, Pentatonic, Harmony, Vocabulary, Practice. The Practice category contains Note Recognition and Staff Notes.

## Nav component

`app/components/Nav.tsx` — persistent navigation bar rendered at the top of every page.

- **Props**: `isDark: boolean`, `toggleDark: () => void` — each page owns its own dark-mode state and passes it in.
- **Home link**: the logo links to `/`.
- **Active link detection**: uses `useLocation()`. `/lick-stash` uses `pathname.startsWith("/lick-stash")` to match both the listing page and pack sub-pages; all other links match exactly on `pathname`.
- **Dark mode persistence**: each page component reads `localStorage.getItem("shred-dojo-dark")` on mount and writes to it on toggle.
- **Preview gating**: `NavLink` entries can carry `preview: true`. Nav reads `localStorage.getItem("shred-dojo-preview")` (and watches `useLocation().search` for `?preview=true` to set it). Preview-gated links render as a faint non-interactive `<span>` when not unlocked; as a normal `<Link>` when unlocked. Currently only Lick Stash is gated.
- **Nav structure**: Links are organized into 5 category groups rendered with a small label above each group and `|` separators between groups (hidden at `max-[700px]`):
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

### Data model

- `NOTES` — chromatic note names in order from E: `["E","F","F#","G","Ab","A","Bb","B","C","Db","D","Eb"]`
- `OPEN_OFFSETS` — semitone offset from E for each open string: `{ E:0, A:5, D:10, G:3, B:7, e:0 }`
- `noteAt(string, fret)` — returns the `NoteName` at a given position: `NOTES[(OPEN_OFFSETS[s] + fret) % 12]`
- `NATURAL_IDXS` — `Set` of chromatic indices that are natural notes: `{0,1,3,5,7,8,10}` (E F G A B C D)
- `NATURAL_NOTES` / `ACCIDENTAL_NOTES` — answer button arrays for each scope
- `QuizSettings` — `{ strings: StringName[], scope: NoteScope, maxFret: number }`
- `Question` — `{ string: StringName, fret: number, note: NoteName }`
- `NoteScope` — `"naturals" | "accidentals" | "both"` (named `NoteScope` to avoid collision with `NoteFilter` from `scalePositions.types.ts`)

### Question pool

`buildPool(cfg)` iterates every (string × fret 0..maxFret) combination, computes the note, and filters by `scope`. `pickNext(pool, prev)` picks a random question, excluding the immediately previous one to avoid repetition (falls back to the full pool when `pool.length === 1`).

### Scoring

- `correct` / `total` — incremented on each button press (every press counts)
- `streak` — resets to 0 on any wrong answer; increments on correct
- `highScore` — longest streak for the current settings configuration, persisted to `localStorage` under key `fn-hs-{sortedStrings}-{scope}-{maxFret}`. Loaded from `localStorage` whenever settings change; updated in real time when a new streak high is set.

### Quiz UX

- **Correct**: dot turns green, clicked button turns green, "Correct!" text → auto-advance after 550ms
- **Wrong**: dot turns red, clicked button turns red (border + tint), "Try again" text → clears after 650ms, stays on same question
- The question dot uses Tailwind `animate-pulse` (opacity) while no feedback is active, paused via `animationPlayState: "paused"` during feedback
- Wrong answers do not reveal the correct note — active recall is required

### Fretboard layout

`QuizFretboard` renders a horizontal fretboard with:
- **Open string column** (36px) — to the left of the nut; shows the fret-0 dot when applicable
- **Nut** (8px) — `var(--faint)` background, acts as the visual boundary between open and fret 1
- **Fret cells** (40px each) — frets 1..maxFret, with a 1.5px `var(--fret-bar)` at the right edge of each cell
- **Position markers** — single dot above frets 3, 5, 7, 9; double dot above 12/24; using `var(--faint)`
- **Fret numbers** — below the fretboard in `font-mono text-[0.55rem]`; "0" appears under the open column
- `DISPLAY_STRINGS` order — `["e","B","G","D","A","E"]` (high e at top, low E at bottom, matching guitar-facing perspective)
- For `maxFret: 22`, total minimum width is ~924px; the container is `overflow-x-auto`

### Controls

- **Strings** — toggle any subset of the 6 strings (at least 1 must remain selected)
- **Notes** — Naturals / Accidentals / Both; answer buttons shown in two rows (naturals on top, accidentals below) — naturals row hidden when scope is "accidentals", accidentals row hidden when scope is "naturals"
- **Fret Range** — `0–12` or `0–22`
- Settings panel shown before quiz starts; score bar (Score / Streak / Best Streak / Quit) shown during quiz

## Staff Notes feature

The Staff Notes page (`/staff-notes`) is a treble clef note-reading quiz. A whole note is displayed on a music staff SVG; the user identifies its name by clicking answer buttons.

### Files

- `app/components/StaffNotes.tsx` — all component code (self-contained, no sibling files)
- `app/routes/staff-notes.tsx` — route wrapper

### Data model

- `NOTES` — same 12 chromatic note names as Fretboard Notes: `["E","F","F#","G","Ab","A","Bb","B","C","Db","D","Eb"]`
- `NATURAL_NOTES` / `ACCIDENTAL_NOTES` — answer button arrays: `["C","D","E","F","G","A","B"]` / `["F#","Ab","Bb","Db","Eb"]`
- `PoolEntry` — `{ noteName: NoteName, octave: 4|5, staffStep: number, midi: number }`
  - `staffStep` — diatonic position from C4: 0=C4, 1=D4, 2=E4 (bottom staff line), …, 7=C5, …, 10=F5 (top line), 12=A5 (ledger above), 13=B5
  - Accidentals sit on their letter-name's staff position with an accidental sign (e.g. Ab4 is on A's space at step 5 with a ♭)
- `FULL_POOL` — 24 static `PoolEntry` objects covering C4–B5, declared as a constant (not derived algorithmically)
- `StaffSettings` — `{ scope: NoteScope, range: NoteRange }` where `NoteScope = "naturals" | "both"` and `NoteRange = 1 | 2` (1 = C4–B4, 2 = C4–B5)

Pool sizes by settings: naturals+1oct=7, naturals+2oct=14, both+1oct=12, both+2oct=24.

### Question pool

`buildPool(settings)` filters `FULL_POOL` by scope and range. `pickNext(pool, prev)` deduplicates on `(noteName, octave)` — **not** `staffStep`, because e.g. B4 and Bb4 share `staffStep=6` but are distinct questions.

### Scoring

Same pattern as Fretboard Notes: `correct` / `total` / `streak` / `highScore`. `highScore` persisted to localStorage under `sn-hs-{scope}-{range}` (4 distinct keys). `noteStyle` preference persisted separately under `sn-note-style`.

### Staff SVG layout

`StaffDisplay` renders an inline SVG (`viewBox="0 0 280 110"`, `overflow="visible"`) containing:

- **5 staff lines** at y = 25, 37, 49, 61, 73 (F5 top → E4 bottom, 12px apart)
- **Treble clef** — Unicode character `𝄞` (U+1D11E) as an SVG `<text>` element at `x=4 y=93 fontSize=70 fontFamily="'Times New Roman',serif"`. The G-curl is calibrated to sit on the G4 line (y=61).
- **Note head** — two concentric ellipses at the same rotation (−16°): outer `rx=11 ry=7` filled in the note color, inner `rx=7 ry=4.5` filled in `var(--surface)`. This produces the standard engraved whole-note ring appearance.
- **Accidental sign** — `♯` or `♭` as SVG `<text>` to the left of the note head when `noteName` contains `#` or ends in `b`.
- **Ledger lines** — drawn for `staffStep ≤ 0` (C4, at `y=85`) and `staffStep ≥ 12` (A5/B5, at `y=13`).

Note Y position: `noteY(step) = 73 - (step - 2) * 6`

Note colors: idle standard → `var(--text)`, idle color → `var(--accent)`, correct → `#2d8a40`, wrong → `#b03020`.

### Note style setting

`noteStyle: "standard" | "color"` is separate state (not part of `StaffSettings`, does not affect pool or highscore key). Persisted to `localStorage` under `"sn-note-style"`. Standard renders the note in `var(--text)` (sheet-music black); Color renders in `var(--accent)`.

### Quiz UX

Same pattern as Fretboard Notes: correct answer advances after 550ms (with audio), wrong answer shows "Try again" for 650ms without revealing the correct note.

### Audio

`playNote(ctx, midi)` — triangle oscillator, same envelope as Fretboard Notes. MIDI numbers map directly (C4=60, A4=69, etc.).

### Controls

- **Notes** — Naturals / Naturals + Accidentals
- **Range** — C4–B4 / C4–B5
- **Note Style** — Standard / Color
- Settings panel shown before quiz; score bar (Score / Streak / Best Streak / Quit) shown during quiz

## Chord Voicings feature

The Chord Voicings page (`/chord-voicings`) shows the 5 CAGED chord shapes for five chord types: Major, Minor, Dom 7, Maj 7, Min 7 — rooted on G.

### Files

- `app/components/chordVoicings.types.ts` — `ChordType`, `CHORD_TONES`, `CHORD_LABELS`, `CHORD_TYPES`, `ChordStringVoicing`, `ChordVoicingData`
- `app/components/chordVoicings.utils.ts` — `buildChordVoicings(chordType)` and `DEG_COLOR` (shared with ArpeggioMaps)
- `app/components/ChordVoicings.tsx` — all component code
- `app/routes/chord-voicings.tsx` — route wrapper

### Data model

- `ChordType` — `"maj" | "min" | "dom7" | "maj7" | "min7"`
- `CHORD_TONES` — the active degrees per chord type (R, 3/b3, 5, and optionally b7/7)
- `buildChordVoicings(chordType)` — returns 5 `ChordVoicingData` objects (one per CAGED shape). Each describes: `shapeName`, `baseFret` (lowest fret on the neck), `showNut` (true when `baseFret <= 1`), and `strings` — an array of 6 `ChordStringVoicing` entries (open/muted/fret/deg).
- For each string the best (lowest-fret) chord tone is selected; strings with no chord tones are marked muted.

### Degree colors

`DEG_COLOR` in `chordVoicings.utils.ts` maps degrees to CSS variables. Root → `var(--root-col)`, 3rd/b3 → `var(--sys-caged)`, 5th → `var(--fifth-col)`, 7th/b7 → `var(--seventh-col)`. Shared by both ChordVoicings and ArpeggioMaps.

### Controls

**Chord** toggle — Maj / Min / Dom 7 / Maj 7 / Min 7.

## Arpeggio Maps feature

The Arpeggio Maps page (`/arpeggio-maps`) shows chord-tone positions across the neck for two systems — CAGED (5 shapes) or 3nps (7 positions) — and the same five chord types as Chord Voicings. Displayed as full horizontal fretboard diagrams.

### Files

- `app/components/arpeggioMaps.utils.ts` — `buildArpeggioPositions(chordType)` (CAGED, 5 positions) and `buildArpeggio3npsPositions(chordType)` (3nps, 7 positions); both reuse existing builders from `scalePositions.utils.ts`
- `app/components/ArpeggioMaps.tsx` — all component code (shares `DEG_COLOR`, `CHORD_TONES`, `ChordType` from `chordVoicings.*`)
- `app/routes/arpeggio-maps.tsx` — route wrapper

### Data model

- `buildArpeggioPositions(chordType)` — calls `buildCagedPositions()` with the chord's scale config. Returns 5 `ScalePosition` objects with `system: "caged"` and a `shapeName` field.
- `buildArpeggio3npsPositions(chordType)` — calls `buildAllPositions()` and filters to `system === "3nps"`. Returns 7 `ScalePosition` objects (one per scale degree), each with a `scaletone` (1–7) but no `shapeName`.
- Both use the same `cfgForChordType()` helper (dom7 uses a Mixolydian config so b7 appears in positions).

### Controls

- **System** toggle — CAGED / 3nps (switches between 5 and 7 cards)
- **Chord** toggle — Maj / Min / Dom 7 / Maj 7 / Min 7

## Lick Stash feature

The Lick Stash (`/lick-stash`) provides curated "lick packs" — collections of Guitar Pro tabs that users can view, play, and loop. The route is publicly accessible but gated in the UI: the Nav link and home-page card are hidden/disabled unless the visitor has unlocked preview mode (see **Preview gating** below).

**Preview gating** — visiting any page with `?preview=true` writes `"shred-dojo-preview": "true"` to localStorage (done in both `HomePage` and `Nav`). Once set it persists across sessions. The Nav then renders the Lick Stash link as a normal `<Link>`; without it the link is a faint non-interactive `<span>`.

### Routes

- `/lick-stash` (`routes/lick-stash.tsx`) — pack listing page. Available packs link to their detail page; disabled packs show at reduced opacity with "Coming soon".
- `/lick-stash/:packSlug` (`routes/lick-stash-pack.tsx`) — individual pack page with accordion-style lick cards. Only one lick open at a time to avoid competing AlphaTab instances.

### Data model

- `lickStash.types.ts` — `Lick` (id, title, description, file) and `LickPack` (slug, title, subtitle, description, licks, available)
- `lickStash.data.ts` — static pack definitions. The first pack ("Rock / Blues Pentatonic") has 10 licks; remaining packs are stubs with `available: false`.
- Guitar Pro source files live in `resources/gp-tabs/`; servable copies go in `public/tabs/`.

### AlphaTab integration

- `AlphaTabPlayer.tsx` — client-only wrapper around `AlphaTabApi`. Uses dynamic `import("@coderline/alphatab")` inside `useEffect` to avoid SSR crashes (AlphaTab requires DOM, Web Workers, Web Audio).
- **Stave profile**: `StaveProfile.ScoreTab` — renders standard notation above guitar tablature so timing/rhythm information is visible. (`TabMixed` = tab-only without rests; `ScoreTab` = notation + tab.)
- **Layout**: horizontal scrolling, score metadata headers hidden (titles managed by our own UI).
- **Playback**: play/pause, stop, and loop toggle. Player is initialized with `enablePlayer: true`, `enableCursor: true`. Soundfont served from `/soundfont/sonivox.sf2`.
- **Cursor**: AlphaTab injects `.at-cursor-bar` and `.at-cursor-beat` DOM elements during playback but ships no default CSS for them. Styles are injected via a `<style>` tag inside `AlphaTabPlayer.tsx` (the only place allowed to style third-party-generated class names that can't be reached with Tailwind utilities).
- **Looping — do not use `api.isLooping`**: AlphaTab's built-in loop is reactive — it waits for the audio buffer to drain before restarting, producing an audible gap. This is a known bug tracked in AlphaTab issue #2569, planned for v1.8.2. Instead, `AlphaTabPlayer` implements looping manually: `playerPositionChanged` watches `currentTick`, and when `currentTick >= endTick - 20`, jumps back via `api.tickPosition = 0` while the player is still running. At 960 PPQ this is ~1/48th of a beat — inaudible — but early enough to prevent the sequencer from stopping MIDI event dispatch and triggering the fade-out drain. A `playerFinished` handler calling `api.play()` directly acts as a fallback if the tick window is missed.
- **Vite plugin**: `@coderline/alphatab-vite` handles web worker bundling, audio worklet setup, and copies font/soundfont assets to the build output automatically.
- **Cleanup**: `api.destroy()` is called in the `useEffect` cleanup to prevent memory leaks and detached DOM nodes.

## Wylde Scales feature

The Wylde Scales page (`/wylde-scales`) visualizes Zakk Wylde's 3-notes-per-string approach to the diatonic scale, pairing each of the 7 modal positions with its corresponding pentatonic box.

### Files

- `app/components/wyldeScales.utils.ts` — `buildWylde()`, `buildAllWyldePositions()`, mode names
- `app/components/WyldeScales.tsx` — all component code (self-contained)
- `app/routes/wylde-scales.tsx` — route wrapper

### How Wylde's 3nps differs from standard systems

**vs. `build3nps`**: Strings E, A, D, G are identical (3 consecutive scale degrees each). On B string, Wylde resets the degree cursor to `(startDegIdx + 4) % 7` — one step back — instead of continuing sequentially. This repeats G string's last degree on B, keeping the shape in a compact 4–5 fret window. As a consequence, the high e string naturally cycles back to the same 3 degrees as the low E string.

**vs. `buildSym`**: Sym drops G string to 2 notes so B can start cleanly. Wylde keeps G at 3 notes and deliberately overlaps the G→B transition.

The `buildWylde` function is identical to `build3nps` except for one line: at `si === 4` (B string), `degCursor` is reset.

### Data model

- `WyldePosition` — `{ degIdx, modeName, strings: ScaleString[], startFret, pentaBoxIdx, pentaBox: BoxNote[], pentaRawMin }`
- `buildAllWyldePositions(scale)` — builds all 7 positions. For each, finds the penta box whose raw min fret is closest to the diatonic's raw min fret (no modulo — direct distance comparison).
- `pentaRawMin` — the raw (non-normalized) minimum absolute fret of the matched penta box. Required for octave-correct display (see below).

### Fret coordinate system / octave normalization

Both the diatonic shape and the pentatonic box are built internally in G (ROOT_FRET = 3). Key transposition works the same as other pages: `keyOffset = (keyFret - ROOT_FRET + 12) % 12`, `displayStartFret = startFret + keyOffset`.

**Critical**: the diatonic uses `startFret = rawMin % 12` (normalized), but penta boxes are built with raw absolute frets that can be at fret 12–15 for boxes near the octave boundary. Adding `keyOffset` directly to raw penta frets shifts them a full octave in the wrong direction.

The fix: penta display frets use the same normalization as diatonic:
```
pentaAbsStart = (pentaRawMin % 12) + keyOffset
pentaDisplayFret = (penta.fret - pentaRawMin) + pentaOffset
// where pentaOffset = pentaAbsStart - displayStartFret
```

This mirrors `toRelative()` for the penta box and keeps diatonic and pentatonic in the same neck region for all 12 keys.

### Controls

- **Scale** — Minor / Major (rebuilds all 7 positions)
- **Key** — 12 chromatic keys E through Eb (persisted to `"shred-dojo-key"` localStorage)

## MetronomeWidget

`app/components/MetronomeWidget.tsx` — a persistent floating metronome rendered in `root.tsx`, fixed to the bottom-right corner of every page. Self-contained: no props, no context. Manages its own dark-mode sync by polling `localStorage` every 500ms.

### Audio engine

Uses the Web Audio API look-ahead scheduler pattern: a `setTimeout` loop fires every `LOOKAHEAD_MS = 25ms` and schedules click events up to `SCHEDULE_AHEAD_S = 0.1s` ahead of `ctx.currentTime`. This decouples visual timing from audio timing and prevents glitches under UI load. `AudioContext` is created lazily on first play to satisfy browser autoplay policies.

- **Click sound** — `OscillatorNode` (triangle wave). Downbeat: 1100 Hz, vol 0.45. Subdivision: 750 Hz, vol 0.25. Short exponential decay (~60ms).
- **Drone sound** — `OscillatorNode` (sine wave) with `GainNode` (vol 0.2). Sustained continuously; fades in/out over ~100ms on start/stop/key change to avoid clicks. Base frequency: `E2_HZ = 82.41` Hz; transposed as `82.41 * 2^(semitone / 12)` where semitone is the chromatic distance from E.

### BPM controls

- **Drag** — vertical mouse drag on the BPM number (`ns-resize` cursor). A `dragMoved` flag (threshold: 3px) distinguishes drag from click.
- **Scroll** — mouse wheel over the BPM number nudges ±1.
- **Click to type** — clicking the BPM number without dragging enters edit mode: the number becomes a `<input type="text" inputMode="numeric">` pre-selected for typing. Enter or blur commits; Escape cancels.
- **±1 / ±5 buttons** — fine-adjustment row below the BPM display.
- **Tap tempo** — averages the last 4 tap intervals.
- Range: 40–240 BPM.

### Drone

A section at the bottom of the expanded panel with a 6×2 grid of all 12 chromatic keys (same note names as the rest of the app: `E F F# G Ab A Bb B C Db D Eb`). Clicking a key starts the drone on that root; clicking the same key again stops it; clicking a different key crossfades to the new pitch. When a drone is active, the collapsed trigger button shows `~KEY` (e.g. `~A`) next to the BPM.

### State

- `bpm` — current tempo; `bpmRef` mirrors it for use inside the scheduler closure
- `isPlaying` / `isPlayingRef` — playback state
- `currentBeat` — 0–3, drives the beat segment indicators
- `pulse` — 80ms flash on each beat, drives the scale-up animation on the BPM number and the dot in the trigger button
- `isExpanded` — panel open/closed
- `isDark` — synced from `localStorage` polling
- `editingBpm` / `bpmInputVal` — BPM type-in mode
- `droneKey` — `number | null`; semitone index (0 = E … 11 = Eb), null = drone off

## Circle of Fifths feature

The Circle of Fifths page (`/circle-of-fifths`) shows an interactive SVG diagram of the 12 keys arranged by perfect fifths, with three concentric rings. Clicking a key reveals its scale, diatonic chords, relative minor, and closely related keys.

### Files

- `app/components/circleOfFifths.utils.ts` — `FIFTHS` array (12 `KeyInfo` entries), `keySigLabel()`, `keySigShort()`
- `app/components/CircleOfFifths.tsx` — all component code (self-contained: `CircleDiagram`, `InfoPanel`, page root)
- `app/routes/circle-of-fifths.tsx` — route wrapper

### Data model

- `KeyInfo` — `{ major, minor, keySig, scaleNotes, diatonicChords, relatedMajors, relatedMinors }`
  - `keySig` — positive = sharps, negative = flats, 0 = none
  - `diatonicChords` — 7 `{ numeral, name, quality }` entries (quality: `"maj" | "min" | "dim"`)
  - `relatedMajors` — the 2 adjacent major keys on the circle (clockwise + counter-clockwise)
  - `relatedMinors` — the relative minor of this key plus both neighbors' relative minors (5 closely related keys total)
- `FIFTHS` — 12 entries clockwise from C (top): C G D A E B F# Db Ab Eb Bb F. All data is hardcoded.
- `keySigShort(n)` — returns `"3#"` / `"2♭"` / `"·"` for use inside the SVG key-sig ring
- `keySigLabel(n)` — returns human-readable string (`"3 sharps"`, `"No sharps or flats"`) for the info panel

### SVG diagram

`CircleDiagram` renders a 560×560 SVG (center 280,280) with three concentric rings built from `arcSegmentPath()`:

| Ring | rOuter | rInner | Text r | Content |
|---|---|---|---|---|
| Major keys | 260 | 180 | 220 | Key name |
| Key signature | 178 | 140 | 159 | `keySigShort()` |
| Relative minor | 138 | 84 | 111 | Minor key name |

Each segment spans 28° with a 2° total gap (1° each side). `segmentAngles(i)` returns `{ start, end, mid }` using `i * 30 - 90` as the base (C at 12 o'clock). SVG fills/strokes use `style={{ fill: "var(--surface)" }}` (not presentation attributes) so CSS variables resolve correctly.

Clicking any ring segment (major or minor) sets `selectedIdx`. The center disc shows the selected key name or "SELECT KEY".

### InfoPanel

Shown below the SVG when a key is selected. Three sections:
1. **Header** — key name + `keySigLabel()` text
2. **Diatonic chords** — 7-column grid of `(numeral / note / quality)` per scale degree; quality dim = accent color, min = muted, maj = text
3. **Footer** — relative minor name + clickable pill buttons for `relatedMajors` + `relatedMinors` (clicking a pill updates `selectedIdx`)

## React Router v7 conventions

- Routes are explicitly registered in `app/routes.ts` (not auto-discovered). Add every new route there with `route("path", "routes/file.tsx")`.
- Use `loader` / `action` exports for data fetching and mutations
- Type route props with the generated types from `./+types/<route-name>`
- Use `<Link>`, `<Form>`, `useFetcher`, `useLoaderData`, etc. from `react-router`

## Testing

- **Vitest** — separate `vitest.config.ts` (avoids react-router plugin conflicts with `vite.config.ts`)
- Scale position tests in `app/components/scalePositions.utils.test.ts` — snapshot fixtures verified against Pebber Brown's PDF reference material in `resources/diatonic-scales/`

## Dev commands

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run typecheck  # Type check (also runs react-router typegen)
npm run test       # Run tests (vitest)
npm run test:watch # Run tests in watch mode
```
