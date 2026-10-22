# Project Structure

This project is a Next.js application focused on nutrition, pantry tracking, and recipe generation.

## Root level

- `.traerules` — project coding rules for AI agents
- `AGENTS.md` — repo instructions / agent guidance
- `CLAUDE.md` — local project instructions
- `components.json` — shadcn-style component configuration
- `next-env.d.ts` — TypeScript config for Next.js
- `next.config.mjs` — Next.js configuration
- `package.json` — dependencies and scripts
- `pnpm-lock.yaml` — lockfile for pnpm
- `pnpm-workspace.yaml` — pnpm workspace config
- `postcss.config.mjs` — PostCSS config
- `proxy.ts` — auth proxy: session gate for protected pages and API routes
- `README.md` — project overview and setup notes
- `STRUCTURE.md` / `projectstructure.md` — structure documentation
- `tsconfig.json` — TypeScript compiler config
- `.gitignore` — Git ignore rules
- `.env.local` — local environment variables (not committed)

## App routes

- `app/`
  - `app/page.tsx` — landing / home page
  - `app/layout.tsx` — root layout and global app shell
  - `app/globals.css` — global styling
  - `app/login/page.tsx` — login page
  - `app/signup/page.tsx` — sign-up page
  - `app/onboarding/page.tsx` — onboarding flow
  - `app/dashboard/page.tsx` — user dashboard
  - `app/pantry/page.tsx` — pantry management page
  - `app/recipes/page.tsx` — recipes page
  - `app/error.tsx`, `app/loading.tsx`, `app/not-found.tsx` — App Router special files
  - `app/api/`
    - `app/api/auth/session/route.ts` — mints / clears the signed session cookie
    - `app/api/generate-recipe/route.ts` — recipe generation API route (decrements quota)
    - `app/api/profile/route.ts` — profile read / upsert (Supabase `profiles`)
    - `app/api/quota/route.ts` — daily generation quota read (Supabase `quota`)
    - `app/api/saved-meals/route.ts` — saved meals list/save/delete (Supabase `saved_meals`)

## Components

- `components/`
  - `components/AuthProvider.tsx` — authentication context/provider
  - `components/CountryCodeSelect.tsx` — country selector UI
  - `components/LoadingModal.tsx` — loading indicator modal
  - `components/Navbar.tsx` — shared navigation bar
  - `components/OtpModal.tsx` — OTP verification modal
  - `components/RecipeCard.tsx` — recipe card
  - `components/RecipeInstructionModal.tsx` — cooking instruction modal
  - `components/ShareModal.tsx` — share modal
  - `components/TagInput.tsx` — input for tags/keywords

## Library / utilities

- `lib/`
  - `lib/store.ts` — client-side app state helper (localStorage cache)
  - `lib/session.ts` — signed session cookie helpers
  - `lib/types.ts` — shared TypeScript types
  - `lib/use-modal-a11y.ts` — modal focus-trap / Esc hook
  - `lib/supabase/`
    - `lib/supabase/data.ts` — server persistence layer (profiles / saved_meals / quota + row types)
    - `lib/supabase/server.ts` — server-side Supabase service-role client

## Public assets

- `public/` — static files such as images, icons, and other frontend assets

## High-level architecture

This app follows a typical Next.js app-router structure:

- `app/` handles routes and server/client page composition
- `components/` contains reusable UI pieces and modal flows
- `lib/` contains shared logic, Supabase integration, and domain types
- `public/` stores static assets

This gives the project a clean separation between routing, UI, data access, and shared utilities.
