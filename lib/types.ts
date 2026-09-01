import type { LucideIcon } from 'lucide-react'

export interface AuthUser {
  id: string
  name: string
  email: string
  phone: string
  verified: boolean
  createdAt: string
}

export interface DailyQuota {
  date: string
  used: number
  max: number
}

export interface Profile {
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

export interface MealTime {
  id: 'breakfast' | 'lunch' | 'dinner'
  label: string
  subtitle: string
}

export interface PrepTime {
  id: 'fast' | 'normal' | 'relaxed'
  label: string
}

export interface Pantry {
  mealTime: MealTime['id'] | null
  prepTime: PrepTime['id'] | null
  items: string[]
  categories?: IngredientCategories
}

export type IngredientCategoryId = 'protein' | 'vegetables' | 'carbs' | 'seasonings'

export interface IngredientCategory {
  id: IngredientCategoryId
  label: string
  placeholder: string
}

export type IngredientCategories = Record<IngredientCategoryId, string[]>

export interface SavedMeal {
  id: string
  savedAt: string
  recipe: Recipe
  mealTime: MealTime['id']
  date: string
}

export interface GenerateRequest {
  profile: Profile
  pantry: Pantry
}

export interface ApiRecipe {
  rank: number
  rankLabel: string
  recipeName: string
  prepTimeMins: number
  caloriesKcal: number
  macronutrients: { protein_g: number; carbs_g: number; fat_g: number }
  ingredients: string[]
  allergenWarnings: string[]
  cookingSteps: string[]
  healthSafetyNote: string
}

export interface GenerateResponse {
  targetCalories: number
  appliedFilters: string[]
  mealTimeLabel: string
  recipes: ApiRecipe[]
}

export interface Recipe {
  rank: string
  rankNum: number
  label: string
  icon: LucideIcon
  tone: 'gold' | 'sage' | 'ochre'
  title: string
  time: string
  kcal: number
  macros: [string, string, string]
  ingredients: string[]
  allergens: string[]
  steps: string[]
  shortSteps?: string[] 
  safetyNote: string
}

export const DIET_STYLES: { id: string; label: string }[] = [
  { id: 'none', label: 'ไม่กำหนด' },
  { id: 'if', label: 'IF' },
  { id: 'high-protein', label: 'High Protein' },
  { id: 'low-carb', label: 'Low Carb' },
  { id: 'keto', label: 'Keto' },
  { id: 'mediterranean', label: 'Mediterranean' },
  { id: 'dash', label: 'DASH Diet' },
  { id: 'clean-eating', label: 'Clean Eating' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'pescatarian', label: 'Pescatarian' },
]

export const ACTIVITY_LEVELS: { id: string; label: string }[] = [
  { id: 'sedentary', label: 'นั่งทำงาน / เคลื่อนไหวน้อย' },
  { id: 'light', label: 'ออกกำลังกายเบา 1-3 ครั้ง/สัปดาห์' },
  { id: 'moderate', label: 'ออกกำลังกายปานกลาง 3-5 ครั้ง/สัปดาห์' },
  { id: 'active', label: 'ออกกำลังกายหนัก 6-7 ครั้ง/สัปดาห์' },
  { id: 'very-active', label: 'ออกกำลังกายหนักมาก + งานร่างกาย' },
]

export const MEAL_TIMES: MealTime[] = [
  { id: 'breakfast', label: 'มื้อเช้า', subtitle: 'ย่อยง่าย ให้พลังงาน' },
  { id: 'lunch', label: 'มื้อกลางวัน', subtitle: 'อิ่มท้อง โภชนาการครบ' },
  { id: 'dinner', label: 'มื้อเย็น', subtitle: 'คาร์บต่ำ โปรตีนสูง ย่อยง่าย' },
]

export const PREP_TIMES: PrepTime[] = [
  { id: 'fast', label: 'เร็วทันใจ (ไม่เกิน 10 นาที)' },
  { id: 'normal', label: 'กำลังดี (15-20 นาที)' },
  { id: 'relaxed', label: 'พอมีเวลา (30 นาที)' },
]

export const INGREDIENT_CATEGORIES: IngredientCategory[] = [
  { id: 'protein', label: 'เนื้อสัตว์', placeholder: 'เช่น อกไก่, ไข่ไก่' },
  { id: 'vegetables', label: 'ผัก', placeholder: 'เช่น บรอกโคลี, คะน้า' },
  { id: 'carbs', label: 'แป้ง/ข้าว', placeholder: 'เช่น ข้าวกล้อง, มันฝรั่ง' },
  { id: 'seasonings', label: 'เครื่องปรุง', placeholder: 'เช่น ซีอิ๊ว, พริกไทย' },
]
