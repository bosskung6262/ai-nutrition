# Project Structure

This project is a Next.js application focused on nutrition, pantry tracking, and recipe generation.

## Root level

- `AGENTS.md` — repo instructions / agent guidance
- `CLAUDE.md` — local project instructions
- `components.json` — shadcn-style component configuration
- `next-env.d.ts` — TypeScript config for Next.js
- `next.config.mjs` — Next.js configuration
- `package.json` — dependencies and scripts
- `pnpm-lock.yaml` — lockfile for pnpm
- `pnpm-workspace.yaml` — pnpm workspace config
- `postcss.config.mjs` — PostCSS config
- `proxy.ts` — proxy setup
- `README.md` — project overview and setup notes
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
  - `app/api/`
    - `app/api/generate-recipe/route.ts` — recipe generation API route
    - `app/api/profile/route.ts` — profile-related API route
    - `app/api/saved-meals/route.ts` — saved meals API route

## Components

- `components/`
  - `components/AuthProvider.tsx` — authentication context/provider
  - `components/CountryCodeSelect.tsx` — country selector UI
  - `components/LoadingModal.tsx` — loading indicator modal
  - `components/OtpModal.tsx` — OTP verification modal
  - `components/ShareModal.tsx` — share modal
  - `components/TagInput.tsx` — input for tags/keywords
  - `components/ui/` — reusable UI primitives and shared component library

## Library / utilities

- `lib/`
  - `lib/server-db.ts` — server-side database logic
  - `lib/store.ts` — app state/store helper
  - `lib/types.ts` — shared TypeScript types
  - `lib/utils.ts` — generic utility functions
  - `lib/supabase/`
    - `lib/supabase/client.ts` — Supabase client setup
    - `lib/supabase/middleware.ts` — middleware utilities for auth/session
    - `lib/supabase/server.ts` — server-side Supabase access

## Public assets

- `public/` — static files such as images, icons, and other frontend assets

## High-level architecture

This app follows a typical Next.js app-router structure:

- `app/` handles routes and server/client page composition
- `components/` contains reusable UI pieces and modal flows
- `lib/` contains shared logic, Supabase integration, and domain types
- `public/` stores static assets

This gives the project a clean separation between routing, UI, data access, and shared utilities.
