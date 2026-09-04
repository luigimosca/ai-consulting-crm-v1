import { callGeminiApi, type GeminiMessage } from './gemini-client';
import { handleChatMessage, type ChatbotContext, type ChatbotResponse } from './chatbot';

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface ProcessChatParams {
  sessionId: string;
  message: string;
  history?: ChatHistoryItem[];
  context?: ChatbotContext;
  apiKey?: string;
  useMock?: boolean;
}

export interface ProcessChatResult {
  reply: string;
  quickReplies?: string[];
  collectedData: Partial<ChatbotContext>;
  isComplete: boolean;
  usedModel: 'gemini' | 'mock_fallback';
}

const SYSTEM_PROMPT = `Sei l'Assistente AI e Consulente Senior di "AI Agency Italia" (www.ai-agency.it), agenzia specializzata nello sviluppo di soluzioni AI verticali e automazioni per:
1. Studi Professionali (Avvocati, Notai, Commercialisti, Consulenti) -> Soluzioni: Assistente RAG documentale per interrogare sentenze e atti, Segreteria virtuale AI h24, automazione estrazione fatture/contratti.
2. Ristoranti & HORECA (Ristoranti, Pizzerie, Bar, Bistrot) -> Soluzioni: Assistente WhatsApp h24 per prenotazioni tavoli sincronizzato con gestionale, promemoria anti no-show, risposte intelligenti alle recensioni Google.
3. E-commerce & Retail Digitale -> Soluzioni: Shopping Assistant AI per guidare alla scelta del prodotto, recupero carrelli abbandonati via WhatsApp.
4. Hotel, B&B & Strutture Turistiche -> Soluzioni: Concierge virtuale in 12 lingue su WhatsApp/Web, prenotazioni dirette senza commissioni OTA, upselling tour.

IL TUO OBIETTIVO:
Condurre una conversazione fluida, professionale, calorosa ed empatica in italiano per qualificare il potenziale cliente in MASSIMO 5-7 messaggi, proponendo una demo gratuita dal vivo di 15 minuti su Google Meet.

FLUSSO DI QUALIFICA:
1. Se il settore non è noto, chiedi in quale settore opera l'attività.
2. Chiedi la dimensione indicativa del team/azienda e il principale collo di bottiglia operativo o problema su cui vorrebbero automazione.
3. Presenta brevemente una soluzione AI concreta per il loro caso (es. "risparmio 15h/settimana" o "-80% no-show").
4. Proponi di organizzare una breve demo personalizzata di 15 minuti senza impegno e chiedi: Nome referente, Email aziendale e Numero di Telefono/WhatsApp.
5. Quando l'utente fornisce i contatti, ringrazialo confermando che il team commerciale lo ricontatterà a brevissimo per concordare l'orario.

FORMATO DI RISPOSTA:
Rispondi con un messaggio discorsivo naturale (lunghezza ideale 2-4 frasi, chiaro e accattivante).
Alla FINE ASSOLUTA del messaggio, allega SEMPRE un blocco di metadati nascosto racchiuso esattamente tra <!--LEAD_DATA: e --> con il seguente formato JSON:
<!--LEAD_DATA:{
  "sector": "horeca_ristoranti" | "studi_legali" | "commercialisti" | "horeca_hotel" | "ecommerce" | "local_services" | null,
  "companySize": "1-5 dipendenti" | "5-15 dipendenti" | "15+ dipendenti" | null,
  "needs": string | null,
  "contactName": string | null,
  "contactEmail": string | null,
  "contactPhone": string | null,
  "preferredDate": string | null,
  "isComplete": boolean,
  "quickReplies": string[]
}-->

IMPORTANTE: Se l'utente menziona email (es. nome@dominio.it) o telefono, inseriscili sempre nel JSON e imposta isComplete a true se hai raccolto almeno nome ed email.`;

