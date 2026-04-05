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

- `scaleMode` / `noteFilter` / `selectedSystems` — filter controls
- `selectedIdx` — which cell is highlighted in the grid (persists after modal closes)
- `modalIdx` — which position is open in the modal (`null` = closed); set on cell click, cleared on modal close or scale change
- `unifiedScaletones` — `Set<number>` of scaletones currently showing a unified (merged) fretboard view; cleared on system or scale change

**Scale systems** — three systems available: `"3nps"`, `"caged"`, and `"sym"`. Users can select 1 or 2 at a time via toggle buttons. The `selectedSystems` state is a `System[]` (length 1-2); when 2 are selected the remaining button is disabled — the user must deselect one before selecting another. Systems are always displayed in a consistent column order: 3nps < caged < sym.

**Grid layout** — when 2 systems are selected, positions are paired by scaletone (1-7) in a 2-column grid. CAGED has only 5 shapes, so 2 rows get empty placeholder cells (dashed border) for the missing scaletones. When 1 system is selected, positions flow naturally in the 2-column grid.

**CAGED system** — defined in `scalePositions.utils.ts` as `CAGED_SHAPES`, an array of 5 shape definitions (E, D, C, A, G in neck order). Each shape specifies interval patterns per string for both major and minor. The `buildCagedPositions()` function generates `ScalePosition` objects with `system: "caged"` and a `shapeName` field. CAGED scaletone mapping differs between major and minor (derived from the first interval on the E string).

**Cross-system fret alignment** — every `ScalePosition` has a `startFret: number` field equal to `rawMinFret % 12` (the absolute minimum fret before `toRelative()` normalization, mod 12). When two systems are paired in the grid, `gridItems` computes a `fretOffset` for each cell by comparing their `startFret` values: the position with the higher `startFret` gets `fretOffset = diff`, shifting its dots to the right so both fretboards show the same physical neck region. The offset is threaded as a prop through `PositionCell` → `Fretboard` → `StringRow`; `StringRow` uses `n.fret === f - fretOffset` for note lookup, and `Fretboard` expands `fretCount` by `fretOffset`. `ShapeModal` always uses `fretOffset=0` (single position, no alignment needed). For minor scale, CAGED shapes E, C, and G extend one fret lower than their paired 3nps/sym positions (offset=1); D and A are naturally aligned (offset=0). **CAGED fret-count matching** — when 3nps + CAGED are paired, `gridItems` also computes a `fretCount` override for each CAGED cell: `Math.max(naturalCAGED, natural3nps)`, ensuring both fretboards display the same number of frets. This is passed as an optional `fretCount` prop through `PositionCell` → `Fretboard`, where it overrides the locally-computed value.

**Fretboard size variants** — `Fretboard`, `StringRow`, and `Dot` accept a `large` boolean prop. When `large={true}`: string rows are `h-[42px]` (vs `29px`), dots are `w-7 h-7` (vs `w-5 h-5`), and text sizes scale up proportionally. Used by `ShapeModal` for the enlarged view.

**Unified view** — when 2 systems are selected, each scaletone separator row shows a "Unify" toggle button (hidden for scaletones where one system has no shape, e.g. CAGED scaletones 6-7). Clicking it merges both positions' notes onto a single full-width `UnifiedCell` fretboard, replacing the two side-by-side cells. The merge is handled by `mergePositions()` in `scalePositions.utils.ts`, which combines notes from both positions using their `fretOffset` values to compute absolute fret positions. Notes at the same fret+string from both systems produce a single `UnifiedNote` with `systems: [sysA, sysB]`. The `UnifiedDot` component renders a system-colored ring around each dot — solid for single-system notes, split-gradient for shared notes. Types `UnifiedNote` and `UnifiedString` are defined in `scalePositions.types.ts`. The unified fretboard uses `fretOffset=0` since notes are pre-resolved to absolute positions.

**Modal navigation** — `ShapeModal` cycles through positions sharing the same `system` as the initially clicked shape. Navigation updates both `modalIdx` and `selectedIdx` in sync.

## Lick Stash feature

The Lick Stash (`/lick-stash`) provides curated "lick packs" — collections of Guitar Pro tabs that users can view, play, and loop.

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

## React Router v7 conventions

- Routes live in `app/routes/` using the file-based convention
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
