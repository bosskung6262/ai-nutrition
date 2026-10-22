/**
 * Prompt-injection guard for values interpolated into AI prompts.
 *
 * Strips control characters / newlines and the `=` `•` characters used to fake
 * prompt headings, then caps the length. Shared by every route that embeds
 * user-supplied text into a Gemini prompt.
 */

const MAX_FIELD_LEN = 60;

export function sanitizePromptValue(value: unknown): string {
  return String(value ?? "")
    .replace(/[\r\n\t\u2028\u2029]+/g, " ")
    .replace(/[=•]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, MAX_FIELD_LEN)
    .trim();
}
