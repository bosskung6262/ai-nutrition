'use client'

import { Clock3, Download, Flame, Sparkles, X } from 'lucide-react'
import type { Recipe } from '@/lib/types'

interface ShareModalProps {
  recipe: Recipe
  mealTimeLabel: string
  onClose: () => void
}

export function ShareModal({ recipe, mealTimeLabel, onClose }: ShareModalProps) {
  const macroLabels = ['โปรตีน', 'คาร์โบ', 'ไขมัน']

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="share-recipe-title">
      <div className="modal-card relative w-full max-w-md p-5 sm:p-6">
        <button type="button" className="modal-close" onClick={onClose} aria-label="ปิด">
          <X />
        </button>

        {/* Header */}
        <div className="mb-5 pr-10 text-left">
          <h2 id="share-recipe-title" className="font-[var(--font-kanit)] text-xl font-semibold text-[var(--foreground)]">
            แชร์เมนูนี้
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">บันทึกภาพสำหรับแชร์ต่อ หรือเก็บไว้ทำตามภายหลัง</p>
        </div>

        {/* Share Card */}
        <div className="mx-auto aspect-[4/5] w-full max-w-[340px] overflow-hidden rounded-[24px] border border-white/70 bg-[#F1F3E0] shadow-[0_16px_36px_rgba(73,102,83,0.14)]">
          <div className="flex h-full flex-col p-5">

            {/* Brand Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded-xl bg-[#778873] text-white shadow-sm">
                  <Sparkles className="size-3.5" />
                </div>
                <div>
                  <p className="font-[var(--font-kanit)] text-[13px] font-semibold leading-none text-[#2a3528]">NutriGenie</p>
                  <p className="mt-0.5 text-[9px] text-[#60705f]">AI Nutrition</p>
                </div>
              </div>
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-[8px] font-semibold tracking-wide text-[var(--primary)]">
                AI RECIPE
              </span>
            </div>

            {/* Title + Meta */}
            <div className="mt-4">
              <p className="text-[10px] font-semibold tracking-wide text-[#60705f]">
                {mealTimeLabel} · เมนูสุขภาพ
              </p>
              <h3 className="mt-2 line-clamp-2 font-[var(--font-kanit)] text-[22px] leading-[1.15] font-semibold tracking-[-0.02em] text-[#2a3528]">
                {recipe.title}
              </h3>
              <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#4a5748]">
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="size-3" />
                  {recipe.time}
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-[#d97706]">
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
                  className="rounded-xl border border-[#c5d2b0] bg-white/55 px-1 py-2 text-center"
                >
                  <b className="block font-[var(--font-kanit)] text-[15px] font-semibold text-[#2a3528]">{macro}</b>
                  <span className="text-[9px] font-medium text-[#60705f]">{macroLabels[index]}</span>
                </div>
              ))}
            </div>

            {/* Steps - ใช้ shortSteps ถ้ามี */}
            <div className="mt-3 flex-1 overflow-hidden rounded-xl border border-white/60 bg-white/55 p-2.5">
              <p className="text-[9px] font-semibold text-[#2a3528]">👨‍🍳 วิธีทำ</p>
              <ol className="mt-1 space-y-1">
                {(recipe.shortSteps ?? recipe.steps).slice(0, 3).map((step, index) => (
                  <li key={index} className="line-clamp-2 text-[10px] leading-[1.4] text-[#4a5748]">
                    <span className="font-semibold text-[#60705f]">{index + 1}.</span> {step}
                  </li>
                ))}
              </ol>
            </div>

            {/* Footer tagline */}
            <p className="mt-2.5 text-center text-[9px] font-medium text-[#60705f]">
              สร้างสรรค์เพื่อเป้าหมายสุขภาพของคุณ
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className="btn-primary w-full"
            onClick={() => alert('ฟีเจอร์ดาวน์โหลดรูปภาพกำลังจะมาในเวอร์ชันถัดไป')}
          >
            <Download className="size-4" />
            ดาวน์โหลดรูปภาพ
          </button>
          <button type="button" className="btn-secondary w-full" onClick={onClose}>
            ปิด
          </button>
        </div>
      </div>
    </div>
  )
}