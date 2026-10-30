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
  /** Optional detail payload — lets a shared plan render the full recipe. */
  ingredients: z.array(z.string().trim().min(1).max(200)).max(40).optional(),
  steps: z.array(z.string().trim().min(1).max(1000)).max(40).optional(),
  healthSafetyNote: z.string().trim().max(1000).optional(),
});

export type MealPlanItem = z.infer<typeof mealPlanItemSchema>;

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export interface MealPlanSchedule {
  [day: number]: {
    [slot in MealSlot]?: MealPlanItem;
  };
}

export interface ShoppingItem {
  name: string;
  quantity: number;
  unit: string;
  originalStrings: string[];
}

export const createMealPlanInputSchema = z.object({
  title: z.string().trim().min(1).max(80).describe("ชื่อแผนมื้ออาหาร"),
  description: z.string().trim().max(300).optional(),
  tags: z.array(z.string().trim().min(1).max(20)).max(5).optional(),
  schedule: z.record(z.string(), z.record(z.string(), mealPlanItemSchema)).optional(),
  meals: z.array(mealPlanItemSchema).min(1).max(21),
});

export type CreateMealPlanInput = z.infer<typeof createMealPlanInputSchema>;

/** Wire shape returned by every /api/meal-plans response. */
export interface MealPlanPayload {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  schedule?: MealPlanSchedule;
  shoppingList?: ShoppingItem[];
  meals: MealPlanItem[];
  shareUrl: string;
  createdAt: string;
}

/* ── Meal Plan Playlist (share codes) ─────────────────────────────── */

/** Body of `POST /api/playlists/generate` — a 1-7 day (or 1-3 meal) plan. */
export const playlistGenerateInputSchema = z.object({
  title: z.string().trim().min(1).max(80).describe("ชื่อแผนมื้ออาหาร"),
  description: z.string().trim().max(300).optional(),
  tags: z.array(z.string().trim().min(1).max(20)).max(5).optional(),
  days: z.number().int().min(1).max(7).describe("จำนวนวันของแผน (1-7 วัน)"),
  schedule: z.record(z.string(), z.record(z.string(), mealPlanItemSchema)).optional(),
  meals: z.array(mealPlanItemSchema).min(1).max(28), // 7 days * 4 slots = 28 max
});

export type PlaylistGenerateInput = z.infer<typeof playlistGenerateInputSchema>;

/** Body of `POST /api/playlists/import`. */
export const playlistImportInputSchema = z.object({
  code: z.string().trim().min(1).max(64),
});

export type PlaylistImportInput = z.infer<typeof playlistImportInputSchema>;

/** Wire shape returned by every /api/playlists response. */
export interface PlaylistPayload {
  /** The share code, e.g. `NUTRI-3D-7WKQ2M` (also the underlying row id). */
  code: string;
  title: string;
  description?: string;
  tags?: string[];
  days: number;
  schedule?: MealPlanSchedule;
  shoppingList?: ShoppingItem[];
  meals: MealPlanItem[];
  shareUrl: string;
  createdAt: string;
}
