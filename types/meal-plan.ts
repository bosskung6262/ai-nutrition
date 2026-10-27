import { z } from "zod";

/**
 * Meal Plan Playlist / Shareable Links (Option C) — shared schemas.
 *
 * `createMealPlanInputSchema` validates the request body server-side only.
 * `MealPlanPayload` is the single wire contract shared by the API routes and
 * the client hooks, so both sides stay in sync.
 */

export const mealPlanItemSchema = z.object({
  mealTitle: z.string().trim().min(1).max(120).describe("ชื่อเมนู"),
  calories: z.number().nonnegative().describe("แคลอรีต่อ 1 ที่ (kcal)"),
  macros: z.object({
    protein: z.number().nonnegative().describe("โปรตีน (g)"),
    carbs: z.number().nonnegative().describe("คาร์โบไฮเดรต (g)"),
    fat: z.number().nonnegative().describe("ไขมัน (g)"),
  }),
  recipeId: z.string().trim().max(64).optional(),
});

export type MealPlanItem = z.infer<typeof mealPlanItemSchema>;

export const createMealPlanInputSchema = z.object({
  title: z.string().trim().min(1).max(80).describe("ชื่อแผนมื้ออาหาร"),
  description: z.string().trim().max(300).optional(),
  meals: z.array(mealPlanItemSchema).min(1).max(21),
});

export type CreateMealPlanInput = z.infer<typeof createMealPlanInputSchema>;

/** Wire shape returned by every /api/meal-plans response. */
export interface MealPlanPayload {
  id: string;
  title: string;
  description?: string;
  meals: MealPlanItem[];
  shareUrl: string;
  createdAt: string;
}
