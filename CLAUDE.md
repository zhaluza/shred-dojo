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
                           #   tabs/caged/*.png = CAGED Immersion transcription scans (cropped from the course PDF)
resources/       # Reference material (PDFs, source .gp files) — not served
```

## Styling

Use **Tailwind utility classes exclusively** in JSX/TSX. Do not add custom CSS classes to `app.css` or any stylesheet — `app.css` holds only the Tailwind import and `@theme { ... }` tokens.

**Design identity — "Fretboard Blueprint"** — a draftsman's technical drawing of the neck: cool slate ground, hairline ink lines, a single **cyan** accent, zero border-radius, and measured-drawing devices (title blocks, dimension lines, registration ticks, fret/inlay-position numbering). Dark-first; a real cool-bond light variant is kept.

**Fonts** — `font-display` → **Saira** (headings/labels/buttons/spec stamps); `font-mono` → **IBM Plex Mono** (body + all numeric readouts). Loaded in `root.tsx`, registered in `app.css` `@theme`.

**Theming** — CSS custom properties injected as inline `style` on each page's root `<div>`, cascading to children. The root div must **also** carry `bg-[var(--bg)] text-[var(--text)]` Tailwind classes (the `style` only defines variables, it doesn't apply bg/color). Dark mode is React state (not the `dark:` variant), toggled by swapping `LIGHT_THEME` / `DARK_THEME` from `theme.ts`, persisted to localStorage (`"shred-dojo-dark"`). Prefer the shared `useDarkMode()` hook + `PageShell` (which owns the wrapper + Nav + container) for new/converted pages; older pages still inline the boilerplate. `MetronomeWidget` renders at the App root (outside any themed div) so it hardcodes the chrome hexes in `getColors` and polls localStorage for theme changes.

**Color tokens** (defined in `theme.ts`). Functional tokens (`--root-col`, `--third/fifth/seventh/blues-col`, `--sys-*`, `--str-*`, `--feedback-*`) carry meaning inside diagrams; the chrome tokens below define the blueprint shell:

| Token | Light (bond) | Dark (slate) | Usage |
|---|---|---|---|
| `--bg` | `#eef2f4` | `#101619` | Page background |
| `--surface` | `#e4eaec` | `#161d22` | Card / panel backgrounds |
| `--border` | `#c2ccd1` | `#2a363d` | Hairline borders, dividers |
| `--text` | `#0e1316` | `#e6eef2` | Primary text (ink) |
| `--muted` | `#5e6a70` | `#7e8c94` | Secondary / label text |
| `--accent` | `#0e7c96` | `#4fd0e6` | Cyan ink: active states, links, focus |
| `--faint` | `#9aa4ab` | `#4a5862` | Faint-but-legible text & markers: fret numbers, inlay dots, inactive beat-dots, hints. **Not** a near-bg ghost color — keep it readable (a too-dark dark value hides fret numbers/tempos). The Nav header's whisper texture uses `color-mix(in srgb, var(--text) 5%, transparent)` instead, not `--faint`. |
| `--fret-bar` | `#cad3d7` | `#222e34` | Fret coordinate lines |
| `--root-col` | `#c0392b` | `#d2473a` | Root note dots |
| `--fifth-col` | `#3f6f96` | `#6f9ec4` | 5th degree dots (kept hue-distinct from cyan accent) |
| `--seventh-col` | `#6a4a7a` | `#9a6abf` | 7th degree dots |
| `--blues-col` | `#4a3aa8` | `#7a6ad8` | b5 "blue note" dots |
| `--third-col` | `#3a6a3a` | `#5a9a5a` | 3rd degree dots |
| `--feedback-correct` | `#2d8a40` | `#2d8a40` | Correct-answer quiz feedback |
| `--feedback-wrong` | `#b03020` | `#b03020` | Wrong-answer quiz feedback |

