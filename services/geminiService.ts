import { MindMapData } from "../types";

const BACKEND_URL = 'https://bananaboom-api-242273127238.asia-east1.run.app/api/voice2map';

export const generateMindMapFromAudio = async (audioBlob: Blob, token: string): Promise<MindMapData> => {
  try {
    const base64Audio = await blobToBase64(audioBlob);

    const response = await fetch(`${BACKEND_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ audioBase64: base64Audio })
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.msg || 'AI model failed to process audio.');
    }

    if (!result.success || !result.data) {
      throw new Error("Invalid response from server");
    }

    return result.data;

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

export const enrichWithGoogleSearch = async (query: string, token: string): Promise<EnrichmentResult> => {
  try {
    const response = await fetch(`${BACKEND_URL}/enrich-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ query })
    });

    const result = await response.json();
    
    if (!response.ok) {
        throw new Error(result.msg || 'Search enrichment failed.');
    }

    return result.data;
  } catch (e) {
    console.error("Search Grounding Error", e);
    throw e;
  }
};

export const enrichWithGoogleMaps = async (query: string, token: string, userLocation?: { lat: number, lng: number }): Promise<EnrichmentResult> => {
  try {
    const response = await fetch(`${BACKEND_URL}/enrich-maps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ query, userLocation })
    });

    const result = await response.json();
    
    if (!response.ok) {
        throw new Error(result.msg || 'Maps enrichment failed.');
    }

    return result.data;
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