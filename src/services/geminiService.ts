import { GoogleGenAI, Type } from "@google/genai";
import { RepairDecision } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function analyzeBrokenItem(base64Image: string): Promise<RepairDecision> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            text: `Tugas Anda adalah menganalisis barang rumah tangga yang rusak dalam foto ini dan memberikan rekomendasi apakah sebaiknya diperbaiki atau diganti baru. 
            Pertimbangkan faktor-faktor berikut dalam konteks Indonesia:
            1. Perkiraan biaya perbaikan vs harga barang baru di pasar Indonesia.
            2. Keberlanjutan lingkungan (mengurangi limbah).
            3. Tingkat kesulitan perbaikan.
            
            Berikan jawaban dalam format JSON murni dengan struktur berikut:
            {
              "decision": "REPAIR" | "REPLACE" | "UNCERTAIN",
              "confidence": number (0-1),
              "reasoning": string (Penjelasan singkat dalam Bahasa Indonesia),
              "estimatedRepairCost": string (Rentang harga dalam Rupiah, contoh: "Rp 50.000 - Rp 150.000"),
              "estimatedNewCost": string (Rentang harga barang baru dalam Rupiah),
              "difficulty": "EASY" | "MEDIUM" | "HARD",
              "sustainabilityImpact": string (Dampak lingkungan jika diperbaiki)
            }`
          },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image
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
          decision: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          reasoning: { type: Type.STRING },
          estimatedRepairCost: { type: Type.STRING },
          estimatedNewCost: { type: Type.STRING },
          difficulty: { type: Type.STRING },
          sustainabilityImpact: { type: Type.STRING }
        },
        required: ["decision", "confidence", "reasoning", "estimatedRepairCost", "estimatedNewCost", "difficulty", "sustainabilityImpact"]
      }
    }
  });

  return JSON.parse(response.text || '{}') as RepairDecision;
}
