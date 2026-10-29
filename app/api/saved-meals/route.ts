import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import {
  getDb,
  isSupabaseConfigError,
  mealToRow,
  rowToMeal,
  stableUserId,
  todayStr,
} from '@/lib/supabase/data'
import type { SavedMealRow, StoredMeal, StoredRecipe } from '@/lib/supabase/data'
import { SESSION_COOKIE, verifySession } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_MEALS_PER_USER = 50

const recipeSchema: z.ZodType<StoredRecipe> = z.object({
  rank: z.string(),
  rankNum: z.number().int().min(1).max(3),
  label: z.string(),
  tone: z.enum(['gold', 'sage', 'ochre']),
  title: z.string().min(1),
  time: z.string().min(1),
  kcal: z.number().positive(),
  macros: z.tuple([z.string(), z.string(), z.string()]),
  ingredients: z.array(z.string()),
  allergens: z.array(z.string()),
  steps: z.array(z.string()),
  safetyNote: z.string(),
})

const saveRequestSchema = z.object({
  mealTime: z.enum(['breakfast', 'lunch', 'dinner']),
  recipe: recipeSchema,
})

/** Resolve the caller's identity from the signed session cookie (never from the request body/query). */
async function sessionEmail(): Promise<string | null> {
  const cookieStore = await cookies()
  return verifySession(cookieStore.get(SESSION_COOKIE)?.value)
}

function genId(): string {
  return 'm_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

export async function POST(req: Request) {
  const STEP = '[POST /api/saved-meals]'
  try {
    const body = (await req.json()) as unknown
    const parsed = saveRequestSchema.safeParse(body)
    if (!parsed.success) {
      console.error(`${STEP} Zod validation failed:`, parsed.error.issues)
      return NextResponse.json(
        { error: 'ข้อมูลบันทึกมื้อไม่ถูกต้อง: ' + parsed.error.issues[0]?.message },
        { status: 400 },
      )
    }
    const data = parsed.data
    const email = await sessionEmail()
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const meal: StoredMeal = {
      id: genId(),
      savedAt: new Date().toISOString(),
      date: todayStr(),
      mealTime: data.mealTime,
      recipe: data.recipe,
    }

    const db = getDb()
    const { error } = await db
      .from('saved_meals')
      .insert(mealToRow(email, await stableUserId(email), meal))
    if (error) throw error

    console.info(`${STEP} Saved meal ${meal.id} for ${email}`)
    return NextResponse.json({ ok: true, meal, via: 'supabase' }, { status: 200 })
  } catch (error: unknown) {
    if (isSupabaseConfigError(error)) {
      console.error(`${STEP} Supabase is not configured`)
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`${STEP} Unhandled error:`, msg, error)
    return NextResponse.json(
      { error: 'ไม่สามารถบันทึกมื้ออาหารได้ในขณะนี้', detail: process.env.NODE_ENV === 'development' ? msg : undefined },
      { status: 500 },
    )
  }
}

export async function GET() {
  const STEP = '[GET /api/saved-meals]'
  try {
    const email = await sessionEmail()
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getDb()
    const { data, error } = await db
      .from('saved_meals')
      .select('*')
      .eq('user_email', email)
      .order('created_at', { ascending: false })
      .limit(MAX_MEALS_PER_USER)
    if (error) {
      console.error(`${STEP} Query error:`, error.message, error.code)
      throw error
    }

    const meals = (data ?? []).map((row) => rowToMeal(row as SavedMealRow))
    return NextResponse.json({ meals, via: 'supabase' }, { status: 200 })
  } catch (error: unknown) {
    if (isSupabaseConfigError(error)) {
      console.error(`${STEP} Supabase is not configured`)
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`${STEP} Unhandled error:`, msg, error)
    return NextResponse.json(
      { error: 'ไม่สามารถโหลดรายการมื้ออาหารที่บันทึกไว้ได้', detail: process.env.NODE_ENV === 'development' ? msg : undefined },
      { status: 500 },
    )
  }
}

export async function DELETE(req: Request) {
  const STEP = '[DELETE /api/saved-meals]'
  try {
    const email = await sessionEmail()
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const id = new URL(req.url).searchParams.get('id') || ''
    if (!id) {
      return NextResponse.json(
        { error: 'ต้องระบุ id ใน query string' },
        { status: 400 },
      )
    }

    const db = getDb()
    const { error } = await db.from('saved_meals').delete().eq('user_email', email).eq('id', id)
    if (error) {
      console.error(`${STEP} Delete error:`, error.message, error.code)
      throw error
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error: unknown) {
    if (isSupabaseConfigError(error)) {
      console.error(`${STEP} Supabase is not configured`)
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`${STEP} Unhandled error:`, msg, error)
    return NextResponse.json(
      { error: 'ไม่สามารถลบมื้ออาหารได้', detail: process.env.NODE_ENV === 'development' ? msg : undefined },
      { status: 500 },
    )
  }
}
