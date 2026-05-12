import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from "@google/genai";
import { generateWithRetry, GenAIQuotaError } from '@/src/lib/genai';
import { requireAuthedUser } from '@/src/lib/firebase/api-auth';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function POST(req: Request) {
  const auth = await requireAuthedUser(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { itemName, damageTypes, diyDifficulty } = await req.json();

    const response = await generateWithRetry(ai, {
      model: "gemini-2.5-flash-lite",
      contents: [
        {
          parts: [
            {
              text: `Kamu adalah pakar reparasi. Buat panduan DIY ringkas dalam Bahasa Indonesia.
              Item: ${itemName}
              Kerusakan: ${damageTypes?.join(", ")}
              Tingkat kesulitan: ${diyDifficulty}

              Batasan WAJIB (jangan dilanggar):
              - tools: maksimal 6 item, setiap item maksimal 40 karakter.
              - materials: maksimal 6 item, setiap item maksimal 40 karakter.
              - steps: maksimal 6 langkah.
              - description per langkah: 1-2 kalimat singkat (maks 200 karakter).
              - title per langkah: maks 60 karakter.
              - safetyNotes: maks 250 karakter.
              - youtubeSearchQuery: maks 80 karakter.

              Return HANYA JSON valid sesuai schema.`
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 4096,
        thinkingConfig: { thinkingBudget: 0 },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            estimatedTime: { type: Type.STRING },
            difficulty: { type: Type.STRING, enum: ["Mudah", "Sedang", "Sulit"] },
            tools: { type: Type.ARRAY, items: { type: Type.STRING } },
            materials: { type: Type.ARRAY, items: { type: Type.STRING } },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stepNumber: { type: Type.NUMBER },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  warning: { type: Type.STRING, nullable: true }
                }
              }
            },
            safetyNotes: { type: Type.STRING },
            youtubeSearchQuery: { type: Type.STRING }
          }
        }
      }
    });

    const raw = response.text || '{}';
    try {
      return NextResponse.json(JSON.parse(raw));
    } catch (parseErr) {
      console.error('DIY JSON parse failed. Raw length:', raw.length, parseErr);
      return NextResponse.json(
        { error: 'AI returned malformed guide, coba lagi.', code: 'BAD_JSON' },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('DIY API error:', error);
    if (error instanceof GenAIQuotaError) {
      return NextResponse.json(
        { error: error.message, retryAfterSeconds: error.retryAfterSeconds, code: 'QUOTA_EXHAUSTED' },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: 'Failed to generate DIY guide' }, { status: 500 });
  }
}
