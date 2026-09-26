/**
 * Motore Template Raccolta Materiali, Informazioni e Accessi del Cliente (Client Requests Engine)
 * Modulo per definire richieste standard, validazione anti-credenziali sicure (GDPR),
 * calcolo completezza, anteprima e associazione intelligente ai task operativi di progetto.
 */

export type ClientRequestCategory =
  | 'brand'
  | 'content'
  | 'assets'
  | 'accesses'
  | 'strategy'
  | 'technical'
  | 'general';

export type ClientRequestStatus =
  | 'requested'
  | 'partially_received'
  | 'received'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type ClientRequestPriority = 'low' | 'medium' | 'high' | 'urgent';

export type ClientRequestItemType =
  | 'file'
  | 'text'
  | 'url'
  | 'access_confirmation'
  | 'selection';

export type ClientRequestItemStatus = 'missing' | 'received' | 'approved' | 'rejected';

export interface AccessConfirmationConfig {
  accountService: string; // e.g. "Google Analytics 4", "WordPress", "Hosting Server"
  accessTypeRequired: string; // e.g. "Invito utente", "Delega Partner", "Delega DNS"
  targetEmail: string; // e.g. "tech@ai-consulting.it" o email agenzia
  requiredLevel: string; // e.g. "Amministratore", "Editor", "Gestore"
  status: 'requested' | 'granted' | 'verified';
  verifiedAt?: string | null;
  notes?: string;
}

export interface ClientRequestItemDefinition {
  id: string; // e.g. "item_logo_vector"
  label: string;
  description?: string;
  itemType: ClientRequestItemType;
  required: boolean;
  accessConfig?: AccessConfirmationConfig;
  selectionOptions?: string[];
  targetTaskKeywords?: string[]; // Parole chiave per associare task del progetto
  defaultRelation?: 'blocks' | 'supports';
}

export interface ClientRequestGroupDefinition {
  id: string; // e.g. "req_brand_assets"
  category: ClientRequestCategory;
  title: string;
  description: string;
  priority: ClientRequestPriority;
  blocksTaskCompletion: boolean;
  clientVisible: boolean;
  items: ClientRequestItemDefinition[];
  targetTaskKeywords: string[];
}

export interface ClientRequestCatalogTemplate {
  code: string;
  name: string;
  description: string;
  version: number;
  groups: ClientRequestGroupDefinition[];
}

// ---------------------------------------------------------------------------
// Sicurezza & Anti-Credenziali (GDPR & Best Practice di Sicurezza)
// ---------------------------------------------------------------------------

/**
 * Rileva tentativi di invio di password in chiaro, token segreti o chiavi API private.
 * Obbliga l'utilizzo di deleghe ufficiali di accesso o canali sicuri.
 */
export function validateNoSensitiveCredentials(input?: string | null): {
  isValid: boolean;
  error?: string;
} {
  if (!input) return { isValid: true };

  const clean = input.trim();
  if (!clean) return { isValid: true };

  // Pattern sospetti di credenziali in chiaro
  const sensitivePatterns: Array<{ regex: RegExp; message: string }> = [
    {
      regex: /(?:password|passwd|pwd)\s*[:=]\s*[^\s,;]+/i,
      message: 'Rilevato pattern di password in chiaro. Per sicurezza non inserire password nel form.',
    },
    {
      regex: /(?:secret|api_key|apikey|app_secret|client_secret)\s*[:=]\s*[^\s,;]+/i,
      message: 'Rilevata chiave segreta o token API. Utilizzare le deleghe di accesso ufficiali.',
    },
    {
      regex: /bearer\s+[a-zA-Z0-9_\-\.]{25,}/i,
      message: 'Rilevato Bearer Token di autenticazione.',
    },
    {
      regex: /-----BEGIN (?:RSA )?PRIVATE KEY-----/i,
      message: 'Rilevata chiave crittografica privata.',
    },
  ];

  for (const p of sensitivePatterns) {
    if (p.regex.test(clean)) {
      return {
        isValid: false,
        error: `${p.message} Per motivi di sicurezza e conformità GDPR non è consentito salvare password o token non cifrati nel CRM.`,
      };
    }
  }

  return { isValid: true };
}

// ---------------------------------------------------------------------------
// Template Seed Standard: "Onboarding sito web e marketing"
// ---------------------------------------------------------------------------

