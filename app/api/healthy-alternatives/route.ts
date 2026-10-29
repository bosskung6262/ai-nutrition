import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateObjectWithFallback } from "@/lib/ai";
import { sanitizePromptValue } from "@/lib/prompt";
import { consumeQuota, getQuota, isSupabaseConfigError } from "@/lib/supabase/data";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { healthyAltInputSchema, healthyAltOutputSchema } from "@/types/healthy-alt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are a WORLD-CLASS THAI CHEF and a CLINICAL NUTRITIONIST.
A user names a Thai dish they are craving (often high-calorie / high-sodium street food).
Your job is to design a HEALTHIER HOME-COOKED ALTERNATIVE that keeps the same flavor
identity but cuts calories and sodium — and to explain the swap clinically.

=== METHOD ===
1. Identify the original dish, its realistic per-serving calories, and its sodium level (ต่ำ / ปานกลาง / สูง).
2. Re-engineer it: swap the worst offenders (fatty cuts, coconut milk, deep-frying, sugary/ salty sauces)
   for lean protein, more vegetables, steaming/grilling/air-frying, and low-sodium seasoning.
3. Keep it recognizably the same dish — a Thai home cook must be able to make it.

=== HARD RULES ===
• The alternative MUST have strictly fewer calories and less sodium than the original.
• calorieReductionPct = round(((original.estimatedCalories - alternative.calories) / original.estimatedCalories) * 100).
• ingredientSubstitutions: 2-5 entries, each written as "ของเดิม → ของใหม่" in Thai.
• keyBenefits: 2-4 short Thai phrases naming the concrete health win (e.g. "ไขมันอิ่มตัวลดลง", "โซเดียมต่ำลงเหมาะกับโรคความดัน").
• Every string in the JSON MUST be in THAI, except numbers.
• Return ONLY a raw, valid, parseable JSON object matching the schema — no markdown, no code fences, no commentary.`;

export async function POST(req: Request) {
  const STEP = "[POST /api/healthy-alternatives]";
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "คำขอไม่ถูกต้อง (body ต้องเป็น JSON)" }, { status: 400 });
    }

    const parsed = healthyAltInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "กรุณาระบุชื่อเมนูที่อยากกิน (1-60 ตัวอักษร)" },
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

    const craving = sanitizePromptValue(parsed.data.craving);
    const userPrompt = [
      "=== งาน (TASK) ===",
      `ผู้ใช้กำลังอยากกิน: ${craving}`,
      "",
      "จงสร้างเมนูทางเลือกเพื่อสุขภาพที่ดีกว่าสำหรับเมนูนี้ โดย:",
      "1. original: ระบุชื่อเมนูเดิม (ไทย), แคลอรีต่อ 1 ที่ (kcal), และระดับโซเดียม (ต่ำ/ปานกลาง/สูง)",
      "2. healthyAlternative: ชื่อเมนูใหม่ที่ยังคงเอกลักษณ์รสชาติเดิม, แคลอรีที่ลดลง, โซเดียม (มก.),",
      '   ingredientSubstitutions (รูปแบบ "ของเดิม → ของใหม่"), และวิธีทำที่ดีต่อสุขภาพ',
      "3. comparison: เปอร์เซ็นต์แคลอรีที่ลดลง และประโยชน์ต่อสุขภาพแบบสั้น ๆ",
      "เมนูทางเลือกต้องมีแคลอรีและโซเดียมน้อยกว่าเมนูเดิมเสมอ",
    ].join("\n");

    const t0 = Date.now();

    const { object: typed, model: modelName } = await generateObjectWithFallback({
      step: STEP,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      schema: healthyAltOutputSchema,
    });
    const t1 = Date.now();

    console.info(`${STEP} AI OK in ${t1 - t0}ms craving=${craving}`);

    const afterQuota = await consumeQuota(email);
    if (!afterQuota.ok) {
      console.warn(`${STEP} Race condition: pre-check passed but consume failed for ${email}`);
      return NextResponse.json(
        { error: "โควต้าถูกใช้ไปพร้อมกันในคำขออื่นแล้ว กรุณาลองใหม่ในวันพรุ่งนี้", quota: afterQuota.quota },
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
        error: "ไม่สามารถสร้างเมนูทางเลือกได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง (AI generation error)",
        detail: process.env.NODE_ENV === "development" ? msg : undefined,
      },
      { status: 500 },
    );
  }
}
