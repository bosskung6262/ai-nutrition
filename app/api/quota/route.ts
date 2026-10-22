import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getQuota, isSupabaseConfigError } from '@/lib/supabase/data'
import { SESSION_COOKIE, verifySession } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Daily generation quota for the signed-in user (single source of truth). */
export async function GET() {
  const STEP = '[GET /api/quota]'
  try {
    const cookieStore = await cookies()
    const email = await verifySession(cookieStore.get(SESSION_COOKIE)?.value)
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const quota = await getQuota(email)
    return NextResponse.json(
      { quota, remaining: Math.max(0, quota.max - quota.used) },
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
      { error: 'ไม่สามารถโหลดโควต้าได้', detail: process.env.NODE_ENV === 'development' ? msg : undefined },
      { status: 500 },
    )
  }
}
