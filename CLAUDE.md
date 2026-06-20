# Shred Dojo

A guitar-practice web app: scale/pentatonic/arpeggio visualizers, ear-training quizzes, and daily practice routines.

## Stack

- **React Router v7** in framework mode (SSR, file-based routing under `app/routes/`)
- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS v4** (via `@tailwindcss/vite` — no `tailwind.config.js`)
- **AlphaTab** (`@coderline/alphatab` + `@coderline/alphatab-vite`) — Guitar Pro notation/playback
- **VexFlow** (`vexflow`) — treble clef staff rendering (Scale Builder)

## Project structure

```
app/
  components/    # Shared components; co-locate .types.ts, .utils.ts, .theme.ts siblings
    CtrlButton.tsx  # Shared button — import this, never define local CtrlBtn/Chip
    theme.ts        # LIGHT_THEME / DARK_THEME token objects
    Nav.tsx         # Persistent top nav
    FullNeckFretboard.tsx  # Shared full-neck (frets 0-24) renderer
  routes/        # File-based routes (registered explicitly in routes.ts)
  root.tsx       # Root layout, global error boundary, MetronomeWidget
  app.css        # Tailwind entry — keep minimal (import + @theme tokens only)
  global.d.ts    # React.CSSProperties augmented to accept --${string} keys
public/
  tabs/ font/ soundfont/   # Served assets (AlphaTab font/soundfont copied by vite plugin)
resources/       # Reference material (PDFs, source .gp files) — not served
```

## Styling

Use **Tailwind utility classes exclusively** in JSX/TSX. Do not add custom CSS classes to `app.css` or any stylesheet — `app.css` holds only the Tailwind import and `@theme { ... }` tokens.

**Fonts** — `font-display` → Oswald (headings/labels/buttons); `font-mono` → Source Code Pro (body). Loaded in `root.tsx`, registered in `app.css` `@theme`.

**Theming** — CSS custom properties injected as inline `style` on each page's root `<div>`, cascading to children. The root div must **also** carry `bg-[var(--bg)] text-[var(--text)]` Tailwind classes (the `style` only defines variables, it doesn't apply bg/color). Dark mode is React state (not the `dark:` variant), toggled by swapping `LIGHT_THEME` / `DARK_THEME` from `theme.ts`. Each page owns its dark-mode state and persists it to localStorage (`"shred-dojo-dark"`).

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
| `--fifth-col` | `#4a6a8a` | `#6a9abf` | 5th degree dots |
| `--seventh-col` | `#6a4a7a` | `#9a6abf` | 7th degree dots |
| `--blues-col` | `#4a3aa8` | `#7a6ad8` | b5 "blue note" dots |
| `--third-col` | `#3a6a3a` | `#5a9a5a` | 3rd degree dots |
| `--feedback-correct` | `#2d8a40` | `#2d8a40` | Correct-answer quiz feedback |
| `--feedback-wrong` | `#b03020` | `#b03020` | Wrong-answer quiz feedback |

**Typography scale** (Tailwind arbitrary values):
- H1: `font-display font-semibold text-[clamp(2rem,5vw,3.2rem)] tracking-[0.04em] uppercase leading-none`
- Section labels: `text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)]`
- Buttons: `font-display text-[0.75rem] tracking-[0.08em] uppercase border`
- Cell labels: `font-display text-[0.68rem] tracking-[0.13em] uppercase text-[var(--muted)]`

**Shared button** — `CtrlButton` (`app/components/CtrlButton.tsx`) is the single button used everywhere. Props: `label, active, onClick, small?, disabled?, title?, normalCase?, className?`. Never define local `CtrlBtn`/`ControlButton`/`Chip` variants. States:
- Default: `bg-transparent text-[var(--text)] border-[var(--border)] hover:border-[var(--text)]`
- Active: `bg-[var(--text)] text-[var(--bg)] border-[var(--text)]`
- Focus (built into `CtrlButton`; apply manually to standalone buttons/links): `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg)]`
- Blues-mode active exception: `bg-[var(--blues-col)] border-[var(--blues-col)] text-white` (keep as standalone `<button>` with focus classes applied directly).

**Mobile / responsive conventions:**
- Touch targets: buttons add `max-[700px]:py-[0.55rem] max-[700px]:px-[1rem]` (small) or `max-[700px]:py-[0.6rem]` (normal); icon-only/narrow add `max-[700px]:min-h-[44px]`.
- Mobile nav (<700px): desktop row hidden (`hidden min-[700px]:flex`), replaced by hamburger `☰` (`min-[700px]:hidden`) opening a right-side drawer. Body scroll locked while open; auto-closes on route change.
- Landscape / short viewport: use the `[@media(max-height:500px)]:` arbitrary variant (targets landscape phones without affecting portrait/desktop). Nav shrinks padding and hides category labels; page content wrappers reduce top padding (`[@media(max-height:500px)]:pt-3`).
- Large-screen width caps via `max-w-[NNNpx] mx-auto` (range `max-w-[740px]` for focused quizzes up to `max-w-[1400px]` for dual-column pages). Fretboard cells use `flex-1` — never set explicit fret-cell widths; let flex scale them.

