import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { JsonStore } from "@/lib/server-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DailyQuota = { date: string; used: number; max: number };
const QUOTA_MAX = 3;

const todayStr = () => new Date().toISOString().slice(0, 10);

const quotaStore = new JsonStore<string, DailyQuota>("ai-nutrition-quota.json");

function getQuota(userKey: string): DailyQuota {
  const today = todayStr();
  let q = quotaStore.get(userKey);
  if (!q || q.date !== today) {
    q = { date: today, used: 0, max: QUOTA_MAX };
    quotaStore.set(userKey, q);
  }
  return q;
}

function checkQuota(userKey: string): {
  ok: boolean;
  remaining: number;
  quota: DailyQuota;
} {
  const q = getQuota(userKey);
  if (q.used >= q.max) return { ok: false, remaining: 0, quota: q };
  return { ok: true, remaining: q.max - q.used, quota: q };
}

function commitQuota(userKey: string): {
  ok: boolean;
  remaining: number;
  quota: DailyQuota;
} {
  const q = getQuota(userKey);
  if (q.used >= q.max) return { ok: false, remaining: 0, quota: q };
  const updated = { ...q, used: q.used + 1 };
  quotaStore.set(userKey, updated);
  return { ok: true, remaining: updated.max - updated.used, quota: updated };
}

const QUANTITY_PATTERN =
  /(\d+(\.\d+)?\s*(ก\.?|กรัม|kg|กิโลกรัม|มล\.?|มิลลิลิตร|ลิตร|ช้อนโต๊ะ|ช้อนชา|ถ้วย|ฟอง|ชิ้น|ผล|ห่อ|กลีบ|แผ่น|หนีบ|ส่วน|ml|g|l|L|tsp|tbsp|cup))|(\d+\/\d+\s*(ถ้วย|ช้อนโต๊ะ|ช้อนชา))/i;

/**
 * Flat, Gemini-compatible Zod schema.
 * • macronutrients uses explicit scalar fields (protein_g / carbs_g / fat_g)
 * • No .refine() / .superRefine() — those produce unsupported JSON-schema extensions.
 * • Post-generation validation (calorie-macro check, quantity check) is done manually below.
 */
const apiRecipeSchema = z.object({
  rank: z.number().describe("Recipe rank 1-3"),
  rankLabel: z.string().describe("Thai label for the rank badge"),
  recipeName: z.string().describe("Thai recipe name"),
  prepTimeMins: z.number().describe("Preparation time in minutes"),
  caloriesKcal: z.number().describe("Total calories in kcal"),
  macronutrients: z
    .object({
      protein_g: z.number().describe("Protein in grams"),
      carbs_g: z.number().describe("Carbohydrates in grams"),
      fat_g: z.number().describe("Fat in grams"),
    })
    .describe("Macronutrient breakdown in grams"),
  ingredients: z
    .array(z.string())
    .describe('Ingredients with precise quantities, e.g. "อกไก่ 150 กรัม"'),
  allergenWarnings: z
    .array(z.string())
    .describe("Thai FDA top-8 allergens present"),
  cookingSteps: z
    .array(z.string())
    .describe("Detailed step-by-step cooking instructions in Thai (for full recipe view)"),
  shortSteps: z
    .array(z.string())
    .describe("Ultra-concise 3 cooking steps in Thai, max 12 words each, for share card. Example: ['ตั้งกระทะผัดหอมใหญ่', 'ใส่ไข่และปรุงรส', 'ตักใส่จานเสิร์ฟ']"),
  healthSafetyNote: z
    .string()
    .describe("Clinical health safety note in Thai, >= 15 chars"),
});

const recipeSchema = z.object({
  targetCalories: z.number().describe("Per-meal calorie target in kcal"),
  appliedFilters: z.array(z.string()).describe("Active dietary filters"),
  mealTimeLabel: z.string().describe("Thai meal time label"),
  recipes: z
    .array(apiRecipeSchema)
    .length(3)
    .describe("Exactly 3 ranked recipes"),
});

/* ── Post-generation validation (replaces .superRefine / .refine) ── */

