'use client'

import { useCallback, useEffect, useState } from 'react'
import type { CreateMealPlanInput, MealPlanPayload } from '@/types/meal-plan'

/**
 * Client bindings for /api/meal-plans.
 *
 * Ownership is enforced server-side from the signed session cookie, so the
 * hooks only move data: creating needs a session, reading a shared plan does not.
 */

/** Create a shareable plan and hand back its `shareUrl`. */
export function useCreateMealPlan() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createPlan = useCallback(async (input: CreateMealPlanInput) => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/meal-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const payload = (await res.json().catch(() => null)) as
        | { ok?: boolean; plan?: MealPlanPayload; error?: string }
        | null

      if (!res.ok || !payload?.plan) {
        setError(payload?.error || 'ไม่สามารถสร้างแผนมื้ออาหารได้ กรุณาลองใหม่อีกครั้ง')
        return null
      }

      return payload.plan
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { createPlan, isLoading, error }
}

/** Public read of a shared plan by its share id (e.g. `planId` from `/plan/[id]`). */
export function useGetSharedPlan(planId: string | null | undefined) {
  const [planData, setPlanData] = useState<MealPlanPayload | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(planId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!planId) {
      setPlanData(null)
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)
    setError(null)

    const load = async () => {
      try {
        const res = await fetch(`/api/meal-plans/${encodeURIComponent(planId)}`, {
          signal: controller.signal,
        })
        const payload = (await res.json().catch(() => null)) as
          | { plan?: MealPlanPayload; error?: string }
          | null

        if (!res.ok || !payload?.plan) {
          setPlanData(null)
          setError(payload?.error || 'ไม่พบแผนมื้ออาหารนี้')
          return
        }

        setPlanData(payload.plan)
      } catch {
        if (controller.signal.aborted) return
        setPlanData(null)
        setError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    void load()
    return () => controller.abort()
  }, [planId])

  return { planData, isLoading, error }
}
