'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Info,
  Loader2,
  Plus,
  Save,
  ShoppingCart,
  Trash2,
  Utensils,
  X,
} from 'lucide-react'
import { useModalA11y } from '@/lib/use-modal-a11y'
import type { MealPlanItem, MealPlanSchedule, MealSlot, ShoppingItem } from '@/types/meal-plan'
import type { Profile, SavedMeal } from '@/lib/types'
import { aggregateIngredients } from '@/lib/meal-plan-utils'

interface PlaylistBuilderProps {
  profile: Profile | null
  savedMeals: SavedMeal[]
  onCreated: () => void
  onClose: () => void
}

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2'

const SLOTS: { id: MealSlot; label: string }[] = [
  { id: 'breakfast', label: 'มื้อเช้า (Breakfast)' },
  { id: 'lunch', label: 'มื้อกลางวัน (Lunch)' },
  { id: 'dinner', label: 'มื้อเย็น (Dinner)' },
  { id: 'snack', label: 'ของว่าง (Snack)' },
]

export function PlaylistBuilder({ profile, savedMeals, onCreated, onClose }: PlaylistBuilderProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  useModalA11y(cardRef, onClose)

  const [step, setStep] = useState(1)
  const [title, setTitle] = useState('แผนมื้ออาหารของฉัน')
  const [description, setDescription] = useState('')
  const [days, setDays] = useState(3)
  const [activeDay, setActiveDay] = useState(1)
  const [schedule, setSchedule] = useState<MealPlanSchedule>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Picker state
  const [picking, setPicking] = useState<{ day: number; slot: MealSlot } | null>(null)

  const allSelectedMeals = useMemo(() => {
    const meals: MealPlanItem[] = []
    for (let d = 1; d <= days; d++) {
      if (!schedule[d]) continue
      for (const slot of SLOTS) {
        const meal = schedule[d][slot.id]
        if (meal) meals.push(meal)
      }
    }
    return meals
  }, [schedule, days])

  const shoppingList = useMemo(() => aggregateIngredients(allSelectedMeals), [allSelectedMeals])

  const totalKcal = useMemo(() => allSelectedMeals.reduce((sum, m) => sum + m.calories, 0), [allSelectedMeals])
  const avgKcalPerDay = days > 0 ? totalKcal / days : 0

  const avgMacros = useMemo(() => {
    const totals = allSelectedMeals.reduce(
      (acc, m) => {
        acc.protein += m.macros.protein
        acc.carbs += m.macros.carbs
        acc.fat += m.macros.fat
        return acc
      },
      { protein: 0, carbs: 0, fat: 0 },
    )
    return days > 0
      ? { protein: totals.protein / days, carbs: totals.carbs / days, fat: totals.fat / days }
      : { protein: 0, carbs: 0, fat: 0 }
  }, [allSelectedMeals, days])

  const kcalDiff = profile?.targetCalories ? avgKcalPerDay - profile.targetCalories : 0
  const kcalMatch = profile?.targetCalories 
    ? Math.abs(kcalDiff) < (profile.targetCalories * 0.1) 
    : false

  const safetyWarnings = useMemo(() => {
    if (!profile) return []
    const warnings: string[] = []
    const avoid = (profile.health || []).concat(profile.avoid || []).map(t => t.toLowerCase())
    
    for (const meal of allSelectedMeals) {
      if (!meal.ingredients) continue
      for (const ing of meal.ingredients) {
        const hit = avoid.find(tag => ing.toLowerCase().includes(tag))
        if (hit) {
          warnings.push(`เมนู "${meal.mealTitle}" อาจมีส่วนประกอบของ "${hit}"`)
        }
      }
    }
    return Array.from(new Set(warnings))
  }, [allSelectedMeals, profile])

  const onSave = async () => {
    if (!title.trim() || allSelectedMeals.length === 0) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/playlists/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          days,
          schedule,
          meals: allSelectedMeals,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      onCreated()
      onClose()
    } catch (err) {
      setError('ไม่สามารถบันทึก Playlist ได้ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setBusy(false)
    }
  }

  const setMeal = (day: number, slot: MealSlot, meal: MealPlanItem | null) => {
    setSchedule(prev => {
      const next = { ...prev }
      if (!next[day]) next[day] = {}
      if (meal) {
        next[day][slot] = meal
      } else {
        delete next[day][slot]
      }
      return next
    })
    setPicking(null)
  }

  const STEPS = [
    { id: 1, label: 'ข้อมูลแผน', sub: 'Basic Info' },
    { id: 2, label: 'จัดตารางมื้ออาหาร', sub: 'Meal Schedule' },
    { id: 3, label: 'สรุปและสร้างโค้ด', sub: 'Summary & Share' },
  ]

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="builder-title">
      <div
        ref={cardRef}
        // `.modal-card` in globals.css is unlayered, so its `width`, `padding` and
        // `overflow` beat every Tailwind utility (which live in @layer). The inline
        // style is what actually makes `max-w-4xl` (896px), a flush `p-0` shell and
        // horizontal-overflow clipping take effect.
        className="modal-card relative flex max-h-[90vh] w-full max-w-[92vw] flex-col overflow-hidden overflow-x-hidden p-0 sm:max-w-4xl"
        style={{
          textAlign: 'left',
          width: 'min(896px, 92vw)',
          maxHeight: '90vh',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* Header with Stepper */}
        <div className="border-b border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent)]/25 text-[var(--primary-dark)]">
                <Plus className="h-6 w-6" />
              </span>
              <div>
                <h2 id="builder-title" className="font-[var(--font-kanit)] text-2xl font-bold text-[var(--foreground)] leading-none mb-1">
                  สร้าง Playlist แผนการกิน
                </h2>
                <p className="text-sm text-[var(--muted)] font-medium">ออกแบบแผนมื้ออาหารของคุณเองได้ 1-7 วัน</p>
              </div>
            </div>
            <button className={`modal-close static h-10 w-10 ${FOCUS_RING}`} onClick={onClose} aria-label="ปิด">
              <X />
            </button>
          </div>

          <div className="flex items-center justify-center gap-6 sm:gap-16">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold transition-colors ${
                    step >= s.id ? 'bg-[var(--primary)] text-white shadow-sm' : 'bg-[var(--bg)] text-[var(--muted)] border border-[var(--border)]'
                  }`}>
                    {step > s.id ? <Check className="h-4 w-4" /> : s.id}
                  </span>
                  <div className="hidden sm:block">
                    <div className={`text-xs font-bold leading-tight ${step >= s.id ? 'text-[var(--foreground)]' : 'text-[var(--muted)]'}`}>
                      {s.label}
                    </div>
                    <div className="text-[10px] text-[var(--muted)] uppercase font-semibold tracking-wider">{s.sub}</div>
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="hidden sm:block h-[2px] w-12 bg-[var(--border)] rounded-full" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="max-h-[80vh] flex-1 overflow-y-auto overflow-x-hidden p-8 sm:p-10">
          {step === 1 && (
            <div className="mx-auto max-w-3xl space-y-10 py-6">
              <div className="space-y-8">
                <div>
                  <label className="mb-3 block text-[11px] font-black text-[var(--muted)] uppercase tracking-[0.2em]">
                    ชื่อ Playlist
                  </label>
                  <input
                    className="input-field text-2xl font-black py-5 px-6 rounded-2xl bg-[var(--bg)] border-2 border-[var(--border)] focus:border-[var(--primary)] transition-all"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="เช่น แผนคุมน้ำหนัก 3 วัน"
                  />
                </div>
                <div>
                  <label className="mb-3 block text-[11px] font-black text-[var(--muted)] uppercase tracking-[0.2em]">
                    คำอธิบาย (Optional)
                  </label>
                  <textarea
                    className="input-field min-h-[160px] text-base font-medium resize-none py-5 px-6 rounded-2xl bg-[var(--bg)] border-2 border-[var(--border)] focus:border-[var(--primary)] transition-all"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับแผนนี้ เช่น เมนูเน้นโปรตีน สำหรับช่วงลดน้ำหนัก..."
                  />
                </div>
                <div>
                  <label className="mb-4 block text-[11px] font-black text-[var(--muted)] uppercase tracking-[0.2em]">
                    จำนวนวันในแผน
                  </label>
                  <div className="flex flex-wrap gap-3 items-center">
                    {[1, 2, 3, 4, 5, 6, 7].map(d => (
                      <button
                        key={d}
                        onClick={() => setDays(d)}
                        className={`h-14 w-14 rounded-2xl border-2 font-black text-lg transition-all ${
                          days === d 
                            ? 'border-[var(--primary)] bg-[var(--primary)] text-white shadow-lg scale-105' 
                            : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--primary)]/50'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                    <span className="ml-4 text-base font-bold text-[var(--muted)]">วัน</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {/* Day Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {Array.from({ length: days }).map((_, i) => {
                  const day = i + 1
                  const isDayComplete = SLOTS.some(s => schedule[day]?.[s.id])
                  return (
                    <button
                      key={day}
                      onClick={() => setActiveDay(day)}
                      className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                        activeDay === day
                          ? 'bg-[var(--primary)] text-white shadow-md'
                          : 'bg-[var(--bg)] text-[var(--muted)] border border-[var(--border)] hover:border-[var(--primary)]/50'
                      }`}
                    >
                      <Calendar className="h-4 w-4" />
                      วันที่ {day}
                      {isDayComplete && <div className="h-1.5 w-1.5 rounded-full bg-white/50" />}
                    </button>
                  )
                })}
              </div>

              {/* Meal Grid */}
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg)] p-6">
                <div className="mb-6 flex items-center gap-3 border-b border-[var(--border)] pb-4">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent)]/20 text-[var(--primary)]">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-[var(--font-kanit)] text-base font-bold text-[var(--foreground)]">
                      จัดมื้ออาหารสำหรับ วันที่ {activeDay}
                    </h3>
                    <p className="text-xs text-[var(--muted)]">เลือกเมนูจากรายการที่บันทึกไว้</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {SLOTS.map(slot => {
                    const meal = schedule[activeDay]?.[slot.id]
                    return (
                      <div
                        key={slot.id}
                        className="group relative flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-all hover:border-[var(--primary)]/50 hover:shadow-sm"
                      >
                        <span className="mb-3 text-[10px] font-bold text-[var(--muted)] uppercase tracking-tighter">
                          {slot.label}
                        </span>
                        {meal ? (
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-base font-bold text-[var(--foreground)] leading-tight">
                                {meal.mealTitle}
                              </div>
                              <div className="mt-2 flex items-center gap-2 text-xs font-bold text-[var(--primary)]">
                                <Flame className="h-3.5 w-3.5" />
                                {meal.calories} kcal
                              </div>
                              <div className="mt-1 text-[11px] font-semibold text-[var(--muted)] whitespace-nowrap">
                                P:{meal.macros.protein}g · C:{meal.macros.carbs}g · F:{meal.macros.fat}g
                              </div>
                            </div>
                            <button
                              onClick={() => setMeal(activeDay, slot.id, null)}
                              className="h-9 w-9 shrink-0 rounded-xl bg-[var(--color-danger)]/10 text-[var(--color-danger)] transition-all hover:bg-[var(--color-danger)]/20"
                            >
                              <Trash2 className="mx-auto h-4.5 w-4.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setPicking({ day: activeDay, slot: slot.id })}
                            className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--border)] py-4 px-4 text-left text-xs font-bold text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/5 hover:border-[var(--primary)]/50"
                          >
                            <div className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--primary)]/10">
                              <Plus className="h-4 w-4" />
                            </div>
                            <span>เลือกเมนูอาหาร...</span>
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="mx-auto max-w-4xl space-y-8">
              {/* Card 1: Plan Summary + Daily Average Nutrition */}
              <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg)] p-8 shadow-sm">
                <h3 className="mb-6 font-[var(--font-kanit)] text-lg font-bold text-[var(--foreground)]">
                  สรุปแผนการกิน
                </h3>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-widest">ชื่อแผน</span>
                    <div className="mt-1 text-sm font-bold text-[var(--foreground)] break-words">{title}</div>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-widest">ระยะเวลา</span>
                    <div className="mt-1 text-sm font-bold text-[var(--foreground)]">{days} วัน</div>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-widest">มื้อทั้งหมด</span>
                    <div className="mt-1 text-sm font-bold text-[var(--foreground)]">{allSelectedMeals.length} มื้อ</div>
                  </div>
                </div>

                <div className="mt-8 border-t border-[var(--border)] pt-8">
                  <div className="mb-5 flex items-center gap-2 text-[11px] font-black text-[var(--muted)] uppercase tracking-[0.2em]">
                    <Activity className="h-4 w-4 text-[var(--primary)]" />
                    สารอาหารเฉลี่ยต่อวัน
                  </div>
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <div className="rounded-2xl bg-[var(--surface)] p-5 text-center border border-[var(--border)]">
                      <div className={`font-[var(--font-kanit)] text-2xl font-black ${kcalMatch ? 'text-[var(--primary)]' : 'text-[var(--color-gold)]'}`}>
                        {Math.round(avgKcalPerDay).toLocaleString()}
                      </div>
                      <div className="mt-1 text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">kcal</div>
                    </div>
                    <div className="rounded-2xl bg-[var(--surface)] p-5 text-center border border-[var(--border)]">
                      <div className="font-[var(--font-kanit)] text-2xl font-black text-[var(--foreground)]">
                        {Math.round(avgMacros.protein)}
                      </div>
                      <div className="mt-1 text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">โปรตีน (g)</div>
                    </div>
                    <div className="rounded-2xl bg-[var(--surface)] p-5 text-center border border-[var(--border)]">
                      <div className="font-[var(--font-kanit)] text-2xl font-black text-[var(--foreground)]">
                        {Math.round(avgMacros.carbs)}
                      </div>
                      <div className="mt-1 text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">คาร์บ (g)</div>
                    </div>
                    <div className="rounded-2xl bg-[var(--surface)] p-5 text-center border border-[var(--border)]">
                      <div className="font-[var(--font-kanit)] text-2xl font-black text-[var(--foreground)]">
                        {Math.round(avgMacros.fat)}
                      </div>
                      <div className="mt-1 text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">ไขมัน (g)</div>
                    </div>
                  </div>

                  {profile?.targetCalories && (
                    <div className="mt-5">
                      {kcalMatch ? (
                        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)]/10 px-4 py-2 text-xs font-black text-[var(--primary)]">
                          <Check className="h-4 w-4" />
                          ตรงตามเป้าหมายสุขภาพของคุณ
                        </div>
                      ) : (
                        <div className="text-xs font-bold leading-relaxed text-[var(--muted)]">
                          {kcalDiff > 0 ? 'แคลอรีสูงกว่า' : 'แคลอรีต่ำกว่า'}เป้าหมายประจำวันของคุณ{' '}
                          <span className="text-sm font-black text-[var(--color-danger)]">
                            {Math.abs(Math.round(kcalDiff))} kcal
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {safetyWarnings.length > 0 && (
                  <div className="mt-8 rounded-2xl border border-[var(--color-danger)]/10 bg-[var(--color-danger)]/5 p-6">
                    <h4 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[var(--color-danger)]">
                      <AlertTriangle className="h-5 w-5" />
                      คำเตือนความปลอดภัย
                    </h4>
                    <ul className="space-y-3">
                      {safetyWarnings.map((w, i) => (
                        <li key={i} className="flex gap-2 text-[11px] font-bold leading-relaxed text-[var(--color-danger)]">
                          <span className="shrink-0">•</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Card 2: Aggregated Shopping List */}
              <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg)] p-8 shadow-sm">
                <h3 className="mb-6 flex items-center gap-3 font-[var(--font-kanit)] text-lg font-bold text-[var(--foreground)]">
                  <ShoppingCart className="h-6 w-6 shrink-0 text-[var(--primary)]" />
                  รายการซื้อของล่วงหน้า (รวมทุกวัน)
                </h3>
                <div className="max-h-[360px] overflow-y-auto overflow-x-hidden pr-1">
                  {shoppingList.length === 0 ? (
                    <div className="py-12 text-center text-sm font-medium text-[var(--muted)]">
                      ยังไม่มีวัตถุดิบในรายการ
                    </div>
                  ) : (
                    <ul className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
                      {shoppingList.map((item, i) => (
                        <li key={i} className="flex items-center justify-between gap-4 border-b border-[var(--border)] py-3 last:border-0">
                          <span className="min-w-0 flex-1 text-xs font-bold text-[var(--foreground)] break-words">{item.name}</span>
                          <span className="shrink-0 rounded-lg bg-[var(--primary)]/5 px-2.5 py-1 text-xs font-black text-[var(--primary)]">
                            {item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(1)} {item.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="flex items-center justify-between gap-6 max-w-5xl mx-auto">
            <div className="flex-1">
              {error && <p className="text-sm font-bold text-[var(--color-danger)]">{error}</p>}
            </div>
            <div className="flex items-center gap-4">
              {step > 1 && (
                <button
                  onClick={() => setStep(prev => prev - 1)}
                  disabled={busy}
                  className={`btn-secondary h-11 px-8 rounded-xl text-sm font-bold shadow-sm hover:shadow transition-all ${FOCUS_RING}`}
                >
                  <ChevronLeft className="h-4 w-4" />
                  ย้อนกลับ
                </button>
              )}
              {step < 3 ? (
                <button
                  onClick={() => setStep(prev => prev + 1)}
                  disabled={!title.trim()}
                  className={`btn-primary h-11 px-10 rounded-xl text-sm font-bold shadow-sm hover:shadow transition-all ${FOCUS_RING}`}
                >
                  ถัดไป
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => void onSave()}
                  disabled={busy || allSelectedMeals.length === 0}
                  className={`btn-primary h-11 px-10 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all ${FOCUS_RING}`}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  บันทึกและสร้าง Share Code
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Saved Meal Picker Overlay */}
        {picking && (
          <div className="absolute inset-0 z-50 flex flex-col bg-[var(--surface)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] p-6">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                  <Utensils className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-[var(--font-kanit)] text-lg font-bold text-[var(--foreground)]">
                    เลือกเมนูสำหรับ {SLOTS.find(s => s.id === picking.slot)?.label}
                  </h3>
                  <p className="text-xs text-[var(--muted)] font-medium">วันที่ {picking.day}</p>
                </div>
              </div>
              <button onClick={() => setPicking(null)} className="h-10 w-10 rounded-full hover:bg-[var(--bg)] transition-colors">
                <X className="mx-auto h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 sm:p-10">
              {savedMeals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center">
                  <div className="mb-8 grid h-20 w-20 place-items-center rounded-[2rem] bg-[var(--bg)] text-[var(--muted)]">
                    <Utensils className="h-10 w-10" />
                  </div>
                  <div className="text-xl font-bold text-[var(--foreground)]">ไม่พบเมนูที่บันทึกไว้</div>
                  <p className="mt-3 text-sm font-medium text-[var(--muted)] max-w-xs leading-relaxed">กรุณาสร้างเมนูอาหารก่อนนำมาจัด Playlist นะคะ</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {savedMeals.map(meal => (
                    <button
                      key={meal.id}
                      onClick={() => setMeal(picking.day, picking.slot, {
                        mealTitle: meal.recipe.title,
                        calories: meal.recipe.kcal,
                        macros: {
                          protein: Number.parseFloat(meal.recipe.macros[0]) || 0,
                          carbs: Number.parseFloat(meal.recipe.macros[1]) || 0,
                          fat: Number.parseFloat(meal.recipe.macros[2]) || 0,
                        },
                        ingredients: meal.recipe.ingredients,
                        steps: meal.recipe.steps,
                        healthSafetyNote: meal.recipe.safetyNote,
                        recipeId: meal.id,
                      })}
                      className="group flex flex-col rounded-[2rem] border-2 border-[var(--border)] bg-[var(--bg)] p-6 text-left transition-all hover:border-[var(--primary)] hover:shadow-xl hover:-translate-y-1"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <span className="font-[var(--font-kanit)] text-base font-bold text-[var(--foreground)] line-clamp-2 leading-tight">
                          {meal.recipe.title}
                        </span>
                        <span className="shrink-0 text-xs font-black text-[var(--primary)] bg-[var(--primary)]/5 px-2 py-1 rounded-lg whitespace-nowrap">
                          {meal.recipe.kcal} kcal
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-[11px] font-bold text-[var(--muted)] whitespace-nowrap">
                        <span>P:{meal.recipe.macros[0]}</span>
                        <span className="opacity-30">·</span>
                        <span>C:{meal.recipe.macros[1]}</span>
                        <span className="opacity-30">·</span>
                        <span>F:{meal.recipe.macros[2]}</span>
                      </div>
                      <div className="mt-5 line-clamp-2 text-xs leading-relaxed text-[var(--muted)] font-medium opacity-80 group-hover:opacity-100">
                        {meal.recipe.ingredients.join(', ')}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