export const SEED_ONBOARDING_WEBSITE_MARKETING_TEMPLATE: ClientRequestCatalogTemplate = {
  code: 'ONBOARDING_WEBSITE_MARKETING',
  name: 'Onboarding sito web e marketing',
  description:
    'Raccolta materiali completa per progetti digitali: brand asset, testi e servizi, foto/video, accessi delegati e obiettivi strategici.',
  version: 1,
  groups: [
    // 1. BRAND
    {
      id: 'req_brand',
      category: 'brand',
      title: 'Identità visiva e Brand Asset',
      description:
        'Loghi istituzionali in alta risoluzione, vettoriali, palette colori ufficiale e font per la progettazione grafica del sito web.',
      priority: 'high',
      blocksTaskCompletion: true,
      clientVisible: true,
      targetTaskKeywords: ['wireframe', 'grafica', 'design', 'ui', 'ux', 'concept', 'visual', 'identit'],
      items: [
        {
          id: 'item_logo_vector',
          label: 'Logo vettoriale',
          description: 'File del logo in formato vettoriale (.SVG, .AI, o .EPS) per un rendering nitido su qualsiasi display.',
          itemType: 'file',
          required: true,
          defaultRelation: 'blocks',
          targetTaskKeywords: ['grafica', 'wireframe', 'design', 'ui'],
        },
        {
          id: 'item_logo_png',
          label: 'Logo PNG con sfondo trasparente',
          description: 'Versione ad alta risoluzione (min 1500px) con sfondo trasparente per header e documenti.',
          itemType: 'file',
          required: true,
          defaultRelation: 'blocks',
          targetTaskKeywords: ['grafica', 'wireframe', 'design'],
        },
        {
          id: 'item_palette_colori',
          label: 'Palette colori e codici HEX',
          description: 'Codici colore primari, secondari e di accento (es. #1E40AF, #3B82F6) o linee guida.',
          itemType: 'text',
          required: true,
          defaultRelation: 'blocks',
          targetTaskKeywords: ['grafica', 'design', 'ui'],
        },
        {
          id: 'item_font_manuale_brand',
          label: 'Font e Manuale di Brand (Brand Guidelines)',
          description: 'Font proprietari (.woff2, .ttf) o indicazione di Google Fonts, con eventuale brand book.',
          itemType: 'file',
          required: false,
          defaultRelation: 'supports',
          targetTaskKeywords: ['grafica', 'design'],
        },
        {
          id: 'item_foto_ufficiali',
          label: 'Foto ufficiali del team e della sede',
          description: 'Fotografie professionali del titolare, del team, degli uffici o della produzione in alta qualità.',
          itemType: 'url',
          required: true,
          defaultRelation: 'blocks',
          targetTaskKeywords: ['grafica', 'ui', 'sviluppo'],
        },
      ],
    },

    // 2. CONTENUTI
    {
      id: 'req_contents',
      category: 'content',
      title: 'Contenuti testuali, Servizi e Note legali',
      description:
        'Testi istituzionali, catalogazione servizi, listini prezzi, risposte alle domande frequenti (FAQ) e informative legali.',
      priority: 'high',
      blocksTaskCompletion: true,
      clientVisible: true,
      targetTaskKeywords: ['copywriting', 'testi', 'contenuti', 'copy', 'schede', 'pagine'],
      items: [
        {
          id: 'item_descrizione_azienda',
          label: 'Descrizione azienda (Chi siamo & Mission)',
          description: 'Storia aziendale, valori, punti di forza differenzianti rispetto ai competitor e target servito.',
          itemType: 'text',
          required: true,
          defaultRelation: 'blocks',
          targetTaskKeywords: ['copywriting', 'testi', 'contenuti'],
        },
        {
          id: 'item_servizi_pacchetti',
          label: 'Servizi e pacchetti offerti',
          description: 'Elenco completo e dettagliato di tutti i servizi o prodotti con relative specifiche e benefici per il cliente.',
          itemType: 'text',
          required: true,
          defaultRelation: 'blocks',
          targetTaskKeywords: ['copywriting', 'testi', 'servizi'],
        },
        {
          id: 'item_prezzi_listino',
          label: 'Prezzi e politiche di tariffazione',
          description: 'Listino prezzi al pubblico o modalità di calcolo preventivo (se da esporre sul sito).',
          itemType: 'file',
          required: false,
          defaultRelation: 'supports',
          targetTaskKeywords: ['copywriting', 'testi'],
        },
        {
          id: 'item_faq',
          label: 'FAQ (Domande Frequenti)',
          description: 'Le 5-10 domande più frequenti poste dai vostri clienti con le relative risposte chiare.',
          itemType: 'text',
          required: false,
          defaultRelation: 'supports',
          targetTaskKeywords: ['copywriting', 'testi'],
        },
        {
          id: 'item_contatti_orari',
          label: 'Contatti e orari operativi',
          description: 'Indirizzo completo, recapiti telefonici, email dipartimentali, PEC, orari di apertura e reperibilità.',
          itemType: 'text',
          required: true,
          defaultRelation: 'blocks',
          targetTaskKeywords: ['copywriting', 'sviluppo', 'footer'],
        },
        {
          id: 'item_termini_condizioni',
          label: 'Termini e condizioni del servizio',
          description: 'Documento legale o bozza contrattuale standard applicata ai clienti.',
          itemType: 'file',
          required: false,
          defaultRelation: 'supports',
          targetTaskKeywords: ['copywriting', 'legal', 'compliance'],
        },
        {
          id: 'item_politiche_cancellazione',
          label: 'Politiche di cancellazione o recesso',
          description: 'Condizioni per la cancellazione di prenotazioni, resi o rimborsi.',
          itemType: 'text',
          required: false,
          defaultRelation: 'supports',
          targetTaskKeywords: ['copywriting', 'legal'],
        },
      ],
    },

    // 3. ASSET
    {
      id: 'req_assets',
      category: 'assets',
      title: 'Asset multimediali e Prove sociali',
      description:
        'Foto e video di catalogo, template per social media, testimonianze, recensioni autorizzate e brochure aziendali pregresse.',
      priority: 'medium',
      blocksTaskCompletion: false,
      clientVisible: true,
      targetTaskKeywords: ['asset', 'media', 'galleria', 'multimediali', 'social', 'sviluppo'],
      items: [
        {
          id: 'item_foto_video_catalogo',
          label: 'Foto e video di catalogo/prodotti',
          description: 'Link a Google Drive / Dropbox contenente scatti fotografici e riprese video in alta definizione.',
          itemType: 'url',
          required: true,
          defaultRelation: 'supports',
          targetTaskKeywords: ['sviluppo', 'media', 'galleria'],
        },
        {
          id: 'item_immagini_social',
          label: 'Immagini e template social esistenti',
          description: 'Grafiche Canva, copertine o post social utilizzati recentemente per mantenere coerenza visiva.',
          itemType: 'url',
          required: false,
          defaultRelation: 'supports',
          targetTaskKeywords: ['social', 'marketing'],
        },
        {
          id: 'item_testimonianze',
          label: 'Testimonianze e casi studio autorizzati',
          description: 'Dichiarazioni o storie di successo di clienti soddisfatti con nome, ruolo e logo/foto del cliente.',
          itemType: 'text',
          required: false,
          defaultRelation: 'supports',
          targetTaskKeywords: ['copywriting', 'social'],
        },
        {
          id: 'item_recensioni_autorizzate',
          label: 'Recensioni autorizzate (Google / Trustpilot)',
          description: 'Selezione delle migliori recensioni pubbliche da evidenziare nelle sezioni chiave del sito.',
          itemType: 'text',
          required: false,
          defaultRelation: 'supports',
          targetTaskKeywords: ['copywriting', 'sviluppo'],
        },
        {
          id: 'item_materiali_esistenti',
          label: 'Materiali marketing esistenti (Brochure / Cataloghi)',
          description: 'Brochure PDF, presentazioni PowerPoint o cataloghi prodotti cartacei scansionati.',
          itemType: 'file',
          required: false,
          defaultRelation: 'supports',
          targetTaskKeywords: ['copywriting', 'analisi'],
        },
      ],
    },

    // 4. ACCESSI (Deleghe di accesso ufficiali - MAI PASSWORD!)
    {
      id: 'req_accesses',
      category: 'accesses',
      title: 'Conferma deleghe e accessi tecnici',
      description:
        'Concessione di accessi amministrativi e tecnici tramite invito utente o delega Partner (es. dominio, hosting, GA4, Search Console, Meta).',
      priority: 'urgent',
      blocksTaskCompletion: true,
      clientVisible: true,
      targetTaskKeywords: ['dominio', 'hosting', 'wordpress', 'cms', 'tracciament', 'tracking', 'ga4', 'search console', 'ads', 'meta', 'setup', 'sviluppo'],
      items: [
        {
          id: 'item_acc_dominio',
          label: 'Accesso gestione DNS / Dominio',
          description: 'Delega tecnica su Registrar (Aruba, Register, Siteground, Cloudflare) per puntamento record A/CNAME.',
          itemType: 'access_confirmation',
          required: true,
          accessConfig: {
            accountService: 'Registrar Dominio',
            accessTypeRequired: 'Delega tecnica / Gestione DNS',
            targetEmail: 'tech@ai-consulting.it',
            requiredLevel: 'Gestore DNS',
            status: 'requested',
          },
          defaultRelation: 'blocks',
          targetTaskKeywords: ['sviluppo', 'setup', 'dominio'],
        },
        {
          id: 'item_acc_hosting',
          label: 'Accesso Hosting / Server Cloud',
          description: 'Accesso pannello cPanel / Plesk / Cloud o credenziali SSH/SFTP gestite via chiave pubblica.',
          itemType: 'access_confirmation',
          required: true,
          accessConfig: {
            accountService: 'Hosting Server',
            accessTypeRequired: 'Invito utente o utente FTP dedicato',
            targetEmail: 'tech@ai-consulting.it',
            requiredLevel: 'Amministratore Hosting',
            status: 'requested',
          },
          defaultRelation: 'blocks',
          targetTaskKeywords: ['sviluppo', 'setup', 'hosting'],
        },
        {
          id: 'item_acc_wordpress',
          label: 'Accesso WordPress / CMS esistente',
          description: 'Invito come utente Amministratore sul back-office WordPress attuale per migrazione o restyling.',
          itemType: 'access_confirmation',
          required: false,
          accessConfig: {
            accountService: 'WordPress CMS',
            accessTypeRequired: 'Nuovo utente WordPress',
            targetEmail: 'dev@ai-consulting.it',
            requiredLevel: 'Amministratore',
            status: 'requested',
          },
          defaultRelation: 'blocks',
          targetTaskKeywords: ['sviluppo', 'cms', 'wordpress'],
        },
        {
          id: 'item_acc_ga4',
          label: 'Delega Google Analytics 4 (GA4)',
          description: 'Invito utente su GA4 con ruolo Editor per configurazione tracciamenti eventi e conversioni.',
          itemType: 'access_confirmation',
          required: true,
          accessConfig: {
            accountService: 'Google Analytics 4',
            accessTypeRequired: 'Invito utente Google',
            targetEmail: 'analytics@ai-consulting.it',
            requiredLevel: 'Editor / Amministratore',
            status: 'requested',
          },
          defaultRelation: 'blocks',
          targetTaskKeywords: ['tracciament', 'tracking', 'ga4', 'analytics'],
        },
        {
          id: 'item_acc_gsc',
          label: 'Delega Google Search Console',
          description: 'Aggiunta proprietario / utente con autorizzazione completa su Search Console per audit SEO.',
          itemType: 'access_confirmation',
          required: true,
          accessConfig: {
            accountService: 'Google Search Console',
            accessTypeRequired: 'Delega Proprietà Search Console',
            targetEmail: 'analytics@ai-consulting.it',
            requiredLevel: 'Proprietario delegato / Completo',
            status: 'requested',
          },
          defaultRelation: 'blocks',
          targetTaskKeywords: ['audit', 'seo', 'search console'],
        },
        {
          id: 'item_acc_gbp',
          label: 'Gestione Profilo Google Business (Google Maps)',
          description: 'Invito come Gestore della scheda Google Business Profile aziendale.',
          itemType: 'access_confirmation',
          required: false,
          accessConfig: {
            accountService: 'Google Business Profile',
            accessTypeRequired: 'Invito Gestore Scheda',
            targetEmail: 'marketing@ai-consulting.it',
            requiredLevel: 'Gestore',
            status: 'requested',
          },
          defaultRelation: 'supports',
          targetTaskKeywords: ['local', 'seo', 'google business'],
        },
        {
          id: 'item_acc_gads',
          label: 'Collegamento account Google Ads a MCC Agenzia',
          description: 'Condivisione del codice ID cliente (10 cifre) per invio richiesta di collegamento al Centro Clienti (MCC).',
          itemType: 'access_confirmation',
          required: false,
          accessConfig: {
            accountService: 'Google Ads',
            accessTypeRequired: 'Collegamento a MCC Agenzia',
            targetEmail: 'ads@ai-consulting.it',
            requiredLevel: 'Accesso Standard / Amministrativo',
            status: 'requested',
          },
          defaultRelation: 'blocks',
          targetTaskKeywords: ['google ads', 'campagne', 'adv'],
        },
        {
          id: 'item_acc_meta_bm',
          label: 'Accesso Partner Meta Business Manager',
          description: 'Assegnazione risorse all\'ID Business Manager agenzia per la gestione di pixel e account pubblicitario.',
          itemType: 'access_confirmation',
          required: false,
          accessConfig: {
            accountService: 'Meta Business Manager',
            accessTypeRequired: 'Assegnazione Partner BM',
            targetEmail: 'meta@ai-consulting.it',
            requiredLevel: 'Accesso Partner a Pixel & Account ADV',
            status: 'requested',
          },
          defaultRelation: 'blocks',
          targetTaskKeywords: ['meta', 'facebook', 'pixel', 'campagne'],
        },
        {
          id: 'item_acc_fb_page',
          label: 'Accesso Pagina Facebook aziendale',
          description: 'Concessione ruolo di gestione della Pagina Facebook per pubblicazione contenuti e inserzioni.',
          itemType: 'access_confirmation',
          required: false,
          accessConfig: {
            accountService: 'Facebook Page',
            accessTypeRequired: 'Invito Gestore Pagina',
            targetEmail: 'social@ai-consulting.it',
            requiredLevel: 'Controllo completo / Inserzioni',
            status: 'requested',
          },
          defaultRelation: 'supports',
          targetTaskKeywords: ['social', 'facebook'],
        },
        {
          id: 'item_acc_ig',
          label: 'Collegamento account Instagram Business',
          description: 'Verifica del collegamento tra account Instagram professionale e la Pagina Facebook aziendale.',
          itemType: 'access_confirmation',
          required: false,
          accessConfig: {
            accountService: 'Instagram Professionale',
            accessTypeRequired: 'Collegamento Instagram a BM',
            targetEmail: 'social@ai-consulting.it',
            requiredLevel: 'Account collegato',
            status: 'requested',
          },
          defaultRelation: 'supports',
          targetTaskKeywords: ['instagram', 'social'],
        },
        {
          id: 'item_acc_booking',
          label: 'Accesso motore prenotazioni / booking',
          description: 'Accesso al gestionale esterno o documentazione API per widget di prenotazione/e-commerce.',
          itemType: 'access_confirmation',
          required: false,
          accessConfig: {
            accountService: 'Piattaforma Booking / Gestionale',
            accessTypeRequired: 'Account operatore o API Key',
            targetEmail: 'dev@ai-consulting.it',
            requiredLevel: 'Accesso Integrazione',
            status: 'requested',
          },
          defaultRelation: 'supports',
          targetTaskKeywords: ['booking', 'sviluppo', 'integrazione'],
        },
      ],
    },

    // 5. STRATEGIA
    {
      id: 'req_strategy',
      category: 'strategy',
      title: 'Strategia di marketing, Target e KPI attesi',
      description:
        'Obiettivi commerciali, pubblico target, concorrenti di riferimento, budget pubblicitario disponibile e KPI di successo.',
      priority: 'high',
      blocksTaskCompletion: true,
      clientVisible: true,
      targetTaskKeywords: ['brief', 'kickoff', 'strategia', 'analisi', 'piano', 'mercato', 'competitor'],
      items: [
        {
          id: 'item_obiettivi_business',
          label: 'Obiettivi prioritari di business',
          description: 'Quali sono i risultati principali attesi dal progetto a 3, 6 e 12 mesi (es. lead generation, vendite e-commerce, brand awareness).',
          itemType: 'text',
          required: true,
          defaultRelation: 'blocks',
          targetTaskKeywords: ['brief', 'kickoff', 'strategia'],
        },
        {
          id: 'item_target_personas',
          label: 'Target e profilo del cliente ideale',
          description: 'Chi è il vostro cliente tipo (B2B, B2C, fascia d\'età, professione, problemi che risolvete per loro).',
          itemType: 'text',
          required: true,
          defaultRelation: 'blocks',
          targetTaskKeywords: ['brief', 'strategia', 'copywriting'],
        },
        {
          id: 'item_aree_geografiche',
          label: 'Aree geografiche di riferimento',
          description: 'Città, province, regioni o mercati esteri verso cui indirizzare la comunicazione e le campagne.',
          itemType: 'text',
          required: true,
          defaultRelation: 'blocks',
          targetTaskKeywords: ['brief', 'strategia', 'local'],
        },
        {
          id: 'item_competitor_diretti',
          label: 'Principali concorrenti (3-5 competitor diretti)',
          description: 'Nomi e link ai siti web dei vostri principali concorrenti con indicazione di cosa apprezzate o non gradite della loro comunicazione.',
          itemType: 'text',
          required: true,
          defaultRelation: 'blocks',
          targetTaskKeywords: ['analisi', 'competitor', 'strategia'],
        },
        {
          id: 'item_budget_pubblicitario',
          label: 'Budget pubblicitario mensile stimato',
          description: 'Importo indicativo mensile allocato per le inserzioni a pagamento (Google Ads, Meta ADV).',
          itemType: 'text',
          required: false,
          defaultRelation: 'supports',
          targetTaskKeywords: ['strategia', 'campagne', 'adv'],
        },
        {
          id: 'item_stagionalita',
          label: 'Stagionalità e periodi di picco',
          description: 'Periodi dell\'anno in cui si concentrano le richieste o le festività rilevanti per il vostro settore.',
          itemType: 'text',
          required: false,
          defaultRelation: 'supports',
          targetTaskKeywords: ['strategia', 'piano'],
        },
        {
          id: 'item_kpi_desiderati',
          label: 'KPI desiderati e metriche di successo',
          description: 'Numero minimo di contatti al mese, costo acquisizione target (CPA) o ROAS desiderato.',
          itemType: 'text',
          required: false,
          defaultRelation: 'supports',
          targetTaskKeywords: ['strategia', 'kpi', 'obiettivi'],
        },
      ],
    },
  ],
};

