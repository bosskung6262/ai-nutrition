import type { SupabaseClient } from '@supabase/supabase-js'
import type { CreateMealPlanInput, MealPlanItem, MealPlanPayload } from '@/types/meal-plan'
import { createAdminClient } from './server'

/**
 * Server-side persistence layer (Supabase only — no `.next/cache` fallback).
 *
 * Every route verifies the signed session cookie BEFORE reaching this module,
 * so the service-role client is only used to read/write the caller's own rows.
 */

export const todayStr = (): string => new Date().toISOString().slice(0, 10)

/** Raised when Supabase env vars are missing or still placeholders. */
export class SupabaseConfigError extends Error {
  constructor() {
    super(
      'ยังไม่ได้ตั้งค่าฐานข้อมูล: กรุณากำหนด NEXT_PUBLIC_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY',
    )
    this.name = 'SupabaseConfigError'
  }
}

export function isSupabaseConfigError(error: unknown): error is SupabaseConfigError {
  return error instanceof SupabaseConfigError
}

/** Service-role client, guarded by an explicit env check. */
export function getDb(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || url.includes('your-supabase') || key.includes('your-supabase')) {
    throw new SupabaseConfigError()
  }
  return createAdminClient()
}

/* ── profiles ─────────────────────────────────────────────────────── */

export type ProfileRow = {
  user_email: string
  updated_at: string
  age: string
  gender: string
  height: string
  weight: string
  activity: string
  diet: string
  health: string[]
  avoid: string[]
  bmr: number | null
  tdee: number | null
  target_calories: number | null
}

/** Application shape of a saved profile (camelCase on the wire). */
export type SavedProfile = {
  userEmail: string
  updatedAt: string
  age: string
  gender: string
  height: string
  weight: string
  activity: string
  diet: string
  health: string[]
  avoid: string[]
  bmr?: number
  tdee?: number
  targetCalories?: number
}

export function profileToRow(profile: SavedProfile): ProfileRow {
  return {
    user_email: profile.userEmail,
    updated_at: profile.updatedAt,
    age: profile.age,
    gender: profile.gender,
    height: profile.height,
    weight: profile.weight,
    activity: profile.activity,
    diet: profile.diet,
    health: profile.health,
    avoid: profile.avoid,
    bmr: profile.bmr ?? null,
    tdee: profile.tdee ?? null,
    target_calories: profile.targetCalories ?? null,
  }
}

export function rowToProfile(row: ProfileRow): SavedProfile {
  return {
    userEmail: row.user_email,
    updatedAt: row.updated_at,
    age: row.age,
    gender: row.gender,
    height: row.height,
    weight: row.weight,
    activity: row.activity,
    diet: row.diet,
    health: row.health ?? [],
    avoid: row.avoid ?? [],
    bmr: row.bmr ?? undefined,
    tdee: row.tdee ?? undefined,
    targetCalories: row.target_calories ?? undefined,
  }
}

/* ── saved_meals ──────────────────────────────────────────────────── */

