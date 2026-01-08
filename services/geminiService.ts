import { GoogleGenAI, Type } from "@google/genai";
import { Item, Match } from '../types';
import { api } from './db';

// NOTE: In a real production app, this call would happen on a Backend (Cloud Functions).
// For this frontend-only demo, we call it directly.

// Initialize the Gemini API client only if API key is available
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const findPotentialMatches = async (foundItem: Item): Promise<Partial<Match>[]> => {
  if (!import.meta.env.VITE_GEMINI_API_KEY || !ai) {
    console.warn("Gemini API Key missing. Returning mock matches.");
    return [];
  }

  // 1. Fetch potential lost items (e.g., same category, recent)
  // In a real app, use geospatial queries first.
  const allLostItems = await api.items.getLostItems();
  const candidates = allLostItems.filter(i =>
    i.category === foundItem.category && i.status === 'lost'
  );

  if (candidates.length === 0) return [];

  // 2. Construct the prompt
  // We'll send a JSON summary of lost items + the found item description/image
  const candidateSummaries = candidates.map(c => ({
    id: c.id,
    title: c.title,
    description: c.description,
    color: c.description.match(/color|red|blue|green|black|white/i)?.[0] || 'unknown',
    location: c.location
  }));

  const systemInstruction = `
    You are an expert Lost & Found Matcher AI.
    Your task is to compare a "Found Item" against a list of "Lost Item Candidates".
    
    Rules:
    1. Analyze semantic similarity in description, category, and visual details if provided.
    2. Location proximity is important but handled partly by pre-filtering. Focus on item details.
    3. Return a JSON list of matches with a confidence score (0-100).
    4. Only return matches with confidence > 60.
    5. Be strict. A "Red iPhone" does not match a "Blue Samsung".
  `;

  const prompt = `
    FOUND ITEM DETAILS:
    Title: Found ${foundItem.category}
    Description: ${foundItem.description}
    Time Found: ${new Date(foundItem.timestamp).toISOString()}
    
    CANDIDATE LOST ITEMS:
    ${JSON.stringify(candidateSummaries, null, 2)}
    
    Respond with JSON schema:
    [ { "lostItemId": "string", "confidence": number, "reason": "string" } ]
  `;

  try {
    const parts: any[] = [{ text: prompt }];

    // Add image if available
    if (foundItem.image) {
      // Assuming image is base64 data URL
      const base64Data = foundItem.image.split(',')[1];
      if (base64Data) {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Data
          }
        });
      }
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-latest',
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              lostItemId: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              reason: { type: Type.STRING }
            }
          }
        }
      }
    });

    const matchesData = JSON.parse(response.text || '[]');

    return matchesData.map((m: any) => ({
      lostItemId: m.lostItemId,
      foundItemId: foundItem.id,
      confidence: m.confidence,
    }));

  } catch (error) {
    console.error("Gemini matching error:", error);
    return [];
  }
};