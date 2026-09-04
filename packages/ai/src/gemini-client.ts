export interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export interface GeminiChatOptions {
  apiKey?: string;
  model?: string;
  systemInstruction?: string;
  contents: GeminiMessage[];
  temperature?: number;
  maxOutputTokens?: number;
}

export async function callGeminiApi({
  apiKey = process.env.GEMINI_API_KEY,
  model = process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  systemInstruction,
  contents,
  temperature = 0.7,
  maxOutputTokens = 1000,
}: GeminiChatOptions): Promise<string> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('GEMINI_API_KEY non configurata o vuota.');
  }

  // Model fallback list
  const candidateModels = [model, 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-pro'];
  const uniqueModels = Array.from(new Set(candidateModels.filter(Boolean)));

  let lastError: Error | null = null;

  for (const currentModel of uniqueModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;

      const payload: any = {
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens,
        },
      };

      if (systemInstruction) {
        payload.systemInstruction = {
          parts: [{ text: systemInstruction }],
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData?.error?.message || `HTTP ${response.status} ${response.statusText}`;
        throw new Error(`Gemini API Error (${currentModel}): ${errorMsg}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error(`Risposta vuota da Gemini API (${currentModel}).`);
      }

      return text;
    } catch (err: any) {
      lastError = err;
      // If error is 404 model not found, continue to next candidate model
      if (err.message && (err.message.includes('not found') || err.message.includes('404'))) {
        continue;
      }
      // Otherwise rethrow
      throw err;
    }
  }

  throw lastError || new Error('Tutti i modelli Gemini candidati hanno fallito.');
}
