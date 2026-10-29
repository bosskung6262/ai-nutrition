import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateObjectWithFallback } from "@/lib/ai";
import { sanitizePromptValue } from "@/lib/prompt";
import { consumeQuota, getDb, getQuota, isSupabaseConfigError, stableUserId } from "@/lib/supabase/data";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { smartSwapInputSchema, smartSwapOutputSchema, type SwapGoal } from "@/types/smart-swap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Thai label per goal — the prompt and the echoed `goal` field both use it. */
const GOAL_LABEL: Record<SwapGoal, string> = {
  lower_calorie: "ลดแคลอรี",
  lower_sodium: "ลดโซเดียม",
  higher_protein: "เพิ่มโปรตีน",
  vegan: "ทำเป็นวีแกน (ไม่มีผลิตภัณฑ์จากสัตว์)",
};

const GOAL_RULE: Record<SwapGoal, string> = {
  lower_calorie:
    "Choose replacements with fewer calories (lean protein, more vegetables, no deep-frying). nutritionDelta.calorieDiff MUST be negative.",
  lower_sodium:
    "Choose low-sodium replacements (fresh herbs, low-sodium soy/fish sauce, no processed or preserved meats).",
  higher_protein:
    "Choose protein-dense replacements (lean meat, egg, tofu, legumes). nutritionDelta.proteinDiff MUST be positive.",
  vegan:
    "Replace EVERY animal product with a plant-based equivalent, including condiments (plant fish-sauce alternatives, coconut aminos).",
};

const SYSTEM_PROMPT = `You are a WORLD-CLASS THAI CHEF and a CLINICAL NUTRITIONIST.
A user names a Thai dish (or a single ingredient) and a nutrition goal. Explain the swaps that reach it.

=== METHOD ===
1. Identify the item and its realistic per-serving nutrition.
2. Give 2-5 ingredient-level substitutions that reach the stated goal.
3. Report the net nutrition change of ALL swaps combined.

=== HARD RULES ===
• Every substitution MUST serve the requested goal — never suggest a swap that works against it.
• ratio is the swap ratio (e.g. "1:1", "1 ถ้วยแทน 2 ช้อนโต๊ะ") so a home cook can measure it.
• calorieImpactPct is the change from THAT single swap in percent (0 = no change, negative = fewer).
• nutritionDelta is the sum of every substitution, in kcal / grams. Keep its sign consistent with the goal.
• instructions: 4-6 short Thai steps for cooking the dish WITH the swapped ingredients applied, so the
  cook never has to read the substitutions again. Never mention the original ingredients.
• reason: one short Thai phrase naming the concrete benefit.
• Every string in the JSON MUST be in THAI, except numbers, units and ratios.
• Return ONLY a raw, valid, parseable JSON object matching the schema — no markdown, no code fences, no commentary.`;

/**
 * The caller's saved health profile: NCD conditions (`health_conditions`) and
 * food allergies / avoid-list (`allergies`). `profiles` is keyed by uuid and
 * stores no email, so we look it up by the derived `stableUserId()`. A missing
 * row is not an error — the swap still runs with whatever the user typed for
 * this meal.
 */
async function loadProfileConstraints(
  email: string,
): Promise<{ healthTags: string[]; avoidTags: string[] }> {
  const { data, error } = await getDb()
    .from("profiles")
    .select("health_conditions, allergies")
    .eq("id", await stableUserId(email))
    .maybeSingle();
  if (error) {
    console.warn("[POST /api/smart-swap] Profile lookup failed:", error.message);
    return { healthTags: [], avoidTags: [] };
  }
  const row = (data ?? {}) as {
    health_conditions?: string[] | null;
    allergies?: string[] | null;
  };
  const clean = (tags: string[] | null | undefined) =>
    (tags ?? []).map(sanitizePromptValue).filter(Boolean);
  return { healthTags: clean(row.health_conditions), avoidTags: clean(row.allergies) };
}

