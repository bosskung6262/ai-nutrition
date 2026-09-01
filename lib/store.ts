'use client'

import type { AuthUser, DailyQuota, GenerateResponse, Pantry, Profile, Recipe, SavedMeal } from './types'
import { Award, Clock, Dumbbell } from 'lucide-react'

const AUTH_KEY = 'ai-nutrition-auth'
const REMEMBER_KEY = 'ai-nutrition-remember'
const PROFILE_KEY = 'ai-nutrition-profile'
const PANTRY_KEY = 'ai-nutrition-pantry'
const RESULT_KEY = 'ai-nutrition-result'
const QUOTA_KEY = 'ai-nutrition-quota'
const SAVED_KEY = 'ai-nutrition-saved'

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function genId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function hashEmail(email: string): string {
  let h = 0
  const s = email.toLowerCase().trim()
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h).toString(36)
}

const rankMeta: Record<number, { rank: string; label: string; icon: typeof Award; tone: 'gold' | 'sage' | 'ochre' }> = {
  1: { rank: 'อันดับ 1', label: 'แนะนำมากที่สุดสำหรับคุณ', icon: Award, tone: 'gold' },
  2: { rank: 'อันดับ 2', label: 'ทางเลือกสุขภาพดี', icon: Dumbbell, tone: 'sage' },
  3: { rank: 'อันดับ 3', label: 'ทำง่ายรวดเร็ว', icon: Clock, tone: 'ochre' },
}

export function toRecipe(api: GenerateResponse['recipes'][number]): Recipe {
  const meta = rankMeta[api.rank] ?? rankMeta[3]
  return {
    rank: meta.rank,
    rankNum: api.rank,
    label: api.rankLabel || meta.label,
    icon: meta.icon,
    tone: meta.tone,
    title: api.recipeName,
    time: `${api.prepTimeMins} นาที`,
    kcal: api.caloriesKcal,
    macros: [`${api.macronutrients.protein_g}g`, `${api.macronutrients.carbs_g}g`, `${api.macronutrients.fat_g}g`],
    ingredients: api.ingredients,
    allergens: api.allergenWarnings,
    steps: api.cookingSteps,
    shortSteps: api.shortSteps, 
    safetyNote: api.healthSafetyNote,
  }
}

export interface StoredAuth {
  user: AuthUser
  passwordHash: string
}

export function getUserList(): StoredAuth[] {
  const raw = typeof window !== 'undefined' ? localStorage.getItem(AUTH_KEY + '-list') : null
  return raw ? JSON.parse(raw) : []
}

export function saveUserList(list: StoredAuth[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(AUTH_KEY + '-list', JSON.stringify(list))
}

export function getCurrentUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const remember = localStorage.getItem(REMEMBER_KEY)
  if (remember) {
    const parsed = JSON.parse(remember)
    if (parsed && parsed.user) return parsed.user as AuthUser
  }
  const raw = sessionStorage.getItem(AUTH_KEY)
  return raw ? (JSON.parse(raw) as AuthUser) : null
}

export function setAuthUser(user: AuthUser, rememberMe: boolean) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(AUTH_KEY, JSON.stringify(user))
  if (rememberMe) {
    localStorage.setItem(REMEMBER_KEY, JSON.stringify({ user, expires: Date.now() + 30 * 24 * 60 * 60 * 1000 }))
  } else {
    localStorage.removeItem(REMEMBER_KEY)
  }
}

export function clearAuth() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(AUTH_KEY)
  localStorage.removeItem(REMEMBER_KEY)
}