export async function processChatMessage({
  sessionId,
  message,
  history = [],
  context = { step: 'greeting' },
  apiKey = process.env.GEMINI_API_KEY,
  useMock = process.env.USE_MOCK_CHATBOT === 'true',
}: ProcessChatParams): Promise<ProcessChatResult> {
  // Regex extractions as safety net
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
  const phoneRegex = /(\+?[0-9\s-]{8,15})/;
  const emailMatch = message.match(emailRegex);
  const phoneMatch = message.match(phoneRegex);

  // Check if mock should be used
  if (useMock || !apiKey) {
    const mockResult = handleChatMessage(message, context);
    const updatedData: ChatbotContext = {
      ...context,
      step: mockResult.nextStep,
      ...mockResult.collectedData,
    };
    if (emailMatch && !updatedData.contactEmail) {
      updatedData.contactEmail = emailMatch[1];
    }
    if (phoneMatch && !updatedData.contactPhone) {
      updatedData.contactPhone = phoneMatch[1].trim();
    }

    const isComplete = Boolean(mockResult.isComplete || updatedData.contactEmail);

    return {
      reply: mockResult.reply,
      quickReplies: mockResult.quickReplies,
      collectedData: updatedData,
      isComplete,
      usedModel: 'mock_fallback',
    };
  }

  try {
    // Format history for Gemini contents
    const contents: GeminiMessage[] = [];

    // Add previous history
    for (const h of history) {
      contents.push({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      });
    }

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    // Call Gemini API
    const rawResponse = await callGeminiApi({
      apiKey,
      systemInstruction: SYSTEM_PROMPT,
      contents,
      temperature: 0.65,
    });

    // Parse LEAD_DATA metadata
    let cleanReply = rawResponse;
    let extractedData: Partial<ChatbotContext> = {
      ...context,
    };
    let quickReplies: string[] | undefined = undefined;
    let isComplete = false;

    const metadataRegex = /<!--LEAD_DATA:([\s\S]*?)-->/;
    const match = rawResponse.match(metadataRegex);

    if (match && match[1]) {
      try {
        const parsed = JSON.parse(match[1].trim());
        cleanReply = rawResponse.replace(metadataRegex, '').trim();

        extractedData = {
          ...context,
          sector: parsed.sector || context.sector,
          companySize: parsed.companySize || context.companySize,
          needs: parsed.needs || context.needs,
          contactName: parsed.contactName || context.contactName,
          contactEmail: parsed.contactEmail || context.contactEmail,
          contactPhone: parsed.contactPhone || context.contactPhone,
          notes: parsed.needs ? `Esigenza: ${parsed.needs}` : context.notes,
        };

        if (Array.isArray(parsed.quickReplies) && parsed.quickReplies.length > 0) {
          quickReplies = parsed.quickReplies;
        }

        isComplete = Boolean(parsed.isComplete && extractedData.contactEmail);
      } catch (err) {
        console.error('Failed to parse LEAD_DATA from Gemini output:', err);
      }
    }

    // Safety net extraction
    if (emailMatch && !extractedData.contactEmail) {
      extractedData.contactEmail = emailMatch[1];
      isComplete = true;
    }
    if (phoneMatch && !extractedData.contactPhone) {
      extractedData.contactPhone = phoneMatch[1].trim();
    }

    return {
      reply: cleanReply,
      quickReplies,
      collectedData: extractedData,
      isComplete,
      usedModel: 'gemini',
    };
  } catch (error) {
    const mockResult = handleChatMessage(message, context);
    const updatedData: ChatbotContext = {
      ...context,
      step: mockResult.nextStep,
      ...mockResult.collectedData,
    };
    if (emailMatch && !updatedData.contactEmail) {
      updatedData.contactEmail = emailMatch[1];
    }
    if (phoneMatch && !updatedData.contactPhone) {
      updatedData.contactPhone = phoneMatch[1].trim();
    }

    return {
      reply: mockResult.reply,
      quickReplies: mockResult.quickReplies,
      collectedData: updatedData,
      isComplete: Boolean(mockResult.isComplete || updatedData.contactEmail),
      usedModel: 'mock_fallback',
    };
  }
}