`--str-*` (string colors) are cool steels; `--sys-3nps/caged/sym` are the system colors (3nps is a warm coral, decoupled from `--accent`).

**Shared shell** — `PageShell` (themed root + Nav + width-capped container; owns dark mode via `useDarkMode`) and `PageHeader` (the "title block" cartouche: eyebrow + H1 + optional `subtitle` line + optional labeled spec/meta cells). `PageHeader` is adopted across essentially all pages for a consistent header; `PageShell` (the full wrapper) is used by Home, Metronome, and Shape Explorer — most other pages still keep their own inline themed wrapper + `<Nav>` (their layouts/max-widths vary), so rolling `PageShell` out further is the remaining cleanup. Morning Coffee and Pentatonic Practice keep bespoke dynamic headers (not `PageHeader`).

**Typography scale** (Tailwind arbitrary values):
- H1: `font-display font-semibold text-[clamp(2rem,5vw,3.2rem)] tracking-[0.04em] uppercase leading-none`
- Section labels: `text-[0.58rem] tracking-[0.16em] uppercase text-[var(--muted)]`
- Buttons: `font-display text-[0.75rem] tracking-[0.08em] uppercase border`
- Cell labels: `font-display text-[0.68rem] tracking-[0.13em] uppercase text-[var(--muted)]`

**Shared button** — `CtrlButton` (`app/components/CtrlButton.tsx`) is the single button used everywhere. Props: `label, active, onClick, small?, disabled?, title?, normalCase?, className?`. Never define local `CtrlBtn`/`ControlButton`/`Chip` variants. States:
- Default: `bg-transparent text-[var(--text)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)]` (zero-radius hairline; cyan ink on hover)
- Active: `bg-[var(--accent)] text-[var(--bg)] border-[var(--accent)]` (cyan fill)
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
| `/caged-immersion` | Guthrie Trapp CAGED / 1-4-5 experience. One route, two modules (a `Concepts \| Exercises` switcher): **Concepts** (3 essential sounds, the 5 CAGED shapes, the Phrasing Trick, + link-outs) and **Exercises** (7 transposable lessons A–G). Shared aside: `CircleKeySelector` + `useDrone` + `Timer` (logs to Practice Log). See the caged-immersion gotcha. |
| `/writing-scales` | Interactive "Writing Ideas with Scales" lesson — 6 scroll sections (the problem; octave-chunk box; two-shapes-from-any-root navigation map + octave map; chord-tone targeting; any-chord→mode; major↔Lydian + maj7♭5 box; a "spark" writing-prompt generator). Sticky key bar (12 keys) + degrees/notes toggle drives every diagram; tap any dot to hear it. See the writing-scales gotcha. |
| `/lick-stash` + `/:packSlug` | Curated Guitar Pro lick packs (AlphaTab playback). Preview-gated in UI. |
| `/morning-coffee` | Daily routine cycling drills across 12 keys; inline metronome; optional Cream & Sugar drills. |
| `/pentatonic-practice` | Six-step pentatonic routine; inline metronome + countdown timer + key-following tonic drone (off by default). |
| `/metronome` | Standalone "Practice Station": circular beat-dial metronome (tap tempo, subdivisions, tempo-trainer auto-ramp) + countdown timer (presets/custom length/+5 min) + a Key & Drone card (circle-of-fifths key picker driving an optional tonic drone). Two-column metronome/timer row above the fold, drone card below. |
| `/practice-log` | Central practice history. The shared `Timer` (Metronome + Pentatonic pages) offers an opt-in Save/Discard review bar at the end of a sitting; this page lists sessions grouped by day (Today / Last 7 days / All time totals) and supports inline edit (label + bpm) + delete. See the practice-log gotcha. |
| `/note-recognition` | Fretboard note-recognition quiz. |
| `/staff-notes` | Treble-clef note-reading quiz. |
| `/chord-tones` | Quiz identifying the degree of a highlighted note in a scale shape. |

