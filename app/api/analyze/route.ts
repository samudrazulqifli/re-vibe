import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from "@google/genai";
import { generateWithRetry, GenAIQuotaError } from '@/src/lib/genai';
import { requireAuthedUser } from '@/src/lib/firebase/api-auth';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function POST(req: Request) {
  const auth = await requireAuthedUser(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { imageUrl, userDescription } = await req.json();
    
    // Fetch image from URL and convert to base64 for Gemini
    // This handles the GCS public URL returned by /api/upload
    let imageData = "";
    let mimeType = "image/jpeg";

    if (imageUrl) {
      const imgResponse = await fetch(imageUrl);
      const arrayBuffer = await imgResponse.arrayBuffer();
      imageData = Buffer.from(arrayBuffer).toString('base64');
      mimeType = imgResponse.headers.get('content-type') || 'image/jpeg';
    }

    const response = await generateWithRetry(ai, {
      model: "gemini-2.5-flash-lite",
      contents: [
        {
          parts: [
            {
              text: `You are Re-Vibe AI, an expert in diagnosing damage to household items including electronics, furniture, appliances, and other objects. Analyze the provided image and return ONLY a valid JSON response with no extra text.

              Additional context from user: ${userDescription || "none"}

              Return this exact JSON structure:
              {
                "itemName": "nama barang dalam Bahasa Indonesia",
                "itemCategory": "elektronik | furnitur | peralatan_rumah | lainnya",
                "damageTypes": ["list kerusakan yang terdeteksi"],
                "severity": "ringan | sedang | parah",
                "severityScore": 1-10,
                "confidence": 0-100,
                "isRepairable": true,
                "damageDescription": "deskripsi singkat kerusakan dalam Bahasa Indonesia, max 2 kalimat",
                "estimatedAge": "estimasi usia barang berdasarkan kondisi visual"
              }

              Be specific and accurate. If you cannot identify the item or damage clearly, set confidence below 50.`
            },
            {
              inlineData: {
                mimeType,
                data: imageData
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            itemName: { type: Type.STRING },
            itemCategory: { type: Type.STRING, enum: ["elektronik", "furnitur", "peralatan_rumah", "lainnya"] },
            damageTypes: { type: Type.ARRAY, items: { type: Type.STRING } },
            severity: { type: Type.STRING, enum: ["ringan", "sedang", "parah"] },
            severityScore: { type: Type.NUMBER },
            confidence: { type: Type.NUMBER },
            isRepairable: { type: Type.BOOLEAN },
            damageDescription: { type: Type.STRING },
            estimatedAge: { type: Type.STRING }
          },
          required: ["itemName", "itemCategory", "damageTypes", "severity", "severityScore", "confidence", "isRepairable", "damageDescription", "estimatedAge"]
        }
      }
    });

    return NextResponse.json(JSON.parse(response.text || '{}'));
  } catch (error) {
    console.error('Analyze API error:', error);
    if (error instanceof GenAIQuotaError) {
      return NextResponse.json(
        { error: error.message, retryAfterSeconds: error.retryAfterSeconds, code: 'QUOTA_EXHAUSTED' },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: 'Failed to analyze' }, { status: 500 });
  }
}
