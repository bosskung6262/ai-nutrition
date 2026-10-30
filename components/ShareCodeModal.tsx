'use client'

import { useMemo, useRef, useState } from 'react'
import {
  CalendarDays,
  Check,
  Copy,
  Link2,
  Loader2,
  RefreshCw,
  Sparkles,
  Ticket,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { useModalA11y } from '@/lib/use-modal-a11y'
import type { MealPlanItem, PlaylistPayload } from '@/types/meal-plan'

interface ShareCodeModalProps {
  /** Meals available to bundle — the first entry is the default selection. */
  meals: MealPlanItem[]
  /** Pre-filled custom title, e.g. "เมนูสำหรับคนชอบกินไก่". */
  defaultTitle?: string
  /** Called after a code is issued so the parent can refresh its playlist list. */
  onCreated?: () => void
  onClose: () => void
}

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2'

const MEAL_PRESETS = [1, 2, 3] as const
const DAY_PRESETS = [1, 2, 3, 4, 5, 6, 7] as const

type Mode = 'meals' | 'days'
type CopyKind = 'code' | 'link'

/**
 * "สร้างโค้ดแชร์" flow — pick a custom title plus a duration (1-3 meals or 1-7
 * days), POST it to `/api/playlists/generate`, and show the resulting share
 * code + link with copy buttons. The server hashes the payload and hands back
 * the existing code when an identical plan is already stored.
 */
export function ShareCodeModal({ meals, defaultTitle, onCreated, onClose }: ShareCodeModalProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  useModalA11y(cardRef, onClose)

  const [title, setTitle] = useState(
    (defaultTitle?.trim() || meals[0]?.mealTitle || 'แผนมื้ออาหารของฉัน').slice(0, 80),
  )
  const [mode, setMode] = useState<Mode>('meals')
  const [mealCount, setMealCount] = useState(1)
  const [dayCount, setDayCount] = useState(Math.min(Math.max(meals.length, 1), 7))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<CopyKind | null>(null)
  const [result, setResult] = useState<{ playlist: PlaylistPayload; reused: boolean } | null>(null)

  const maxMeals = Math.min(meals.length, 3)

  // "1-3 meals" bundles a slice; "1-7 days" ships the whole selection as day count.
  const selectedMeals = useMemo(
    () => (mode === 'meals' ? meals.slice(0, mealCount) : meals.slice(0, 21)),
    [mode, mealCount, meals],
  )
  const days = mode === 'meals' ? 1 : dayCount

  const canSubmit = title.trim().length > 0 && selectedMeals.length > 0 && !busy

  const onGenerate = async () => {
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/playlists/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), days, meals: selectedMeals }),
      })
      const data = (await res.json().catch(() => null)) as
        | { playlist?: PlaylistPayload; reused?: boolean; error?: string }
        | null
      if (!res.ok || !data?.playlist) {
        throw new Error(data?.error || `สร้างโค้ดไม่สำเร็จ (HTTP ${res.status})`)
      }
      setResult({ playlist: data.playlist, reused: Boolean(data.reused) })
      onCreated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถสร้างโค้ดได้ในขณะนี้')
    } finally {
      setBusy(false)
    }
  }

  const onCopy = async (value: string, kind: CopyKind) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      setTimeout(() => setCopied((current) => (current === kind ? null : current)), 2000)
    } catch {
      /* clipboard unavailable — ignore */
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="share-code-title">
      <div
        ref={cardRef}
        className="modal-card relative max-h-[85vh] overflow-y-auto"
        style={{ textAlign: 'left' }}
      >
        <button
          className={`modal-close ${FOCUS_RING}`}
          onClick={onClose}
          aria-label="ปิด"
        >
          <X />
        </button>

        <div className="mb-5 flex items-center gap-2.5 pr-10">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--accent)]/25 text-[var(--primary-dark)]">
            <Ticket className="h-4 w-4" />
          </span>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-wider text-[#708c77] uppercase">
              Share Code
            </span>
            <h2
              id="share-code-title"
              className="font-[var(--font-kanit)] text-xl font-semibold text-[var(--foreground)]"
            >
              สร้างโค้ดแชร์แผนนี้
            </h2>
          </div>
        </div>

        {result ? (
          <div>
            <div className="flex flex-col items-center rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5 text-center">
              <span className="text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">
                Share Code
              </span>
              <div className="mt-2 font-[var(--font-kanit)] text-2xl font-semibold tracking-wide text-[var(--primary)]">
                {result.playlist.code}
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <span className="tag-pill bg-primary/10 text-primary border-none text-[11px]">
                  {result.playlist.days} วัน
                </span>
                <span className="tag-pill bg-primary/10 text-primary border-none text-[11px]">
                  {result.playlist.meals.length} เมนู
                </span>
              </div>
            </div>

            {result.reused && (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-[var(--accent)]/25 p-3 text-xs text-[var(--primary-dark)]">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                พบแผนเดิมที่มีเนื้อหาเหมือนกันแล้ว จึงใช้โค้ดเดิมโดยไม่สร้างข้อมูลซ้ำ
              </p>
            )}

            <label className="mt-4 mb-1.5 block text-[13px] font-medium text-[var(--foreground)]">
              ลิงก์แชร์
            </label>
            <input
              className="input-field text-xs"
              readOnly
              value={result.playlist.shareUrl}
              onFocus={(event) => event.currentTarget.select()}
            />

            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <button
                className={`btn-secondary ${FOCUS_RING}`}
                onClick={() => void onCopy(result.playlist.code, 'code')}
              >
                {copied === 'code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied === 'code' ? 'คัดลอกโค้ดแล้ว' : 'คัดลอกโค้ด'}
              </button>
              <button
                className={`btn-secondary ${FOCUS_RING}`}
                onClick={() => void onCopy(result.playlist.shareUrl, 'link')}
              >
                {copied === 'link' ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                {copied === 'link' ? 'คัดลอกลิงก์แล้ว' : 'คัดลอกลิงก์'}
              </button>
            </div>

            <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
              <button
                className={`btn-ghost w-full text-xs sm:flex-1 ${FOCUS_RING}`}
                onClick={() => {
                  setResult(null)
                  setCopied(null)
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                สร้างโค้ดใหม่
              </button>
              <button className={`btn-primary w-full sm:flex-1 ${FOCUS_RING}`} onClick={onClose}>
                เสร็จสิ้น
              </button>
            </div>
          </div>
        ) : (
          <div>
            <label
              htmlFor="share-code-custom-title"
              className="mb-2 block text-[13px] font-medium text-[var(--foreground)]"
            >
              ชื่อแผน (กำหนดเองได้)
            </label>
            <input
              id="share-code-custom-title"
              className="input-field"
              maxLength={80}
              placeholder="เช่น เมนูสำหรับคนชอบกินไก่"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={busy}
            />

            <span className="mt-5 mb-2 block text-[13px] font-medium text-[var(--foreground)]">
              ระยะเวลา
            </span>
            <div className="mb-3 inline-flex rounded-full bg-[var(--bg)] p-1">
              {([
                { id: 'meals', label: 'ตามจำนวนมื้อ', icon: UtensilsCrossed },
                { id: 'days', label: 'ตามจำนวนวัน', icon: CalendarDays },
              ] as const).map((option) => {
                const Icon = option.icon
                const active = option.id === mode
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${FOCUS_RING} ${
                      active
                        ? 'bg-[var(--surface)] text-[var(--primary)] shadow-sm'
                        : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                    }`}
                    aria-pressed={active}
                    onClick={() => setMode(option.id)}
                    disabled={busy}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {option.label}
                  </button>
                )
              })}
            </div>

            {mode === 'meals' ? (
              <div className="flex flex-wrap gap-2.5">
                {MEAL_PRESETS.map((count) => {
                  const disabled = count > maxMeals
                  const active = count === mealCount
                  return (
                    <button
                      key={count}
                      type="button"
                      className={active ? 'chip selected' : 'chip'}
                      aria-pressed={active}
                      onClick={() => setMealCount(count)}
                      disabled={disabled || busy}
                    >
                      {count} มื้อ
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {DAY_PRESETS.map((count) => {
                  const active = count === dayCount
                  return (
                    <button
                      key={count}
                      type="button"
                      className={active ? 'chip selected' : 'chip'}
                      aria-pressed={active}
                      onClick={() => setDayCount(count)}
                      disabled={busy}
                    >
                      {count} วัน
                    </button>
                  )
                })}
              </div>
            )}

            <p className="mt-3 text-xs text-[var(--muted)]">
              จะแชร์ทั้งหมด {selectedMeals.length} เมนู · {days} วัน
              {mode === 'meals' && maxMeals < 3 ? ` (มีให้เลือก ${maxMeals} เมนู)` : ''}
            </p>

            <div className="mt-4 max-h-40 space-y-2 overflow-y-auto">
              {selectedMeals.map((meal, idx) => (
                <div
                  key={`${meal.mealTitle}-${idx}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-2.5"
                >
                  <span className="truncate font-[var(--font-kanit)] text-sm text-[var(--foreground)]">
                    {meal.mealTitle}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-[var(--primary)]">
                    {meal.calories} kcal
                  </span>
                </div>
              ))}
            </div>

            {error && <p className="mt-3 text-xs text-[var(--color-danger)]">{error}</p>}

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
                onClick={() => void onGenerate()}
                disabled={!canSubmit}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
                สร้างโค้ดแชร์
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
