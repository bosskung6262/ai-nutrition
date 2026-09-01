import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { JsonStore } from '@/lib/server-db'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type StoredRecipe = {
  rank: string
  rankNum: number
  label: string
  tone: 'gold' | 'sage' | 'ochre'
  title: string
  time: string
  kcal: number
  macros: [string, string, string]
  ingredients: string[]
  allergens: string[]
  steps: string[]
  safetyNote: string
}

type StoredMeal = {
  id: string
  savedAt: string
  date: string
  mealTime: 'breakfast' | 'lunch' | 'dinner'
  recipe: StoredRecipe
}

type UserMeals = {
  userEmail: string
  updatedAt: string
  meals: StoredMeal[]
}

const FALLBACK_STORE = new JsonStore<string, UserMeals>('ai-nutrition-saved-meals.json')

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
  userEmail: z.string().email({ message: 'อีเมลไม่ถูกต้อง' }).optional(),
  mealTime: z.enum(['breakfast', 'lunch', 'dinner']),
  recipe: recipeSchema,
})

const MAX_MEALS_PER_USER = 50

function normEmail(email: string | undefined): string {
  return (email || '').trim().toLowerCase()
}

function genId(): string {
  return 'm_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

type SupabaseEnvStatus =
  | { ok: true; reason?: never }
  | { ok: false; reason: 'missing_env' | 'error'; detail?: string }

let cachedSupabaseStatus: SupabaseEnvStatus | null = null

function checkSupabaseEnv(): SupabaseEnvStatus {
  if (cachedSupabaseStatus) return cachedSupabaseStatus
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || url.includes('your-supabase') || key.includes('your-supabase')) {
    cachedSupabaseStatus = { ok: false, reason: 'missing_env' }
    return cachedSupabaseStatus
  }
  cachedSupabaseStatus = { ok: true }
  return cachedSupabaseStatus
}

/**
 * Get a Supabase client that uses the user's auth session (RLS-aware).
 * Falls back to the admin client if the session client cannot be created
 * (e.g. cookies() unavailable during static rendering).
 */
async function getSupabaseClient() {
  try {
    const cookieStore = await cookies()
    return createClient(cookieStore)
  } catch {
    return createAdminClient()
  }
}

function toFallback(meal: StoredMeal, email: string) {
  const existing = FALLBACK_STORE.get(email)
  const meals: StoredMeal[] = existing?.meals
    ? [meal, ...existing.meals].slice(0, MAX_MEALS_PER_USER)
    : [meal]
  FALLBACK_STORE.set(email, {
    userEmail: email,
    updatedAt: new Date().toISOString(),
    meals,
  })
}

async function saveToSupabase(email: string, meal: StoredMeal, mealTime: StoredMeal['mealTime']) {
  const sb = await getSupabaseClient()
  const { error } = await sb.from('saved_meals').insert({
    id: meal.id,
    user_email: email,
    meal_time: mealTime,
    date: meal.date,
    saved_at: meal.savedAt,
    rank: meal.recipe.rank,
    rank_num: meal.recipe.rankNum,
    label: meal.recipe.label,
    tone: meal.recipe.tone,
    title: meal.recipe.title,
    prep_time: meal.recipe.time,
    kcal: meal.recipe.kcal,
    protein: meal.recipe.macros[0],
    carbs: meal.recipe.macros[1],
    fat: meal.recipe.macros[2],
    ingredients: meal.recipe.ingredients,
    allergens: meal.recipe.allergens,
    steps: meal.recipe.steps,
    safety_note: meal.recipe.safetyNote,
    recipe_json: meal.recipe,
  })
  if (error) throw error
}

async function listFromSupabase(email: string): Promise<StoredMeal[]> {
  const sb = await getSupabaseClient()
  const { data, error } = await sb
    .from('saved_meals')
    .select('*')
    .eq('user_email', email)
    .order('saved_at', { ascending: false })
    .limit(MAX_MEALS_PER_USER)
  if (error) {
    console.warn('[listFromSupabase] Query error:', error.message, error.code)
    throw error
  }
  return (data || []).map((row) => {
    const fromJson = (row.recipe_json ?? null) as StoredRecipe | null
    const recipe: StoredRecipe = fromJson ?? {
      rank: row.rank || 'อันดับ ' + (row.rank_num ?? 3),
      rankNum: row.rank_num ?? 3,
      label: row.label || '',
      tone: (row.tone as StoredRecipe['tone']) ?? 'ochre',
      title: row.title || '',
      time: row.prep_time || '',
      kcal: Number(row.kcal) || 0,
      macros: [row.protein || '0g', row.carbs || '0g', row.fat || '0g'],
      ingredients: (row.ingredients as string[]) || [],
      allergens: (row.allergens as string[]) || [],
      steps: (row.steps as string[]) || [],
      safetyNote: row.safety_note || '',
    }
    return {
      id: row.id,
      savedAt: row.saved_at ? new Date(row.saved_at).toISOString() : new Date().toISOString(),
      date: row.date || todayStr(),
      mealTime: (row.meal_time as StoredMeal['mealTime']) || 'lunch',
      recipe,
    }
  })
}

