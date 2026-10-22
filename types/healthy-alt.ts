import { z } from "zod";

/**
 * Healthy Recipe Alternatives (Option B) — shared schemas.
 *
 * `healthyAltInputSchema` validates the request body server-side only.
 * `healthyAltOutputSchema` is the Gemini structured-output contract, so it stays
 * flat/nesting-only (no .refine()/.transform()) like the recipe schema.
 */

/** Craving name cap — mirrors the prompt sanitizer's field limit. */
export const CRAVING_MAX_LEN = 60;

export const healthyAltInputSchema = z.object({
  craving: z
    .string()
    .trim()
    .min(1)
    .max(CRAVING_MAX_LEN)
    .describe('ชื่อเมนูที่ผู้ใช้อยากกิน เช่น "ข้าวขาหมู"'),
});

export type HealthyAltInput = z.infer<typeof healthyAltInputSchema>;

export const healthyAltOutputSchema = z.object({
  original: z
    .object({
      name: z.string().describe("Thai name of the original craving dish"),
      estimatedCalories: z.number().describe("Estimated calories of the original dish in kcal"),
      sodiumLevel: z.string().describe('Sodium level of the original: "ต่ำ" | "ปานกลาง" | "สูง"'),
    })
    .describe("The original dish the user craves"),
  healthyAlternative: z
    .object({
      name: z.string().describe("Thai name of the healthier alternative dish"),
      calories: z.number().describe("Calories of the healthier alternative in kcal"),
      sodium: z.number().describe("Sodium of the healthier alternative in milligrams"),
      ingredientSubstitutions: z
        .array(z.string())
        .describe('Thai substitution pairs, e.g. "หมูสามชั้น → อกไก่ลอกหนัง"'),
      cookingMethod: z.string().describe("Thai description of the healthier cooking method"),
    })
    .describe("The healthier alternative dish"),
  comparison: z
    .object({
      calorieReductionPct: z.number().describe("Calorie reduction vs original, in percent"),
      keyBenefits: z.array(z.string()).describe("Short Thai health benefits of the swap"),
    })
    .describe("Original vs alternative comparison"),
});

export type HealthyAlternative = z.infer<typeof healthyAltOutputSchema>;

/** Wire shape returned by /api/healthy-alternatives (includes quota meta). */
export type HealthyAltResponse = HealthyAlternative & {
  _meta?: {
    remaining: number;
    date: string;
    latencyMs: number;
    model: string;
  };
};
