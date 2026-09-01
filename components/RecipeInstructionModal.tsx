'use client'

import { AlertTriangle, Clock3, Flame, Leaf, X } from 'lucide-react'
import type { Recipe } from '@/lib/types'

interface RecipeInstructionModalProps {
  recipe: Recipe
  onClose: () => void
}

export function RecipeInstructionModal({ recipe, onClose }: RecipeInstructionModalProps) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="recipe-instructions-title">
      <div className="modal-card relative w-full max-w-2xl p-6 sm:p-8">
        <button type="button" className="modal-close" onClick={onClose} aria-label="ปิด">
          <X />
        </button>
        <div className="pr-10">
          <p className="mb-2 text-xs font-semibold text-[var(--primary)]">{recipe.rank} · {recipe.label}</p>
          <h2 id="recipe-instructions-title" className="font-[var(--font-kanit)] text-2xl font-semibold text-[var(--foreground)] sm:text-[28px]">{recipe.title}</h2>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--muted)]">
            <span className="inline-flex items-center gap-1"><Clock3 className="size-4" />{recipe.time}</span>
            <span className="inline-flex items-center gap-1 font-semibold text-[#d97706]"><Flame className="size-4" />{recipe.kcal.toLocaleString()} kcal</span>
          </div>
        </div>

        <div className="mt-7 grid gap-6 md:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-[20px] border border-[var(--border)] bg-[var(--bg)] p-5">
            <h3 className="font-[var(--font-kanit)] text-sm font-semibold text-[var(--foreground)]">ส่วนผสมทั้งหมด</h3>
            <ul className="mt-3 space-y-2 text-sm text-[#2D3748]">
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
        <button type="button" className="btn-secondary mt-6 w-full" onClick={onClose}>ปิด</button>
      </div>
    </div>
  )
}
