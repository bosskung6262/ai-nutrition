import { NextResponse } from 'next/server'
import { getPublicMealPlan, isSupabaseConfigError } from '@/lib/supabase/data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Public read for share links — no session required, because anyone holding the
 * link should be able to preview the playlist. Non-public plans are treated as
 * missing so the endpoint never leaks their existence.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const STEP = '[GET /api/meal-plans/[id]]'
  try {
    const { id } = await params
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin

    const plan = await getPublicMealPlan(id, origin)
    if (!plan) {
      return NextResponse.json(
        { error: 'ไม่พบแผนมื้ออาหารนี้ หรือลิงก์ถูกตั้งเป็นส่วนตัว' },
        { status: 404 },
      )
    }

    return NextResponse.json({ ok: true, plan }, { status: 200 })
  } catch (error: unknown) {
    if (isSupabaseConfigError(error)) {
      console.error(`${STEP} Supabase is not configured`)
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`${STEP} Unhandled error:`, msg, error)
    return NextResponse.json(
      {
        error: 'ไม่สามารถโหลดแผนมื้ออาหารนี้ได้',
        detail: process.env.NODE_ENV === 'development' ? msg : undefined,
      },
      { status: 500 },
    )
  }
}
