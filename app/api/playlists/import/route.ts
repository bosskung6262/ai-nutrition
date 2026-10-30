import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { importPlaylist, isSupabaseConfigError } from '@/lib/supabase/data'
import { SESSION_COOKIE, verifySession } from '@/lib/session'
import { playlistImportInputSchema } from '@/types/meal-plan'

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

/** Copy a shared playlist into the caller's own collection as one record. */
export async function POST(req: Request) {
  const STEP = '[POST /api/playlists/import]'
  try {
    const body = (await req.json().catch(() => null)) as unknown
    const parsed = playlistImportInputSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'ข้อมูลโค้ดไม่ถูกต้อง: ' + parsed.error.issues[0]?.message },
        { status: 400 },
      )
    }

    const email = await sessionEmail()
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await importPlaylist(email, parsed.data.code, originOf(req))
    if (!result) {
      return NextResponse.json({ error: 'ไม่พบแผนการกินนี้' }, { status: 404 })
    }

    console.info(`${STEP} Imported ${parsed.data.code} for ${email} as ${result.playlist.code}`)
    return NextResponse.json(
      { ok: true, playlist: result.playlist, reused: result.reused },
      { status: 200 },
    )
  } catch (error: unknown) {
    if (isSupabaseConfigError(error)) {
      console.error(`${STEP} Supabase is not configured`)
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`${STEP} Unhandled error:`, msg, error)
    return NextResponse.json(
      {
        error: 'ไม่สามารถนำเข้าแผนการกินได้ในขณะนี้',
        detail: process.env.NODE_ENV === 'development' ? msg : undefined,
      },
      { status: 500 },
    )
  }
}
