import type { GoogleGenAI } from "@google/genai";

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 800;

const FALLBACK_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash",
];

export async function generateWithRetry(
  ai: GoogleGenAI,
  params: Parameters<GoogleGenAI["models"]["generateContent"]>[0]
) {
  const primary = params.model;
  const models = [primary, ...FALLBACK_MODELS.filter((m) => m !== primary)];

  let lastErr: any;
  for (const model of models) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await ai.models.generateContent({ ...params, model });
      } catch (err: any) {
        lastErr = err;
        const status = err?.status ?? err?.code;
        const isRetryable = RETRYABLE_STATUS.has(status);
        const isQuotaExhausted = status === 429;

        if (!isRetryable) throw err;
        if (isQuotaExhausted) break;
        if (attempt === MAX_ATTEMPTS) break;

        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}
