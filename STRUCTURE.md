# Project Structure

AI Nutrition - An intelligent meal recommendation system powered by AI

## Overview

This is a Next.js 16 (App Router) full-stack application for generating personalized nutritional meal recommendations. The app uses TypeScript and React 19, and persists server-side data (profiles, saved meals, daily quota) in Supabase Postgres. Authentication is a signed, httpOnly session cookie minted by `/api/auth/session` and verified in `proxy.ts`.

---

## Directory Structure

### Root Level

```
├── app/                          # Next.js App Router - Pages & API routes
├── components/                   # Reusable React components
├── lib/                          # Utility functions, types, and client/server logic
├── public/                       # Static assets
├── node_modules/                 # Dependencies (pnpm)
├── next.config.mjs               # Next.js configuration
├── tsconfig.json                 # TypeScript configuration
├── postcss.config.mjs            # PostCSS configuration
├── pnpm-workspace.yaml           # pnpm workspace configuration
├── pnpm-lock.yaml                # pnpm lock file
├── package.json                  # Project dependencies
├── components.json               # Component configuration (shadcn/ui)
├── proxy.ts                      # Auth proxy (session gate, replaces middleware.ts)
├── .traerules                    # Project coding rules for AI agents
├── AGENTS.md                     # AI agent instructions (Next.js)
├── CLAUDE.md                     # Claude customization instructions
├── STRUCTURE.md                  # This document
├── projectstructure.md           # Condensed structure reference
└── README.md                     # Project documentation
```

---

## /app - Next.js App Router

Application pages and API routes using Next.js 15 App Router.

### Pages

| Path | Purpose |
|------|---------|
| `/` | Landing page |
| `/login` | User login page |
| `/signup` | User registration page |
| `/onboarding` | Initial user setup and preferences |
| `/pantry` | Ingredient selection and meal preference input |
| `/recipes` | Generated recipe results display |
| `/dashboard` | User dashboard with saved meals and history |

Root layout and App Router special files: `layout.tsx`, `error.tsx`, `loading.tsx`, `not-found.tsx`.

### API Routes

