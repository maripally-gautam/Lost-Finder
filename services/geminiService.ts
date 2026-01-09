import { GoogleGenAI, Type } from "@google/genai";
import { Item, Match } from '../types';
import { api } from './db';

// NOTE: In a real production app, this call would happen on a Backend (Cloud Functions).
// For this frontend-only demo, we call it directly.

// Initialize the Gemini API client only if API key is available
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Helper function to check if Gemini API is configured
const isGeminiConfigured = (): boolean => {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  return !!(key && key !== '' && key !== 'your_gemini_api_key' && ai);
};

// Get all lost items from both localStorage and Firebase
const getAllLostItems = async (): Promise<Item[]> => {
  try {
    const items = await api.items.getLostItems();
    return items.filter(i => i.type === 'lost' && i.status === 'lost');
  } catch (error) {
    console.error('Error fetching lost items:', error);
    const items = JSON.parse(localStorage.getItem('fg_items') || '[]');
    return items.filter((i: Item) => i.type === 'lost' && i.status === 'lost');
  }
};

// Get all found items
const getAllFoundItems = async (): Promise<Item[]> => {
  try {
    const items = await api.items.getFoundItems();
    return items.filter(i => i.type === 'found' && i.status === 'found');
  } catch (error) {
    console.error('Error fetching found items:', error);
    const items = JSON.parse(localStorage.getItem('fg_items') || '[]');
    return items.filter((i: Item) => i.type === 'found' && i.status === 'found');
  }
};

// Extract color mentions from description
const extractColors = (text: string): string[] => {
  const colorPattern = /\b(red|blue|green|black|white|yellow|orange|purple|pink|brown|gray|grey|silver|gold|beige|navy|maroon|teal|cyan|magenta)\b/gi;
  const matches = text.match(colorPattern) || [];
  return [...new Set(matches.map(c => c.toLowerCase()))];
};

// Extract brand mentions from description
const extractBrand = (text: string): string => {
  const brandPattern = /\b(apple|iphone|samsung|galaxy|google|pixel|huawei|xiaomi|oppo|vivo|oneplus|sony|lg|nokia|motorola|dell|hp|lenovo|asus|acer|microsoft|surface|macbook|ipad|airpods|kindle|fitbit|garmin|rolex|casio|seiko|nike|adidas|puma|gucci|louis vuitton|chanel|prada|coach|fossil|rayban|oakley)\b/gi;
  const match = text.match(brandPattern);
  return match ? match[0].toLowerCase() : '';
};

// Extract key properties for comparison
const extractItemProperties = (item: Item) => {
  return {
    id: item.id,
    title: item.title || '',
    description: item.description || '',
    category: item.category || '',
    location: item.location?.address || '',
    image: item.image || null,
    timestamp: item.timestamp,
    colors: extractColors(item.description || ''),
    brand: extractBrand(item.description || ''),
    distinguishingMarks: item.privateDetails?.distinguishingMarks || '',
    contents: item.privateDetails?.contents || '',
    serialNumber: item.privateDetails?.serialNumber || '',
  };
};

