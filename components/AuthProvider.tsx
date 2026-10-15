'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  clearAuth,
  createUser,
  findUserByEmail,
  generateOTP,
  getCurrentUser,
  resetUserPassword,
  setAuthUser,
  verifyAndActivateUser,
  verifyUserLogin,
} from '@/lib/store'
import type { AuthUser } from '@/lib/types'

/* ─── Cookie helpers ────────────────────────────────────────────────── */

/**
 * The session cookie is httpOnly + signed, so it can only be minted by the
 * server via `/api/auth/session` — client JS can neither read nor forge it.
 */
function setSessionCookie(email: string) {
  void fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  }).catch(() => null)
}

async function clearSessionCookie() {
  await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => null)
}

/* ─── Context ───────────────────────────────────────────────────────── */

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  refresh: () => void
  logout: () => void
  requestSignupOtp: (
    name: string,
    email: string,
    phone: string,
    password: string,
  ) =>
    | { ok: true; autoVerified: true; user: AuthUser }
    | { ok: true; autoVerified?: false }
    | { ok: false; error?: string }
  verifySignupOtp: (input: string) => { ok: boolean; error?: string }
  requestForgotOtp: (email: string) => { ok: boolean; error?: string }
  confirmForgotAndReset: (
    input: string,
    newPassword: string,
  ) => { ok: boolean; error?: string }
  login: (
    email: string,
    password: string,
    rememberMe: boolean,
  ) => { ok: boolean; error?: string }
  cancelOtpFlow: () => void
  otp: string | null
  otpTargetEmail: string | null
  otpPurpose: 'signup' | 'forgot'
}

const AuthContext = createContext<AuthContextValue | null>(null)

/* ─── Provider ──────────────────────────────────────────────────────── */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [otp, setOtp] = useState<string | null>(null)
  const [otpTargetEmail, setOtpTargetEmail] = useState<string | null>(null)
  const [otpPurpose, setOtpPurpose] = useState<'signup' | 'forgot'>('signup')

  /* On mount: restore session from storage and sync cookie once. */
  useEffect(() => {
    const stored = getCurrentUser()
    setUser(stored)
    if (stored?.email) setSessionCookie(stored.email)
    setLoading(false)
  }, [])

  const refresh = () => {
    const u = getCurrentUser()
    setUser(u)
    if (u?.email) setSessionCookie(u.email)
    else void clearSessionCookie()
  }

  const logout = async () => {
    clearAuth()
    setUser(null)
    // Await the server-side cookie clear so the proxy does not bounce us back
    // to /dashboard still holding the old session.
    await clearSessionCookie()
    window.location.href = '/login'
  }

  /* ── Signup ─────────────────────────────────────────────────────── */

  const requestSignupOtp = (
    name: string,
    email: string,
    phone: string,
    password: string,
  ) => {
    const existing = findUserByEmail(email)
    if (existing)
      return {
        ok: false as const,
        error: 'อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบหรือใช้อีเมลอื่น',
      }
    createUser(name, email, phone, password)
    const code = generateOTP()
    setOtp(code)
    setOtpTargetEmail(email)
    setOtpPurpose('signup')
    console.info(
      '[OTP] Signup code for',
      email,
      ':',
      code,
      '(OTP bypass enabled — auto-verifying)',
    )
    const activated = verifyAndActivateUser(email)
    if (activated) {
      setAuthUser(activated, false)
      setSessionCookie(activated.email)
      setOtp(null)
      setOtpTargetEmail(null)
      setUser(activated)
      return { ok: true as const, autoVerified: true as const, user: activated }
    }
    return { ok: true as const, autoVerified: false as const }
  }

  const verifySignupOtp = (input: string) => {
    if (!otp || !otpTargetEmail)
      return { ok: false, error: 'ไม่พบรายการยืนยัน กรุณาลงทะเบียนใหม่' }
    if (input !== otp)
      return { ok: false, error: 'รหัส OTP ไม่ถูกต้อง กรุณาลองอีกครั้ง' }
    const activated = verifyAndActivateUser(otpTargetEmail)
    if (!activated) return { ok: false, error: 'ไม่สามารถยืนยันบัญชีได้' }
    setAuthUser(activated, false)
    setSessionCookie(activated.email)
    setUser(activated)
    setOtp(null)
    setOtpTargetEmail(null)
    return { ok: true }
  }

  /* ── Forgot password ────────────────────────────────────────────── */

  const requestForgotOtp = (email: string) => {
    const u = findUserByEmail(email)
    if (!u) return { ok: false, error: 'ไม่พบบัญชีที่ใช้อีเมลนี้' }
    const code = generateOTP()
    setOtp(code)
    setOtpTargetEmail(email)
    setOtpPurpose('forgot')
    console.info('[OTP] Forgot password code for', email, ':', code)
    return { ok: true }
  }

  const confirmForgotAndReset = (input: string, newPassword: string) => {
    if (!otp || !otpTargetEmail)
      return { ok: false, error: 'ไม่พบรายการรีเซ็ต กรุณาขอใหม่อีกครั้ง' }
    if (input !== otp)
      return { ok: false, error: 'รหัส OTP ไม่ถูกต้อง กรุณาลองอีกครั้ง' }
    const ok = resetUserPassword(otpTargetEmail, newPassword)
    if (!ok) return { ok: false, error: 'ไม่สามารถรีเซ็ตรหัสผ่านได้' }
    setOtp(null)
    setOtpTargetEmail(null)
    return { ok: true }
  }

  /* ── Login ──────────────────────────────────────────────────────── */

  const login = (email: string, password: string, rememberMe: boolean) => {
    const u = verifyUserLogin(email, password)
    if (!u) return { ok: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }
    if (!u.verified)
      return { ok: false, error: 'บัญชียังไม่ได้รับการยืนยัน OTP' }
    setAuthUser(u, rememberMe)
    setSessionCookie(u.email)
    setUser(u)
    return { ok: true }
  }

  /* ── Cancel OTP ─────────────────────────────────────────────────── */

  const cancelOtpFlow = () => {
    setOtp(null)
    setOtpTargetEmail(null)
  }

  /* ── Context value ──────────────────────────────────────────────── */

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      refresh,
      logout,
      requestSignupOtp,
      verifySignupOtp,
      requestForgotOtp,
      confirmForgotAndReset,
      login,
      cancelOtpFlow,
      otp,
      otpTargetEmail,
      otpPurpose,
    }),
    [user, loading, otp, otpTargetEmail, otpPurpose],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
