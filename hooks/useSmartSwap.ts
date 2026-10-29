'use client'

import { useCallback, useState } from 'react'
import type { SmartSwapInput, SmartSwapResponse } from '@/types/smart-swap'

/**
 * Client binding for POST /api/smart-swap.
 *
 * Identity + quota live in the signed session cookie and are enforced
 * server-side, so this hook only sends the target, goal and the optional
 * per-meal extra restrictions, then surfaces the server's Thai error message
 * (400 / 401 / 429 / 500) to the UI.
 */
export function useSmartSwap() {
  const [data, setData] = useState<SmartSwapResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateSwap = useCallback(async (input: SmartSwapInput) => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/smart-swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const payload = (await res.json().catch(() => null)) as
        | (SmartSwapResponse & { error?: string })
        | null

      if (!res.ok) {
        setData(null)
        setError(payload?.error || 'ไม่สามารถวิเคราะห์การเปลี่ยนส่วนผสมได้ กรุณาลองใหม่อีกครั้ง')
        return null
      }

      setData(payload)
      return payload
    } catch {
      setData(null)
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { generateSwap, data, isLoading, error }
}
