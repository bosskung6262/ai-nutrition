'use client'

import { useRef } from 'react'
import { AlertTriangle, Clock3, Flame, Leaf, Ticket, X } from 'lucide-react'
import { useModalA11y } from '@/lib/use-modal-a11y'
import type { Recipe } from '@/lib/types'

interface RecipeInstructionModalProps {
  recipe: Recipe
  /** When provided, shows the "สร้างโค้ดแชร์" action in the footer. */
  onCreateShareCode?: (recipe: Recipe) => void
  onClose: () => void
}

export function RecipeInstructionModal({ recipe, onCreateShareCode, onClose }: RecipeInstructionModalProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  useModalA11y(cardRef, onClose)

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="recipe-instructions-title">
      <div ref={cardRef} className="modal-card relative w-full max-w-2xl p-6 sm:p-8">
        <button type="button" className="modal-close" onClick={onClose} aria-label="ปิด">
          <X />
        </button>
        <div className="pr-10">
          <p className="mb-2 text-xs font-semibold text-[var(--primary)]">{recipe.rank} · {recipe.label}</p>
          <h2 id="recipe-instructions-title" className="font-[var(--font-kanit)] text-2xl font-semibold text-[var(--foreground)] sm:text-[28px]">{recipe.title}</h2>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--muted)]">
            <span className="inline-flex items-center gap-1"><Clock3 className="size-4" />{recipe.time}</span>
            <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-gold)]"><Flame className="size-4" />{recipe.kcal.toLocaleString()} kcal</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(['โปรตีน', 'คาร์โบ', 'ไขมัน'] as const).map((label, index) => (
              <div key={label} className="rounded-2xl bg-[var(--bg)] p-2.5 text-center">
                <b className="block font-[var(--font-kanit)] text-sm font-semibold text-[var(--foreground)]">{recipe.macros[index]}</b>
                <span className="text-[11px] text-[var(--muted)]">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-7 grid gap-6 md:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-[20px] border border-[var(--border)] bg-[var(--bg)] p-5">
            <h3 className="font-[var(--font-kanit)] text-sm font-semibold text-[var(--foreground)]">ส่วนผสมทั้งหมด</h3>
            <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-[var(--muted)]">
              {recipe.ingredients.map((ingredient) => <li key={ingredient}>• {ingredient}</li>)}
            </ul>
            {recipe.allergens.length > 0 && (
              <div className="allergen-warning mt-5">
                <AlertTriangle />
                <span>มีส่วนผสมของ {recipe.allergens.join(', ')}</span>
              </div>
            )}
          </section>

          <section>
            <h3 className="font-[var(--font-kanit)] text-sm font-semibold text-[var(--foreground)]">วิธีทำ</h3>
            <ol className="step-list mt-3">
              {recipe.steps.map((step, index) => (
                <li key={`${index}-${step}`} className="text-sm leading-6 text-[var(--muted)]">
                  <span className="step-num">{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="safety-note mt-6">
          <Leaf />
          <div>
            <strong className="text-sm">หมายเหตุด้านสุขภาพ</strong>
            <p className="mt-1 text-sm leading-6 text-[var(--primary-dark)]">{recipe.safetyNote}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <button type="button" className="btn-secondary w-full sm:flex-1" onClick={onClose}>ปิด</button>
          {onCreateShareCode && (
            <button
              type="button"
              className="btn-primary w-full sm:flex-1"
              onClick={() => onCreateShareCode(recipe)}
            >
              <Ticket className="size-4" />
              สร้างโค้ดแชร์
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
