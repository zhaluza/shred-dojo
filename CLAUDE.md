# Shred Dojo

## Stack

- **React Router v7** in framework mode (SSR, file-based routing under `app/routes/`)
- **React 19**
- **TypeScript**
- **Tailwind CSS v4** (via `@tailwindcss/vite` plugin — no `tailwind.config.js`)
- **Vite**

## Project structure

```
app/
  components/    # Shared components (co-locate .types.ts, .utils.ts, .theme.ts siblings)
  routes/        # File-based routes (React Router v7 conventions)
  root.tsx       # Root layout, global error boundary
  app.css        # Tailwind entry point — keep minimal
  global.d.ts    # React.CSSProperties augmented to accept --${string} keys
public/          # Static assets
resources/       # Reference material (PDFs, etc.) — not served
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
| `--two-nps` | `#c8a060` | `#c8a060` | 2nps string highlight |
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

**Pseudo-element pattern** — never use `::before`/`::after` via CSS. Instead:
- Background gradients: `backgroundImage` inline style on the element itself
- Decorative lines: explicit `<div className="absolute ...">` with `height` + `backgroundColor` inline styles

## React Router v7 conventions

- Routes live in `app/routes/` using the file-based convention
- Use `loader` / `action` exports for data fetching and mutations
- Type route props with the generated types from `./+types/<route-name>`
- Use `<Link>`, `<Form>`, `useFetcher`, `useLoaderData`, etc. from `react-router`

## Dev commands

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run typecheck # Type check (also runs react-router typegen)
```
