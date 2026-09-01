# Project Structure

AI Nutrition - An intelligent meal recommendation system powered by AI

## Overview

This is a Next.js 15+ full-stack application for generating personalized nutritional meal recommendations. The app uses TypeScript, React 19+, and integrates with Supabase for backend services.

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
├── tailwind.config.ts            # Tailwind CSS configuration (if present)
├── postcss.config.mjs            # PostCSS configuration
├── pnpm-workspace.yaml           # pnpm workspace configuration
├── pnpm-lock.yaml                # pnpm lock file
├── package.json                  # Project dependencies
├── components.json               # Component configuration (shadcn/ui)
├── proxy.ts                      # API proxy configuration
├── AGENTS.md                     # AI agent instructions (Next.js)
├── CLAUDE.md                     # Claude customization instructions
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
| `/layout.tsx` | Root layout wrapper for all pages |

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/generate-recipe/` | POST | AI-powered recipe generation endpoint |
| `/api/profile/` | GET/POST/PUT | User profile management |
| `/api/saved-meals/` | GET/POST | Fetch and save user's meal preferences |

### Assets

- `globals.css` - Global styles (Tailwind CSS)
- `landing.css` - Landing page specific styles
- `next-env.d.ts` - Next.js TypeScript environment types

---

## /components - React Components

Reusable UI components for the application.

### Authentication & Layout

| Component | Purpose |
|-----------|---------|
| `AuthProvider.tsx` | React Context provider for user authentication state |
| `Navbar.tsx` | Generic navigation bar |
| `LandingNavbar.tsx` | Navigation for landing page |
| `DashboardNavbar.tsx` | Navigation for dashboard section |

### Feature Components

| Component | Purpose |
|-----------|---------|
| `RecipeCard.tsx` | Card component displaying a single recipe |
| `RecipeInstructionModal.tsx` | Modal showing detailed cooking instructions |
| `ShareModal.tsx` | Modal for sharing recipes (social/email) |
| `TagInput.tsx` | Input component for ingredient/filter tags |
| `nutrition.tsx` | Nutritional information display component |

### Modals & Utilities

| Component | Purpose |
|-----------|---------|
| `LoadingModal.tsx` | Full-screen loading indicator |
| `OtpModal.tsx` | One-time password (OTP) verification modal |
| `CountryCodeSelect.tsx` | Country/phone code selector for authentication |

### UI Subdirectory

- `/ui/` - Likely contains shadcn/ui component library components (auto-generated)

---

## /lib - Utilities & Core Logic

Shared utilities, type definitions, and backend logic.

### Files

| File | Purpose |
|------|---------|
| `store.ts` | Client-side state management (localStorage) |
| `types.ts` | TypeScript type definitions for recipes, users, meals |
| `utils.ts` | Helper utility functions |
| `server-db.ts` | Server-side database operations |

### Supabase Subdirectory

| File | Purpose |
|------|---------|
| `client.ts` | Supabase client initialization (browser) |
| `server.ts` | Supabase server client (Server Components/API routes) |
| `middleware.ts` | Authentication middleware for Next.js |

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
- `proxy.ts` - API routing/proxy configuration
- `AGENTS.md` - Next.js version-specific agent instructions
- `CLAUDE.md` - Claude AI customization

---

## Key Technologies

- **Frontend Framework**: Next.js 15+ with App Router
- **Language**: TypeScript
- **UI Components**: Shadcn/ui, Tailwind CSS, Lucide icons
- **State Management**: React Context + localStorage
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **HTTP Client**: Fetch API
- **Package Manager**: pnpm
- **Styling**: Tailwind CSS + PostCSS

---

## Data Flow

### User Journey

1. **Authentication** → `/login` or `/signup` → `AuthProvider` validates session
2. **Onboarding** → `/onboarding` → Collect dietary preferences
3. **Pantry Setup** → `/pantry` → Select ingredients, set meal goals
4. **Recipe Generation** → API `/api/generate-recipe/` → AI generates meals
5. **View Recipes** → `/recipes` → Display 3 recommended recipes
6. **Save Meals** → API `/api/saved-meals/` → Store to Supabase
7. **Dashboard** → `/dashboard` → View saved meals and history

### State Management

- **Client State**: `store.ts` (localStorage for offline support)
- **Server State**: Supabase (user profiles, saved meals, history)
- **Auth State**: `AuthProvider` context + Supabase Auth

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
✅ Daily quota system (3 generations/day)  
✅ Offline support (localStorage)  
✅ Responsive design  

---

## Development Commands

See `package.json` for available scripts (dev, build, start, lint, etc.)

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint
```

---

## Notes

- Uses **Client Components** (`'use client'`) for interactive features
- Implements **Server Components** for data fetching and API routes
- Uses **Supabase** for real-time database and authentication
- Implements **localStorage** for offline-first capability
- Uses **Tailwind CSS** custom properties for theming
- Includes **quota system** (daily limit on recipe generations)
