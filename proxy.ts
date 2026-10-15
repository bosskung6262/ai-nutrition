import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/lib/session'

const PROTECTED_PAGES = ['/dashboard', '/onboarding', '/pantry', '/recipes']
const PROTECTED_API = ['/api/generate-recipe', '/api/profile', '/api/saved-meals']

/**
 * Next.js 16 proxy — replaces the deprecated middleware.ts convention.
 *
 * The `auth_session` cookie is httpOnly + signed and minted server-side by
 * `/api/auth/session`.  This proxy verifies the signature (not just presence)
 * before trusting the session.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value)
  const isAuthed = !!session

  // ── Root: allow authenticated users to see landing page ────────────
  if ((pathname === '/' || pathname === '') && isAuthed) {
    return NextResponse.next()
  }
  if ((pathname === '/' || pathname === '') && !isAuthed) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ── Protected pages: require session ──────────────────────────────
  const isProtectedPage = PROTECTED_PAGES.some(
    (r) => pathname === r || pathname.startsWith(r + '/'),
  )
  if (isProtectedPage && !isAuthed) {
    console.warn(
      '[proxy] No auth session for protected page — redirecting to /login',
      { pathname },
    )
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Protected API routes: 401 if unauthenticated ──────────────────
  const isProtectedApi = PROTECTED_API.some(
    (r) => pathname === r || pathname.startsWith(r + '/'),
  )
  if (isProtectedApi && !isAuthed) {
    return NextResponse.json(
      { error: 'Unauthorized — no session' },
      { status: 401 },
    )
  }

  // ── Login / Signup: redirect to dashboard if already authed ───────
  if ((pathname === '/login' || pathname === '/signup') && isAuthed) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/signup',
    '/dashboard/:path*',
    '/onboarding/:path*',
    '/pantry/:path*',
    '/recipes/:path*',
    '/api/generate-recipe',
    '/api/profile',
    '/api/saved-meals',
  ],
}