function validateRecipe(r: z.infer<typeof apiRecipeSchema>): string[] {
  const issues: string[] = [];

  // Calorie–macro consistency
  const macroKcal =
    r.macronutrients.protein_g * 4 +
    r.macronutrients.carbs_g * 4 +
    r.macronutrients.fat_g * 9;
  if (Math.abs(macroKcal - r.caloriesKcal) > r.caloriesKcal * 0.3) {
    issues.push(
      `Calorie mismatch: stated ${r.caloriesKcal} kcal but macros sum to ~${Math.round(macroKcal)} kcal`,
    );
  }

  // Ingredient quantity check
  for (const ing of r.ingredients) {
    if (!QUANTITY_PATTERN.test(ing) || ing.length < 6) {
      issues.push(`Ingredient missing precise quantity: "${ing}"`);
      break; // report first offender only
    }
  }

  // Minimums
  if (r.cookingSteps.length < 3)
    issues.push("cookingSteps must have >= 3 entries");
  if (r.healthSafetyNote.length < 15)
    issues.push("healthSafetyNote must be >= 15 chars");

  return issues;
}

const SYSTEM_PROMPT = `You are a WORLD-CLASS EXECUTIVE CHEF (Michelin-star caliber) AND A BOARD-CERTIFIED CLINICAL NUTRITIONIST.
Your dual expertise allows you to craft Thai meals that are simultaneously:
  a) Restaurant-grade in flavor, aroma, texture, and presentation — using authentic Thai herbs and spices.
  b) Clinically precise in macronutrient balance, caloric control, and NCD-safety (Diabetes, Hypertension, Dyslipidemia, CKD, CVD).

=== YOUR CREDENTIALS & PERSONA ===
• Executive Chef, 18+ years at Michelin-level Thai fine-dining establishments across Bangkok, Tokyo, and London.
• Clinical Nutritionist (MSc, CNS-certified), specializing in weight management and metabolic syndrome reversal.
• You think and write fluently in THAI for every recipe component.

=== NON-NEGOTIABLE NCD SAFETY RULES (FATAL IF VIOLATED) ===
✅ DIABETES: No refined sugar (น้ำตาลทราย, น้ำตาลกลั่น, ไอซิ่ง) — use natural sweeteners ONLY if necessary, prefer 0 kcal sweetener; Low-GI carbs exclusively.
✅ HYPERTENSION: Sodium < 600 mg/meal; ABSOLUTELY NO bacon, ham, sausage, processed/preserved meats; NO seasoning powder (ผงชูรส).
✅ DYSLIPIDEMIA: No saturated/trans fats; NO palm oil, NO coconut milk/cream (กะทิ, หัวกะทิ), NO lard; use olive / rice-bran / canola oil only.
✅ CKD: Moderate plant-based protein, limit phosphorus additives, avoid very high sodium.
✅ ALLERGIES / AVOID LIST: NEVER include any ingredient listed in the user's "อาหารที่แพ้/ไม่ทาน" list — not even as a trace condiment.
✅ DIET STYLE: Strictly honor the user's chosen diet style:
   - Keto         : Total carbs < 20g, high healthy fat, mod protein.
   - Low Carb     : Total carbs < 30g per meal.
   - High Protein : 30–45 g protein per meal.
   - Vegan        : Zero animal products (use plant protein: tofu, tempeh, edamame, lentils).
   - Pescatarian  : Seafood + plants; NO meat (chicken, pork, beef).
   - IF / DASH / Mediterranean / Clean Eating : follow standard clinical guidelines.
✅ PREP TIME: Match user's time budget: Fast (< 10 min), Normal (15–20 min), Relaxed (~30 min).
✅ CALORIE TARGET: Every recipe MUST land within ±15% of the user's per-meal calorie target.

=== OUTPUT FORMAT — ZERO DEVIATION ===
• Return ONLY a raw, valid, parseable JSON object matching the provided schema.
• NO extra text, NO markdown, NO code fences, NO backticks, NO commentary, NO preamble or epilogue of any kind.
• Every string inside the JSON (recipe names, ingredients, steps, notes, labels) MUST be in the THAI language.
• Generate EXACTLY 3 recipes, ranked by suitability:
    Rank 1 → Best overall fit for user's profile, target, allergies, and NCD constraints.
            rankLabel: ใช้ "แนะนำมากที่สุดสำหรับคุณ" (matches Award badge on frontend).
    Rank 2 → Nutrition-optimal alternative (higher protein, better micros).
            rankLabel: ใช้ "ทางเลือกสุขภาพดี" (matches Dumbbell badge on frontend).
    Rank 3 → Fastest & simplest to prepare with given pantry items.
            rankLabel: ใช้ "ทำง่ายรวดเร็ว" (matches Clock badge on frontend).
• INGREDIENTS FORMAT (enforced): Every single ingredient line MUST include a precise numeric quantity and unit.
    ✅ Correct examples: "อกไก่ 150 กรัม", "ข้าวกล้องต้ม 1/2 ถ้วย", "น้ำมันมะกอก 1 ช้อนโต๊ะ", "ไข่ไก่ 2 ฟอง", "กระเทียม 3 กลีบ"
    ❌ Wrong: "อกไก่" (no qty), "น้ำมันมะกอกนิดหน่อย" (no precise number)
• MACRO ACCURACY: Protein + Carbs + Fat derived kcal must be within ±30% of stated caloriesKcal.
  (Formula: protein*4 + carbs*4 + fat*9 ≈ caloriesKcal)
• COOKING STEPS: Minimum 3 steps per recipe, numbered logic, practical for a home kitchen in Thailand.
• SHORT STEPS (shortSteps): Provide EXACTLY 3 ultra-short summary steps in Thai for the share card. Each step ≤ 12 words, one short phrase only.
    ✅ Example: ["ตั้งกระทะผัดหอมใหญ่จนหอม", "ใส่ไข่และเครื่องปรุง คนให้เข้ากัน", "ตักราดข้าวเสิร์ฟร้อน"]
• HEALTH SAFETY NOTE (Thai): Explain WHY this recipe is safe/beneficial for THIS specific user's NCD profile — specifically name their conditions and how the ingredients help. Must be ≥ 15 chars.
• ALLERGEN WARNINGS: Enumerate any Thai FDA top-8 allergens present (ถั่ว, ไข่, นม, ปลา, กุ้ง/หอย, ข้าวสาลี/กลูเตน, งา, ถั่วลิสง). If none, return empty array.

=== STRICT PANTRY CONSTRAINT (CRITICAL) ===
• STRICTLY USE ONLY the ingredients explicitly listed in the user's pantry.
• DO NOT introduce any new main ingredients, meats, vegetables, or carbohydrates that were not provided by the user.
• If the user provides a very short list of ingredients, create recipes strictly by combining those exact ingredients.
• Exception: You may ONLY use standard household basic seasonings/condiments (e.g., water, salt, minimal low-sodium soy sauce, pepper) IF AND ONLY IF necessary to make the dish cookable.
Prioritize authentic Thai flavors: lime, lemongrass, galangal, kaffir lime leaf, chilies, garlic, shallots, coriander, fish sauce (low-sodium if HTN), holy basil, etc. — but substitute where NCD rules require (e.g., low-sodium soy instead of regular fish sauce for HTN users).
Avoid "ผัดขี้เมา" — don't just dump ingredients; compose balanced dishes.
`;

