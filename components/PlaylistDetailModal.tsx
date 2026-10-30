'use client'

import { useRef, useState } from 'react'
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Flame,
  Loader2,
  ShoppingCart,
  Trash2,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { useModalA11y } from '@/lib/use-modal-a11y'
import type { Profile } from '@/lib/types'
import type { MealPlanItem, PlaylistPayload } from '@/types/meal-plan'

interface PlaylistDetailModalProps {
  playlist: PlaylistPayload
  profile?: Profile | null
  /** True while the parent is calling DELETE /api/playlists/[code]. */
  deleting: boolean
  onDelete: () => void
  onClose: () => void
}

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2'

const MACRO_LABELS = ['โปรตีน', 'คาร์โบ', 'ไขมัน'] as const

function macrosOf(meal: MealPlanItem): number[] {
  return [meal.macros.protein, meal.macros.carbs, meal.macros.fat]
}

/**
 * "Playlist Details" viewer — the full recipe list behind a share code, with
 * ingredient breakdowns and cooking steps when the plan carried them.
 */
export function PlaylistDetailModal({
  playlist,
  profile,
  deleting,
  onDelete,
  onClose,
}: PlaylistDetailModalProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  useModalA11y(cardRef, onClose)
  const [copied, setCopied] = useState(false)

  const onCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(playlist.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable — ignore */
    }
  }

  // Calculate daily average calories for comparison
  const totalCalories = playlist.meals.reduce((sum, m) => sum + m.calories, 0)
  const days = playlist.days || 1
  const avgCalories = Math.round(totalCalories / days)
  const target = profile?.targetCalories || (profile?.tdee ? Math.round(profile.tdee * 0.9) : 0)
  const diff = avgCalories - target
  const isMatch = Math.abs(diff) <= 100

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="playlist-detail-title">
      <div
        ref={cardRef}
        className="modal-card relative max-h-[85vh] overflow-y-auto"
        style={{ textAlign: 'left' }}
      >
        <button className={`modal-close ${FOCUS_RING}`} onClick={onClose} aria-label="ปิด">
          <X />
        </button>

        <div className="mb-4 flex items-center gap-2.5 pr-10">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--accent)]/25 text-[var(--primary-dark)]">
            <UtensilsCrossed className="h-4 w-4" />
          </span>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-wider text-[#708c77] uppercase">
              Meal Plan Playlist
            </span>
            <h2
              id="playlist-detail-title"
              className="font-[var(--font-kanit)] text-xl font-semibold text-[var(--foreground)]"
            >
              รายละเอียดแผนการกิน
            </h2>
          </div>
        </div>

        <h3 className="font-[var(--font-kanit)] text-base font-semibold text-[var(--foreground)]">
          {playlist.title}
        </h3>
        {playlist.description && (
          <p className="mt-1 text-sm text-[var(--muted)]">{playlist.description}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="tag-pill bg-primary/10 text-primary border-none text-[11px]">
            {playlist.days} วัน
          </span>
          <span className="tag-pill bg-primary/10 text-primary border-none text-[11px]">
            {playlist.meals.length} เมนู
          </span>
          {playlist.tags?.map(tag => (
            <span key={tag} className="tag-pill bg-accent/25 text-primary-dark border-none text-[11px]">
              #{tag}
            </span>
          ))}
          <span className="tag-pill bg-primary/10 text-primary border-none text-[11px]">
            โค้ด {playlist.code}
          </span>
          <button
            className={`btn-ghost px-2.5 py-1.5 text-[11px] ${FOCUS_RING}`}
            onClick={() => void onCopyCode()}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'คัดลอกแล้ว' : 'คัดลอกโค้ด'}
          </button>
        </div>

        {profile && target > 0 && (
          <div className={`mt-4 rounded-2xl border p-4 ${isMatch ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <Flame className={`h-4 w-4 ${isMatch ? 'text-emerald-600' : 'text-amber-600'}`} />
              <span className={`text-xs font-bold ${isMatch ? 'text-emerald-700' : 'text-amber-700'}`}>
                การเปรียบเทียบพลังงานเฉลี่ยต่อวัน
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-[var(--font-kanit)] text-lg font-bold text-[var(--foreground)]">
                {avgCalories.toLocaleString()}
              </span>
              <span className="text-xs text-[var(--muted)]">kcal / วัน</span>
              <span className="mx-1 text-[var(--muted)]">vs</span>
              <span className="text-xs font-medium text-[var(--muted)]">เป้าหมาย {target.toLocaleString()} kcal</span>
            </div>
            <p className={`mt-1 text-xs font-medium ${isMatch ? 'text-emerald-700' : 'text-amber-700'}`}>
              {isMatch
                ? 'ตรงตามเป้าหมายสุขภาพของคุณ'
                : diff > 0
                ? `แคลอรีสูงกว่าเป้าหมายประจำวันของคุณ ${diff.toLocaleString()} kcal`
                : `แคลอรีต่ำกว่าเป้าหมายประจำวันของคุณ ${Math.abs(diff).toLocaleString()} kcal`}
            </p>
          </div>
        )}

        {playlist.shoppingList && playlist.shoppingList.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-3 flex items-center gap-2 font-[var(--font-kanit)] text-sm font-semibold text-[var(--foreground)]">
              <ShoppingCart className="h-4 w-4 text-[var(--primary)]" />
              รายการซื้อของล่วงหน้า (Aggregated)
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {playlist.shoppingList.map((item, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg)] p-2.5">
                  <span className="truncate text-xs text-[var(--foreground)]">{item.name}</span>
                  <span className="shrink-0 text-[11px] font-bold text-[var(--primary)]">
                    {item.quantity > 0 ? (item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(1)) : ''} {item.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 space-y-6">
          {playlist.schedule ? (
            // Render by Day if schedule exists
            Object.entries(playlist.schedule).map(([day, slots]) => (
              <div key={day} className="space-y-3">
                <h4 className="flex items-center gap-2 font-[var(--font-kanit)] text-sm font-bold text-[var(--primary)]">
                  <Calendar className="h-4 w-4" />
                  วันที่ {day}
                </h4>
                <div className="space-y-2.5">
                  {Object.entries(slots).map(([slot, meal]) => (
                    <MealDetailCard key={slot} slot={slot} meal={meal as MealPlanItem} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            // Fallback to simple list if no schedule
            <div className="space-y-2.5">
              {playlist.meals.map((meal, index) => (
                <MealDetailCard key={index} meal={meal} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <button
            className={`btn-secondary flex-1 text-[var(--color-danger)] ${FOCUS_RING}`}
            onClick={onDelete}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            ลบแผนนี้
          </button>
          <button className={`btn-primary flex-1 ${FOCUS_RING}`} onClick={onClose} disabled={deleting}>
            ปิด
          </button>
        </div>
      </div>
    </div>
  )
}

function MealDetailCard({ slot, meal }: { slot?: string; meal: MealPlanItem }) {
  const [expanded, setExpanded] = useState(false)
  const ingredients = meal.ingredients ?? []
  const steps = meal.steps ?? []
  const slotLabel = slot
    ? {
        breakfast: 'มื้อเช้า',
        lunch: 'มื้อกลางวัน',
        dinner: 'มื้อเย็น',
        snack: 'ของว่าง',
      }[slot] || slot
    : null

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setExpanded(!expanded)}
        className={`flex items-start justify-between gap-4 p-3.5 text-left transition-colors hover:bg-[var(--accent)]/5 ${FOCUS_RING}`}
      >
        <div className="flex-1 min-w-0">
          {slotLabel && (
            <span className="mb-1 block text-[10px] font-bold text-[var(--primary)] uppercase tracking-tight">
              {slotLabel}
            </span>
          )}
          <h5 className="font-[var(--font-kanit)] text-sm font-semibold text-[var(--foreground)] line-clamp-1">
            {meal.mealTitle}
          </h5>
          <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-[var(--muted)]">
            <span className="flex items-center gap-1">
              <Flame className="h-3 w-3" /> {meal.calories} kcal
            </span>
            <span>P: {meal.macros.protein}g</span>
            <span>C: {meal.macros.carbs}g</span>
            <span>F: {meal.macros.fat}g</span>
          </div>
        </div>
        <div className="shrink-0 pt-1">
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-[var(--muted)]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[var(--muted)]" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[var(--border)] bg-[var(--surface)] p-4 space-y-4">
          {meal.healthSafetyNote && (
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-2.5 text-[11px] text-amber-800">
              <span className="font-bold">⚠️ หมายเหตุสุขภาพ:</span> {meal.healthSafetyNote}
            </div>
          )}

          <div>
            <h6 className="mb-2 flex items-center gap-2 font-[var(--font-kanit)] text-xs font-bold text-[var(--foreground)]">
              <ShoppingCart className="h-3.5 w-3.5 text-[var(--primary)]" />
              ส่วนผสมหลัก
            </h6>
            <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {ingredients.map((ing, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[var(--muted)]">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--primary)]" />
                  {ing}
                </li>
              ))}
            </ul>
          </div>

          {steps.length > 0 && (
            <div>
              <h6 className="mb-2 flex items-center gap-2 font-[var(--font-kanit)] text-xs font-bold text-[var(--foreground)]">
                <UtensilsCrossed className="h-3.5 w-3.5 text-[var(--primary)]" />
                วิธีทำ
              </h6>
              <div className="space-y-2">
                {steps.map((step, i) => (
                  <div key={i} className="flex gap-2.5 text-xs leading-relaxed">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-lg bg-[var(--accent)]/20 text-[10px] font-bold text-[var(--primary-dark)]">
                      {i + 1}
                    </span>
                    <p className="text-[var(--muted)]">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