/**
 * Funzione di matching euristico per trovare task di un progetto collegabili a una richiesta o a un item
 */
export function matchTasksForRequest(
  keywords: string[],
  projectTasks: Array<{ id: string; title: string; description?: string | null }>
): string[] {
  if (!keywords || keywords.length === 0 || !projectTasks || projectTasks.length === 0) {
    return [];
  }

  const matchedTaskIds: string[] = [];
  const normalizedKeywords = keywords.map((k) => k.toLowerCase().trim()).filter(Boolean);

  for (const task of projectTasks) {
    const taskText = `${task.title} ${task.description || ''}`.toLowerCase();
    for (const kw of normalizedKeywords) {
      if (taskText.includes(kw)) {
        matchedTaskIds.push(task.id);
        break;
      }
    }
  }

  return matchedTaskIds;
}

/**
 * Calcola lo stato aggregato di una richiesta a partire dallo stato delle sue voci
 */
export function computeRequestOverallStatus(
  currentStatus: ClientRequestStatus,
  items: Array<{ required: boolean; status: ClientRequestItemStatus }>
): ClientRequestStatus {
  // Se lo stato è già approved o cancelled da un'azione esplicita finale, mantienilo
  if (['approved', 'cancelled'].includes(currentStatus)) {
    return currentStatus;
  }

  if (!items || items.length === 0) {
    return 'requested';
  }

  const requiredItems = items.filter((i) => i.required);
  const totalRequired = requiredItems.length;

  if (totalRequired === 0) {
    const anyReceived = items.some((i) => ['received', 'approved'].includes(i.status));
    return anyReceived ? 'received' : 'requested';
  }

  const receivedRequired = requiredItems.filter((i) => ['received', 'approved'].includes(i.status)).length;
  const anyReceived = items.some((i) => ['received', 'approved'].includes(i.status));

  if (receivedRequired === totalRequired) {
    // Tutti gli elementi obbligatori ricevuti
    return currentStatus === 'under_review' ? 'under_review' : 'received';
  } else if (anyReceived) {
    return 'partially_received';
  } else {
    return 'requested';
  }
}
