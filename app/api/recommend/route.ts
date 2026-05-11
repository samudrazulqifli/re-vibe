import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from "@google/genai";
import { generateWithRetry, GenAIQuotaError } from '@/src/lib/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function POST(req: Request) {
  try {
    const { itemName, itemCategory, damageTypes, severity, severityScore, userDescription } = await req.json();

    const response = await generateWithRetry(ai, {
      model: "gemini-2.5-flash-lite",
      contents: [
        {
          parts: [
            {
              text: `You are Re-Vibe AI financial advisor for household repairs. Based on the damage information provided, give a repair vs. replace recommendation. Return ONLY valid JSON, no extra text.

              Item: ${itemName}
              Category: ${itemCategory}
              Damage: ${damageTypes?.join(", ")}
              Severity: ${severity} (score: ${severityScore}/10)
              User Context: ${userDescription || "none"}
              
              Use realistic Indonesian market prices (in IDR). 
              General rules of thumb for Indonesian market:
              1. If service cost ratio > 60% of new product price, recommend buying new.
              2. If damage is severe and item is old, recommend buying new.
              3. If DIY is safe and easy (e.g., loose screws, simple cleaning, plug replacement), mention it as primary option.
              4. Provide specific search keywords for Google Maps (for local service centers), E-commerce (for new parts/products), and YouTube (for DIY tutorials).`
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendation: { type: Type.STRING, enum: ["service", "diy", "buy"] },
            primaryReasoning: { type: Type.STRING },
            serviceCostMin: { type: Type.NUMBER },
            serviceCostMax: { type: Type.NUMBER },
            newProductPriceMin: { type: Type.NUMBER },
            newProductPriceMax: { type: Type.NUMBER },
            costRatioPercent: { type: Type.NUMBER },
            diyPossible: { type: Type.BOOLEAN },
            diyDifficulty: { type: Type.STRING, enum: ["mudah", "sedang", "sulit"] },
            searchKeywords: {
              type: Type.OBJECT,
              properties: {
                service: { type: Type.STRING },
                product: { type: Type.STRING },
                diy: { type: Type.STRING }
              },
              required: ["service", "product", "diy"]
            },
            additionalTips: { type: Type.STRING }
          },
          required: [
            "recommendation", 
            "primaryReasoning", 
            "serviceCostMin", 
            "serviceCostMax", 
            "newProductPriceMin", 
            "newProductPriceMax", 
            "costRatioPercent", 
            "diyPossible", 
            "diyDifficulty", 
            "searchKeywords"
          ]
        }
      }
    });

    return NextResponse.json(JSON.parse(response.text || '{}'));
  } catch (error) {
    console.error('Recommend API error:', error);
    if (error instanceof GenAIQuotaError) {
      return NextResponse.json(
        { error: error.message, retryAfterSeconds: error.retryAfterSeconds, code: 'QUOTA_EXHAUSTED' },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: 'Failed to generate recommendation' }, { status: 500 });
  }
}
