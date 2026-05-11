import type { GoogleGenAI } from "@google/genai";

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 800;

const FALLBACK_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-2.5-flash",
  "gemini-flash-latest",
];

export class GenAIQuotaError extends Error {
  retryAfterSeconds?: number;
  constructor(message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "GenAIQuotaError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function parseRetryAfter(err: any): number | undefined {
  const m = String(err?.message || "").match(/Please retry in ([\d.]+)s/);
  return m ? Math.ceil(parseFloat(m[1])) : undefined;
}

export async function generateWithRetry(
  ai: GoogleGenAI,
  params: Parameters<GoogleGenAI["models"]["generateContent"]>[0]
) {
  const primary = params.model;
  const models = [primary, ...FALLBACK_MODELS.filter((m) => m !== primary)];

  let lastErr: any;
  let allQuotaExhausted = true;
  for (const model of models) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await ai.models.generateContent({ ...params, model });
      } catch (err: any) {
        lastErr = err;
        const status = err?.status ?? err?.code;
        const isRetryable = RETRYABLE_STATUS.has(status);
        const isQuotaExhausted = status === 429;

        if (!isQuotaExhausted) allQuotaExhausted = false;
        if (!isRetryable) throw err;
        if (isQuotaExhausted) break;
        if (attempt === MAX_ATTEMPTS) break;

        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  if (allQuotaExhausted) {
    throw new GenAIQuotaError(
      "Kuota Gemini AI untuk semua model penuh, coba lagi beberapa saat.",
      parseRetryAfter(lastErr)
    );
  }
  throw lastErr;
}
