import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { deletePlaylist, getPlaylistByCode, isSupabaseConfigError } from '@/lib/supabase/data'
import { SESSION_COOKIE, verifySession } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Absolute origin of the current request — the basis of every share link. */
function originOf(req: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
}

/** Resolve the caller's identity from the signed session cookie (never from the URL). */
async function sessionEmail(): Promise<string | null> {
  const cookieStore = await cookies()
  return verifySession(cookieStore.get(SESSION_COOKIE)?.value)
}

/**
 * Public read by share code — no session required, because anyone holding the
 * code should be able to preview the playlist. Non-public playlists are treated
 * as missing so the endpoint never leaks their existence.
 */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const STEP = '[GET /api/playlists/[code]]'
  try {
    const { code } = await params

    const playlist = await getPlaylistByCode(code, originOf(req))
    if (!playlist) {
      return NextResponse.json(
        { error: 'ไม่พบแผนการกินนี้ หรือลิงก์ถูกตั้งเป็นส่วนตัว' },
        { status: 404 },
      )
    }

    return NextResponse.json({ ok: true, playlist }, { status: 200 })
  } catch (error: unknown) {
    if (isSupabaseConfigError(error)) {
      console.error(`${STEP} Supabase is not configured`)
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`${STEP} Unhandled error:`, msg, error)
    return NextResponse.json(
      {
        error: 'ไม่สามารถโหลดแผนการกินนี้ได้',
        detail: process.env.NODE_ENV === 'development' ? msg : undefined,
      },
      { status: 500 },
    )
  }
}

/** Remove one of the signed-in user's own playlists. */
export async function DELETE(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const STEP = '[DELETE /api/playlists/[code]]'
  try {
    const email = await sessionEmail()
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code } = await params
    const removed = await deletePlaylist(email, code)
    if (!removed) {
      return NextResponse.json({ error: 'ไม่พบแผนการกินนี้ในคลังของคุณ' }, { status: 404 })
    }

    console.info(`${STEP} Deleted playlist ${code} for ${email}`)
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error: unknown) {
    if (isSupabaseConfigError(error)) {
      console.error(`${STEP} Supabase is not configured`)
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`${STEP} Unhandled error:`, msg, error)
    return NextResponse.json(
      {
        error: 'ไม่สามารถลบแผนการกินได้ในขณะนี้',
        detail: process.env.NODE_ENV === 'development' ? msg : undefined,
      },
      { status: 500 },
    )
  }
}
