import type { SupabaseClient } from '@supabase/supabase-js'
import type { CreateMealPlanInput, MealPlanItem, MealPlanPayload } from '@/types/meal-plan'
import { DAILY_QUOTA_MAX } from '@/lib/types'
import { createAdminClient } from './server'

/**
 * Server-side persistence layer (Supabase only — no `.next/cache` fallback).
 *
 * Every route verifies the signed session cookie BEFORE reaching this module,
 * so the service-role client is only used to read/write the caller's own rows.
 */

export const todayStr = (): string => new Date().toISOString().slice(0, 10)

/**
 * Stable, deterministic uuid for a session email.
 *
 * This app authenticates with a signed cookie that carries only an email — it
 * never signs in to Supabase Auth, so there is no `auth.uid()` to use. Both
 * `profiles.id` and `saved_meals.user_id` are NOT NULL uuid columns, so instead
 * of writing NULL we derive one identity per email (SHA-256, shaped as a v4
 * uuid). The same email always maps to the same uuid, on every request.
 *
 * Reads and writes always go through the service-role client, which bypasses
 * RLS — so the `auth.uid() = id` / `auth.uid() = user_id` policies are never
 * evaluated rather than being violated.
 */
export async function stableUserId(email: string): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email.trim().toLowerCase())),
  )
  digest[6] = (digest[6] & 0x0f) | 0x40 // version 4
  digest[8] = (digest[8] & 0x3f) | 0x80 // RFC 4122 variant
  const hex = Array.from(digest.subarray(0, 16), (b) => b.toString(16).padStart(2, '0')).join('')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-')
}

/** Form text → int4 column (`''` and unparseable input become NULL). */
function toInt(value: string | null | undefined): number | null {
  if (!value || !value.trim()) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : null
}

/** Form text → numeric column (`''` and unparseable input become NULL). */
function toNum(value: string | null | undefined): number | null {
  if (!value || !value.trim()) return null
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** int4/numeric column → the string form the profile form expects. */
function numToStr(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value)
}

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

/**
 * The real `profiles` columns. The table is keyed by `id` (uuid) and stores no
 * email at all — identity is the derived `stableUserId()` above.
 */
export type ProfileRow = {
  id: string
  updated_at: string | null
  full_name: string | null
  phone_number: string | null
  age: number | null
  gender: string | null
  height: number | null
  weight: number | null
  activity_level: string | null
  bmr: number | null
  tdee: number | null
  target_calories: number | null
  health_conditions: string[] | null
  diet_style: string | null
  allergies: string[] | null
  activity: string | null
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

export function profileToRow(profile: SavedProfile, id: string): ProfileRow {
  return {
    id,
    updated_at: profile.updatedAt,
    full_name: null,
    phone_number: null,
    age: toInt(profile.age),
    gender: profile.gender || null,
    height: toNum(profile.height),
    weight: toNum(profile.weight),
    activity_level: profile.activity || null,
    bmr: profile.bmr ?? null,
    tdee: profile.tdee ?? null,
    target_calories: profile.targetCalories ?? null,
    health_conditions: profile.health,
    diet_style: profile.diet || null,
    allergies: profile.avoid,
    activity: profile.activity || null,
  }
}

export function rowToProfile(row: ProfileRow, userEmail: string): SavedProfile {
  return {
    userEmail,
    updatedAt: row.updated_at ?? new Date().toISOString(),
    age: numToStr(row.age),
    gender: row.gender ?? '',
    height: numToStr(row.height),
    weight: numToStr(row.weight),
    // `activity_level` is the canonical column; `activity` is a legacy duplicate.
    activity: row.activity_level ?? row.activity ?? '',
    diet: row.diet_style ?? '',
    health: row.health_conditions ?? [],
    avoid: row.allergies ?? [],
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

/**
 * The real `saved_meals` columns. There is no place for the rank badge,
 * prep time, allergens or a nested recipe blob — those are reconstructed with
 * neutral placeholders in `rowToMeal()`.
 */
export type SavedMealRow = {
  id: string
  user_id: string
  created_at: string | null
  recipe_name: string
  meal_time: string | null
  calories_kcal: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  ingredients: string[] | null
  cooking_steps: string[] | null
  health_safety_note: string | null
  user_email: string | null
  saved_at: string | null
}

/** `'12g'` / `'Δ-5g'` → `12` / `-5`; anything unparseable becomes NULL. */
function macroToNumber(value: string): number | null {
  const parsed = Number.parseFloat(value.replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

/** numeric column → the `'12g'` display form used by the cards. */
function macroFromNumber(value: number | null): string {
  return value === null ? '—' : `${value}g`
}

export function mealToRow(email: string, userId: string, meal: StoredMeal): SavedMealRow {
  const { recipe } = meal
  return {
    id: meal.id,
    user_id: userId,
    created_at: meal.savedAt,
    recipe_name: recipe.title,
    meal_time: meal.mealTime,
    calories_kcal: Math.round(recipe.kcal),
    protein_g: macroToNumber(recipe.macros[0]),
    carbs_g: macroToNumber(recipe.macros[1]),
    fat_g: macroToNumber(recipe.macros[2]),
    ingredients: recipe.ingredients,
    cooking_steps: recipe.steps,
    health_safety_note: recipe.safetyNote,
    user_email: email,
    saved_at: meal.savedAt,
  }
}

export function rowToMeal(row: SavedMealRow): StoredMeal {
  const savedAt = row.created_at ?? row.saved_at ?? new Date().toISOString()
  return {
    id: row.id,
    savedAt,
    date: savedAt.slice(0, 10),
    mealTime: (row.meal_time as StoredMeal['mealTime']) || 'lunch',
    recipe: {
      rank: 'บันทึกไว้',
      rankNum: 1,
      label: 'เมนูที่บันทึกไว้',
      tone: 'sage',
      title: row.recipe_name,
      time: '',
      kcal: row.calories_kcal ?? 0,
      macros: [
        macroFromNumber(row.protein_g),
        macroFromNumber(row.carbs_g),
        macroFromNumber(row.fat_g),
      ],
      ingredients: row.ingredients ?? [],
      allergens: [],
      steps: row.cooking_steps ?? [],
      safetyNote: row.health_safety_note ?? '',
    },
  }
}

/* ── quota ────────────────────────────────────────────────────────── */

export const QUOTA_MAX = DAILY_QUOTA_MAX

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
  if (row && row.date === today && row.max === QUOTA_MAX) return toQuota(row)

  // Same-day rows keep their `used` count but pick up a changed limit;
  // a new day resets the count.
  const used = row && row.date === today ? row.used : 0
  const { data: fresh, error: resetError } = await db
    .from('quota')
    .upsert(
      { user_email: userEmail, date: today, used, max: QUOTA_MAX },
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