const mealTimeIdToLabel: Record<string, string> = {
  breakfast: "มื้อเช้า",
  lunch: "มื้อกลางวัน",
  dinner: "มื้อเย็น",
};

const prepTimeIdToLabel: Record<string, string> = {
  fast: "เร็วทันใจ (ไม่เกิน 10 นาที)",
  normal: "กำลังดี (15-20 นาที)",
  relaxed: "พอมีเวลา (30 นาที)",
};

const dietLabelMap: Record<string, string> = {
  none: "ไม่กำหนด",
  if: "IF",
  "high-protein": "High Protein",
  "low-carb": "Low Carb",
  keto: "Keto",
  mediterranean: "Mediterranean",
  dash: "DASH Diet",
  "clean-eating": "Clean Eating",
  vegan: "Vegan",
  pescatarian: "Pescatarian",
};

export async function POST(req: Request) {
  const STEP = "[POST /api/generate-recipe]";
  try {
    const body = (await req.json()) as unknown;
    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { error: "คำขอไม่ถูกต้อง (body ต้องเป็น JSON object)" },
        { status: 400 },
      );
    }

    const { userEmail, profile, pantry } = body as {
      userEmail?: string;
      profile?: {
        age: string;
        gender: string;
        height: string;
        weight: string;
        activity: string;
        diet: string;
        health: string[];
        avoid: string[];
        targetCalories?: number;
      };
      pantry?: {
        mealTime: "breakfast" | "lunch" | "dinner" | null;
        prepTime: "fast" | "normal" | "relaxed" | null;
        items: string[];
      };
    };

    if (!profile) {
      console.error(`${STEP} Body invalid: missing profile`);
      return NextResponse.json(
        { error: "ข้อมูลคำขอไม่ครบถ้วน (ไม่พบโปรไฟล์ผู้ใช้)" },
        { status: 400 },
      );
    }
    if (!pantry) {
      console.error(`${STEP} Body invalid: missing pantry`);
      return NextResponse.json(
        { error: "ข้อมูลคำขอไม่ครบถ้วน (ไม่พบข้อมูลมื้ออาหาร/ส่วนผสม)" },
        { status: 400 },
      );
    }

    const userKey = (userEmail || "guest-" + todayStr()).trim().toLowerCase();

    const preCheck = checkQuota(userKey);
    if (!preCheck.ok) {
      console.warn(`${STEP} Quota exhausted for ${userKey}`);
      return NextResponse.json(
        {
          error:
            "โควต้าสร้างเมนูอาหารวันนี้หมดแล้ว (3/3 ครั้ง) กรุณากลับมาใช้งานใหม่ในวันพรุ่งนี้",
          quota: preCheck.quota,
        },
        { status: 429 },
      );
    }

    const perMealTarget = profile.targetCalories
      ? Math.round(profile.targetCalories / 3)
      : 550;
    const mealLabel = pantry.mealTime
      ? mealTimeIdToLabel[pantry.mealTime]
      : "มื้อหลัก";
    const prepLabel = pantry.prepTime
      ? prepTimeIdToLabel[pantry.prepTime]
      : "เวลาปานกลาง";
    const dietLabel =
      dietLabelMap[profile.diet || "none"] || profile.diet || "ไม่กำหนด";

    const filters: string[] = [mealLabel, prepLabel];
    if (profile.diet && profile.diet !== "none")
      filters.push("สไตล์: " + dietLabel);
    profile.health?.forEach((h) => filters.push("สุขภาพ: " + h));
    profile.avoid?.forEach((a) => filters.push("ห้าม: " + a));

    const healthLine =
      profile.health?.length && profile.health.join(", ") !== "ไม่มี"
        ? profile.health.join(", ")
        : "สุขภาพทั่วไป";
    const avoidLine = profile.avoid?.length
      ? profile.avoid.join(", ")
      : "ไม่มี";
    const pantryLine = pantry.items?.length
      ? pantry.items.join(", ")
      : "ไม่มี (หากไม่มีวัตถุดิบ ให้แจ้งเตือน หรือใช้เฉพาะเครื่องปรุงพื้นฐาน)";

    const userPrompt = [
      "=== โปรไฟล์ผู้ใช้ (User Profile) ===",
      `• ช่วงอายุ: ${profile.age} ปี`,
      `• เพศ: ${profile.gender}`,
      `• ส่วนสูง: ${profile.height} ซม.`,
      `• น้ำหนักตัว: ${profile.weight} กก.`,
      `• ระดับกิจกรรม: ${profile.activity}`,
      `• รูปแบบการกิน (Diet Style): ${dietLabel}`,
      `• โรคประจำตัว / NCD constraints: ${healthLine}`,
      `• อาหารที่แพ้ / ห้ามทานอย่างเด็ดขาด: ${avoidLine}`,
      `• เป้าหมายแคลอรีต่อมื้อ (target): ${perMealTarget} kcal (ห้ามล้นเกิน ±15%)`,
      "",
      "=== มื้ออาหาร & ครัว (Meal + Pantry) ===",
      `• มื้อที่จะทำ: ${mealLabel}`,
      `• ระยะเวลาทำอาหารที่ผู้ใช้ต้องการ: ${prepLabel}`,
      `• วัตถุดิบที่ผู้ใช้ระบุ (STRICT INGREDIENT LIST): ${pantryLine}`,
      "",
      "=== งาน (TASK) ===",
      `สร้าง 3 สูตรอาหารไทย สำหรับ${mealLabel} ที่:`,
      '1. **กฎเหล็กด้านวัตถุดิบ (STRICT PANTRY):** ใช้เฉพาะวัตถุดิบที่ระบุใน "วัตถุดิบที่ผู้ใช้ระบุ" เท่านั้น ห้ามเพิ่มเนื้อสัตว์ ผัก หรือแป้งชนิดอื่นที่ผู้ใช้ไม่ได้กรอกมาโดยเด็ดขาด (อนุญาตเฉพาะเครื่องปรุงพื้นฐาน เช่น น้ำเปล่า เกลือ พริกไทย น้ำมันเล็กน้อย)',
      "2. ลดน้ำหนักปลอดภัย: โปรตีนสูง, ไฟเบอร์สูง (ตามวัตถุดิบที่มี), แคลอรีอยู่ใน ±15% เป้าหมาย",
      '3. ปฏิบัติตามกฎ NCD และรายการ "อาหารที่แพ้/ห้ามทาน" อย่างเคร่งครัด',
      '4. **ทุกส่วนผสม** ระบุปริมาณตัวเลข + หน่วยแน่นอน เช่น "อกไก่ 150 กรัม", "ไข่ไก่ 2 ฟอง"',
      "5. cookingSteps: อย่างน้อย 3 ขั้นตอน/สูตร ละเอียด ง่ายต่อปฏิบัติในครัวบ้านไทย",
      `6. healthSafetyNote (≥ 15 ตัวอักษร): อธิบายเหตุผลทางคลินิกว่าทำไมสูตรนี้จึงปลอดภัยและมีประโยชน์ต่อผู้ใช้ โดยเฉพาะโรค: ${healthLine}`,
      "7. allergenWarnings: ตรวจว่ามีสิ่งใดใน 8 อันดับแพ้อาหารของไทย ถ้าไม่มีให้คืนเป็น array ว่าง []",
      '8. rankLabel ต้องตรงตามกฎ: Rank1="แนะนำมากที่สุดสำหรับคุณ", Rank2="ทางเลือกสุขภาพดี", Rank3="ทำง่ายรวดเร็ว"',
    ].join("\n");

    console.info(
      `${STEP} Calling AI for user=${userKey} meal=${pantry.mealTime} diet=${profile.diet} pre-check-remaining=${preCheck.remaining}`,
    );

    const t0 = Date.now();
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash-latest";

    const { object } = await generateObject({
      model: google(modelName),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      schema: recipeSchema,
    });
    const t1 = Date.now();
    const typed = object as z.infer<typeof recipeSchema>;

    // ตรวจสอบว่ามีวัตถุดิบแปลกปลอมหลุดมาหรือไม่
    function validatePantryMatch(
      recipeIngredients: string[],
      allowedItems: string[],
    ): string[] {
      const issues: string[] = [];
      if (!allowedItems || allowedItems.length === 0) return issues;

      // รายการเครื่องปรุงพื้นฐานที่อนุญาตให้มีได้
      const basicStaples = [
        "น้ำ",
        "น้ำมัน",
        "เกลือ",
        "พริกไทย",
        "ซีอิ๊ว",
        "ซอส",
        "น้ำปลา",
        "กระเทียม",
        "พริก",
      ];

      for (const ing of recipeIngredients) {
        const isAllowed = allowedItems.some((item) => ing.includes(item));
        const isStaple = basicStaples.some((staple) => ing.includes(staple));

        if (!isAllowed && !isStaple) {
          issues.push(`Found unapproved added ingredient: "${ing}"`);
        }
      }
      return issues;
    }

    // Post-generation validation (replaces in-schema superRefine / refine)
    const validationIssues: string[] = [];
    for (let i = 0; i < typed.recipes.length; i++) {
      const issues = validateRecipe(typed.recipes[i]);
      for (const issue of issues) {
        validationIssues.push(
          `Recipe ${i + 1} (${typed.recipes[i].recipeName}): ${issue}`,
        );
      }
    }
    if (validationIssues.length > 0) {
      console.warn(`${STEP} Post-validation warnings:`, validationIssues);
    }

    console.info(
      `${STEP} AI OK in ${t1 - t0}ms recipes=${typed.recipes.length}`,
    );

    const afterQuota = commitQuota(userKey);
    if (!afterQuota.ok) {
      console.warn(
        `${STEP} Race condition: pre-check passed but commit failed for ${userKey}`,
      );
      return NextResponse.json(
        {
          error:
            "โควต้าถูกใช้ไปพร้อมกันในคำขออื่นแล้ว กรุณาลองใหม่ในวันพรุ่งนี้",
          quota: afterQuota.quota,
        },
        { status: 429 },
      );
    }

    return NextResponse.json(
      {
        ...typed,
        appliedFilters: typed.appliedFilters?.length
          ? typed.appliedFilters
          : filters,
        mealTimeLabel: typed.mealTimeLabel || mealLabel,
        _meta: {
          remaining: afterQuota.remaining,
          date: afterQuota.quota.date,
          usedSoFar: afterQuota.quota.used,
          latencyMs: t1 - t0,
          model: `google/${modelName} (direct via @ai-sdk/google)`,
        },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`${STEP} Unhandled error:`, msg, error);
    return NextResponse.json(
      {
        error:
          "ไม่สามารถประมวลผลเมนูได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง (AI generation error)",
        detail: process.env.NODE_ENV === "development" ? msg : undefined,
      },
      { status: 500 },
    );
  }
}
