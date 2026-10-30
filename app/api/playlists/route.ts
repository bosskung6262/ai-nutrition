import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { isSupabaseConfigError, listPlaylists } from '@/lib/supabase/data'
import { SESSION_COOKIE, verifySession } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Resolve the caller's identity from the signed session cookie (never from the request body/query). */
async function sessionEmail(): Promise<string | null> {
  const cookieStore = await cookies()
  return verifySession(cookieStore.get(SESSION_COOKIE)?.value)
}

/** Absolute origin of the current request — the basis of every share link. */
function originOf(req: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
}

/** Every playlist owned by the signed-in user, newest first. */
export async function GET(req: Request) {
  const STEP = '[GET /api/playlists]'
  try {
    const email = await sessionEmail()
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const playlists = await listPlaylists(email, originOf(req))
    return NextResponse.json({ ok: true, playlists }, { status: 200 })
  } catch (error: unknown) {
    if (isSupabaseConfigError(error)) {
      console.error(`${STEP} Supabase is not configured`)
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`${STEP} Unhandled error:`, msg, error)
    return NextResponse.json(
      {
        error: 'ไม่สามารถโหลดแผนการกินได้ในขณะนี้',
        detail: process.env.NODE_ENV === 'development' ? msg : undefined,
      },
      { status: 500 },
    )
  }
}
