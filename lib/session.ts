/**
 * Signed session cookie helpers (Web Crypto — Edge + Node safe).
 *
 * The session cookie is httpOnly and HMAC-SHA256 signed with SESSION_SECRET,
 * so the client can neither read nor forge it. Identity is always derived
 * server-side via `verifySession()`; never trust a client-supplied email.
 */

export const SESSION_COOKIE = 'auth_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

const SECRET = process.env.SESSION_SECRET || 'nutrigenie-dev-secret'

let warnedMissingSecret = false

/**
 * Warn once, on first real use. Doing this at import time also fired during
 * `next build` (production NODE_ENV, no sessions involved) and spammed one
 * warning per build worker.
 */
function warnIfSecretMissing(): void {
  if (warnedMissingSecret || process.env.SESSION_SECRET || process.env.NODE_ENV !== 'production') {
    return
  }
  warnedMissingSecret = true
  console.warn('[session] SESSION_SECRET is not set — using insecure dev key. Set it in production.')
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(value: string): Uint8Array {
  const pad = value.length % 4 ? '='.repeat(4 - (value.length % 4)) : ''
  const bin = atob(value.replace(/-/g, '+').replace(/_/g, '/') + pad)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return b64urlEncode(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))))
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Create a signed session token for `email`. */
export async function signSession(email: string): Promise<string> {
  warnIfSecretMissing()
  const payload = b64urlEncode(
    new TextEncoder().encode(
      JSON.stringify({ e: email.trim().toLowerCase(), x: Date.now() + SESSION_MAX_AGE * 1000 }),
    ),
  )
  return `${payload}.${await hmac(payload)}`
}

/** Verify a signed session token, returning the email or null. */
export async function verifySession(token: string | undefined | null): Promise<string | null> {
  if (!token) return null
  warnIfSecretMissing()
  const dot = token.indexOf('.')
  if (dot <= 0) return null
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  if (!safeEqual(sig, await hmac(payload))) return null
  try {
    const data = JSON.parse(new TextDecoder().decode(b64urlDecode(payload))) as {
      e?: string
      x?: number
    }
    if (!data.e || typeof data.x !== 'number' || Date.now() > data.x) return null
    return data.e
  } catch {
    return null
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  maxAge: SESSION_MAX_AGE,
}
