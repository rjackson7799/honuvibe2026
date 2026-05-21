# Fix Vercel Build Failure — Missing DashboardBackdrop

## Context

The latest production deploy (commit `344a89c`) is failing on Vercel with:

```
Module not found: Can't resolve '@/components/learn/DashboardBackdrop'
  > 17 | import { DashboardBackdrop } from '@/components/learn/DashboardBackdrop';
```

Root cause: the `app/[locale]/learn/dashboard/page.tsx` change in `344a89c` imports and renders `<DashboardBackdrop />` (lines 17 and 109), but `components/learn/DashboardBackdrop.tsx` was never committed — it sits untracked locally, along with the image it references at `public/images/dashboard/welcome-backdrop.webp`. CI builds from `origin/main`, so the import resolves to nothing.

Fix is to commit the two untracked artifacts that the imported code depends on and push to `main`.

## Files to commit

- `components/learn/DashboardBackdrop.tsx` — the React component referenced by the import
- `public/images/dashboard/welcome-backdrop.webp` — the asset the component renders via `next/image`

Both already exist locally and are confirmed untracked via `git status`.

## Out of scope

- No code changes. The component as-written is correct (uses `next/image`, fluid mask, `-z-10`, `pointer-events-none`).
- The unrelated untracked plans, `TODO.md`, and other partner/Vertice files in `git status` are not touched — only the two files the failing import actually needs.
- The pre-existing `M` on `PROGRESS.md` and `components/learn/WelcomeScreen.tsx` are unrelated to this build break and should not be bundled into the fix commit.

## Steps

1. `git add components/learn/DashboardBackdrop.tsx public/images/dashboard/welcome-backdrop.webp`
2. Commit with a focused message, e.g. `fix(dashboard): commit DashboardBackdrop component + asset to unbreak Vercel build`
3. `git push origin main`
4. Watch Vercel for the new deploy off the new HEAD commit.

## Verification

- After push, the new Vercel build for `main` should pass the Turbopack compile step (no `Module not found` for `DashboardBackdrop`).
- Visit `/learn/dashboard` on the deployed preview and confirm the backdrop image renders behind the welcome area (hidden on mobile by design — check `sm:` breakpoint and up).
- Local sanity check before pushing: `pnpm run build` should complete without the module-not-found error.