// Calculate basic similarity without AI for fallback
const calculateBasicSimilarity = (foundItem: Item, lostItem: Item): number => {
  let score = 0;
  const foundProps = extractItemProperties(foundItem);
  const lostProps = extractItemProperties(lostItem);

  // Category match (30 points)
  if (foundProps.category.toLowerCase() === lostProps.category.toLowerCase()) {
    score += 30;
  }

  // Color match (20 points)
  const commonColors = foundProps.colors.filter(c => lostProps.colors.includes(c));
  if (commonColors.length > 0) {
    score += Math.min(20, commonColors.length * 10);
  }

  // Brand match (20 points)
  if (foundProps.brand && lostProps.brand && foundProps.brand === lostProps.brand) {
    score += 20;
  }

  // Description keyword overlap (20 points)
  const foundWords = new Set(foundProps.description.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const lostWords = new Set(lostProps.description.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const commonWords = [...foundWords].filter(w => lostWords.has(w));
  const overlapRatio = commonWords.length / Math.max(foundWords.size, lostWords.size, 1);
  score += Math.round(overlapRatio * 20);

  // Time proximity bonus (10 points)
  const timeDiff = Math.abs(foundProps.timestamp - lostProps.timestamp);
  const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
  if (daysDiff <= 7) {
    score += Math.round(10 * (1 - daysDiff / 7));
  }

  return Math.min(100, score);
};

// Basic matching fallback when AI is unavailable
const performBasicMatching = (foundItem: Item, candidates: Item[]): Partial<Match>[] => {
  const matches: Partial<Match>[] = [];

  for (const lostItem of candidates) {
    const confidence = calculateBasicSimilarity(foundItem, lostItem);
    if (confidence >= 50) {
      matches.push({
        lostItemId: lostItem.id,
        foundItemId: foundItem.id,
        confidence,
      });
    }
  }

  matches.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  console.log(`Basic matching found ${matches.length} potential matches`);
  return matches;
};

export const findPotentialMatches = async (foundItem: Item): Promise<Partial<Match>[]> => {
  // 1. Fetch all lost items
  const allLostItems = await getAllLostItems();

  // Filter by category first, but include all if no matches
  let candidates = allLostItems.filter(i =>
    i.category === foundItem.category && i.status === 'lost'
  );

  if (candidates.length === 0) {
    candidates = allLostItems.filter(i => i.status === 'lost');
  }

  if (candidates.length === 0) {
    console.log('No lost items found to compare against');
    return [];
  }

  // Use basic matching if Gemini is not configured
  if (!isGeminiConfigured()) {
    console.warn("Gemini API Key missing or invalid. Using basic matching algorithm.");
    return performBasicMatching(foundItem, candidates);
  }

  // 2. Construct detailed prompt for AI matching
  const candidateSummaries = candidates.map(c => {
    const props = extractItemProperties(c);
    return {
      id: c.id,
      title: c.title,
      description: c.description || 'No description provided',
      category: c.category,
      colors: props.colors.length > 0 ? props.colors.join(', ') : 'Not specified',
      brand: props.brand || 'Not specified',
      location: props.location || 'Not specified',
      hasImage: !!c.image,
      distinguishingMarks: props.distinguishingMarks || 'None provided',
      timeLost: new Date(c.timestamp).toLocaleDateString()
    };
  });

  const foundProps = extractItemProperties(foundItem);

  const systemInstruction = `
    You are an expert Lost & Found Matcher AI for a mobile app.
    Your task is to compare a "Found Item" against a list of "Lost Item Candidates".
    
    IMPORTANT MATCHING RULES:
    1. Analyze semantic similarity in description, category, colors, brand, and visual details.
    2. If an item lacks certain properties (like image or detailed description), focus on available properties.
    3. Give higher weight to: exact category matches, color matches, brand/model matches, similar descriptions.
    4. Be flexible with missing data - if a lost item has no image but description matches, still consider it.
    5. Return a JSON list of matches with a confidence score (0-100).
    6. Only return matches with confidence > 50.
    7. Different brands AND colors = no match.
    8. Partial matches are valuable if key properties align.
  `;

  const prompt = `
    FOUND ITEM DETAILS:
    - Title: ${foundItem.title}
    - Category: ${foundItem.category}
    - Description: ${foundItem.description || 'No description provided'}
    - Colors: ${foundProps.colors.length > 0 ? foundProps.colors.join(', ') : 'Not specified'}
    - Brand: ${foundProps.brand || 'Not specified'}
    - Location: ${foundProps.location || 'Not specified'}
    - Has Image: ${!!foundItem.image}
    - Time Found: ${new Date(foundItem.timestamp).toLocaleDateString()}
    
    CANDIDATE LOST ITEMS (Total: ${candidateSummaries.length}):
    ${JSON.stringify(candidateSummaries, null, 2)}
    
    Analyze each lost item and return matches. For items with missing details, focus on what IS available.
    
    Respond with JSON schema:
    [ { "lostItemId": "string", "confidence": number (0-100), "reason": "string explaining the match" } ]
  `;

  try {
    const parts: any[] = [{ text: prompt }];

    // Add found item image if available
    if (foundItem.image) {
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

    const response = await ai!.models.generateContent({
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
    const validMatches = matchesData.filter((m: any) => m.confidence > 50);

    console.log(`AI found ${validMatches.length} potential matches for found item`);

    return validMatches.map((m: any) => ({
      lostItemId: m.lostItemId,
      foundItemId: foundItem.id,
      confidence: m.confidence,
    }));

  } catch (error) {
    console.error("Gemini matching error:", error);
    return performBasicMatching(foundItem, candidates);
  }
};

// Basic matching for lost items (fallback)
const performBasicMatchingForLost = (lostItem: Item, candidates: Item[]): Partial<Match>[] => {
  const matches: Partial<Match>[] = [];

  for (const foundItem of candidates) {
    const confidence = calculateBasicSimilarity(foundItem, lostItem);
    if (confidence >= 50) {
      matches.push({
        lostItemId: lostItem.id,
        foundItemId: foundItem.id,
        confidence,
      });
    }
  }

  matches.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  return matches;
};

// Find potential matches for a LOST item against FOUND items
export const findMatchesForLostItem = async (lostItem: Item): Promise<Partial<Match>[]> => {
  // 1. Fetch all found items
  const allFoundItems = await getAllFoundItems();

  let candidates = allFoundItems.filter(i =>
    i.category === lostItem.category && i.status === 'found'
  );

  if (candidates.length === 0) {
    candidates = allFoundItems.filter(i => i.status === 'found');
  }

  if (candidates.length === 0) {
    console.log('No found items to compare against');
    return [];
  }

  if (!isGeminiConfigured()) {
    console.warn("Gemini API Key missing. Using basic matching algorithm.");
    return performBasicMatchingForLost(lostItem, candidates);
  }

  // 2. Construct the prompt
  const candidateSummaries = candidates.map(c => {
    const props = extractItemProperties(c);
    return {
      id: c.id,
      title: c.title,
      description: c.description || 'No description provided',
      category: c.category,
      colors: props.colors.length > 0 ? props.colors.join(', ') : 'Not specified',
      brand: props.brand || 'Not specified',
      location: props.location || 'Not specified',
      hasImage: !!c.image,
      timeFound: new Date(c.timestamp).toLocaleDateString()
    };
  });

  const lostProps = extractItemProperties(lostItem);

  const systemInstruction = `
    You are an expert Lost & Found Matcher AI.
    Your task is to compare a "Lost Item" against a list of "Found Item Candidates".
    
    IMPORTANT MATCHING RULES:
    1. Analyze semantic similarity in description, category, colors, brand, and visual details.
    2. If an item lacks certain properties, focus on the available properties.
    3. Give higher weight to exact matches in category, color, and brand.
    4. Be flexible with missing data - match on what IS available.
    5. Return a JSON list of matches with a confidence score (0-100).
    6. Only return matches with confidence > 50.
    7. Different brands AND colors = no match.
    8. Partial matches are valuable if key properties align.
  `;

  const prompt = `
    LOST ITEM DETAILS:
    - Title: ${lostItem.title}
    - Category: ${lostItem.category}
    - Description: ${lostItem.description || 'No description provided'}
    - Colors: ${lostProps.colors.length > 0 ? lostProps.colors.join(', ') : 'Not specified'}
    - Brand: ${lostProps.brand || 'Not specified'}
    - Location: ${lostProps.location || 'Not specified'}
    - Has Image: ${!!lostItem.image}
    - Time Lost: ${new Date(lostItem.timestamp).toLocaleDateString()}
    
    CANDIDATE FOUND ITEMS (Total: ${candidateSummaries.length}):
    ${JSON.stringify(candidateSummaries, null, 2)}
    
    Respond with JSON schema:
    [ { "foundItemId": "string", "confidence": number (0-100), "reason": "string explaining the match" } ]
  `;

  try {
    const parts: any[] = [{ text: prompt }];

    if (lostItem.image) {
      const base64Data = lostItem.image.split(',')[1];
      if (base64Data) {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Data
          }
        });
      }
    }

    const response = await ai!.models.generateContent({
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
              foundItemId: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              reason: { type: Type.STRING }
            }
          }
        }
      }
    });

    const matchesData = JSON.parse(response.text || '[]');
    const validMatches = matchesData.filter((m: any) => m.confidence > 50);

    console.log(`AI found ${validMatches.length} potential matches for lost item`);

    return validMatches.map((m: any) => ({
      lostItemId: lostItem.id,
      foundItemId: m.foundItemId,
      confidence: m.confidence,
    }));

  } catch (error) {
    console.error("Gemini matching error:", error);
    return performBasicMatchingForLost(lostItem, candidates);
  }
};