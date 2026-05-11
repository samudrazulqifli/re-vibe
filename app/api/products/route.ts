import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function POST(req: Request) {
  try {
    const { itemName, itemCategory, priceMin, priceMax } = await req.json();

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          parts: [
            {
              text: `Generate optimized e-commerce search queries for finding a replacement product.
              Item: ${itemName}
              Category: ${itemCategory}
              Budget: Rp ${priceMin} - Rp ${priceMax}
              
              Return ONLY valid JSON:
              {
                "productQuery": "query produk yang spesifik dan tepat",
                "tokopediaUrl": "https://www.tokopedia.com/search?st=product&q={encoded_query}&price_min=${priceMin}&price_max=${priceMax}",
                "shopeeUrl": "https://shopee.co.id/search?keyword={encoded_query}",
                "lazadaUrl": "https://www.lazada.co.id/catalog/?q={encoded_query}",
                "blibliUrl": "https://www.blibli.com/jual/{encoded_query}",
                "productSuggestions": [
                  {
                    "name": "nama produk yang direkomendasikan",
                    "estimatedPrice": "Rp xxx.xxx – Rp xxx.xxx",
                    "brand": "merek yang bagus untuk kategori ini",
                    "reason": "alasan kenapa produk ini cocok"
                  }
                ]
              }
              
              Note: Replace {encoded_query} in URLs with a URL-safe encoded version of the productQuery you generate.`
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            productQuery: { type: Type.STRING },
            tokopediaUrl: { type: Type.STRING },
            shopeeUrl: { type: Type.STRING },
            lazadaUrl: { type: Type.STRING },
            blibliUrl: { type: Type.STRING },
            productSuggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  estimatedPrice: { type: Type.STRING },
                  brand: { type: Type.STRING },
                  reason: { type: Type.STRING }
                },
                required: ["name", "estimatedPrice", "brand", "reason"]
              }
            }
          },
          required: ["productQuery", "tokopediaUrl", "shopeeUrl", "lazadaUrl", "blibliUrl", "productSuggestions"]
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    
    // Server-side secondary safety: ensure encoded queries are actually encoded
    const encoded = encodeURIComponent(data.productQuery);
    data.tokopediaUrl = data.tokopediaUrl.replace('{encoded_query}', encoded);
    data.shopeeUrl = data.shopeeUrl.replace('{encoded_query}', encoded);
    data.lazadaUrl = data.lazadaUrl.replace('{encoded_query}', encoded);
    data.blibliUrl = data.blibliUrl.replace('{encoded_query}', encoded);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json({ error: 'Failed to generate product queries' }, { status: 500 });
  }
}
