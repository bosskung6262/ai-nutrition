import { z } from "zod";

/**
 * Smart Swap Engine — shared schemas.
 *
 * `smartSwapInputSchema` validates the request body server-side only.
 * `smartSwapOutputSchema` is the Gemini structured-output contract, so it stays
 * flat/nesting-only (no .refine()/.transform()) like the other AI route schemas.
 */

export const SWAP_GOALS = [
  "lower_calorie",
  "lower_sodium",
  "higher_protein",
  "vegan",
] as const;

export const smartSwapInputSchema = z.object({
  targetRecipeOrIngredient: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .describe('เมนูหรือวัตถุดิบที่ต้องการปรับ เช่น "ข้าวผัดหมู" หรือ "กะทิ"'),
  swapGoal: z.enum(SWAP_GOALS).describe("เป้าหมายการปรับสูตร"),
  additionalRestrictions: z
    .string()
    .trim()
    .max(120)
    .optional()
    .describe(
      "ข้อจำกัดเพิ่มเติมสำหรับมื้อนี้ (ไม่บังคับ) เช่น 'ไม่ใส่พริก, ไม่ใช้น้ำมัน, แพ้กุ้ง'",
    ),
});

export type SmartSwapInput = z.infer<typeof smartSwapInputSchema>;
export type SwapGoal = (typeof SWAP_GOALS)[number];

export const smartSwapOutputSchema = z.object({
  originalItem: z.string().describe("Thai name of the item being swapped"),
  goal: z.string().describe("The swap goal, echoed back in Thai"),
  suggestedSubstitutions: z
    .array(
      z.object({
        originalIngredient: z.string().describe("Thai name of the ingredient to replace"),
        replacementIngredient: z.string().describe("Thai name of the replacement ingredient"),
        ratio: z.string().describe('Swap ratio, e.g. "1:1" or "2 ช้อนโต๊ะ ต่อ 1 ถ้วย"'),
        calorieImpactPct: z
          .number()
          .describe("Calorie change from this single swap, in percent (negative = fewer)"),
        reason: z.string().describe("Short Thai reason for the swap"),
      }),
    )
    .min(1)
    .max(5)
    .describe("Ingredient-level substitutions"),
  nutritionDelta: z
    .object({
      calorieDiff: z.number().describe("Total calorie change in kcal (negative = fewer)"),
      proteinDiff: z.number().describe("Total protein change in grams"),
      carbsDiff: z.number().describe("Total carbohydrate change in grams"),
      fatDiff: z.number().describe("Total fat change in grams"),
    })
    .describe("Net nutrition change of the whole swap"),
  instructions: z
    .array(z.string())
    .optional()
    .describe("Step-by-step Thai cooking guide using the swapped ingredients"),
});

export type SmartSwapResult = z.infer<typeof smartSwapOutputSchema>;

/** Wire shape returned by /api/smart-swap (includes quota meta). */
export type SmartSwapResponse = SmartSwapResult & {
  _meta?: {
    remaining: number;
    date: string;
    latencyMs: number;
    model: string;
  };
};
