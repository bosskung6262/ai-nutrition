'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  ChevronRight,
  CircleAlert,
  Droplets,
  Dumbbell,
  Flame,
  Leaf,
  LoaderCircle,
  Repeat,
  Share2,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { ShareModal } from '@/components/ShareModal'
import { useSmartSwap } from '@/hooks/useSmartSwap'
import { loadPantry, saveMeal } from '@/lib/store'
import type { Recipe } from '@/lib/types'
import type { SwapGoal } from '@/types/smart-swap'

/** Labels mirror the server's GOAL_LABEL map in app/api/smart-swap/route.ts. */
const GOAL_OPTIONS: { id: SwapGoal; label: string; icon: typeof Flame }[] = [
  { id: 'lower_calorie', label: 'ลดแคลอรี', icon: Flame },
  { id: 'lower_sodium', label: 'ลดโซเดียม', icon: Droplets },
  { id: 'higher_protein', label: 'เพิ่มโปรตีน', icon: Dumbbell },
  { id: 'vegan', label: 'วีแกน/เจ', icon: Leaf },
]

const QUERY_MAX_LEN = 120
const RESTRICTIONS_MAX_LEN = 120

/** Integers stay clean, everything else shows one decimal. */
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmt(Math.abs(n))}`

export default function SmartSwapPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { generateSwap, data, isLoading, error } = useSmartSwap()

  const [query, setQuery] = useState('')
  const [restrictions, setRestrictions] = useState('')
  const [selectedGoal, setSelectedGoal] = useState<SwapGoal>('lower_calorie')
  // Snapshots taken at submit time, so the result header keeps describing the plan
  // that was actually generated even if the user edits the form afterwards.
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [submittedGoal, setSubmittedGoal] = useState<SwapGoal>('lower_calorie')
  const [shareOpen, setShareOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return
    if (!user) router.replace('/login')
  }, [loading, user, router])

  const canSubmit = query.trim().length > 0 && !isLoading

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const target = query.trim()
    if (!target || isLoading) return
    setSubmittedQuery(target)
    setSubmittedGoal(selectedGoal)
    setSaved(false)
    await generateSwap({
      targetRecipeOrIngredient: target,
      swapGoal: selectedGoal,
      additionalRestrictions: restrictions.trim() || undefined,
    })
  }

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center" style={{ background: 'var(--bg)' }}>
        <div className="text-lg" style={{ fontFamily: 'var(--font-kanit)', color: 'var(--muted)' }}>
          กำลังโหลด...
        </div>
      </div>
    )
  }

  const goalLabel = GOAL_OPTIONS.find((option) => option.id === submittedGoal)?.label ?? ''

  // Where the goal moved the needle: that single metric earns the colour treatment.
  const highlightKey = submittedGoal === 'higher_protein' ? 'proteinDiff' : 'calorieDiff'

  const deltas = data
    ? ([
        { key: 'calorieDiff', label: 'แคลอรี', unit: 'kcal', value: data.nutritionDelta.calorieDiff },
        { key: 'proteinDiff', label: 'โปรตีน', unit: 'g', value: data.nutritionDelta.proteinDiff },
        { key: 'carbsDiff', label: 'คาร์โบไฮเดรต', unit: 'g', value: data.nutritionDelta.carbsDiff },
        { key: 'fatDiff', label: 'ไขมัน', unit: 'g', value: data.nutritionDelta.fatDiff },
      ] as const).map((delta) => {
        if (delta.key !== highlightKey) {
          return { ...delta, color: 'var(--foreground)' }
        }
        const improved =
          submittedGoal === 'higher_protein' ? delta.value >= 0 : delta.value <= 0
        return { ...delta, color: improved ? 'var(--color-sage)' : 'var(--color-ochre)' }
      })
    : []

  // The result only carries differences, while /api/saved-meals expects absolute
  // values — so we persist a self-describing "Δ from the original" record.
  const onSave = async () => {
    if (!data || saved) {
      if (saved) {
        setToast('เมนูนี้ถูกบันทึกไว้แล้วในคลังของคุณ')
        setTimeout(() => setToast(null), 2600)
      }
      return
    }

    const title = `${submittedQuery || data.originalItem} · ${goalLabel}`
    const recipe: Recipe = {
      rank: 'ผลต่างสูตร',
      rankNum: 1,
      label: `ผลต่างจากสูตรเดิม · ${goalLabel}`,
      icon: Repeat,
      tone: 'sage',
      title,
      time: '—',
      kcal: Math.max(1, Math.round(Math.abs(data.nutritionDelta.calorieDiff))),
      macros: [
        `Δ${signed(data.nutritionDelta.proteinDiff)}g`,
        `Δ${signed(data.nutritionDelta.carbsDiff)}g`,
        `Δ${signed(data.nutritionDelta.fatDiff)}g`,
      ],
      ingredients: data.suggestedSubstitutions.map(
        (swap) => `${swap.originalIngredient} → ${swap.replacementIngredient} (${swap.ratio})`,
      ),
      allergens: [],
      steps: data.instructions ?? [],
      safetyNote: 'ค่าที่แสดงคือผลต่างจากสูตรเดิม ไม่ใช่ค่าสัมบูรณ์',
    }

    const mealId = (loadPantry()?.mealTime ?? 'lunch') as 'breakfast' | 'lunch' | 'dinner'
    saveMeal(recipe, mealId)
    setSaved(true)

    let serverOk = false
    let serverMsg = ''
    try {
      if (user?.email) {
        const { icon, ...savedRecipe } = recipe
        const response = await fetch('/api/saved-meals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mealTime: mealId, recipe: savedRecipe }),
        })
        const payload = (await response.json().catch(() => null)) as { ok?: boolean; via?: string } | null
        serverOk = response.ok && Boolean(payload?.ok)
        serverMsg = payload?.via === 'supabase' ? ' (Supabase)' : payload?.via === 'fallback' ? ' (Local)' : ''
      }
    } catch {
      serverMsg = ' (Server sync skipped)'
    }

    setToast(
      serverOk
        ? `บันทึก "${title}" แล้ว${serverMsg}! พร้อมเข้าถึงได้ในแดชบอร์ด`
        : `บันทึก "${title}" ในอุปกรณ์${serverMsg} · กรุณาตรวจสอบการเชื่อมต่อ`,
    )
    setTimeout(() => setToast(null), 3200)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 80 }}>
      <div className="shell pt-11 pb-7">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-[12px] font-semibold tracking-wide text-primary uppercase">
          <Repeat className="size-3" />
          Smart Swap Engine
        </div>
        <h1
          className="mt-4 text-4xl font-semibold text-[var(--foreground)] sm:text-[52px]"
          style={{ fontFamily: 'var(--font-kanit)' }}
        >
          ปรับสูตรเมนูโปรด <em className="not-italic text-[#91a694]">ให้ตรงเป้าหมาย</em>
        </h1>
        <p className="mt-2.5 max-w-2xl text-[15px] text-[var(--muted)] leading-relaxed">
          พิมพ์ชื่อเมนูหรือวัตถุดิบ แล้วเลือกเป้าหมาย <span className="text-primary font-medium">AI จะเสนอการเปลี่ยนส่วนผสม</span>ที่ทำได้จริง
          พร้อมผลต่างของสารอาหาร
        </p>
      </div>

      <div className="shell">
        <div className="mx-auto max-w-3xl">
          <form className="glass-card p-6 sm:p-7" onSubmit={onSubmit}>
            <label
              htmlFor="smart-swap-query"
              className="mb-2 block text-[13px] font-medium text-[var(--foreground)]"
            >
              เมนู
            </label>
            <input
              id="smart-swap-query"
              type="text"
              className="input-field"
              maxLength={QUERY_MAX_LEN}
              placeholder="กรุณากรอกเมนูที่ต้องการปรับ เช่น คัพเค้ก"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />

            <fieldset className="mt-6 border-0 p-0">
              <legend className="mb-3 text-[13px] font-medium text-[var(--foreground)]">
                เป้าหมายการปรับสูตร
              </legend>
              <div className="flex flex-wrap gap-2.5">
                {GOAL_OPTIONS.map((option) => {
                  const Icon = option.icon
                  const selected = option.id === selectedGoal
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={selected ? 'chip selected' : 'chip'}
                      aria-pressed={selected}
                      onClick={() => setSelectedGoal(option.id)}
                    >
                      <Icon className="size-4" />
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <details className="group mt-5">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[13px] font-medium text-[var(--foreground)] [&::-webkit-details-marker]:hidden">
                <ChevronRight className="size-4 text-[var(--muted)] transition-transform group-open:rotate-90" />
                ข้อจำกัดเพิ่มเติมสำหรับมื้อนี้
                <span className="font-normal text-[var(--muted)]">(Optional)</span>
              </summary>
              <input
                id="smart-swap-restrictions"
                type="text"
                className="input-field mt-3"
                maxLength={RESTRICTIONS_MAX_LEN}
                aria-label="ข้อจำกัดเพิ่มเติมสำหรับมื้อนี้ (Optional)"
                placeholder="เช่น ไม่ใส่พริก, ไม่ใช้น้ำมัน, แพ้กุ้งเพิ่มเติม..."
                value={restrictions}
                onChange={(event) => setRestrictions(event.target.value)}
              />
            </details>

            {error && (
              <div className="error-msg" role="alert">
                <CircleAlert />
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary mt-6 w-full justify-between px-5 py-3.5"
              disabled={!canSubmit}
            >
              <span>{isLoading ? 'กำลังคำนวณเมนูสุขภาพ...' : 'Smart Swap'}</span>
              {isLoading ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
            </button>
          </form>

          {isLoading && (
            <section className="glass-card mt-6 p-6" aria-busy="true" aria-live="polite">
              <div className="h-5 w-2/3 animate-pulse rounded-full" style={{ background: 'var(--card)' }} />
              <div className="mt-5 space-y-3">
                {[0, 1, 2].map((row) => (
                  <div
                    key={row}
                    className="h-16 animate-pulse rounded-2xl"
                    style={{ background: 'var(--card)' }}
                  />
                ))}
              </div>
            </section>
          )}

          {!isLoading && !data && (
            <div
              className="mt-6 flex items-center gap-2 rounded-2xl p-4 text-xs text-[var(--primary)]"
              style={{ background: 'rgba(161,188,152,0.18)' }}
            >
              <Sparkles className="size-4 shrink-0" />
              เลือกเป้าหมายแล้วกดปุ่มเพื่อดูข้อเสนอการเปลี่ยนส่วนผสม (ใช้โควต้าสร้างเมนู 1 ครั้ง)
            </div>
          )}

          {!isLoading && data && (
            <>
            <section className="glass-card mt-6 p-6 sm:p-7" aria-live="polite">
              <h2
                className="text-xl font-semibold text-[var(--foreground)]"
                style={{ fontFamily: 'var(--font-kanit)' }}
              >
                ปรับสูตร <span className="text-primary">{submittedQuery || data.originalItem}</span> ให้เข้ากับเป้าหมาย <span className="text-primary">{goalLabel}</span>
              </h2>

              <h3 className="mt-6 mb-3 text-[13px] font-medium text-[var(--foreground)]">
                ส่วนผสมที่แนะนำให้เปลี่ยน
              </h3>
              <ul className="space-y-3">
                {data.suggestedSubstitutions.map((swap, index) => (
                  <li
                    key={`${swap.originalIngredient}-${index}`}
                    className="rounded-2xl border p-4"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--foreground)]">
                        {swap.originalIngredient}
                      </span>
                      <ArrowRight className="size-4 text-[var(--primary)]" aria-hidden="true" />
                      <span className="text-sm font-semibold text-[var(--primary)]">
                        {swap.replacementIngredient}
                      </span>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <span className="tag-pill bg-primary/10 text-primary border-none">อัตราส่วน {swap.ratio}</span>
                      <span className="tag-pill bg-primary/10 text-primary border-none">แคลอรี {signed(swap.calorieImpactPct)}%</span>
                    </div>
                    <p className="mt-2.5 text-[13px] text-[var(--muted)]">{swap.reason}</p>
                  </li>
                ))}
              </ul>

              <h3 className="mt-6 mb-3 text-[13px] font-medium text-[var(--foreground)]">
                ผลต่างสารอาหารหลังปรับสูตร
              </h3>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {deltas.map((delta) => (
                  <div key={delta.key} className="macro-chip">
                    <b style={{ color: delta.color }}>{signed(delta.value)}</b>
                    <span>
                      {delta.label} ({delta.unit})
                    </span>
                  </div>
                ))}
              </div>

              {data.instructions && data.instructions.length > 0 && (
                <>
                  <h3 className="mt-8 mb-4 flex items-center gap-2 text-[14px] font-bold tracking-wider text-[#708c77] uppercase">
                    <Sparkles className="size-3.5" />
                    วิธีทำ / Cooking Steps
                  </h3>
                  <ol className="step-list">
                    {data.instructions.map((step, index) => (
                      <li
                        key={`${index}-${step}`}
                        className="text-sm leading-6 text-[var(--muted)]"
                      >
                        <span className="step-num">{index + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </>
              )}

              {data._meta && (
                <p className="mt-4 text-[11px] text-[var(--muted)]">
                  ใช้โควต้าแล้ว · เหลือ {data._meta.remaining} ครั้งวันนี้ · ตอบกลับใน{' '}
                  {(data._meta.latencyMs / 1000).toFixed(1)} วินาที
                </p>
              )}
            </section>

            <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
              <button
                type="button"
                onClick={() => void onSave()}
                className="btn-secondary min-w-0 px-3 py-3 text-xs"
              >
                {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
                {saved ? 'บันทึกแล้ว' : 'บันทึกมื้อนี้'}
              </button>
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="btn-secondary px-3 py-3 text-xs"
                aria-label="แชร์ผลการปรับสูตร"
              >
                <Share2 className="size-4" />
                แชร์
              </button>
            </div>
            </>
          )}

          {shareOpen && data && (
            <ShareModal
              kind="swap"
              swap={{
                originalItem: submittedQuery || data.originalItem,
                goalLabel,
                substitutions: data.suggestedSubstitutions,
                nutritionDelta: data.nutritionDelta,
              }}
              onClose={() => setShareOpen(false)}
            />
          )}
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className="fixed bottom-8 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[var(--ink-soft)] px-[18px] py-3 text-[13px] font-medium text-white shadow-[0_12px_36px_rgba(74,87,72,0.35)]"
        >
          <BookmarkCheck className="size-4" />
          {toast}
        </div>
      )}
    </div>
  )
}
