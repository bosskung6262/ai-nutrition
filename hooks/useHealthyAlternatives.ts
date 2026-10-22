'use client'

import { useCallback, useState } from 'react'
import type { HealthyAltResponse } from '@/types/healthy-alt'

/**
 * Client binding for POST /api/healthy-alternatives.
 *
 * Identity + quota live in the signed session cookie and are enforced
 * server-side, so this hook only sends the craving and surfaces the
 * server's Thai error message (401 / 429 / 500) to the UI.
 */
export function useHealthyAlternatives() {
  const [data, setData] = useState<HealthyAltResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateAlternative = useCallback(async (craving: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/healthy-alternatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ craving }),
      })
      const payload = (await res.json().catch(() => null)) as
        | (HealthyAltResponse & { error?: string })
        | null

      if (!res.ok) {
        setData(null)
        setError(payload?.error || 'ไม่สามารถสร้างเมนูทางเลือกได้ กรุณาลองใหม่อีกครั้ง')
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

  return { generateAlternative, data, isLoading, error }
}
