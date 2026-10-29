import { z } from "zod";

/**
 * Auto Recipe from Ingredients — shared schemas.
 *
 * `autoRecipeInputSchema` validates the request body server-side only.
 * `autoRecipeOutputSchema` is the Gemini structured-output contract, so it stays
 * flat/nesting-only (no .refine()/.transform()) like the other AI route schemas.
 */

/** Per-field cap — mirrors the prompt sanitizer's field limit. */
export const INGREDIENT_MAX_LEN = 40;

export const autoRecipeInputSchema = z.object({
  ingredients: z
    .array(z.string().trim().min(1).max(INGREDIENT_MAX_LEN))
    .min(1)
    .max(30)
    .describe("วัตถุดิบที่มีอยู่ในครัว"),
  allergyConstraints: z
    .array(z.string().trim().min(1).max(INGREDIENT_MAX_LEN))
    .max(15)
    .optional()
    .describe("อาหารที่แพ้ / ห้ามทาน"),
  maxPreparationTimeMinutes: z
    .number()
    .int()
    .min(5)
    .max(180)
    .optional()
    .describe("เวลาทำอาหารสูงสุดที่ยอมรับได้ (นาที)"),
});

export type AutoRecipeInput = z.infer<typeof autoRecipeInputSchema>;

export const autoRecipeOutputSchema = z.object({
  recipes: z
    .array(
      z.object({
        title: z.string().describe("Thai recipe name"),
        description: z.string().describe("Short Thai description of the dish"),
        prepTimeMinutes: z.number().describe("Preparation time in minutes"),
        calories: z.number().describe("Calories per serving in kcal"),
        macros: z
          .object({
            protein: z.number().describe("Protein in grams"),
            carbs: z.number().describe("Carbohydrates in grams"),
            fat: z.number().describe("Fat in grams"),
          })
          .describe("Macronutrient breakdown in grams"),
        ingredientsUsed: z
          .array(z.string())
          .describe("Ingredients from the user's list, with quantities"),
        missingIngredients: z
          .array(z.string())
          .describe("Pantry staples the recipe additionally needs"),
        instructions: z.array(z.string()).describe("Step-by-step Thai cooking instructions"),
      }),
    )
    .min(1)
    .max(5)
    .describe("Generated recipes"),
});

export type AutoRecipeResult = z.infer<typeof autoRecipeOutputSchema>;

/** Wire shape returned by /api/auto-recipe (includes quota meta). */
export type AutoRecipeResponse = AutoRecipeResult & {
  _meta?: {
    remaining: number;
    date: string;
    latencyMs: number;
    model: string;
  };
};
