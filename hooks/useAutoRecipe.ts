'use client'

import { useCallback, useState } from 'react'
import type { AutoRecipeInput, AutoRecipeResponse } from '@/types/auto-recipe'

/**
 * Client binding for POST /api/auto-recipe.
 *
 * Identity + quota live in the signed session cookie and are enforced
 * server-side, so this hook only sends the ingredient list and surfaces the
 * server's Thai error message (400 / 401 / 429 / 500) to the UI.
 */
export function useAutoRecipe() {
  const [data, setData] = useState<AutoRecipeResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateRecipes = useCallback(async (input: AutoRecipeInput) => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auto-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const payload = (await res.json().catch(() => null)) as
        | (AutoRecipeResponse & { error?: string })
        | null

      if (!res.ok) {
        setData(null)
        setError(payload?.error || 'ไม่สามารถสร้างเมนูจากวัตถุดิบได้ กรุณาลองใหม่อีกครั้ง')
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

  return { generateRecipes, data, isLoading, error }
}
