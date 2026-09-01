'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BookmarkCheck, Plus, Sparkles, Target, UtensilsCrossed } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { RecipeCard } from '@/components/RecipeCard'
import { RecipeInstructionModal } from '@/components/RecipeInstructionModal'
import { ShareModal } from '@/components/ShareModal'
import { getDailyQuota, loadPantry, loadResult, saveMeal, toRecipe } from '@/lib/store'
import type { Recipe } from '@/lib/types'

export default function RecipesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const resultData = useMemo(() => (typeof window !== 'undefined' ? loadResult() : null), [])
  const pantry = useMemo(() => (typeof window !== 'undefined' ? loadPantry() : null), [])

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [mealTimeLabel, setMealTimeLabel] = useState('')
  const [targetKcal, setTargetKcal] = useState(0)
  const [appliedFilters, setAppliedFilters] = useState<string[]>([])
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [instructionFor, setInstructionFor] = useState<Recipe | null>(null)
  const [shareFor, setShareFor] = useState<Recipe | null>(null)
  const [quotaRemaining, setQuotaRemaining] = useState(0)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (!resultData) {
      router.replace('/pantry')
      return
    }

    setRecipes(resultData.recipes.map(toRecipe))
    setMealTimeLabel(resultData.mealTimeLabel)
    setTargetKcal(resultData.targetCalories)
    setAppliedFilters(resultData.appliedFilters || [])
    const quota = getDailyQuota()
    setQuotaRemaining(quota.max - quota.used)
  }, [loading, user, router, resultData])

  const onSave = async (recipe: Recipe) => {
    const key = `${recipe.rankNum}-${recipe.title}`
    if (savedIds.has(key)) {
      setToast('เมนูนี้ถูกบันทึกไว้แล้วในคลังของคุณ')
      setTimeout(() => setToast(null), 2600)
      return
    }

    const mealId = pantry?.mealTime || 'lunch'
    saveMeal(recipe, mealId as 'breakfast' | 'lunch' | 'dinner')
    setSavedIds((current) => new Set(current).add(key))

    let serverOk = false
    let serverMsg = ''
    try {
      if (user?.email) {
        const { icon, ...savedRecipe } = recipe
        const response = await fetch('/api/saved-meals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userEmail: user.email,
            mealTime: mealId as 'breakfast' | 'lunch' | 'dinner',
            recipe: savedRecipe,
          }),
        })
        const data = (await response.json().catch(() => null)) as { ok?: boolean; via?: string } | null
        serverOk = response.ok && Boolean(data?.ok)
        serverMsg = data?.via === 'supabase' ? ' (Supabase)' : data?.via === 'fallback' ? ' (Local)' : ''
      }
    } catch {
      serverMsg = ' (Server sync skipped)'
    }

    setToast(
      serverOk
        ? `บันทึก "${recipe.title}" แล้ว${serverMsg}! พร้อมเข้าถึงได้ในแดชบอร์ด`
        : `บันทึก "${recipe.title}" ในอุปกรณ์${serverMsg} · กรุณาตรวจสอบการเชื่อมต่อ`,
    )
    setTimeout(() => setToast(null), 3200)
  }

  if (loading || !user || !resultData) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--bg)]">
        <div className="font-[var(--font-kanit)] text-lg text-[var(--muted)]">กำลังโหลด...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-25">
      <div className="shell flex items-center justify-between py-11 pb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-linear-to-br from-[#D2DCB6] to-[#A1BC98] px-4 py-2 text-xs font-semibold text-[#5c6b59]">
          <Sparkles className="size-3.5" />
          โควต้าวันนี้เหลือ {quotaRemaining}/3 ครั้ง
        </div>
      </div>

      <main className="shell">
        <div className="mx-auto max-w-[1100px]">
          <header className="mb-7">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[#A1BC98]/20 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[var(--primary)]">
              <UtensilsCrossed className="size-3" />
              ผลลัพธ์เมนู{mealTimeLabel}
            </div>
            <h1 className="font-[var(--font-kanit)] text-[42px] leading-[1.1] font-semibold tracking-[-0.03em] text-[var(--foreground)]">เชฟ AI คัดสรรเมนูสุดพิเศษ</h1>
            <p className="mt-2.5 max-w-[620px] text-[15px] text-[var(--muted)]">3 เมนูที่ออกแบบมาเพื่อคุณโดยเฉพาะ เหมาะกับเป้าหมายและสุขภาพของคุณที่สุด</p>
          </header>

          <section className="glass-card mb-6 p-6 sm:p-8">
            <div className="card-header mt-[-4px] flex-wrap gap-4">
              <button type="button" className="mb-6 flex items-center gap-2 text-sm font-medium text-[#778873] hover:opacity-80" onClick={() => router.push('/pantry')}>
                <ArrowLeft className="size-4" />
                ย้อนกลับ
              </button>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)]">
                  <Target className="size-3.5" />
                  เป้าหมาย {targetKcal.toLocaleString()} kcal/มื้อ
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {appliedFilters.map((filter) => (
                    <span key={filter} className="rounded-full bg-[var(--bg)] px-3 py-1 text-[11px] font-medium text-[var(--muted)]">{filter}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid items-stretch gap-[18px] md:grid-cols-3">
              {recipes.map((recipe) => {
                const recipeKey = `${recipe.rankNum}-${recipe.title}`
                return (
                  <RecipeCard
                    key={recipeKey}
                    recipe={recipe}
                    isSaved={savedIds.has(recipeKey)}
                    onOpenInstructions={setInstructionFor}
                    onSave={() => void onSave(recipe)}
                    onShare={setShareFor}
                  />
                )
              })}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] pt-5">
              <p className="max-w-[460px] text-xs text-[var(--muted)]">พบเมนูที่ถูกใจแล้วหรือยัง? หากยังไม่ใช่สามารถสร้างใหม่ได้อีกครั้ง (จะหักโควต้าต่อวัน 1 ครั้ง)</p>
              <div className="flex gap-2.5">
                <button type="button" className="btn-secondary" onClick={() => router.push('/dashboard')}>ไปยังแดชบอร์ด</button>
                <button type="button" className="btn-primary" disabled={quotaRemaining <= 0} onClick={() => router.push('/pantry')}>
                  <Plus className="size-4" />
                  สร้างเมนูใหม่
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {toast && (
        <div role="status" className="fixed bottom-8 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#4a5748] px-[18px] py-3 text-[13px] font-medium text-white shadow-[0_12px_36px_rgba(74,87,72,0.35)]">
          <BookmarkCheck className="size-4" />
          {toast}
        </div>
      )}

      {instructionFor && <RecipeInstructionModal recipe={instructionFor} onClose={() => setInstructionFor(null)} />}
      {shareFor && <ShareModal recipe={shareFor} mealTimeLabel={mealTimeLabel} onClose={() => setShareFor(null)} />}
    </div>
  )
}