**Grid / cells** — `grid grid-cols-2 max-[560px]:grid-cols-1 gap-0`; cells use `-mt-px -ml-px` for collapsed borders; selected cell adds `relative z-[2]`.

**Modal overlay** — `fixed inset-0 z-50` backdrop `rgba(10,8,6,0.82)` + `backdropFilter: blur(4px)`. Panel: `--surface` bg, `1px solid var(--border)`, `borderTop: 3px solid var(--accent)`. Lock body scroll on mount, restore on unmount.

**Pseudo-elements** — never use `::before`/`::after`. Background gradients → `backgroundImage` inline style; decorative lines → explicit `<div className="absolute …">` with inline `height`/`backgroundColor`.

## Conventions

- **Routes** — register every route explicitly in `app/routes.ts` (`route("path", "routes/file.tsx")`); they are not auto-discovered. Use `loader`/`action` exports; type props from `./+types/<route-name>`; import `<Link>`, `<Form>`, `useFetcher`, `useLoaderData`, etc. from `react-router`.
- **Component organization** — most feature pages follow the pattern: `Feature.tsx` (all component code, often self-contained), optional `feature.utils.ts` (pure logic/data, no React) and `feature.types.ts` siblings, plus a thin `routes/feature.tsx` wrapper.
- **Fretboard music model** — shapes are built in **G** (`ROOT_FRET = 3` on low E). Key transposition: `keyOffset = (keyFret - ROOT_FRET + 12) % 12`. Most pages normalize to the lower octave (`raw > 12 ? raw - 12 : raw`) before applying an optional `octaveShift` (0/12) register toggle. The shared helper pattern is `computeDisplayFret(startFret, keyOffset, octaveShift)`. `FRET_INLAYS` / `FRET_DOUBLE` (position-marker fret sets) are exported from `scalePositions.utils.ts` and reused across pages.
- **Key persistence** — global key selection persisted to localStorage under `"shred-dojo-key"`.

## Routes / features

Built-in fretboard/quiz pages. Each has a `routes/<name>.tsx` wrapper + a `components/` implementation; consult the source for details.

| Route | Purpose |
|---|---|
| `/` (`home.tsx`) | Landing page. Loader returns `{ preview }` from `?preview=true`; unlocks Lick Stash and writes `"shred-dojo-preview"` to localStorage. |
| `/shape-explorer` | Scale shape visualizer — Focus / Pair / Overview views; 3nps, CAGED, or Penta systems. |
| `/scale-positions` | Scale systems (3nps / CAGED / sym), 1–2 at a time, paired by scaletone with cross-system fret alignment + unified merge view. |
| `/wylde-scales` | Zakk Wylde 3nps approach pairing each modal position with its pentatonic box. |
| `/yngwie-scales` | Two harmonic-minor shapes highlighting the raised 7th. |
| `/scale-builder` | Five scale formulas in any key; Names or VexFlow Staff view; reference + exercise modes. |
| `/pentatonic-triads` | Triad intervals (R/3/5) within and across the 5 pentatonic boxes; blues b5 mode; neck-context combined view. |
| `/pentatonic-colors` | Box 1 of penta with layered "color notes" from related modes. |
| `/interval-shapes` | Recurring two-string interval shapes within penta boxes; Diagram + Flashcard modes. |
| `/chord-voicings` | 5 CAGED chord shapes for 5 chord types. |
| `/arpeggio-maps` | Chord-tone positions across the neck (CAGED or 3nps). |
| `/circle-of-fifths` | Interactive SVG circle-of-fifths with diatonic-chord info panel. |
| `/lick-stash` + `/:packSlug` | Curated Guitar Pro lick packs (AlphaTab playback). Preview-gated in UI. |
| `/morning-coffee` | Daily routine cycling drills across 12 keys; inline metronome; optional Cream & Sugar drills. |
| `/pentatonic-practice` | Six-step pentatonic routine; inline metronome + countdown timer + key-following tonic drone (off by default). |
| `/metronome` | Standalone "Practice Station": circular beat-dial metronome (tap tempo, subdivisions, tempo-trainer auto-ramp) + countdown timer (presets/custom length/+5 min). Two-column layout so both fit above the fold. |
| `/note-recognition` | Fretboard note-recognition quiz. |
| `/staff-notes` | Treble-clef note-reading quiz. |
| `/chord-tones` | Quiz identifying the degree of a highlighted note in a scale shape. |

