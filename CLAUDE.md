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
  routes/        # File-based routes (React Router v7 conventions)
  root.tsx       # Root layout, global error boundary
  app.css        # Tailwind entry point — keep minimal
public/          # Static assets
react-router.config.ts
vite.config.ts
```

## Styling

Use **Tailwind utility classes exclusively** in JSX/TSX. Do not add custom CSS classes to `app.css` or any other stylesheet. The only content in `app.css` should be the Tailwind import and theme tokens (`@theme { ... }`).

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