export function generateOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function createUser(name: string, email: string, phone: string, password: string): AuthUser {
  const user: AuthUser = {
    id: 'u_' + hashEmail(email) + genId(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    verified: false,
    createdAt: new Date().toISOString(),
  }
  const list = getUserList()
  list.push({ user, passwordHash: hashEmail(password + email) })
  saveUserList(list)
  return user
}

export function verifyUserLogin(email: string, password: string): AuthUser | null {
  const list = getUserList()
  const entry = list.find((e) => e.user.email === email.trim().toLowerCase())
  if (!entry) return null
  if (entry.passwordHash !== hashEmail(password + email)) return null
  return entry.user
}

export function findUserByEmail(email: string): AuthUser | null {
  const list = getUserList()
  const entry = list.find((e) => e.user.email === email.trim().toLowerCase())
  return entry ? entry.user : null
}

export function verifyAndActivateUser(email: string): AuthUser | null {
  const list = getUserList()
  const idx = list.findIndex((e) => e.user.email === email.trim().toLowerCase())
  if (idx === -1) return null
  list[idx].user.verified = true
  saveUserList(list)
  return list[idx].user
}

export function resetUserPassword(email: string, newPassword: string): boolean {
  const list = getUserList()
  const idx = list.findIndex((e) => e.user.email === email.trim().toLowerCase())
  if (idx === -1) return false
  list[idx].passwordHash = hashEmail(newPassword + email)
  saveUserList(list)
  return true
}

export function getDailyQuota(): DailyQuota {
  if (typeof window === 'undefined') return { date: todayStr(), used: 0, max: 3 }
  const raw = localStorage.getItem(QUOTA_KEY)
  const today = todayStr()
  if (!raw) {
    const fresh: DailyQuota = { date: today, used: 0, max: 3 }
    localStorage.setItem(QUOTA_KEY, JSON.stringify(fresh))
    return fresh
  }
  const parsed = JSON.parse(raw) as DailyQuota
  if (parsed.date !== today) {
    const reset: DailyQuota = { date: today, used: 0, max: 3 }
    localStorage.setItem(QUOTA_KEY, JSON.stringify(reset))
    return reset
  }
  return parsed
}

export function useOneQuota(): DailyQuota | null {
  const q = getDailyQuota()
  if (q.used >= q.max) return null
  const updated = { ...q, used: q.used + 1 }
  localStorage.setItem(QUOTA_KEY, JSON.stringify(updated))
  return updated
}

export function setDailyQuota(used: number, max: number = 3): DailyQuota {
  const today = todayStr()
  const updated: DailyQuota = { date: today, used: Math.max(0, Math.min(used, max)), max }
  if (typeof window !== 'undefined') {
    localStorage.setItem(QUOTA_KEY, JSON.stringify(updated))
  }
  return updated
}

export function saveProfile(profile: Profile) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export function loadProfile(): Profile | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(PROFILE_KEY)
  return raw ? (JSON.parse(raw) as Profile) : null
}

export function savePantry(pantry: Pantry) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(PANTRY_KEY, JSON.stringify(pantry))
}

export function loadPantry(): Pantry | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(PANTRY_KEY)
  return raw ? (JSON.parse(raw) as Pantry) : null
}

export function saveResult(result: GenerateResponse) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(RESULT_KEY, JSON.stringify(result))
}

export function loadResult(): GenerateResponse | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(RESULT_KEY)
  return raw ? (JSON.parse(raw) as GenerateResponse) : null
}

export function getSavedMeals(): SavedMeal[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(SAVED_KEY)
  return raw ? (JSON.parse(raw) as SavedMeal[]) : []
}

export function saveMeal(recipe: Recipe, mealTime: SavedMeal['mealTime']): SavedMeal {
  const all = getSavedMeals()
  const meal: SavedMeal = {
    id: 'm_' + genId(),
    savedAt: new Date().toISOString(),
    date: todayStr(),
    mealTime,
    recipe: { ...recipe, icon: undefined as unknown as Recipe['icon'] },
  }
  all.unshift(meal)
  localStorage.setItem(SAVED_KEY, JSON.stringify(all.slice(0, 50)))
  return meal
}

export function removeSavedMeal(id: string) {
  const all = getSavedMeals().filter((m) => m.id !== id)
  localStorage.setItem(SAVED_KEY, JSON.stringify(all))
}

export function calcBMR(profile: Profile): number {
  const w = parseFloat(profile.weight) || 60
  const h = parseFloat(profile.height) || 165
  const a = parseFloat(profile.age) || 30
  const isMale = profile.gender === 'male'
  const base = isMale ? (10 * w + 6.25 * h - 5 * a + 5) : (10 * w + 6.25 * h - 5 * a - 161)
  return Math.round(base)
}

export function calcTDEE(bmr: number, activity: string): number {
  const mult: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    'very-active': 1.9,
  }
  return Math.round(bmr * (mult[activity] ?? 1.375))
}
