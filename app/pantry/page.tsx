'use client'

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock as ClockIcon,
  Flame,
  Moon,
  Salad,
  Sparkles,
  Sun,
  Target,
  UtensilsCrossed,
  Zap,
  X,
} from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { LoadingModal } from '@/components/LoadingModal'
import { getDailyQuota, loadPantry, loadProfile, savePantry, saveResult, setDailyQuota } from '@/lib/store'
import {
  INGREDIENT_CATEGORIES,
  MEAL_TIMES,
  PREP_TIMES,
  type IngredientCategories,
  type IngredientCategory,
  type IngredientCategoryId,
  type Pantry as PantryType,
} from '@/lib/types'
import type { GenerateResponse } from '@/lib/types'

const MEAL_ICONS: Record<string, typeof Sun> = {
  breakfast: Sun,
  lunch: Salad,
  dinner: Moon,
}

const createEmptyIngredientCategories = (): IngredientCategories => ({
  protein: [],
  vegetables: [],
  carbs: [],
  seasonings: [],
})

const normalizeIngredient = (value: string) => value.trim().toLocaleLowerCase()

function getSavedIngredientCategories(categories?: IngredientCategories): IngredientCategories {
  const emptyCategories = createEmptyIngredientCategories()

  if (!categories) return emptyCategories

  return INGREDIENT_CATEGORIES.reduce<IngredientCategories>((next, category) => {
    const ingredients = categories[category.id]
    next[category.id] = Array.isArray(ingredients)
      ? ingredients.filter((ingredient, index) =>
          Boolean(ingredient.trim()) &&
          ingredients.findIndex((item) => normalizeIngredient(item) === normalizeIngredient(ingredient)) === index,
        )
      : []
    return next
  }, emptyCategories)
}

interface IngredientCategoryCardProps {
  category: IngredientCategory
  ingredients: string[]
  onAdd: (categoryId: IngredientCategoryId, ingredient: string) => boolean
  onRemove: (categoryId: IngredientCategoryId, ingredient: string) => void
}

