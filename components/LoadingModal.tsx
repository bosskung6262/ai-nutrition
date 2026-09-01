'use client'

import { useEffect, useState } from 'react'
import { ChefHat, Sparkles, Clock, CheckCircle2 } from 'lucide-react'

interface LoadingModalProps {
  mealTimeLabel: string
  onCancel?: () => void
  cancelable?: boolean
}

const STAGES: { label: string; icon: typeof Sparkles; progress: number }[] = [
  { label: 'กำลังวิเคราะห์โภชนาการเป้าหมายของคุณ...', icon: Sparkles, progress: 20 },
  { label: 'กำลังกรองอาหารที่แพ้และข้อจำกัดสุขภาพ...', icon: Sparkles, progress: 40 },
  { label: 'กำลังจับคู่ส่วนผสมตามช่วงเวลาและเวลาเตรียม...', icon: Clock, progress: 65 },
  { label: 'กำลังคัดสรรและจัดอันดับ 3 เมนูที่เหมาะสมที่สุด...', icon: ChefHat, progress: 85 },
  { label: 'เกือบเสร็จแล้ว กำลังตรวจสอบความปลอดภัย...', icon: CheckCircle2, progress: 98 },
]

export function LoadingModal({ mealTimeLabel, onCancel, cancelable = false }: LoadingModalProps) {
  const [stage, setStage] = useState(0)
  const current = STAGES[stage]

  useEffect(() => {
    if (stage >= STAGES.length - 1) return
    const t = setTimeout(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 950)
    return () => clearTimeout(t)
  }, [stage])

  return (
    <div className="modal-overlay" role="alertdialog" aria-modal="true">
      <div className="modal-card relative" style={{ textAlign: 'center' }}>
        {cancelable && onCancel && (
          <button className="modal-close" onClick={onCancel} aria-label="ยกเลิก">
            <span style={{ width: 18, height: 2, background: 'var(--primary)', display: 'block' }} />
          </button>
        )}
        <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 22px' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(161,188,152,0.25) 0%, rgba(161,188,152,0) 70%)',
            }}
            className="animate-pulse-ring"
          />
          <div
            className="animate-chef-bounce"
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <svg viewBox="0 0 120 120" width="110" height="110" aria-hidden="true">
              <defs>
                <linearGradient id="chefBody" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#D2DCB6" />
                  <stop offset="100%" stopColor="#A1BC98" />
                </linearGradient>
                <linearGradient id="chefHat" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="100%" stopColor="#F1F3E0" />
                </linearGradient>
              </defs>
              <ellipse cx="60" cy="82" rx="34" ry="28" fill="url(#chefBody)" stroke="#778873" strokeWidth="1.5" />
              <path
                d="M30 72 Q22 58 32 50 L88 50 Q98 58 90 72 Z"
                fill="url(#chefHat)"
                stroke="#778873"
                strokeWidth="1.5"
              />
              <circle cx="40" cy="44" r="6" fill="#FFFFFF" stroke="#778873" strokeWidth="1.2" />
              <circle cx="60" cy="38" r="7" fill="#FFFFFF" stroke="#778873" strokeWidth="1.2" />
              <circle cx="80" cy="44" r="6" fill="#FFFFFF" stroke="#778873" strokeWidth="1.2" />
              <circle cx="49" cy="76" r="2.5" fill="#4a5748" />
              <circle cx="71" cy="76" r="2.5" fill="#4a5748" />
              <path d="M53 88 Q60 94 67 88" stroke="#4a5748" strokeWidth="2" strokeLinecap="round" fill="none" />
              <circle cx="40" cy="86" r="4" fill="#F8B4B4" opacity="0.55" />
              <circle cx="80" cy="86" r="4" fill="#F8B4B4" opacity="0.55" />
            </svg>
          </div>
        </div>
        <h3
          style={{
            fontFamily: 'var(--font-kanit)',
            margin: 0,
            fontSize: 22,
            color: 'var(--foreground)',
          }}
        >
          เชฟ AI กำลังคัดสรรเมนู{mealTimeLabel}
        </h3>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--muted)' }}>
          ที่ปลอดภัยและเหมาะสมที่สุดสำหรับคุณ
        </p>

        <div style={{ marginTop: 26, textAlign: 'left' }}>
          <div className="progress-bar" aria-hidden="true">
            <div className="progress-bar-fill" style={{ width: `${current.progress}%` }} />
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 14,
              fontSize: 12,
              color: 'var(--primary)',
              fontWeight: 500,
            }}
          >
            <current.icon style={{ width: 15, height: 15, flexShrink: 0 }} className="spin" />
            <span>{current.label}</span>
          </div>
          <div
            style={{
              marginTop: 18,
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11,
              color: 'var(--muted)',
            }}
          >
            <span>ประมวลผลอยู่ {stage + 1}/{STAGES.length}</span>
            <span>{current.progress}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
