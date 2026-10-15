import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { SESSION_COOKIE, sessionCookieOptions, signSession } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({ email: z.string().email({ message: 'อีเมลไม่ถูกต้อง' }) })

/** Mint a signed, httpOnly session cookie. */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }
  const token = await signSession(parsed.data.email)
  const store = await cookies()
  store.set(SESSION_COOKIE, token, sessionCookieOptions)
  return NextResponse.json({ ok: true })
}

/** Clear the session cookie. */
export async function DELETE() {
  const store = await cookies()
  store.set(SESSION_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 })
  return NextResponse.json({ ok: true })
}
