
import { GoogleGenAI, Type } from "@google/genai";
import { Coordinates } from "../types";

export const geocodeCities = async (cities: string[]): Promise<Record<string, Coordinates>> => {
  if (cities.length === 0) return {};
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Convert the following city names into geographical coordinates (latitude and longitude): ${cities.join(', ')}.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER }
            },
            required: ["name", "lat", "lng"]
          }
        }
      }
    });

    const results: any[] = JSON.parse(response.text);
    const mapping: Record<string, Coordinates> = {};
    results.forEach(item => {
      mapping[item.name] = item;
    });
    return mapping;
  } catch (error) {
    console.error("Geocoding failed:", error);
    return {};
  }
};
