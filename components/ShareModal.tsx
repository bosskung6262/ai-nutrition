'use client'

import { useRef, useState } from 'react'
import { ArrowRight, Clock3, Download, Flame, LoaderCircle, Sparkles, X } from 'lucide-react'
import { useModalA11y } from '@/lib/use-modal-a11y'
import type { Recipe } from '@/lib/types'
import type { SmartSwapResult } from '@/types/smart-swap'

/** Everything the swap share card needs, resolved from the Smart Swap result. */
export interface SwapShareData {
  originalItem: string
  goalLabel: string
  substitutions: SmartSwapResult['suggestedSubstitutions']
  nutritionDelta: SmartSwapResult['nutritionDelta']
}

type ShareModalProps = { onClose: () => void } & (
  | { kind?: 'recipe'; recipe: Recipe; mealTimeLabel: string }
  | { kind: 'swap'; swap: SwapShareData }
)

const binary = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Number.isInteger(n) ? Math.abs(n) : Math.abs(n).toFixed(1)}`
const slug = (value: string) =>
  value.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'recipe'

export function ShareModal(props: ShareModalProps) {
  const { onClose } = props
  const dialogRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useModalA11y(dialogRef, onClose)

  const fileName =
    props.kind === 'swap'
      ? `nutrigenie-swap-${slug(props.swap.originalItem)}`
      : `nutrigenie-${slug(props.recipe.title)}`

  const onDownload = async () => {
    const node = cardRef.current
    if (!node || busy) return
    setBusy(true)
    setError(null)
    try {
      // Loaded on demand so html2canvas stays out of the initial bundle.
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(node, { backgroundColor: null, scale: 2, logging: false, useCORS: true })
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `${fileName}.png`
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      console.error('[ShareModal] image export failed', err)
      setError('สร้างรูปภาพไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="share-recipe-title">
      <div ref={dialogRef} className="modal-card relative w-full max-w-md p-5 sm:p-6">
        <button type="button" className="modal-close" onClick={onClose} aria-label="ปิด">
          <X />
        </button>

        {/* Header */}
        <div className="mb-5 pr-10 text-left">
          <h2 id="share-recipe-title" className="font-[var(--font-kanit)] text-xl font-semibold text-[var(--foreground)]">
            {props.kind === 'swap' ? 'แชร์สูตรที่ปรับแล้ว' : 'แชร์เมนูนี้'}
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">บันทึกภาพสำหรับแชร์ต่อ หรือเก็บไว้ทำตามภายหลัง</p>
        </div>

        {/* Share Card */}
        <div
          ref={cardRef}
          className="mx-auto aspect-[4/5] w-full max-w-[340px] overflow-hidden rounded-[24px] border border-[rgba(255,255,255,0.7)] bg-[var(--bg)] shadow-[0_16px_36px_rgba(73,102,83,0.14)]"
        >
          <div className="flex h-full flex-col p-5">
            {props.kind === 'swap' ? (
              <SwapShareCardBody data={props.swap} />
            ) : (
              <RecipeShareCardBody recipe={props.recipe} mealTimeLabel={props.mealTimeLabel} />
            )}
          </div>
        </div>

        {error && <p className="mt-3 text-center text-xs text-[var(--color-danger)]">{error}</p>}

        {/* Action Buttons */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" className="btn-primary w-full" onClick={onDownload} disabled={busy}>
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}
            {busy ? 'กำลังสร้างรูปภาพ...' : 'ดาวน์โหลดรูปภาพ'}
          </button>
          <button type="button" className="btn-secondary w-full" onClick={onClose}>
            ปิด
          </button>
        </div>
      </div>
    </div>
  )
}

function RecipeShareCardBody({ recipe, mealTimeLabel }: { recipe: Recipe; mealTimeLabel: string }) {
  const macroLabels = ['โปรตีน', 'คาร์โบ', 'ไขมัน']

  return (
    <>
      {/* Brand Header */}
      <div className="flex items-center justify-between gap-2">
        <ShareBrand />
        <span className="rounded-full bg-[rgba(255,255,255,0.7)] px-2 py-0.5 text-[8px] font-semibold tracking-wide text-[var(--primary)]">
          AI RECIPE
        </span>
      </div>

      {/* Title + Meta */}
      <div className="mt-4">
        <p className="text-[10px] font-semibold tracking-wide text-[var(--muted)]">
          {mealTimeLabel} · เมนูสุขภาพ
        </p>
        <h3 className="mt-2 line-clamp-2 font-[var(--font-kanit)] text-[22px] leading-[1.15] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
          {recipe.title}
        </h3>
        <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--ink-soft)]">
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-3" />
            {recipe.time}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-gold)]">
            <Flame className="size-3" />
            {recipe.kcal.toLocaleString()} kcal
          </span>
        </div>
      </div>

      {/* Macros */}
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {recipe.macros.map((macro, index) => (
          <div
            key={macroLabels[index]}
            className="rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.55)] px-1 py-2 text-center"
          >
            <b className="block font-[var(--font-kanit)] text-[15px] font-semibold text-[var(--foreground)]">{macro}</b>
            <span className="text-[9px] font-medium text-[var(--muted)]">{macroLabels[index]}</span>
          </div>
        ))}
      </div>

      {/* Steps - ใช้ shortSteps ถ้ามี */}
      <div className="mt-3 flex-1 overflow-hidden rounded-xl border border-[rgba(255,255,255,0.6)] bg-[rgba(255,255,255,0.55)] p-2.5">
        <p className="text-[9px] font-semibold text-[var(--foreground)]">👨‍🍳 วิธีทำ</p>
        <ol className="mt-1 space-y-1">
          {(recipe.shortSteps ?? recipe.steps).slice(0, 3).map((step, index) => (
            <li key={index} className="line-clamp-2 text-[10px] leading-[1.4] text-[var(--ink-soft)]">
              <span className="font-semibold text-[var(--muted)]">{index + 1}.</span> {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Footer tagline */}
      <p className="mt-2.5 text-center text-[9px] font-medium text-[var(--muted)]">
        สร้างสรรค์เพื่อเป้าหมายสุขภาพของคุณ
      </p>
    </>
  )
}

function SwapShareCardBody({ data }: { data: SwapShareData }) {
  const deltas = [
    { label: 'แคลอรี', value: data.nutritionDelta.calorieDiff },
    { label: 'โปรตีน', value: data.nutritionDelta.proteinDiff },
    { label: 'คาร์โบ', value: data.nutritionDelta.carbsDiff },
    { label: 'ไขมัน', value: data.nutritionDelta.fatDiff },
  ]

  return (
    <>
      {/* Brand Header */}
      <div className="flex items-center justify-between gap-2">
        <ShareBrand />
        <span className="rounded-full bg-[rgba(255,255,255,0.7)] px-2 py-0.5 text-[8px] font-semibold tracking-wide text-[var(--primary)]">
          SMART SWAP
        </span>
      </div>

      {/* Title + Goal */}
      <div className="mt-4">
        <p className="text-[10px] font-semibold tracking-wide text-[var(--muted)]">ปรับสูตรให้ตรงเป้าหมาย</p>
        <h3 className="mt-2 line-clamp-2 font-[var(--font-kanit)] text-[22px] leading-[1.15] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
          {data.originalItem}
        </h3>
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#e8efe9] px-2 py-0.5 text-[10px] font-semibold text-[var(--primary)]">
          <Sparkles className="size-3" />
          {data.goalLabel}
        </span>
      </div>

      {/* Substitutions */}
      <div className="mt-3 space-y-1.5">
        {data.substitutions.slice(0, 3).map((swap, index) => (
          <div
            key={`${swap.originalIngredient}-${index}`}
            className="rounded-xl border border-[rgba(255,255,255,0.6)] bg-[rgba(255,255,255,0.55)] px-2.5 py-1.5"
          >
            <div className="flex flex-wrap items-center gap-1 text-[10.5px] leading-tight">
              <span className="text-[var(--muted)] line-through">{swap.originalIngredient}</span>
              <ArrowRight className="size-3 shrink-0 text-[var(--primary)]" />
              <span className="font-semibold text-[var(--foreground)]">{swap.replacementIngredient}</span>
            </div>
            <p className="mt-0.5 text-[9px] text-[var(--muted)]">อัตราส่วน {swap.ratio}</p>
          </div>
        ))}
      </div>

      {/* Nutrition delta */}
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {deltas.map((delta) => (
          <div
            key={delta.label}
            className="rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.55)] px-1 py-2 text-center"
          >
            <b className="block font-[var(--font-kanit)] text-[13px] font-semibold text-[var(--foreground)]">
              {binary(delta.value)}
            </b>
            <span className="text-[8px] font-medium text-[var(--muted)]">{delta.label}</span>
          </div>
        ))}
      </div>

      {/* Footer tagline */}
      <p className="mt-auto pt-2.5 text-center text-[9px] font-medium text-[var(--muted)]">
        ปรับสูตรอัจฉริยะเพื่อเป้าหมายสุขภาพของคุณ
      </p>
    </>
  )
}

function ShareBrand() {
  return (
    <div className="flex items-center gap-2">
      <div className="grid size-8 place-items-center rounded-xl bg-[var(--brand)] text-white shadow-sm">
        <Sparkles className="size-3.5" />
      </div>
      <div>
        <p className="font-[var(--font-kanit)] text-[13px] font-semibold leading-none text-[var(--foreground)]">NutriGenie</p>
        <p className="mt-0.5 text-[9px] text-[var(--muted)]">AI Nutrition</p>
      </div>
    </div>
  )
}
