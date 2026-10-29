import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateObjectWithFallback } from "@/lib/ai";
import { sanitizePromptValue } from "@/lib/prompt";
import { consumeQuota, getQuota, isSupabaseConfigError } from "@/lib/supabase/data";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { autoRecipeInputSchema, autoRecipeOutputSchema } from "@/types/auto-recipe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are a WORLD-CLASS THAI HOME COOK and a CLINICAL NUTRITIONIST.
A user lists the ingredients they already have in the kitchen. Design recipes that use them.

=== METHOD ===
1. Read the ingredient list. The user should NOT have to buy a main ingredient.
2. Compose 3 balanced dishes that are recognizably Thai home cooking.
3. Balance protein, vegetables and carbohydrate; keep each dish macro-consistent
   (protein*4 + carbs*4 + fat*9 must be within ±30% of stated calories).

=== HARD RULES ===
• ingredientsUsed: ONLY items from the user's list, each with a precise numeric quantity
  (e.g. "อกไก่ 150 กรัม", "ไข่ไก่ 2 ฟอง"). NEVER invent main ingredients.
• missingIngredients: basic household staples only (น้ำปลา, ซีอิ๊ว, เกลือ, พริกไทย, น้ำมัน, กระเทียม).
  If the dish needs nothing extra, return an empty array [].
• allergyConstraints: NEVER include a listed allergen — not even as a trace condiment.
  If the list cannot be honored with the given ingredients, exclude that dish entirely.
• maxPreparationTimeMinutes: prepTimeMinutes must be <= the user's limit when one is given.
• instructions: at least 3 practical steps per recipe, in Thai.
• Every string in the JSON MUST be in THAI, except numbers and units.
• Return ONLY a raw, valid, parseable JSON object matching the schema — no markdown, no code fences, no commentary.`;

export async function POST(req: Request) {
  const STEP = "[POST /api/auto-recipe]";
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "คำขอไม่ถูกต้อง (body ต้องเป็น JSON)" }, { status: 400 });
    }

    const parsed = autoRecipeInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "กรุณาระบุวัตถุดิบอย่างน้อย 1 รายการ และตรวจสอบตัวเลขเวลาทำอาหาร" },
        { status: 400 },
      );
    }

    // Quota is keyed off the signed session cookie — never a client-supplied email.
    const cookieStore = await cookies();
    const email = await verifySession(cookieStore.get(SESSION_COOKIE)?.value);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preCheck = await getQuota(email);
    if (preCheck.used >= preCheck.max) {
      console.warn(`${STEP} Quota exhausted for ${email}`);
      return NextResponse.json(
        {
          error: `โควต้าสร้างเมนูอาหารวันนี้หมดแล้ว (${preCheck.used}/${preCheck.max} ครั้ง) กรุณากลับมาใช้งานใหม่ในวันพรุ่งนี้`,
          quota: preCheck,
        },
        { status: 429 },
      );
    }

    const ingredients = parsed.data.ingredients.map(sanitizePromptValue).filter(Boolean);
    const allergies = (parsed.data.allergyConstraints ?? [])
      .map(sanitizePromptValue)
      .filter(Boolean);
    const timeLimit = parsed.data.maxPreparationTimeMinutes;

    const userPrompt = [
      "=== งาน (TASK) ===",
      `วัตถุดิบที่มีอยู่: ${ingredients.join(", ")}`,
      `อาหารที่แพ้ / ห้ามทาน: ${allergies.length ? allergies.join(", ") : "ไม่มี"}`,
      `เวลาทำอาหารสูงสุด: ${timeLimit ? `${timeLimit} นาที` : "ไม่จำกัด"}`,
      "",
      "จงสร้าง 3 สูตรอาหารไทยที่ทำได้จริงจากวัตถุดิบนี้ โดย:",
      "1. ใช้เฉพาะวัตถุดิบที่ระบุ (ห้ามเพิ่มเนื้อสัตว์/ผัก/แป้งชนิดใหม่)",
      "2. ระบุ ingredientsUsed พร้อมปริมาณตัวเลข + หน่วยของทุกอย่าง",
      "3. ระบุ missingIngredients เฉพาะเครื่องปรุงพื้นฐานที่ยังขาด (ถ้าไม่ขาดให้คืน [])",
      "4. instructions อย่างน้อย 3 ขั้นตอน ละเอียดพอที่จะทำตามได้ในครัวบ้าน",
      "5. ถ้ามีเวลา/ข้อจำกัดการแพ้ ให้ปฏิบัติตามอย่างเคร่งครัด",
    ].join("\n");

    const t0 = Date.now();

    const { object: typed, model: modelName } = await generateObjectWithFallback({
      step: STEP,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      schema: autoRecipeOutputSchema,
    });
    const t1 = Date.now();

    console.info(`${STEP} AI OK in ${t1 - t0}ms recipes=${typed.recipes.length}`);

    const afterQuota = await consumeQuota(email);
    if (!afterQuota.ok) {
      console.warn(`${STEP} Race condition: pre-check passed but consume failed for ${email}`);
      return NextResponse.json(
        {
          error: "โควต้าถูกใช้ไปพร้อมกันในคำขออื่นแล้ว กรุณาลองใหม่ในวันพรุ่งนี้",
          quota: afterQuota.quota,
        },
        { status: 429 },
      );
    }

    return NextResponse.json(
      {
        ...typed,
        _meta: {
          remaining: afterQuota.remaining,
          date: afterQuota.quota.date,
          latencyMs: t1 - t0,
          model: `google/${modelName} (direct via @ai-sdk/google)`,
        },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    if (isSupabaseConfigError(error)) {
      console.error(`${STEP} Supabase is not configured`);
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`${STEP} Unhandled error:`, msg, error);
    return NextResponse.json(
      {
        error: "ไม่สามารถสร้างเมนูจากวัตถุดิบได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง (AI generation error)",
        detail: process.env.NODE_ENV === "development" ? msg : undefined,
      },
      { status: 500 },
    );
  }
}