**Nav** (`Nav.tsx`) — 5 category groups, by mode of use: three reference families — **Scales** (Shape Explorer, Systems, Wylde, Yngwie, Scale Builder), **Pentatonic** (Triads, Colors, Intervals), **Harmony** (Chords, Arpeggios, Circle of Fifths) — plus **Train** (Morning Coffee, Pentatonic, CAGED Immersion, Writing Ideas, Metronome, Lick Stash — preview-gated, Practice Log) and **Drills** (Note Recognition, Staff Notes, Chord Tones). Train = metered/guided practice + record; Drills = active-recall quizzes. The same grouping is mirrored in `home.tsx` `TOOL_CATEGORIES` (home now lists every tool, not a subset). Props: `isDark`, `toggleDark`.

**Quiz UX (shared pattern)** — Note Recognition / Staff Notes / Chord Tones: correct → green flash, auto-advance ~550ms; wrong → red flash ~650ms, stay on same question. **Wrong answers are never revealed — active recall only.** High scores persisted under per-config localStorage keys.

## Gotchas / non-obvious details

These are easy to get wrong and worth knowing before touching the relevant area:

- **AlphaTab looping — do not use `api.isLooping`.** Its built-in loop waits for the audio buffer to drain, causing an audible gap (AlphaTab #2569). `AlphaTabPlayer.tsx` loops manually: `playerPositionChanged` jumps `api.tickPosition = 0` when `currentTick >= endTick - 20` (≈1/48 beat at 960 PPQ — inaudible but early enough to keep the sequencer running). A `playerFinished` → `api.play()` handler is the fallback. Always `api.destroy()` in cleanup.
- **AlphaTab SSR** — must `import("@coderline/alphatab")` dynamically inside `useEffect`; it needs DOM/Workers/Web Audio. Stave profile `StaveProfile.ScoreTab`. Cursor classes (`.at-cursor-bar/.at-cursor-beat`) have no shipped CSS — injected via a `<style>` tag in `AlphaTabPlayer.tsx` (the only sanctioned place to style third-party-generated class names).
- **VexFlow stem-detachment** (`ScaleBuilder` `StaffView`) — measure container width via `ResizeObserver` wrapped in `requestAnimationFrame`, reading `getBoundingClientRect().width` (not stale `contentRect.width`), with a `window` resize fallback. Use a `cancelled` flag per effect and clear `innerHTML` only inside the `.then()`. Use `Voice.Mode.SOFT` to allow non-standard note counts; derive formatter width from stave geometry so stems align with note heads. Accidentals must be added explicitly via `addModifier(new Accidental(...), 0)`.
- **Wylde / penta octave-squash** — penta boxes are built with raw absolute frets (can be fret 12–15 near the octave boundary); adding `keyOffset` directly shifts them an octave the wrong way. Normalize penta display frets the same way as the diatonic shape (`pentaRawMin % 12`). Regression-tested in `wyldeScales.utils.test.ts`.
- **`buildScale` enharmonics** — uses `NOTES_FROM_C`, which always returns flat enharmonics (Ab not G#, Db not C#); test expectations must match.
- **Staff Notes dedup** — `pickNext` dedups on `(noteName, octave)`, not `staffStep` (B4 and Bb4 share a line but are distinct questions).
- **Inline metronomes** — Morning Coffee, Pentatonic Practice, and the standalone `/metronome` page each embed their own metronome and suppress the global `MetronomeWidget` (`root.tsx` checks `pathname`). All three use the same look-ahead Web Audio scheduler hook (currently **duplicated** inline, not shared — `useMetronomePanel` in the routine pages, `useMetronome` in `Metronome.tsx`) with independent persistence keys (`mc-*`, `pp-*`, `met-*`). `met-*` also covers master volume (`met-vol`, 0–1), tempo-trainer (`met-ramp-on/amt/bars`), and timer length (`met-timer-sec`). De-duplicating these into one shared hook is a known pending cleanup. The **countdown timer**, by contrast, *is* shared — `Timer.tsx` (`<Timer storageKey=… presets? maxMin? onSecond? onLogSession? onDiscardSession? defaultLabel? />`, exporting `fmtClock`), used by Pentatonic Practice (`pp-timer-sec`), the standalone page (`met-timer-sec`), and CAGED Immersion (`caged-timer-sec`). It counts down off a **wall-clock `deadlineRef`** (not per-tick decrement) and resyncs on `visibilitychange`, so a backgrounded/throttled tab stays accurate; elapsed time for logging is likewise accrued from real time (`Date.now()` deltas, pulsing `onSecond` per whole second), and `addFive` bumps `deadlineRef` directly. Don't reintroduce `remaining`-decrement-per-tick — it drifts in inactive tabs. - **Drone (`Drone.tsx`)** — shared `useDrone(rootPc, storageKey)` hook + `DronePanel`, used by Pentatonic Practice (in the key aside, toggle key `d`, `pp-drone-vol`), the standalone Metronome page (Key & Drone card, `met-drone-vol`), and CAGED Immersion (`caged-drone-vol`). Own AudioContext, created lazily on first toggle (within the click gesture, for autoplay policy); sine root+chorus+fifth+octave voices that retune smoothly when the key changes. Starts **off** and only persists volume — an "on" state isn't restored since audio can't auto-resume without a gesture. The circle-of-fifths key picker is the shared `CircleKeySelector.tsx` (a compact picker; distinct from the full `/circle-of-fifths` info page). Both pull key data (`KEYS`/`NOTE_NAMES`/`mod12`) from `pentatonicPractice.utils.ts`.
- **Central practice log** (`practiceLog.utils.ts`) — timestamped session entries (`{ id, startedAt, durationSec, source, section?, label?, bpm? }`) under one key `shred-dojo-practice-log`. Pages **only** call the exported functions (`loadSessions`/`addSession`/`updateSession`/`deleteSession`/`clearSessions` + pure `groupByDay`/`totalSec`/`isSameDay`/`SOURCE_LABELS`) — never touch localStorage directly — so the backend can become DB-backed later without touching pages. Logging is **opt-in**: a *sitting* = one contiguous run where **pause keeps accruing** time; `finishRun` (reset / completion / length change, skipping runs under `MIN_LOG_SEC` = 5s) surfaces an in-`Timer` **review bar** (elapsed + optional label `prefilled from defaultLabel` + Save/Discard). Save calls `onLogSession(sec, label)`; only then is `addSession` invoked. Leaving the page mid-sitting discards unsaved time (no auto-write). Pentatonic Practice keeps a *live, in-memory* "this sitting · per section" tally (via `onSecond`, cleared on save/discard — not persisted, the old `pp-log` key is gone) and defaults the label to the active step title; the durable record is one entry tagged with `section`. The `/practice-log` page lists, deletes, and inline-edits entries — `label`, `bpm`, and `durationSec` (an `mm : ss` editor; `updateSession`'s patch type allows all three). Pure helpers are unit-tested in `practiceLog.utils.test.ts`. (`SOURCE_LABELS` / the `isValidSession` allow-list are a hardcoded union — add new sources to *both* when a new page logs, e.g. `"caged-immersion"`.)
- **CAGED Immersion** (`CagedImmersion.tsx` orchestrator → `CagedConcepts.tsx` / `CagedExercises.tsx`; pure `cagedImmersion.utils.ts` + tests) — built *on top of* the existing CAGED engine, not a new music model: diagrams come from `buildChordVoicings` / `ChordDiagram` (now exported from `ChordVoicings.tsx`) and `FullNeckFretboard`. **Key bridge**: the shared `CircleKeySelector` works in circle-of-fifths `KEYS` index (pc), the engine transposes by low-E fret — `keyFretForPc(pc) = mod12(pc - 4)`, then `computeDisplayFret`. A CAGED voicing's string frets are relative; transposing = relabelling `baseFret` by `mod12(rootPc - 7)` (G = pc 7 = `ROOT_FRET 3`) and treating shapes as movable (`showNut:false`, no open strings); zone cells are octave-clustered within ±6 frets of the I. Persists its own `caged-*` keys (`caged-key/-mode/-module/-drone-vol/-timer-sec`) — **not** the global `shred-dojo-key` (different encoding). The Concepts major/minor toggle is **parallel** (same root), only affects Concepts; Exercises are self-labelled per lesson. Exercise CAGED diagrams are **hidden by default** and re-hide on key/lesson change (active recall); each lesson also shows its **canonical transcription as fixed-G PNG scans** (`public/tabs/caged/*.png`, cropped from the course PDF) — the diagrams transpose, the tabs stay in G. Metronome = the global floating `MetronomeWidget` (this route does **not** suppress it / embed its own).
- **Writing with Scales** (`WritingScales.tsx` + pure `writingScales.utils.ts` + tests) — ported from a standalone HTML prototype (`resources/writing_with_scales/scales.html`). Reuses the shared **music model** (`mod12`/`KEYS`/`NOTE_NAMES`/`OPEN_PCS` from `pentatonicPractice.utils`, `FRET_INLAYS`/`FRET_DOUBLE` from `scalePositions.utils`) and the **single-note triangle-pluck audio** pattern from `FretboardNotes.tsx` (lazy `AudioContext`, resume-on-gesture, `midiToHz`). But the four diagram types — a 0–12 neck with per-note arbitrary colors/opacity + note-or-degree labels + tap-to-hear; a windowed octave-chunk box (interval labels R/Δ2/p4…, two-octave dimming); a 0–15 navigation map (movable root, two shapes, dashed octave-jump lines); and a movable maj7♭5 grip — are **bespoke React-SVG renderers in this file**, *not* `FullNeckFretboard`/`ChordDiagram` (those are div-based / degree-only / CAGED-engine-bound and can't do clicks, note labels, per-note color, dashed lines, windowing, or maj7♭5). Strings are indexed **low→high (0=low E … 5=high e)** to match `OPEN_PCS`; display rows are top=high e (`row = 5 - si`). Tap ripple uses SVG SMIL `<animate>` (auto-runs on insert — no custom CSS keyframes). Key is **page-local**, persisted under its own `ws-key` (a pitch class 0–11) — **not** the global `shred-dojo-key`; the section-6 "spark" randomizes the key freely. The colour mapping is intentional: root→`--root-col`, scale/target→`--accent`, ♯4 colour note→`--blues-col`, descending nav shape→`--seventh-col`. No course/author attribution in the copy (deliberate — the user evolves the material in their own words).
- **Preview gating** — visiting any page with `?preview=true` writes `"shred-dojo-preview": "true"` to localStorage (persists). Gates Lick Stash nav link + home card.

## Testing

- **Vitest** with a separate `vitest.config.ts` (avoids react-router plugin conflicts with `vite.config.ts`).
- Only `*.utils.ts` files are tested (`*.utils.test.ts` alongside source); React components are not.
- Covered: `scalePositions`, `wyldeScales`, `pentatonicTriads`, `scaleBuilder`, `chordVoicings`, `practiceLog`, `writingScales` utils. `scalePositions` is verified against Pebber Brown's PDF in `resources/diatonic-scales/`.
- Patterns: compact `fmt`/`fmtBox` serializers (`"deg:fret deg:fret | …"`) for readable assertions; a few manually-verified spot checks as anchors; invariant loops over the full parameter space (all scaletones / boxes / chord types / 12 keys).

## Dev commands

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run typecheck  # Type check (also runs react-router typegen)
npm run test       # Run tests (vitest)
npm run test:watch # Watch mode
```
