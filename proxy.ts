import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/lib/session'

const PROTECTED_PAGES = ['/dashboard', '/onboarding', '/pantry', '/recipes', '/smart-swap']
const PROTECTED_API = ['/api/generate-recipe', '/api/profile', '/api/saved-meals', '/api/quota']

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

  // ── Root: landing page is always public ────────────────────────────
  if (pathname === '/' || pathname === '') {
    return NextResponse.next()
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

  // ── Login / Signup: allow access to fix state sync issues ─────────
  if (pathname === '/login' || pathname === '/signup') {
    return NextResponse.next()
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
    '/smart-swap/:path*',
    '/api/generate-recipe',
    '/api/profile',
    '/api/saved-meals',
    '/api/quota',
  ],
}
