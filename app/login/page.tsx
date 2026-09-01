'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, CheckCircle2, Leaf, LogIn } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { OtpModal } from '@/components/OtpModal'

function LoginInner() {
  const { login, loading, requestForgotOtp, confirmForgotAndReset, otp, otpPurpose, otpTargetEmail, cancelOtpFlow } =
    useAuth()
  const router = useRouter()
  const search = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [forgot, setForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!email.trim() || !password) {
      setError('กรุณากรอกอีเมลและรหัสผ่าน')
      return
    }
    setSubmitting(true)
    await new Promise((r) => setTimeout(r, 450))
    const res = login(email, password, remember)
    setSubmitting(false)
    if (!res.ok) {
      setError(res.error || 'เข้าสู่ระบบไม่สำเร็จ')
      return
    }
    setSuccess('เข้าสู่ระบบสำเร็จ กำลังนำไปที่หน้าหลัก...')
    const next = search.get('next') || '/'
    setTimeout(() => router.replace(next), 900)
  }

  const onRequestForgot = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!forgotEmail.trim()) {
      setError('กรุณากรอกอีเมล')
      return
    }
    setSubmitting(true)
    setTimeout(() => {
      const res = requestForgotOtp(forgotEmail)
      setSubmitting(false)
      if (!res.ok) setError(res.error || 'ไม่สามารถส่งรหัสได้')
    }, 500)
  }

  return (
    <>
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg)' }}>
        <div
          style={{
            width: 'min(440px, 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50% 45% 50% 42%',
                background: '#778873',
                transform: 'rotate(-27deg)',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 10px 24px rgba(119,136,115,0.25)',
              }}
            >
              <Leaf style={{ width: 20, height: 20, color: '#F1F3E0' }} />
            </div>
            <div style={{ fontFamily: 'var(--font-kanit)', fontSize: 26, fontWeight: 600, color: '#4a5748' }}>
              Nutri<span style={{ color: '#778873' }}>Genie</span>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <h1
              style={{
                fontFamily: 'var(--font-kanit)',
                margin: 0,
                fontSize: 28,
                fontWeight: 600,
                color: 'var(--foreground)',
              }}
            >
              {forgot ? 'รีเซ็ตรหัสผ่าน' : 'ยินดีต้อนรับกลับมา'}
            </h1>
            <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 14 }}>
              {forgot
                ? 'กรอกอีเมลเพื่อขอรหัสยืนยันและตั้งรหัสผ่านใหม่'
                : 'เข้าสู่ระบบเพื่อสร้างเมนูสุขภาพส่วนตัวของคุณ'}
            </p>
          </div>

          <div className="glass-card" style={{ width: '100%', padding: 28 }}>
            {!forgot ? (
              <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                  <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>อีเมล</span>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>รหัสผ่าน</span>
                    <button
                      type="button"
                      onClick={() => setForgot(true)}
                      style={{
                        fontSize: 12,
                        color: 'var(--primary)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 500,
                        padding: 0,
                      }}
                    >
                      ลืมรหัสผ่าน?
                    </button>
                  </div>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </label>

                <label className="checkbox-custom">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  จำการเข้าสู่ระบบ (Remember Me)
                </label>

                {error && (
                  <div className="error-msg" role="alert">
                    <AlertCircle style={{ width: 15, height: 15 }} />
                    {error}
                  </div>
                )}
                {success && (
                  <div className="success-msg" role="status">
                    <CheckCircle2 style={{ width: 15, height: 15 }} />
                    {success}
                  </div>
                )}

                <button className="btn-primary" type="submit" disabled={submitting || !!success} style={{ marginTop: 6 }}>
                  <LogIn style={{ width: 16, height: 16 }} />
                  {submitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                </button>

                <div className="auth-divider">หรือ</div>

                <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
                  ยังไม่มีบัญชีอยู่?{' '}
                  <Link
                    href="/signup"
                    style={{
                      color: 'var(--primary)',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    สมัครสมาชิกที่นี่
                  </Link>
                </div>
              </form>
            ) : (
              <form onSubmit={onRequestForgot} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                  <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>อีเมลของบัญชี</span>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                </label>

                {error && (
                  <div className="error-msg" role="alert">
                    <AlertCircle style={{ width: 15, height: 15 }} />
                    {error}
                  </div>
                )}

                <button className="btn-primary" type="submit" disabled={submitting} style={{ marginTop: 6 }}>
                  {submitting ? 'กำลังส่งรหัสยืนยัน...' : 'ขอรหัสยืนยันผ่านอีเมล'}
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setForgot(false)
                    setError(null)
                    cancelOtpFlow()
                  }}
                >
                  กลับไปเข้าสู่ระบบ
                </button>
              </form>
            )}
          </div>

          <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
            เข้าสู่ระบบ = ยอมรับนโยบายความเป็นส่วนตัวและเงื่อนไขการใช้งานของเรา
          </div>
        </div>

        {otp && otpPurpose === 'forgot' && otpTargetEmail && (
          <OtpModal
            purpose="forgot"
            email={otpTargetEmail}
            showNewPassword
            onConfirm={(code, newPw) => confirmForgotAndReset(code, newPw || '')}
            onCancel={() => {
              cancelOtpFlow()
            }}
          />
        )}
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg)' }} />}>
      <LoginInner />
    </Suspense>
  )
}
