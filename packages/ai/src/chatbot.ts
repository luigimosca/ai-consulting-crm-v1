export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

export interface ChatbotContext {
  step: 'greeting' | 'sector' | 'size_needs' | 'contact_info' | 'completed';
  sector?: string;
  companySize?: string;
  needs?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
}

export interface ChatbotResponse {
  reply: string;
  nextStep: ChatbotContext['step'];
  collectedData: Partial<ChatbotContext>;
  isComplete: boolean;
  quickReplies?: string[];
}

export function handleChatMessage(
  input: string,
  context: ChatbotContext = { step: 'greeting' }
): ChatbotResponse {
  const cleanInput = input.trim();
  const lower = cleanInput.toLowerCase();

  // Global email & phone detector
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
  const phoneRegex = /(\+?[0-9\s-]{8,15})/;
  const emailMatch = cleanInput.match(emailRegex);
  const phoneMatch = cleanInput.match(phoneRegex);

  const detectedEmail = emailMatch ? emailMatch[1] : context.contactEmail;
  const detectedPhone = phoneMatch ? phoneMatch[1].trim() : context.contactPhone;

  // Sector detector
  let detectedSector = context.sector || 'local_services';
  let sectorLabel = 'Attività locale';

  if (lower.includes('ristoran') || lower.includes('horeca') || lower.includes('bar') || lower.includes('pizzeri') || lower.includes('food')) {
    detectedSector = 'horeca_ristoranti';
    sectorLabel = 'Ristorazione & HORECA';
  } else if (lower.includes('legal') || lower.includes('avvocat') || lower.includes('studio') || lower.includes('commercialist') || lower.includes('notai')) {
    detectedSector = lower.includes('commercialist') ? 'commercialisti' : 'studi_legali';
    sectorLabel = 'Studi Professionali';
  } else if (lower.includes('e-com') || lower.includes('ecom') || lower.includes('shop') || lower.includes('vendit') || lower.includes('store')) {
    detectedSector = 'ecommerce';
    sectorLabel = 'E-commerce & Store Online';
  } else if (lower.includes('hotel') || lower.includes('turism') || lower.includes('b&b') || lower.includes('resort') || lower.includes('struttur')) {
    detectedSector = 'horeca_hotel';
    sectorLabel = 'Turismo & Strutture Ricettive';
  }

  // If email is already provided in the input, complete the qualification
  if (emailMatch) {
    let name = cleanInput
      .replace(emailMatch[0], '')
      .replace(phoneMatch ? phoneMatch[0] : '', '')
      .replace(/mi chiamo|sono|referente|dott|avv|titolare/gi, '')
      .replace(/[,;:-]/g, ' ')
      .trim();

    if (!name || name.length < 2) {
      name = context.contactName || 'Referente';
    }

    return {
      reply: `Perfetto ${name}! Ho registrato la tua richiesta di demo per ${sectorLabel}.\n\nUn nostro consulente AI ti contatterà al più presto all'indirizzo ${detectedEmail} per confermare l'orario a te più comodo su Google Meet.\n\nA presto!`,
      nextStep: 'completed',
      collectedData: {
        sector: detectedSector,
        contactName: name,
        contactEmail: detectedEmail,
        contactPhone: detectedPhone,
        notes: context.notes || `Richiesta demo qualificata via Chatbot (${context.needs || 'Consulenza AI'})`,
      },
      isComplete: true,
      quickReplies: [],
    };
  }

  // State machine flow
  const currentStep = context.step || 'sector';

  switch (currentStep) {
    case 'greeting':
    case 'sector': {
      return {
        reply: `Fantastico! Nel settore ${sectorLabel} abbiamo sviluppato soluzioni AI ad alto impatto (risparmio fino a 15 ore a settimana ed eliminazione delle attività ripetitive).\n\nQuante persone compongono il tuo team e qual è la sfida operativa principale che vorresti automatizzare?`,
        nextStep: 'size_needs',
        collectedData: {
          sector: detectedSector,
          notes: `Settore: ${sectorLabel}`,
        },
        isComplete: false,
        quickReplies: [
          '1-5 persone: Gestione contatti & risposte clienti',
          '5-15 persone: Prenotazioni WhatsApp & No-Show',
          '15+ persone: Documenti, Preventivi & CRM',
          'Supporto clienti h24 & Recupero vendite',
        ],
      };
    }

    case 'size_needs': {
      const needs = cleanInput;
      const size = lower.includes('1-5')
        ? '1-5 dipendenti'
        : lower.includes('5-15')
        ? '5-15 dipendenti'
        : lower.includes('15+') || lower.includes('25')
        ? '15+ dipendenti'
        : 'Team operativo';

      return {
        reply: `Ottimo, abbiamo già implementato questo tipo di automazione per realtà simili con risultati immediati (+35% conversioni e risposte istantanee).\n\nPossiamo organizzare una breve demo live personalizzata di 15 minuti senza impegno su Google Meet. Con quale Nome, Email e Telefono possiamo metterti in contatto?`,
        nextStep: 'contact_info',
        collectedData: {
          sector: detectedSector,
          companySize: size,
          needs,
          notes: `${context.notes || ''} | Esigenza: ${needs} | Team: ${size}`,
        },
        isComplete: false,
        quickReplies: [
          'Marco Rossi, marco@azienda.it, 3401234567',
          'info@miazienda.it, tel 02123456',
        ],
      };
    }

    case 'contact_info': {
      let name = cleanInput
        .replace(phoneMatch ? phoneMatch[0] : '', '')
        .replace(/mi chiamo|sono|referente|titolare/gi, '')
        .trim();

      if (!name || name.length < 2) {
        name = 'Referente Azienda';
      }

      const emailFallback = detectedEmail || 'richiesta.demo@azienda.it';

      return {
        reply: `Grazie ${name}! Abbiamo memorizzato i tuoi recapiti per la demo su misura per ${sectorLabel}.\n\nTi invieremo l'invito su ${emailFallback} a breve. Ti auguriamo una buona giornata!`,
        nextStep: 'completed',
        collectedData: {
          sector: detectedSector,
          contactName: name,
          contactEmail: emailFallback,
          contactPhone: detectedPhone,
        },
        isComplete: true,
      };
    }

    case 'completed':
    default: {
      return {
        reply: "La tua richiesta di demo è già registrata con successo nel nostro CRM! Se hai altre domande specifiche o vuoi parlarci subito, puoi scriverci direttamente a info@ai-agency.it.",
        nextStep: 'completed',
        collectedData: {},
        isComplete: true,
      };
    }
  }
}
