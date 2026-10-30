import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createPlaylist, isSupabaseConfigError } from '@/lib/supabase/data'
import { SESSION_COOKIE, verifySession } from '@/lib/session'
import { playlistGenerateInputSchema } from '@/types/meal-plan'

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

/** Create a shareable 1/3/7-day playlist owned by the signed-in user. */
export async function POST(req: Request) {
  const STEP = '[POST /api/playlists/generate]'
  try {
    const body = (await req.json().catch(() => null)) as unknown
    const parsed = playlistGenerateInputSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'ข้อมูลแผนการกินไม่ถูกต้อง: ' + parsed.error.issues[0]?.message },
        { status: 400 },
      )
    }

    const email = await sessionEmail()
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { playlist, reused } = await createPlaylist(email, parsed.data, originOf(req))
    console.info(
      `${STEP} ${reused ? 'Reused' : 'Created'} playlist ${playlist.code} for ${email} (${playlist.meals.length} meals)`,
    )
    return NextResponse.json({ ok: true, playlist, reused }, { status: 200 })
  } catch (error: unknown) {
    if (isSupabaseConfigError(error)) {
      console.error(`${STEP} Supabase is not configured`)
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`${STEP} Unhandled error:`, msg, error)
    return NextResponse.json(
      {
        error: 'ไม่สามารถสร้างแผนการกินได้ในขณะนี้',
        detail: process.env.NODE_ENV === 'development' ? msg : undefined,
      },
      { status: 500 },
    )
  }
}