export async function POST(req: Request) {
  const STEP = "[POST /api/smart-swap]";
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "คำขอไม่ถูกต้อง (body ต้องเป็น JSON)" }, { status: 400 });
    }

    const parsed = smartSwapInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "กรุณาระบุเมนู/วัตถุดิบ (1-120 ตัวอักษร) และเลือกเป้าหมายการปรับสูตรให้ถูกต้อง" },
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

    const target = sanitizePromptValue(parsed.data.targetRecipeOrIngredient);
    const goal = parsed.data.swapGoal;
    const extraRestrictions = parsed.data.additionalRestrictions
      ? sanitizePromptValue(parsed.data.additionalRestrictions)
      : "";

    // Fold the saved health profile (NCD conditions + allergies) together with
    // this meal's optional extra restrictions into the system prompt.
    const { healthTags, avoidTags } = await loadProfileConstraints(email);
    const constraints = [
      healthTags.length ? `โรคประจำตัว (NCD): ${healthTags.join(", ")}` : "",
      avoidTags.length ? `อาหารที่แพ้ / ห้ามทานอย่างเด็ดขาด: ${avoidTags.join(", ")}` : "",
      extraRestrictions ? `ข้อจำกัดเพิ่มเติมสำหรับมื้อนี้: ${extraRestrictions}` : "",
    ].filter(Boolean);

    const systemPrompt = constraints.length
      ? `${SYSTEM_PROMPT}

=== ข้อจำกัดเฉพาะผู้ใช้ (HARD CONSTRAINTS — ห้ามละเมิด) ===
${constraints.map((line) => `• ${line}`).join("\n")}
• ทุกข้อเสนอต้องไม่ขัดกับข้อจำกัดข้างต้นโดยเด็ดขาด หากข้อจำกัดขัดกับเป้าหมาย ให้เลือกวิธีอื่นที่ยังถึงเป้าหมายได้โดยไม่ละเมิดข้อจำกัด และอธิบายเหตุผลสั้น ๆ ใน reason`
      : SYSTEM_PROMPT;

    const userPrompt = [
      "=== งาน (TASK) ===",
      `เมนู/วัตถุดิบเป้าหมาย: ${target}`,
      `เป้าหมายการปรับสูตร: ${GOAL_LABEL[goal]} (${goal})`,
      "",
      "จงเสนอการเปลี่ยนส่วนผสมที่ทำให้ถึงเป้าหมายนี้ โดย:",
      `1. ${GOAL_RULE[goal]}`,
      '2. suggestedSubstitutions: 2-5 รายการ แต่ละรายการคือ "ของเดิม → ของใหม่" พร้อมอัตราส่วนที่ตวงได้จริง',
      "3. calorieImpactPct ของแต่ละรายการ เป็น % ของแคลอรีที่เปลี่ยนจากรายการนั้น",
      "4. nutritionDelta: ผลรวมการเปลี่ยนแปลงแคลอรี/โปรตีน/คาร์บ/ไขมันของการเปลี่ยนทั้งหมด (kcal และ กรัม)",
      "5. instructions: ขั้นตอนทำอาหาร 4-6 ข้อ โดยใช้ส่วนผสมที่เปลี่ยนแล้ว (ห้ามพูดถึงของเดิม) เพื่อให้ทำตามได้ทันที",
      `6. originalItem = "${target}" และ goal = "${GOAL_LABEL[goal]}"`,
    ].join("\n");

    const t0 = Date.now();

    const { object: typed, model: modelName } = await generateObjectWithFallback({
      step: STEP,
      system: systemPrompt,
      prompt: userPrompt,
      schema: smartSwapOutputSchema,
    });
    const t1 = Date.now();

    console.info(
      `${STEP} AI OK in ${t1 - t0}ms target=${target} goal=${goal} swaps=${typed.suggestedSubstitutions.length}`,
    );

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
        error: "ไม่สามารถวิเคราะห์การเปลี่ยนส่วนผสมได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง (AI generation error)",
        detail: process.env.NODE_ENV === "development" ? msg : undefined,
      },
      { status: 500 },
    );
  }
}
