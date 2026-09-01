'use client'

import { Bookmark, BookmarkCheck, Clock3, Flame, Share2, UtensilsCrossed } from 'lucide-react'
import type { Recipe } from '@/lib/types'

const TONE_BADGE: Record<Recipe['tone'], string> = {
  gold: 'rank-badge-gold',
  sage: 'rank-badge-sage',
  ochre: 'rank-badge-ochre',
}

interface RecipeCardProps {
  recipe: Recipe
  isSaved: boolean
  onOpenInstructions: (recipe: Recipe) => void
  onSave: () => void
  onShare: (recipe: Recipe) => void
}

export function RecipeCard({ recipe, isSaved, onOpenInstructions, onSave, onShare }: RecipeCardProps) {
  const Icon = recipe.icon
  const macroLabels = ['โปรตีน', 'คาร์โบ', 'ไขมัน']

  return (
    <article className="flex h-full min-h-[510px] flex-col rounded-[20px] border border-[var(--border)] bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(73,102,83,0.12)]">
      <div className="flex items-center justify-between gap-3">
        <div className={TONE_BADGE[recipe.tone]}>
          <Icon className="size-3" />
          <span>{recipe.rank} · {recipe.label}</span>
        </div>
        <div className="grid size-10 place-items-center rounded-full bg-[#A1BC98]/20 text-[var(--primary)]">
          <UtensilsCrossed className="size-[18px]" />
        </div>
      </div>

      <h3 className="mt-5 line-clamp-2 min-h-14 font-[var(--font-kanit)] text-[22px] leading-7 font-semibold text-[var(--foreground)]">
        {recipe.title}
      </h3>

      <div className="mt-2 flex items-center gap-4 text-xs text-[var(--muted)]">
        <span className="inline-flex items-center gap-1"><Clock3 className="size-[13px]" />{recipe.time}</span>
        <span className="inline-flex items-center gap-1 font-semibold text-[#d97706]"><Flame className="size-[13px]" />{recipe.kcal.toLocaleString()} kcal</span>
      </div>

      <div className="my-5 grid grid-cols-3 gap-2 border-y border-[var(--border)] py-4">
        {recipe.macros.map((macro, index) => (
          <div key={macroLabels[index]} className="rounded-2xl bg-[#F1F3E0] p-3 text-center">
            <b className="block font-[var(--font-kanit)] text-base font-semibold text-[var(--foreground)]">{macro}</b>
            <span className="text-xs text-[var(--muted)]">{macroLabels[index]}</span>
          </div>
        ))}
      </div>

      <section className="min-h-[92px]">
        <h4 className="mb-2 font-[var(--font-kanit)] text-xs font-semibold text-[var(--foreground)]">ส่วนผสมหลัก</h4>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm text-[#2D3748]">
          {recipe.ingredients.slice(0, 4).map((ingredient) => (
            <li key={ingredient} className="truncate">• {ingredient}</li>
          ))}
        </ul>
        {recipe.ingredients.length > 4 && <p className="mt-2 text-xs font-medium text-[var(--primary)]">+{recipe.ingredients.length - 4} ส่วนผสมอื่น</p>}
      </section>

      <div className="mt-auto space-y-3 pt-5">
        <button type="button" className="btn-primary w-full" onClick={() => onOpenInstructions(recipe)}>
          ดูวิธีทำ
        </button>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button type="button" onClick={onSave} className="btn-secondary min-w-0 px-3 py-3 text-xs">
            {isSaved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
            {isSaved ? 'บันทึกแล้ว' : 'บันทึกมื้อนี้'}
          </button>
          <button type="button" onClick={() => onShare(recipe)} className="btn-secondary px-3 py-3 text-xs" aria-label={`แชร์ ${recipe.title}`}>
            <Share2 className="size-4" />
            แชร์
          </button>
        </div>
      </div>
    </article>
  )
}
