'use client'

import { useEffect, useRef, useState } from 'react'
import { X, ShieldCheck, Mail } from 'lucide-react'

interface OtpModalProps {
  purpose: 'signup' | 'forgot'
  email: string
  onConfirm: (code: string, newPassword?: string) => { ok: boolean; error?: string }
  onCancel: () => void
  showNewPassword?: boolean
}

export function OtpModal({ purpose, email, onConfirm, onCancel, showNewPassword }: OtpModalProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputs.current[0]?.focus()
  }, [])

  const setDigit = (idx: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const next = [...digits]
    next[idx] = value.slice(-1)
    setDigits(next)
    setError(null)
    if (value && idx < 5) {
      inputs.current[idx + 1]?.focus()
    }
  }

  const onKey = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus()
    }
  }

  const submit = () => {
    const code = digits.join('')
    if (code.length !== 6) {
      setError('กรุณากรอกรหัส OTP 6 หลักให้ครบ')
      return
    }
    if (showNewPassword) {
      if (newPw.length < 6) {
        setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร')
        return
      }
      if (newPw !== confirmPw) {
        setError('รหัสผ่านยืนยันไม่ตรงกัน')
        return
      }
    }
    const res = onConfirm(code, showNewPassword ? newPw : undefined)
    if (res.ok) {
      setSuccess(purpose === 'signup' ? 'ยืนยันบัญชีสำเร็จ กำลังนำคุณเข้าสู่ระบบ...' : 'รีเซ็ตรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่')
      setTimeout(() => (purpose === 'signup' ? window.location.reload() : window.location.href = '/login'), 1400)
    } else {
      setError(res.error || 'ยืนยันไม่สำเร็จ')
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card relative" role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onCancel} aria-label="ปิด">
          <X />
        </button>
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--color-card)] grid place-items-center mb-4">
            <ShieldCheck className="w-8 h-8 text-[var(--primary)]" />
          </div>
          <h3 style={{ fontFamily: 'var(--font-kanit)', margin: 0, fontSize: 24, color: 'var(--foreground)' }}>
            {purpose === 'signup' ? 'ยืนยันอีเมลของคุณ' : 'รีเซ็ตรหัสผ่าน'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8, marginBottom: 4 }}>
            เราได้ส่งรหัสยืนยัน 6 หลักไปยังอีเมลแล้ว
          </p>
          <div className="flex items-center gap-2 text-[13px] text-[var(--primary)]">
            <Mail className="w-4 h-4" />
            <span style={{ fontWeight: 500 }}>{email}</span>
          </div>
        </div>

        <div style={{ marginTop: 28 }}>
          <div className="otp-inputs">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputs.current[i] = el }}
                className="otp-input"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => onKey(i, e)}
              />
            ))}
          </div>

          {showNewPassword && (
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>รหัสผ่านใหม่</span>
                <input
                  type="password"
                  className="input-field"
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  value={newPw}
                  onChange={(e) => {
                    setNewPw(e.target.value)
                    setError(null)
                  }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>ยืนยันรหัสผ่านใหม่</span>
                <input
                  type="password"
                  className="input-field"
                  placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                  value={confirmPw}
                  onChange={(e) => {
                    setConfirmPw(e.target.value)
                    setError(null)
                  }}
                />
              </label>
            </div>
          )}

          {error && (
            <div className="error-msg" role="alert">
              <X />
              {error}
            </div>
          )}
          {success && (
            <div className="success-msg" role="status">
              <ShieldCheck />
              {success}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={onCancel}>
              ยกเลิก
            </button>
            <button className="btn-primary" style={{ flex: 1 }} onClick={submit} disabled={!!success}>
              {purpose === 'signup' ? 'ยืนยันบัญชี' : 'รีเซ็ตรหัสผ่าน'}
            </button>
          </div>

          <div style={{ marginTop: 18, textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
            หากไม่ได้รับอีเมล ให้ตรวจสอบในกล่องสแปมหรือลองใหม่อีกครั้ง
          </div>
        </div>
      </div>
    </div>
  )
}
