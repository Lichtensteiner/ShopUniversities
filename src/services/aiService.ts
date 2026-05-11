
export interface AIRequest {
  model?: string;
  contents: any;
  config?: any;
}

export const generateAIContent = async (request: AIRequest): Promise<{ text: string }> => {
  try {
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error calling AI API' }));
      throw new Error(errorData.error || `Server returned ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error("AI Service Client Error:", error);
    throw new Error(error.message || "Erreur lors de la communication avec l'IA");
  }
};
