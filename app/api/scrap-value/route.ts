import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from "@google/genai";
import { generateWithRetry } from '@/src/lib/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function POST(req: Request) {
  try {
    const { itemName, itemCategory } = await req.json();

    const response = await generateWithRetry(ai, {
      model: "gemini-2.5-flash-lite",
      contents: [
        {
          parts: [
            {
              text: `You are a scrap market expert in Indonesia. Estimate the scrap value and characteristic for this old/broken item.
              Item: ${itemName}
              Category: ${itemCategory}
              
              Return ONLY valid JSON:
              {
                "scrapValueRange": "Rp x.000 – Rp x.000",
                "weightEstimate": "x – x kg",
                "tips": [
                  "tips agar cepat terjual 1",
                  "tips agar cepat terjual 2",
                  "tips agar cepat terjual 3"
                ]
              }
              
              Use realistic Indonesian scrap market prices (Harga pengepul/loak).`
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scrapValueRange: { type: Type.STRING },
            weightEstimate: { type: Type.STRING },
            tips: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["scrapValueRange", "weightEstimate", "tips"]
        }
      }
    });

    return NextResponse.json(JSON.parse(response.text || '{}'));
  } catch (error) {
    console.error('Scrap Value API error:', error);
    return NextResponse.json({ error: 'Failed to generate scrap value estimate' }, { status: 500 });
  }
}
