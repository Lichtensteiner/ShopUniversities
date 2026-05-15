import { GoogleGenAI } from "@google/genai";

export interface AIRequest {
  model?: string;
  contents: any;
  config?: any;
}

// Lazy initialization of GoogleGenAI
let genAI: GoogleGenAI | null = null;

const getGenAI = () => {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("L'Assistant IA n'est pas encore configuré. Si vous utilisez un navigateur, assurez-vous d'avoir configuré votre clé API Gemini.");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
};

export const generateAIContent = async (request: AIRequest): Promise<{ text: string }> => {
  try {
    const client = getGenAI();
    
    // Normalize contents for the SDK
    const contents = normalizeContents(request.contents);
    
    // Always use the recommended model if none specified, or if a prohibited one is specified
    let modelName = request.model || "gemini-3-flash-preview";
    if (modelName === "gemini-1.5-flash" || modelName === "gemini-1.5-pro" || modelName === "gemini-pro") {
      modelName = "gemini-3-flash-preview";
    }

    const response = await client.models.generateContent({
      model: modelName,
      contents,
      config: request.config
    });

    if (!response.text) {
      throw new Error("L'IA a retourné une réponse vide.");
    }

    return { text: response.text };
  } catch (error: any) {
    console.error("AI Service Error:", error);
    
    // Handle specific API key errors with helpful messages as per skill guidelines
    if (error.message?.includes("API_KEY_INVALID") || error.message?.includes("400")) {
      throw new Error("Clé API Gemini invalide. Veuillez vérifier votre configuration dans Paramètres > Secrets.");
    }
    
    if (error.message?.includes("PERMISSION_DENIED") || error.message?.includes("403")) {
      throw new Error("Accès refusé. Veuillez vérifier les permissions de votre clé API Gemini dans Paramètres > Secrets.");
    }

    if (error.message?.includes("RESOURCE_EXHAUSTED") || error.message?.includes("429")) {
      throw new Error("Quota épuisé. Si vous utilisez le compte gratuit, essayez d'attendre un peu ou configurez une clé API avec facturation dans Paramètres > Secrets.");
    }

    throw new Error(error.message || "Erreur lors de la génération avec l'IA");
  }
};

// Helper to normalize contents for Gemini
function normalizeContents(contents: any) {
  if (Array.isArray(contents)) return contents;
  if (contents && contents.contents) {
    return Array.isArray(contents.contents) ? contents.contents : [contents.contents];
  }
  if (contents && contents.parts) {
    return [{ parts: contents.parts }];
  }
  return [contents];
}
