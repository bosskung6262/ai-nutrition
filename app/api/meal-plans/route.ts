import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  createMealPlan,
  isSupabaseConfigError,
  listMealPlans,
} from '@/lib/supabase/data'
import { SESSION_COOKIE, verifySession } from '@/lib/session'
import { createMealPlanInputSchema } from '@/types/meal-plan'

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

/** Create a shareable meal plan owned by the signed-in user. */
export async function POST(req: Request) {
  const STEP = '[POST /api/meal-plans]'
  try {
    const body = (await req.json().catch(() => null)) as unknown
    const parsed = createMealPlanInputSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'ข้อมูลแผนมื้ออาหารไม่ถูกต้อง: ' + parsed.error.issues[0]?.message },
        { status: 400 },
      )
    }

    const email = await sessionEmail()
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const plan = await createMealPlan(email, parsed.data, originOf(req))
    console.info(`${STEP} Created plan ${plan.id} for ${email} (${plan.meals.length} meals)`)
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
        error: 'ไม่สามารถสร้างแผนมื้ออาหารได้ในขณะนี้',
        detail: process.env.NODE_ENV === 'development' ? msg : undefined,
      },
      { status: 500 },
    )
  }
}

/** All meal plans created by the signed-in user, newest first. */
export async function GET(req: Request) {
  const STEP = '[GET /api/meal-plans]'
  try {
    const email = await sessionEmail()
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const plans = await listMealPlans(email, originOf(req))
    return NextResponse.json({ ok: true, plans }, { status: 200 })
  } catch (error: unknown) {
    if (isSupabaseConfigError(error)) {
      console.error(`${STEP} Supabase is not configured`)
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`${STEP} Unhandled error:`, msg, error)
    return NextResponse.json(
      {
        error: 'ไม่สามารถโหลดแผนมื้ออาหารได้ในขณะนี้',
        detail: process.env.NODE_ENV === 'development' ? msg : undefined,
      },
      { status: 500 },
    )
  }
}
