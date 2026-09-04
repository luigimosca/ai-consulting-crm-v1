export interface OutreachParams {
  lead: {
    companyName: string;
    sector?: string;
    city?: string;
    website?: string;
    contactName?: string;
  };
  channel: 'email' | 'whatsapp' | 'call';
}

export interface OutreachMessage {
  channel: 'email' | 'whatsapp' | 'call';
  subject: string;
  body: string;
}

export function generateOutreachMessage({ lead, channel }: OutreachParams): OutreachMessage {
  const name = lead.contactName || 'Titolare';
  const company = lead.companyName;
  const city = lead.city ? ` a ${lead.city}` : '';

  let sectorHook = '';
  let solutionPitch = '';

  switch (lead.sector) {
    case 'horeca_ristoranti':
      sectorHook = `ho notato la vostra attività${city} e volevo complimentarmi per le ottime recensioni.`;
      solutionPitch = `Abbiamo sviluppato un assistente WhatsApp AI per la ristorazione che gestisce prenotazioni dei tavoli h24, risponde alle domande sul menù e invia reminder automatici per azzerare i no-show.`;
      break;
    case 'studi_legali':
      sectorHook = `ho analizzato il vostro posizionamento digitale e l'efficienza degli studi legali moderni.`;
      solutionPitch = `Affianchiamo gli studi con un agente AI per la segreteria intelligente (qualifica prime richieste dei clienti h24) e un assistente documentale RAG per l'analisi e la ricerca istantanea su atti e contratti.`;
      break;
    case 'commercialisti':
      sectorHook = `sappiamo quanto la gestione delle scadenze e le richieste ripetitive dei clienti possano saturare lo studio.`;
      solutionPitch = `Le nostre automazioni AI estraggono automaticamente dati da fatture/documenti e smistano le domande fiscali ricorrenti dei clienti senza farvi perdere tempo.`;
      break;
    case 'horeca_hotel':
      sectorHook = `ho visto la vostra struttura ricettiva${city}.`;
      solutionPitch = `Il nostro Concierge AI multilingua risponde agli ospiti su WhatsApp e Web in 12 lingue, gestisce prenotazioni dirette ed esegue l'upselling di servizi extra senza commissioni OTA.`;
      break;
    case 'ecommerce':
      sectorHook = `ho dato un'occhiata al vostro shop online ${lead.website || ''}.`;
      solutionPitch = `I nostri agenti AI conversazionali aiutano a recuperare fino al 24% dei carrelli abbandonati via WhatsApp e guidano i clienti nella scelta del prodotto ideale come un commesso esperto.`;
      break;
    default:
      sectorHook = `seguo con interesse la crescita di ${company}${city}.`;
      solutionPitch = `Implementiamo soluzioni AI pratiche (Chatbot intelligenti, automazione contatti e CRM) per ridurre il lavoro ripetitivo del vostro team e incrementare le conversioni.`;
  }

  if (channel === 'email') {
    return {
      channel: 'email',
      subject: `Automazione AI & Nuovi Clienti per ${company}`,
      body: `Gentile ${name},\n\n${sectorHook}\n\n${solutionPitch}\n\nUn nostro cliente nello stesso settore ha risparmiato oltre 15 ore a settimana nel primo mese, aumentando al contempo le conversioni.\n\nPossiamo fare una breve call esplorativa di 10 minuti giovedì o venerdì per mostrarle una demo su misura senza alcun impegno?\n\nCordiali saluti,\nTeam AI Agency\nwww.ai-agency.it`
    };
  } else if (channel === 'whatsapp') {
    return {
      channel: 'whatsapp',
      subject: `WhatsApp B2B - ${company}`,
      body: `Ciao ${name}! 👋\n\nTi scrivo da AI Agency. ${sectorHook}\n\n${solutionPitch}\n\nTi andrebbe di vedere una demo di 5 minuti su misura per ${company}? Ti invio volentieri un link di prova se ti fa piacere!`
    };
  } else {
    return {
      channel: 'call',
      subject: `Script Telefonata - ${company}`,
      body: `[SCRIPT CHIAMATA]\n1. Aggancio: "Buongiorno ${name}, sono [Nome] di AI Agency. La disturbo solo 60 secondi."\n2. Hook: "${sectorHook}"\n3. Value Prop: "${solutionPitch}"\n4. Proposta: "La chiamo semplicemente per proporle una dimostrazione dal vivo di 10 minuti su come funziona per ${company}. Martedì mattina o mercoledì pomeriggio le andrebbe meglio?"`
    };
  }
}
