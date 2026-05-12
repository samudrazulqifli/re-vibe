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
              text: `You are a practical repair expert. Create a clear DIY repair guide in Bahasa Indonesia for the following:
              Item: ${itemName}
              Damage: ${damageTypes?.join(", ")}
              Difficulty: ${diyDifficulty}

              Return ONLY valid JSON:
              {
                "title": "judul panduan",
                "estimatedTime": "estimasi waktu pengerjaan (misal: 30-45 menit)",
                "difficulty": "Mudah | Sedang | Sulit",
                "tools": ["list alat yang dibutuhkan"],
                "materials": ["list bahan yang dibutuhkan"],
                "steps": [
                  {
                    "stepNumber": 1,
                    "title": "judul langkah",
                    "description": "instruksi detail",
                    "warning": "peringatan keamanan jika ada, atau null"
                  }
                ],
                "safetyNotes": "catatan keamanan penting",
                "youtubeSearchQuery": "query untuk YouTube search dalam Bahasa Indonesia yang spesifik"
              }`
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
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

    return NextResponse.json(JSON.parse(response.text || '{}'));
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
