'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Leaf, UserPlus } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { CountryCodeSelect, DEFAULT_COUNTRY, type CountryCode } from '@/components/CountryCodeSelect'

export default function SignupPage() {
  const { requestSignupOtp } = useAuth()
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState<CountryCode>(DEFAULT_COUNTRY)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!name.trim() || !email.trim() || !password || !phone.trim()) {
      setError('กรุณากรอกข้อมูลให้ครบทุกช่อง')
      return
    }
    if (password.length < 6) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร')
      return
    }
    if (password !== confirm) {
      setError('รหัสผ่านยืนยันไม่ตรงกัน')
      return
    }
    const digits = phone.replace(/\D/g, '')
    if (!/^\d{7,15}$/.test(digits)) {
      setError('กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (7-15 หลัก)')
      return
    }
    setSubmitting(true)
    await new Promise((r) => setTimeout(r, 550))
    const fullPhone = `${country.dialCode}${digits.startsWith('0') ? digits.slice(1) : digits}`
    const res = requestSignupOtp(name, email, fullPhone, password)
    setSubmitting(false)
    if (!res.ok) {
      setError(res.error || 'ไม่สามารถสมัครได้')
      return
    }
    if (res.autoVerified) {
      setSuccess('สมัครสมาชิกสำเร็จ! กำลังนำคุณไปยังหน้าโปรไฟล์...')
      setTimeout(() => router.replace('/onboarding'), 900)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '48px 24px',
        background: 'var(--bg)',
      }}
    >
      <div
        style={{
          width: 'min(480px, 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
            สมัครสมาชิกใหม่
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 14 }}>
            เริ่มต้นวันแรกของการกินที่ดีขึ้นสำหรับสุขภาพของคุณ
          </p>
        </div>

        <div className="glass-card" style={{ width: '100%', padding: 28 }}>
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
              <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>ชื่อ-นามสกุล</span>
              <input
                className="input-field"
                placeholder="สมศักดิ์ มั่นคง"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </label>

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
              <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>เบอร์โทรศัพท์</span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
                <div style={{ width: 150, flexShrink: 0 }}>
                  <CountryCodeSelect value={country} onChange={setCountry} />
                </div>
                <input
                  type="tel"
                  className="input-field"
                  placeholder="812345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  style={{ flex: 1 }}
                />
              </div>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                รูปแบบเต็ม: {country.dialCode}{phone.replace(/\D/g, '').startsWith('0') ? phone.replace(/\D/g, '').slice(1) : phone.replace(/\D/g, '')} ({country.code})
              </span>
            </label>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 14,
              }}
            >
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>รหัสผ่าน</span>
                <input
                  type="password"
                  className="input-field"
                  placeholder="อย่างน้อย 6 ตัว"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>ยืนยันรหัสผ่าน</span>
                <input
                  type="password"
                  className="input-field"
                  placeholder="พิมพ์อีกครั้ง"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </label>
            </div>

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

            <button className="btn-primary" type="submit" disabled={submitting || !!success} style={{ marginTop: 8 }}>
              <UserPlus style={{ width: 16, height: 16 }} />
              {submitting ? 'กำลังสร้างบัญชี...' : 'สมัครสมาชิกและเริ่มต้นใช้งาน'}
            </button>

            <div className="auth-divider">หรือ</div>

            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
              มีบัญชีอยู่แล้ว?{' '}
              <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                เข้าสู่ระบบที่นี่
              </Link>
            </div>
          </form>
        </div>

        <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', maxWidth: 440 }}>
          ด้วยการสมัครสมาชิก คุณยอมรับเงื่อนไขการใช้งานและนโยบายความเป็นส่วนตัวของระบบ
        </div>
      </div>
    </div>
  )
}
