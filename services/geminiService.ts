import { GoogleGenAI } from "@google/genai";
import { MindMapData } from "../types";
interface ImportMetaEnv {
  readonly GEMINI_API_KEY: string;
  // 在这里添加其他环境变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
const ai = new GoogleGenAI({ apiKey: import.meta.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `
You are an expert at structuring disorganized spoken thoughts into clear, logical, hierarchical mind maps.
Your goal is to extract entities, actions, and relationships from the audio transcript and organize them into a strict JSON tree structure.

Rules:
1. Identify the main topic as the root node.
2. Group related concepts into branches.
3. Keep labels concise (2-5 words).
4. Add 'details' if there is specific extra info (dates, prices, specific items).
5. Assign a 'category' to each node from these options: 'idea' (general concept), 'task' (action item), 'question' (uncertainty), 'fact' (statement).
6. Assign a unique string ID to every node.
7. Return ONLY the JSON object.
`;

export const generateMindMapFromAudio = async (audioBlob: Blob): Promise<MindMapData> => {
  try {
    const base64Audio = await blobToBase64(audioBlob);

    // Using gemini-3-pro-preview for advanced reasoning (thinking) capabilities
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'audio/mp3', 
              data: base64Audio
            }
          },
          {
            text: "Listen to this audio. Structurally organize these thoughts into a Mind Map JSON with a 'root' object containing 'id', 'label', 'details', 'category', and 'children' array."
          }
        ]
      },
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        thinkingConfig: {
          thinkingBudget: 32768 
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No text response from Gemini");

    const parsedData = JSON.parse(jsonText) as MindMapData;
    
    // Basic validation
    if (!parsedData.root) {
      throw new Error("Invalid JSON structure: missing root");
    }

    // Recursively add timestamps if missing
    const augmentNode = (node: any) => {
      if (!node.createdAt) node.createdAt = Date.now();
      if (node.children) node.children.forEach(augmentNode);
    };
    augmentNode(parsedData.root);

    return parsedData;

  } catch (error) {
    console.error("Gemini processing error:", error);
    throw error;
  }
};

// --- Grounding Services ---

export interface EnrichmentResult {
  text: string;
  links: { title: string; url: string }[];
}

export const enrichWithGoogleSearch = async (query: string): Promise<EnrichmentResult> => {
  try {
    // gemini-3-flash-preview allows googleSearch tool
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Search for "${query}". Provide a 1-sentence summary of key facts.`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "";
    // Extract grounding URLs
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const links = chunks
      .filter((c: any) => c.web?.uri)
      .map((c: any) => ({ title: c.web.title || 'Source', url: c.web.uri }));

    return { text, links };
  } catch (e) {
    console.error("Search Grounding Error", e);
    throw e;
  }
};

export const enrichWithGoogleMaps = async (query: string, userLocation?: { lat: number, lng: number }): Promise<EnrichmentResult> => {
  try {
    // gemini-2.5-flash allows googleMaps tool
    const config: any = {
      tools: [{ googleMaps: {} }]
    };

    if (userLocation) {
        config.toolConfig = {
            retrievalConfig: {
                latLng: {
                    latitude: userLocation.lat,
                    longitude: userLocation.lng
                }
            }
        };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Find "${query}". Provide the address, rating, and a brief review snippet if available.`,
      config: config
    });

    const text = response.text || "";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    // Maps grounding chunks structure
    const links: { title: string; url: string }[] = [];
    chunks.forEach((c: any) => {
        if (c.maps?.uri) {
            links.push({ title: c.maps.title || 'Google Maps', url: c.maps.uri });
        }
    });

    return { text, links };
  } catch (e) {
    console.error("Maps Grounding Error", e);
    throw e;
  }
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64data = reader.result as string;
      const base64Content = base64data.split(',')[1];
      resolve(base64Content);
    };
    reader.onerror = reject;
  });
};