export type StoredRecipe = {
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

export type StoredMeal = {
  id: string
  savedAt: string
  date: string
  mealTime: 'breakfast' | 'lunch' | 'dinner'
  recipe: StoredRecipe
}

export type SavedMealRow = {
  id: string
  user_email: string
  meal_time: StoredMeal['mealTime']
  date: string
  saved_at: string
  rank: string | null
  rank_num: number | null
  label: string | null
  tone: string | null
  title: string | null
  prep_time: string | null
  kcal: number | null
  protein: string | null
  carbs: string | null
  fat: string | null
  ingredients: string[] | null
  allergens: string[] | null
  steps: string[] | null
  safety_note: string | null
  recipe_json: StoredRecipe | null
}

export function mealToRow(email: string, meal: StoredMeal): SavedMealRow {
  return {
    id: meal.id,
    user_email: email,
    meal_time: meal.mealTime,
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
  }
}

export function rowToMeal(row: SavedMealRow): StoredMeal {
  const fromJson = row.recipe_json ?? null
  const recipe: StoredRecipe = fromJson ?? {
    rank: row.rank || 'อันดับ ' + (row.rank_num ?? 3),
    rankNum: row.rank_num ?? 3,
    label: row.label || '',
    tone: (row.tone as StoredRecipe['tone']) ?? 'ochre',
    title: row.title || '',
    time: row.prep_time || '',
    kcal: Number(row.kcal) || 0,
    macros: [row.protein || '0g', row.carbs || '0g', row.fat || '0g'],
    ingredients: row.ingredients ?? [],
    allergens: row.allergens ?? [],
    steps: row.steps ?? [],
    safetyNote: row.safety_note || '',
  }
  return {
    id: row.id,
    savedAt: row.saved_at ? new Date(row.saved_at).toISOString() : new Date().toISOString(),
    date: row.date || todayStr(),
    mealTime: row.meal_time || 'lunch',
    recipe,
  }
}

/* ── quota ────────────────────────────────────────────────────────── */

export const QUOTA_MAX = 3

export type DailyQuota = { date: string; used: number; max: number }

export type QuotaRow = {
  user_email: string
  date: string
  used: number
  max: number
}

export type QuotaResult = { ok: boolean; remaining: number; quota: DailyQuota }

// shortcut: retries cover concurrent "last slot" races; if contention grows,
// move the increment into a Postgres function instead.
const MAX_CONSUME_RETRIES = 3

function toQuota(row: QuotaRow): DailyQuota {
  return { date: row.date, used: row.used, max: row.max }
}

/** Read today's quota, resetting the row when the day rolls over. */
async function readQuota(db: SupabaseClient, userEmail: string): Promise<DailyQuota> {
  const today = todayStr()
  const { data, error } = await db
    .from('quota')
    .select('*')
    .eq('user_email', userEmail)
    .maybeSingle()
  if (error) throw error

  const row = data as QuotaRow | null
  if (row && row.date === today) return toQuota(row)

  const { data: fresh, error: resetError } = await db
    .from('quota')
    .upsert(
      { user_email: userEmail, date: today, used: 0, max: QUOTA_MAX },
      { onConflict: 'user_email' },
    )
    .select('*')
    .single()
  if (resetError) throw resetError
  return toQuota(fresh as QuotaRow)
}

/** Current quota for `userEmail` — the single server-side source of truth. */
export async function getQuota(userEmail: string): Promise<DailyQuota> {
  return readQuota(getDb(), userEmail)
}

/**
 * Decrement one generation from today's quota. The conditional update
 * (`used` must still equal the value we read) keeps concurrent requests from
 * double-spending the last slot.
 */
export async function consumeQuota(userEmail: string): Promise<QuotaResult> {
  const db = getDb()
  let seen: DailyQuota | null = null

  for (let attempt = 0; attempt < MAX_CONSUME_RETRIES; attempt += 1) {
    const quota = await readQuota(db, userEmail)
    seen = quota
    if (quota.used >= quota.max) return { ok: false, remaining: 0, quota }

    const next = quota.used + 1
    const { data, error } = await db
      .from('quota')
      .update({ used: next })
      .eq('user_email', userEmail)
      .eq('date', quota.date)
      .eq('used', quota.used)
      .select('*')
      .maybeSingle()
    if (error) throw error

    const row = data as QuotaRow | null
    if (row) {
      return {
        ok: true,
        remaining: Math.max(0, row.max - row.used),
        quota: toQuota(row),
      }
    }
  }

  return { ok: false, remaining: 0, quota: seen ?? { date: todayStr(), used: 0, max: QUOTA_MAX } }
}

/* ── meal_plans ───────────────────────────────────────────────────── */

export const MEAL_PLANS_MAX_PER_USER = 50

export type MealPlanRow = {
  id: string
  user_email: string
  title: string
  description: string | null
  meals: MealPlanItem[] | null
  is_public: boolean
  created_at: string
}

// shortcut: 48-bit hex share id — unguessable enough for link sharing; switch
// to a longer base62 id if enumeration/collision ever becomes a concern.
function newShareId(): string {
  return 'mp_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}

/**
 * `/plan/[id]` is the planned public preview route (UI not built yet) — kept as
 * a path so the same link works on localhost, preview and production.
 */
function shareUrlFor(id: string, origin: string): string {
  return new URL(`/plan/${id}`, origin).toString()
}

export function rowToMealPlan(row: MealPlanRow, origin: string): MealPlanPayload {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    meals: row.meals ?? [],
    shareUrl: shareUrlFor(row.id, origin),
    createdAt: row.created_at,
  }
}

/** Insert a shareable plan owned by `userEmail`; the row id doubles as the share id. */
export async function createMealPlan(
  userEmail: string,
  input: CreateMealPlanInput,
  origin: string,
): Promise<MealPlanPayload> {
  const db = getDb()
  const { data, error } = await db
    .from('meal_plans')
    .insert({
      id: newShareId(),
      user_email: userEmail,
      title: input.title,
      description: input.description ?? null,
      meals: input.meals,
      is_public: true,
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single()
  if (error) throw error
  return rowToMealPlan(data as MealPlanRow, origin)
}

/** Every plan owned by `userEmail`, newest first. */
export async function listMealPlans(
  userEmail: string,
  origin: string,
): Promise<MealPlanPayload[]> {
  const db = getDb()
  const { data, error } = await db
    .from('meal_plans')
    .select('*')
    .eq('user_email', userEmail)
    .order('created_at', { ascending: false })
    .limit(MEAL_PLANS_MAX_PER_USER)
  if (error) throw error
  return ((data ?? []) as MealPlanRow[]).map((row) => rowToMealPlan(row, origin))
}

/** Public read used by share links — non-public plans are reported as missing. */
export async function getPublicMealPlan(
  id: string,
  origin: string,
): Promise<MealPlanPayload | null> {
  const db = getDb()
  const { data, error } = await db
    .from('meal_plans')
    .select('*')
    .eq('id', id)
    .eq('is_public', true)
    .maybeSingle()
  if (error) throw error
  return data ? rowToMealPlan(data as MealPlanRow, origin) : null
}
