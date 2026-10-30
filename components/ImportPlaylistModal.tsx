'use client'

import { Flame, Loader2, PackagePlus, Sparkles, X } from 'lucide-react'
import type { PlaylistPayload } from '@/types/meal-plan'

interface ImportPlaylistModalProps {
  playlist: PlaylistPayload
  busy: boolean
  error: string | null
  onClose: () => void
  onConfirm: () => void
}

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2'

/**
 * "Import Confirmation Modal" — previews a shared playlist and, on confirm,
 * asks the parent to call POST /api/playlists/import.
 */
export function ImportPlaylistModal({
  playlist,
  busy,
  error,
  onClose,
  onConfirm,
}: ImportPlaylistModalProps) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="นำเข้าแผนการกิน">
      <div className="modal-card relative max-h-[85vh] overflow-y-auto" style={{ textAlign: 'left' }}>
        <button
          className={`absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-full bg-[var(--color-card)]/60 text-[var(--muted)] transition-colors hover:text-[var(--foreground)] ${FOCUS_RING}`}
          onClick={onClose}
          disabled={busy}
          aria-label="ปิด"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--accent)]/25 text-[var(--primary-dark)]">
            <PackagePlus className="h-4 w-4" />
          </span>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-wider text-[#708c77] uppercase">
              Meal Plan Playlist
            </span>
            <h3 className="font-[var(--font-kanit)] text-xl font-semibold text-[var(--foreground)]">
              นำเข้าแผนการกิน
            </h3>
          </div>
        </div>

        <h4 className="font-[var(--font-kanit)] text-base font-semibold text-[var(--foreground)]">
          {playlist.title}
        </h4>
        {playlist.description && (
          <p className="mt-1 text-sm text-[var(--muted)]">{playlist.description}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="tag-pill bg-primary/10 text-primary border-none text-[11px]">
            {playlist.days} วัน
          </span>
          <span className="tag-pill bg-primary/10 text-primary border-none text-[11px]">
            {playlist.meals.length} เมนู
          </span>
          <span className="tag-pill bg-primary/10 text-primary border-none text-[11px]">
            โค้ด {playlist.code}
          </span>
        </div>

        <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
          {playlist.meals.map((meal, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3"
            >
              <div className="min-w-0">
                <div className="truncate font-[var(--font-kanit)] text-sm font-medium text-[var(--foreground)]">
                  {meal.mealTitle}
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                  โปรตีน {meal.macros.protein}g · คาร์โบ {meal.macros.carbs}g · ไขมัน {meal.macros.fat}g
                </div>
              </div>
              <span className="shrink-0 text-xs font-semibold text-[var(--primary)]">
                <Flame className="mr-1 inline h-3 w-3" />
                {meal.calories} kcal
              </span>
            </div>
          ))}
        </div>

        {error && (
          <p className="mt-3 text-xs text-[var(--color-danger)]">{error}</p>
        )}

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <button
            className={`btn-secondary flex-1 ${FOCUS_RING}`}
            onClick={onClose}
            disabled={busy}
          >
            ยกเลิก
          </button>
          <button
            className={`btn-primary flex-1 ${FOCUS_RING}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            นำเข้าแผนนี้ลง Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
