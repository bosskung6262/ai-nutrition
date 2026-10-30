import type { MealPlanItem, ShoppingItem } from '@/types/meal-plan'

/**
 * Aggregates ingredients across multiple meals into a unified shopping list.
 * Mandates Thai units for parsing and summing.
 */
export function aggregateIngredients(meals: MealPlanItem[]): ShoppingItem[] {
  const map = new Map<string, ShoppingItem>()

  // Pattern: "อกไก่ 150 กรัม" or "ไข่ไก่ 2 ฟอง"
  // Handles decimal and fractions like "1/2"
  const pattern = /^(.+?)\s+([\d./]+)\s+(.+)$/

  for (const meal of meals) {
    if (!meal.ingredients) continue
    for (const raw of meal.ingredients) {
      const match = raw.match(pattern)
      if (match) {
        const [, name, qtyStr, unit] = match
        const qty = evalQty(qtyStr)
        const key = `${name.trim().toLowerCase()}_${unit.trim().toLowerCase()}`
        const existing = map.get(key)
        if (existing) {
          existing.quantity += qty
          if (!existing.originalStrings.includes(raw)) {
            existing.originalStrings.push(raw)
          }
        } else {
          map.set(key, {
            name: name.trim(),
            quantity: qty,
            unit: unit.trim(),
            originalStrings: [raw],
          })
        }
      } else {
        // Fallback for ingredients without clear qty/unit
        const name = raw.trim()
        const key = `raw_${name.toLowerCase()}`
        if (!map.has(key)) {
          map.set(key, {
            name,
            quantity: 0,
            unit: '',
            originalStrings: [raw],
          })
        }
      }
    }
  }

  return Array.from(map.values())
}

function evalQty(str: string): number {
  if (str.includes('/')) {
    const [num, den] = str.split('/').map(Number)
    return den ? num / den : 0
  }
  return Number.parseFloat(str) || 0
}