**Nav** (`Nav.tsx`) — 6 category groups: **Scales** (Shape Explorer, Systems, Wylde, Yngwie, Scale Builder), **Pentatonic** (Triads, Colors, Intervals), **Harmony** (Chords, Arpeggios, Circle of Fifths), **Vocabulary** (Lick Stash — preview-gated), **Routines** (Morning Coffee, Pentatonic, Metronome), **Practice** (Note Recognition, Staff Notes, Chord Tones). The Routines/Practice split is mirrored in `home.tsx` `TOOL_CATEGORIES`. Props: `isDark`, `toggleDark`.

**Quiz UX (shared pattern)** — Note Recognition / Staff Notes / Chord Tones: correct → green flash, auto-advance ~550ms; wrong → red flash ~650ms, stay on same question. **Wrong answers are never revealed — active recall only.** High scores persisted under per-config localStorage keys.

## Gotchas / non-obvious details

These are easy to get wrong and worth knowing before touching the relevant area:

- **AlphaTab looping — do not use `api.isLooping`.** Its built-in loop waits for the audio buffer to drain, causing an audible gap (AlphaTab #2569). `AlphaTabPlayer.tsx` loops manually: `playerPositionChanged` jumps `api.tickPosition = 0` when `currentTick >= endTick - 20` (≈1/48 beat at 960 PPQ — inaudible but early enough to keep the sequencer running). A `playerFinished` → `api.play()` handler is the fallback. Always `api.destroy()` in cleanup.
- **AlphaTab SSR** — must `import("@coderline/alphatab")` dynamically inside `useEffect`; it needs DOM/Workers/Web Audio. Stave profile `StaveProfile.ScoreTab`. Cursor classes (`.at-cursor-bar/.at-cursor-beat`) have no shipped CSS — injected via a `<style>` tag in `AlphaTabPlayer.tsx` (the only sanctioned place to style third-party-generated class names).
- **VexFlow stem-detachment** (`ScaleBuilder` `StaffView`) — measure container width via `ResizeObserver` wrapped in `requestAnimationFrame`, reading `getBoundingClientRect().width` (not stale `contentRect.width`), with a `window` resize fallback. Use a `cancelled` flag per effect and clear `innerHTML` only inside the `.then()`. Use `Voice.Mode.SOFT` to allow non-standard note counts; derive formatter width from stave geometry so stems align with note heads. Accidentals must be added explicitly via `addModifier(new Accidental(...), 0)`.
- **Wylde / penta octave-squash** — penta boxes are built with raw absolute frets (can be fret 12–15 near the octave boundary); adding `keyOffset` directly shifts them an octave the wrong way. Normalize penta display frets the same way as the diatonic shape (`pentaRawMin % 12`). Regression-tested in `wyldeScales.utils.test.ts`.
- **`buildScale` enharmonics** — uses `NOTES_FROM_C`, which always returns flat enharmonics (Ab not G#, Db not C#); test expectations must match.
- **Staff Notes dedup** — `pickNext` dedups on `(noteName, octave)`, not `staffStep` (B4 and Bb4 share a line but are distinct questions).
- **Inline metronomes** — Morning Coffee, Pentatonic Practice, and the standalone `/metronome` page each embed their own metronome and suppress the global `MetronomeWidget` (`root.tsx` checks `pathname`). All three use the same look-ahead Web Audio scheduler hook (currently **duplicated** inline, not shared — `useMetronomePanel` in the routine pages, `useMetronome` in `Metronome.tsx`) with independent persistence keys (`mc-*`, `pp-*`, `met-*`). `met-*` also covers master volume (`met-vol`, 0–1), tempo-trainer (`met-ramp-on/amt/bars`), and timer length (`met-timer-sec`). De-duplicating these into one shared hook is a known pending cleanup. Pentatonic Practice also has a separate `useDrone` hook (own AudioContext, sine root+fifth+octave voices) that follows the selected key's root; it starts off and only persists volume (`pp-drone-vol`) — an "on" state isn't restored since audio can't auto-resume without a gesture. Toggle key: `d`.
- **Preview gating** — visiting any page with `?preview=true` writes `"shred-dojo-preview": "true"` to localStorage (persists). Gates Lick Stash nav link + home card.

## Testing

- **Vitest** with a separate `vitest.config.ts` (avoids react-router plugin conflicts with `vite.config.ts`).
- Only `*.utils.ts` files are tested (`*.utils.test.ts` alongside source); React components are not.
- Covered: `scalePositions`, `wyldeScales`, `pentatonicTriads`, `scaleBuilder`, `chordVoicings` utils. `scalePositions` is verified against Pebber Brown's PDF in `resources/diatonic-scales/`.
- Patterns: compact `fmt`/`fmtBox` serializers (`"deg:fret deg:fret | …"`) for readable assertions; a few manually-verified spot checks as anchors; invariant loops over the full parameter space (all scaletones / boxes / chord types / 12 keys).

## Dev commands

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run typecheck  # Type check (also runs react-router typegen)
npm run test       # Run tests (vitest)
npm run test:watch # Watch mode
```