All routes below require a valid session cookie (enforced by `proxy.ts`) and use the Supabase service-role client through `lib/supabase/data.ts`.

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/session/` | POST/DELETE | Mint or clear the signed httpOnly session cookie |
| `/api/generate-recipe/` | POST | AI-powered recipe generation (decrements the daily quota) |
| `/api/profile/` | GET/POST | Read / upsert the user's profile in `profiles` |
| `/api/saved-meals/` | GET/POST/DELETE | List, save, and delete rows in `saved_meals` |
| `/api/quota/` | GET | Current daily generation quota from `quota` |

### Assets

- `globals.css` - Global styles (Tailwind CSS)
- `landing.css` - Landing page specific styles

---

## /components - React Components

Reusable UI components for the application.

### Authentication & Layout

| Component | Purpose |
|-----------|---------|
| `AuthProvider.tsx` | React Context provider for user authentication state |
| `Navbar.tsx` | Shared navigation bar |

### Feature Components

| Component | Purpose |
|-----------|---------|
| `RecipeCard.tsx` | Card component displaying a single recipe |
| `RecipeInstructionModal.tsx` | Modal showing detailed cooking instructions |
| `ShareModal.tsx` | Modal for sharing recipes as a card |
| `TagInput.tsx` | Input component for ingredient/filter tags |

### Modals & Utilities

| Component | Purpose |
|-----------|---------|
| `LoadingModal.tsx` | Full-screen loading indicator |
| `OtpModal.tsx` | One-time password (OTP) verification modal |
| `CountryCodeSelect.tsx` | Country/phone code selector for authentication |

---

## /lib - Utilities & Core Logic

Shared utilities, type definitions, and backend logic.

### Files

| File | Purpose |
|------|---------|
| `store.ts` | Client-side state management (localStorage mirror of auth, profile, pantry, results) |
| `session.ts` | Signed session cookie helpers (sign / verify, Edge-safe) |
| `types.ts` | TypeScript type definitions for recipes, users, meals |
| `use-modal-a11y.ts` | Focus trap / Esc handling hook shared by modals |

### Supabase Subdirectory

| File | Purpose |
|------|---------|
| `data.ts` | Server-side persistence layer (profiles / saved_meals / quota + row types) |
| `server.ts` | Supabase service-role client factory for API routes |

---

## /public - Static Assets

Static files served directly by the web server:
- Images
- Icons
- Fonts
- Other media assets

---

## Configuration Files

### Build & Development

- `next.config.mjs` - Next.js build and runtime configuration
- `tsconfig.json` - TypeScript compiler options
- `postcss.config.mjs` - PostCSS plugins (Tailwind, autoprefixer, etc.)

### Package Management

- `package.json` - Project dependencies and scripts
- `pnpm-lock.yaml` - Lock file for reproducible installs
- `pnpm-workspace.yaml` - pnpm workspace configuration (monorepo support)

### Customization

- `components.json` - Shadcn/ui component library configuration
- `proxy.ts` - Auth proxy that gates protected pages and API routes
- `AGENTS.md` - Next.js version-specific agent instructions
- `CLAUDE.md` - Claude AI customization

---

## Key Technologies

- **Frontend Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **UI Components**: Tailwind CSS, Lucide icons, shadcn base styles
- **State Management**: React Context + localStorage (client mirror)
- **Backend**: Supabase Postgres via service-role client (server-only)
- **AI**: AI SDK + Google Gemini (`/api/generate-recipe`)
- **HTTP Client**: Fetch API
- **Package Manager**: pnpm
- **Styling**: Tailwind CSS + PostCSS

---

## Data Flow

### User Journey

1. **Authentication** → `/login` or `/signup` → OTP flow in `AuthProvider`, then `/api/auth/session` mints the signed cookie
2. **Onboarding** → `/onboarding` → Collect dietary preferences, `POST /api/profile`
3. **Pantry Setup** → `/pantry` → Select ingredients, set meal goals
4. **Recipe Generation** → `POST /api/generate-recipe` → quota pre-check, then AI generates meals
5. **View Recipes** → `/recipes` → Display 3 recommended recipes (`/api/quota` reflects the decrement)
6. **Save Meals** → `POST /api/saved-meals` → Insert into Supabase `saved_meals`
7. **Dashboard** → `/dashboard` → `GET /api/saved-meals` for saved meals and history

### State Management

- **Client State**: `store.ts` (localStorage cache of auth/profile/pantry/results for offline reading)
- **Server State**: Supabase tables `profiles`, `saved_meals`, `quota` — the single source of truth
- **Auth State**: `AuthProvider` context + signed httpOnly session cookie verified in `proxy.ts`

---

## Language & Localization

- **Primary Language**: Thai (ไทย)
- All UI text and error messages are in Thai
- Uses Thai fonts (var(--font-kanit))

---

## Features

✅ User authentication (email/OTP)  
✅ Personalized recipe generation via AI  
✅ Ingredient pantry management  
✅ Nutritional goal setting  
✅ Recipe saving and bookmarking  
✅ Recipe sharing functionality  
✅ Daily quota system (3 generations/day, enforced server-side in Supabase)  
✅ Client-side localStorage cache for offline reading  
✅ Responsive design  

---

## Development Commands

See `package.json` for available scripts.

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Type check
npx tsc --noEmit
```

---

## Notes

- Uses **Client Components** (`'use client'`) for interactive features
- Implements **Server Components** for data fetching and API routes
- Persists all server data in **Supabase** (`profiles`, `saved_meals`, `quota`) — no file-system JSON store
- Stores a **localStorage cache** on the client for offline reading; the server remains the source of truth
- Requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; routes return 503 when they are missing
- Uses **Tailwind CSS** custom properties for theming
- Includes **quota system** (daily limit on recipe generations, atomic decrement in Supabase)
