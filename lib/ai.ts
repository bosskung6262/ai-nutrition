import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import type { z } from "zod";

/**
 * Shared Gemini structured-output call with multi-model fallback.
 *
 * Model IDs die (404 "no longer available") and get throttled (503 "high demand"),
 * so a single hardcoded id makes every AI route brittle. Candidates are tried in
 * order and the first success wins.
 *
 * Fallbacks are verified against this project's API key. `gemini-1.5-*` and
 * `gemini-2.0-*` are NOT included — they are fully retired and always 404.
 */
const FALLBACK_MODELS = [
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
  "gemini-3.8-flash",
  "gemini-flash-latest",
];

/** `GEMINI_MODEL` first, then the fallbacks, without duplicates. */
export function candidateModels(): string[] {
  const configured = (process.env.GEMINI_MODEL ?? "").trim();
  const all = configured ? [configured, ...FALLBACK_MODELS] : [...FALLBACK_MODELS];
  return all.filter((model, index) => all.indexOf(model) === index);
}

type GenerateArgs<T extends z.ZodType> = {
  /** Log prefix, e.g. "[POST /api/smart-swap]". */
  step: string;
  system: string;
  prompt: string;
  schema: T;
};

/**
 * Runs `generateObject` against each candidate model until one succeeds.
 * Throws the last captured error when every candidate fails.
 */
export async function generateObjectWithFallback<T extends z.ZodType>({
  step,
  system,
  prompt,
  schema,
}: GenerateArgs<T>): Promise<{ object: z.infer<T>; model: string }> {
  let lastError: unknown = null;

  for (const modelName of candidateModels()) {
    try {
      const { object } = await generateObject({
        model: google(modelName),
        instructions: system,
        prompt,
        schema,
      });
      return { object: object as z.infer<T>, model: modelName };
    } catch (error: unknown) {
      lastError = error;
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(`${step} Model "${modelName}" failed, trying next candidate: ${reason}`);
    }
  }

  throw lastError ?? new Error("No Gemini model candidates configured");
}