function IngredientCategoryCard({ category, ingredients, onAdd, onRemove }: IngredientCategoryCardProps) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addIngredient = () => {
    if (onAdd(category.id, draft)) {
      setDraft('')
      inputRef.current?.focus()
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    addIngredient()
  }

  return (
    <section
      style={{
        padding: 14,
        borderRadius: 16,
        background: '#FFFFFF',
        border: '1px solid var(--border)',
      }}
    >
      <label htmlFor={`ingredient-${category.id}`} style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--foreground)', marginBottom: 10 }}>
        {category.label}
      </label>
      <div style={{ display: 'flex', gap: 10 }}>
        <input
          id={`ingredient-${category.id}`}
          ref={inputRef}
          type="text"
          placeholder={category.placeholder}
          className="input-field"
          style={{ flex: 1, padding: '11px 13px' }}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <button type="button" className="btn-primary" onClick={addIngredient} style={{ padding: '11px 16px' }}>
          เพิ่ม
        </button>
      </div>

      {ingredients.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {ingredients.map((ingredient) => (
            <div
              key={ingredient}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 8px 8px 12px',
                borderRadius: 14,
                background: 'rgba(210,220,182,0.5)',
                border: '2px solid var(--primary)',
                color: 'var(--primary)',
                fontSize: 12.5,
                fontWeight: 500,
              }}
            >
              {ingredient}
              <button
                type="button"
                onClick={() => onRemove(category.id, ingredient)}
                className="btn-ghost"
                aria-label={`ลบ ${ingredient}`}
                style={{ padding: 2, color: 'var(--primary)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default function PantryPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [mealTime, setMealTime] = useState<PantryType['mealTime']>(null)
  const [prepTime, setPrepTime] = useState<PantryType['prepTime']>(null)
  const [ingredientCategories, setIngredientCategories] = useState<IngredientCategories>(createEmptyIngredientCategories)
  const [remaining, setRemaining] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/login')
      return
    }
    const quota = getDailyQuota()
    setRemaining(quota.max - quota.used)

    const profile = loadProfile()
    if (!profile || !profile.bmr) {
      router.replace('/onboarding')
      return
    }

    const saved = loadPantry()
    if (saved) {
      setMealTime(saved.mealTime)
      setPrepTime(saved.prepTime)
    }
    setIngredientCategories(getSavedIngredientCategories(saved?.categories))
  }, [loading, user, router])

  const items = useMemo(
    () => INGREDIENT_CATEGORIES.flatMap((category) => ingredientCategories[category.id]),
    [ingredientCategories],
  )

  const addIngredient = (categoryId: IngredientCategoryId, rawIngredient: string) => {
    const ingredient = rawIngredient.trim()
    if (!ingredient || items.some((item) => normalizeIngredient(item) === normalizeIngredient(ingredient))) {
      return false
    }

    setIngredientCategories((current) => ({
      ...current,
      [categoryId]: [...current[categoryId], ingredient],
    }))
    return true
  }

  const removeIngredient = (categoryId: IngredientCategoryId, ingredient: string) => {
    setIngredientCategories((current) => ({
      ...current,
      [categoryId]: current[categoryId].filter((item) => item !== ingredient),
    }))
  }

  const canSubmit = Boolean(mealTime) && Boolean(prepTime) && items.length > 0 && remaining > 0

  const selectedMealLabel = MEAL_TIMES.find((m) => m.id === mealTime)?.label || ''

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    savePantry({ mealTime, prepTime, items, categories: ingredientCategories })
    const profile = loadProfile()
    if (!profile) {
      setError('โปรไฟล์ผู้ใช้ไม่ถูกต้อง กรุณากลับไปกรอกโปรไฟล์ใหม่')
      return
    }
    setProcessing(true)
    try {
      const res = await fetch('/api/generate-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: user?.email,
          profile,
          pantry: { mealTime, prepTime, items },
        }),
      })
      const data = (await res.json()) as GenerateResponse & {
        error?: string
        quota?: { max: number; used: number }
        _meta?: { remaining: number; usedSoFar: number }
      }
      if (!res.ok) {
        if (res.status === 429) {
          const used = data.quota?.used ?? data._meta?.usedSoFar ?? 3
          const max = data.quota?.max ?? 3
          setDailyQuota(used, max)
          setRemaining(max - used)
        }
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      saveResult(data as GenerateResponse)
      const used = data._meta?.usedSoFar ?? 1
      const max = 3
      setDailyQuota(used, max)
      setRemaining(max - used)
      router.push('/recipes')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ AI'
      console.error('[pantry onSubmit]', msg, err)
      if (msg.includes('โควต้า')) {
        setError(msg)
      } else {
        setError(
          'ไม่สามารถสร้างเมนูได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง (หากซ้ำหลายครั้งอาจเกิดจากปัญหา API Key หรือเครือข่าย)',
        )
      }
      const q = getDailyQuota()
      setRemaining(q.max - q.used)
    } finally {
      setProcessing(false)
    }
  }

  if (loading || !user) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ fontFamily: 'var(--font-kanit)', fontSize: 18, color: 'var(--muted)' }}>กำลังโหลด...</div>
      </div>
    )
  }

  const profile = loadProfile()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 80 }}>
      <div
        className="shell"
        style={{ padding: '44px 0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>ขั้นตอนที่ 2/2 · เลือกมื้ออาหาร</div>
      </div>

      <div className="shell">
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 999,
                background: 'rgba(161,188,152,0.2)',
                color: 'var(--primary)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 0.02,
                marginBottom: 16,
              }}
            >
              <UtensilsCrossed style={{ width: 12, height: 12 }} />
              เลือกมื้ออาหารของคุณ
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-kanit)',
                margin: 0,
                fontSize: 42,
                fontWeight: 600,
                color: 'var(--foreground)',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
              }}
            >
              วันนี้คุณอยากกินมื้อไหนดี?
            </h1>
            <p style={{ margin: '10px 0 0', color: 'var(--muted)', fontSize: 15, maxWidth: 600 }}>
              เลือกช่วงเวลาและเวลาที่คุณต้องการเตรียมอาหาร AI จะคัดสรรสูตรที่เหมาะสมที่สุดสำหรับคุณ
            </p>
          </div>

          <form onSubmit={onSubmit} className="max-w-4xl mx-auto bg-white/80 backdrop-blur-md rounded-3xl p-6 sm:p-10 border border-white/60 shadow-xl my-8">
            <div className="card-header" style={{ marginTop: -4 }}>
              <button type="button" className="flex items-center gap-2 text-[#778873] hover:opacity-80 font-medium text-sm mb-6" onClick={() => router.push('/onboarding')}>
                <ArrowLeft className="w-4 h-4" />
                ย้อนกลับ
              </button>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 999,
                  background:
                    remaining > 0
                      ? 'linear-gradient(135deg, #D2DCB6 0%, #A1BC98 100%)'
                      : 'rgba(220,38,38,0.1)',
                  color: remaining > 0 ? '#5c6b59' : 'var(--color-danger)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <Zap className="w-4 h-4" />
                โควต้าเหลือ {remaining}/3 ครั้ง
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)', marginBottom: 12 }}>
                เลือกเวลาของมื้ออาหาร (จำเป็นต้องเลือก 1 อย่าง)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {MEAL_TIMES.map((mt) => {
                  const selected = mealTime === mt.id
                  const Icon = MEAL_ICONS[mt.id]
                  return (
                    <button
                      key={mt.id}
                      type="button"
                      onClick={() => setMealTime(mt.id)}
                      className={selected ? 'bg-[#D2DCB6] border-[#778873] rounded-2xl p-5 relative' : 'bg-white border border-white/60 rounded-2xl p-5 relative'}
                      style={{ border: selected ? '2px solid #778873' : '1.5px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}
                    >
                      {selected && (
                        <div style={{ position: 'absolute', top: 10, right: 10 }}>
                          <CheckCircle2 className="w-5 h-5 text-[#778873]" />
                        </div>
                      )}

                      <div style={{ width: 40, height: 40, borderRadius: 14, display: 'grid', placeItems: 'center', marginBottom: 4 }}>
                        <Icon className={selected ? 'text-[#778873] w-6 h-6' : 'text-[#A1BC98] w-6 h-6'} />
                      </div>
                      <div style={{ fontFamily: 'var(--font-kanit)', fontSize: 16, fontWeight: 600, color: '#2D3748' }}>{mt.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{mt.subtitle}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            <fieldset style={{ border: 0, padding: 0, margin: '26px 0 0' }}>
              <legend style={{ marginBottom: 12, fontSize: 13, fontWeight: 500, color: 'var(--foreground)' }}>
                เลือกเวลาที่ต้องการเตรียม (จำเป็นต้องเลือก 1 อย่าง)
              </legend>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {PREP_TIMES.map((pt) => {
                  const selected = prepTime === pt.id
                  return (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => setPrepTime(pt.id)}
                      className={selected ? 'bg-[#D2DCB6] border-[#778873] rounded-2xl p-4 flex items-center justify-center gap-2' : 'bg-white border border-white/60 rounded-2xl p-4 flex items-center justify-center gap-2'}
                      style={{ border: selected ? '2px solid #778873' : '1.5px solid var(--border)', cursor: 'pointer' }}
                    >
                      {selected && (
                        <div style={{ position: 'absolute', top: 8, right: 8 }}>
                          <CheckCircle2 className="w-5 h-5 text-[#778873]" />
                        </div>
                      )}
                      <div className="flex items-center justify-center gap-2">
                        <ClockIcon className={selected ? 'text-[#778873] w-5 h-5' : 'text-[#A1BC98] w-5 h-5'} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#2D3748' }}>{pt.label}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <div style={{ marginTop: 28 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)' }}>
                  ส่วนผสมที่มีอยู่ในครัว
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  เลือกแล้ว {items.length} รายการ
                </div>
              </div>

              <div
                style={{
                  padding: 18,
                  borderRadius: 22,
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: 10,
                }}
              >
                {INGREDIENT_CATEGORIES.map((category) => (
                  <IngredientCategoryCard
                    key={category.id}
                    category={category}
                    ingredients={ingredientCategories[category.id]}
                    onAdd={addIngredient}
                    onRemove={removeIngredient}
                  />
                ))}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1.1fr',
                gap: 14,
                marginTop: 26,
              }}
            >
              <div
                style={{
                  padding: 18,
                  borderRadius: 20,
                  background:
                    'linear-gradient(135deg, rgba(210,220,182,0.55) 0%, rgba(161,188,152,0.35) 100%)',
                  border: '1px solid rgba(161,188,152,0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  justifyContent: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#5c6b59', fontWeight: 600 }}>
                  <Target style={{ width: 13, height: 13 }} />
                  เป้าหมายพลังงานต่อมื้อ
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-kanit)',
                      fontSize: 34,
                      fontWeight: 600,
                      color: '#2a3528',
                    }}
                  >
                    {profile?.targetCalories
                      ? Math.round(profile.targetCalories / 3).toLocaleString()
                      : profile?.tdee
                      ? Math.round((profile.tdee * 0.9) / 3).toLocaleString()
                      : '--'}
                  </div>
                  <div style={{ fontSize: 12, color: '#5c6b59' }}>กิโลแคลอรี/มื้อ</div>
                </div>
                <div style={{ fontSize: 10.5, color: '#5c6b59', opacity: 0.9, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Flame style={{ width: 11, height: 11 }} />
                  AI จะปรับค่าให้เหมาะสมกับช่วงเวลาและเป้าหมายอีกครั้ง
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
                {error && (
                  <div className="error-msg" style={{ margin: 0 }}>
                    <AlertCircle style={{ width: 14, height: 14 }} />
                    {error}
                  </div>
                )}
                {!canSubmit && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: 12,
                      borderRadius: 14,
                      background: 'rgba(161,188,152,0.18)',
                      color: 'var(--primary)',
                      fontSize: 12,
                    }}
                  >
                    <Sparkles style={{ width: 14, height: 14, flexShrink: 0 }} />
                    {remaining <= 0
                      ? 'โควต้าวันนี้หมดแล้ว กรุณากลับมาใหม่ในวันพรุ่งนี้'
                      : !mealTime
                      ? 'กรุณาเลือกเวลาของมื้ออาหาร (เช้า/กลางวัน/เย็น)'
                      : !prepTime
                      ? 'กรุณาเลือกเวลาที่ต้องการเตรียมอาหาร'
                      : 'กรุณาเลือกอย่างน้อย 1 อย่างของส่วนผสม'}
                  </div>
                )}
                <button
                  className="btn-primary"
                  type="submit"
                  disabled={!canSubmit}
                  style={{ justifyContent: 'space-between', padding: '14px 20px' }}
                >
                  <span>ประมวลผลเมนูอาหารด้วย AI</span>
                  <Sparkles style={{ width: 16, height: 16 }} />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {processing && (
        <LoadingModal mealTimeLabel={selectedMealLabel} />
      )}
    </div>
  )
}