async function deleteFromSupabase(email: string, id: string) {
  const sb = await getSupabaseClient()
  const { error } = await sb.from('saved_meals').delete().eq('user_email', email).eq('id', id)
  if (error) {
    console.warn('[deleteFromSupabase] Delete error:', error.message, error.code)
    throw error
  }
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
    const email = normEmail(data.userEmail)
    if (!email) {
      return NextResponse.json(
        { error: 'ต้องระบุ userEmail เพื่อบันทึกมื้ออาหาร' },
        { status: 400 },
      )
    }

    const meal: StoredMeal = {
      id: genId(),
      savedAt: new Date().toISOString(),
      date: todayStr(),
      mealTime: data.mealTime,
      recipe: data.recipe,
    }

    const envStatus = checkSupabaseEnv()
    let storedVia: 'supabase' | 'fallback' = 'fallback'

    if (envStatus.ok) {
      try {
        await saveToSupabase(email, meal, data.mealTime)
        storedVia = 'supabase'
      } catch (sbErr) {
        const detail = sbErr instanceof Error ? sbErr.message : String(sbErr)
        console.warn(
          `${STEP} Supabase insert failed (${detail}); falling back to JsonStore.`,
        )
        toFallback(meal, email)
        storedVia = 'fallback'
      }
    } else {
      toFallback(meal, email)
      storedVia = 'fallback'
    }

    console.info(
      `${STEP} Saved meal ${meal.id} for ${email} via=${storedVia}`,
    )
    return NextResponse.json({ ok: true, meal, via: storedVia }, { status: 200 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`${STEP} Unhandled error:`, msg, error)
    return NextResponse.json(
      { error: 'ไม่สามารถบันทึกมื้ออาหารได้ในขณะนี้', detail: msg },
      { status: 500 },
    )
  }
}

export async function GET(req: Request) {
  const STEP = '[GET /api/saved-meals]'
  try {
    const { searchParams } = new URL(req.url)
    const email = normEmail(searchParams.get('userEmail') || undefined)
    if (!email) {
      return NextResponse.json(
        { error: 'ต้องระบุ userEmail ใน query string' },
        { status: 400 },
      )
    }

    const envStatus = checkSupabaseEnv()
    if (envStatus.ok) {
      try {
        const rows = await listFromSupabase(email)
        return NextResponse.json(
          { meals: rows, via: 'supabase' },
          { status: 200 },
        )
      } catch (sbErr) {
        const detail = sbErr instanceof Error ? sbErr.message : String(sbErr)
        console.warn(
          `${STEP} Supabase select failed (${detail}); falling back to JsonStore.`,
        )
      }
    }
    const fallback = FALLBACK_STORE.get(email)
    return NextResponse.json(
      { meals: fallback?.meals || [], via: 'fallback' },
      { status: 200 },
    )
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`${STEP} Unhandled error:`, msg, error)
    return NextResponse.json(
      { error: 'ไม่สามารถโหลดรายการมื้ออาหารที่บันทึกไว้ได้', detail: msg },
      { status: 500 },
    )
  }
}

export async function DELETE(req: Request) {
  const STEP = '[DELETE /api/saved-meals]'
  try {
    const { searchParams } = new URL(req.url)
    const email = normEmail(searchParams.get('userEmail') || undefined)
    const id = searchParams.get('id') || ''
    if (!email || !id) {
      return NextResponse.json(
        { error: 'ต้องระบุ userEmail และ id ใน query string' },
        { status: 400 },
      )
    }

    const envStatus = checkSupabaseEnv()
    if (envStatus.ok) {
      try {
        await deleteFromSupabase(email, id)
      } catch (sbErr) {
        const detail = sbErr instanceof Error ? sbErr.message : String(sbErr)
        console.warn(
          `${STEP} Supabase delete failed (${detail}); applying to fallback as well.`,
        )
      }
    }

    const existing = FALLBACK_STORE.get(email)
    if (existing) {
      const remaining = existing.meals.filter((m) => m.id !== id)
      FALLBACK_STORE.set(email, {
        ...existing,
        updatedAt: new Date().toISOString(),
        meals: remaining,
      })
    }
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`${STEP} Unhandled error:`, msg, error)
    return NextResponse.json(
      { error: 'ไม่สามารถลบมื้ออาหารได้', detail: msg },
      { status: 500 },
    )
  }
}
