import { type CommercialPainPoint, type WebsiteAnalysisData } from './types';

export function generateCommercialPainPoints(
  analysis: WebsiteAnalysisData | null | undefined,
  sector?: string | null,
  contactsCount: number = 0
): CommercialPainPoint[] {
  const painPoints: CommercialPainPoint[] = [];

  // Se il sito non esiste o non è raggiungibile
  if (!analysis || !analysis.isReachable) {
    painPoints.push({
      id: 'no_website',
      title: 'Assenza di presenza web proprietaria verificabile',
      description: 'L\'attività non dispone di un sito web attivo o raggiungibile, perdendo traffico qualificato da ricerche territoriali e turistiche.',
      severity: 'alta',
      recommendedSolution: 'Sito Vetrina Moderno AI-Ready + Presidio Scheda Territoriale',
      estimatedImpact: '+40% di visibilità locale e credibilità verso nuovi clienti',
    });
    return painPoints;
  }

  // 1. Assenza WhatsApp / Chatbot
  const hasWa = Boolean(analysis.hasWhatsapp?.value);
  const hasBot = Boolean(analysis.hasChatbot?.value);

  if (!hasWa && !hasBot) {
    painPoints.push({
      id: 'no_instant_chat',
      title: 'Nessun canale di chat istantanea o WhatsApp sul sito',
      description: 'I visitatori che navigano da smartphone non hanno modo di inviare una richiesta veloce, aumentando il tasso di abbandono.',
      severity: 'alta',
      recommendedSolution: 'Agente AI WhatsApp per risposte 24/7 e recupero automatico contatti',
      estimatedImpact: '+25% di lead generati dal traffico web esistente',
    });
  } else if (hasWa && !hasBot) {
    painPoints.push({
      id: 'manual_whatsapp',
      title: 'WhatsApp gestito solo manualmente senza automazione AI',
      description: 'Le richieste in orario di chiusura o nei weekend rischiano di rimanere senza risposta immediata.',
      severity: 'media',
      recommendedSolution: 'Chatbot AI integrato con WhatsApp per prima qualifica e presa appuntamenti',
      estimatedImpact: 'Risposta in 5 secondi h24 e zero prospect persi fuori orario',
    });
  }

  // 2. Assenza Booking / Prenotazioni Online
  const hasBooking = Boolean(analysis.hasBooking?.value);
  const isHoreca = sector === 'horeca_ristoranti' || sector === 'horeca_hotel';
  const isProfessional = sector === 'studi_legali' || sector === 'commercialisti' || sector === 'local_services';

  if (!hasBooking) {
    if (isHoreca) {
      painPoints.push({
        id: 'no_table_booking',
        title: 'Mancanza di sistema di prenotazione digitale autonoma',
        description: 'I clienti devono telefonare per prenotare tavoli o camere, saturando il personale durante i turni di servizio.',
        severity: 'alta',
        recommendedSolution: 'Booking AI conversazionale per tavoli/camere sincronizzato con Google Calendar',
        estimatedImpact: 'Risparmio di 15+ ore/mese di gestione telefonica e +18% prenotazioni dirette',
      });
    } else if (isProfessional) {
      painPoints.push({
        id: 'no_appointment_scheduler',
        title: 'Fissazione appuntamenti e consulenze non automatizzata',
        description: 'La segreteria gestisce lo scambio di email e chiamate per incastrare le disponibilità dei professionisti.',
        severity: 'media',
        recommendedSolution: 'Segreteria Digitale AI con calendario integrato per appuntamenti e pre-screening',
        estimatedImpact: 'Riduzione tempi di fissazione appuntamenti dell\'80%',
      });
    }
  }

  // 3. Assenza tracciamento Analytics / Pixel
  const hasAnalytics = Boolean(analysis.hasAnalytics?.value);
  const hasPixel = Boolean(analysis.hasPixel?.value);

  if (!hasAnalytics && !hasPixel) {
    painPoints.push({
      id: 'no_analytics',
      title: 'Assenza di tracciamento conversioni e traffico web',
      description: 'L\'azienda non misura quanti visitatori visitano il sito né quali pagine generano più interesse.',
      severity: 'bassa',
      recommendedSolution: 'Configurazione Google Analytics 4 + Meta Pixel con tracciamento eventi AI',
      estimatedImpact: 'Visibilità completa sul ROI delle attività promozionali',
    });
  }

  // 4. E-commerce e carrelli
  const isEcom = Boolean(analysis.isEcommerce?.value);
  if (isEcom && !hasBot) {
    painPoints.push({
      id: 'ecom_no_assistant',
      title: 'E-commerce senza assistente agli acquisti AI',
      description: 'I clienti con dubbi su taglie, spedizioni o compatibilità abbandonano il carrello senza supporto.',
      severity: 'alta',
      recommendedSolution: 'Shopping Assistant AI + Agente WhatsApp per recupero carrelli abbandonati',
      estimatedImpact: 'Recupero stimato del 12-18% dei carrelli non completati',
    });
  }

  // 5. Multilingua
  const isMulti = Boolean(analysis.isMultilingual?.value);
  if (!isMulti && isHoreca) {
    painPoints.push({
      id: 'no_multilingual',
      title: 'Sito monolingua in un settore ad alta vocazione turistica',
      description: 'I turisti e visitatori stranieri hanno difficoltà a consultare menu, servizi o offerte in lingua madre.',
      severity: 'media',
      recommendedSolution: 'Traduzione AI dinamica del sito e assistente multilingua (EN, DE, FR, ES)',
      estimatedImpact: '+30% di engagement da clientela internazionale',
    });
  }

  // 6. Dominio di terzo livello / hosting gratuito (es. Altervista, Webflow io, Wixsite)
  if (analysis.isFreeSubdomain) {
    painPoints.push({
      id: 'free_subdomain_hosting',
      title: `Presenza web su sottodominio gratuito (${analysis.freeSubdomainHost || 'terzo livello'})`,
      description: 'L\'attività utilizza un hosting gratuito di terzo livello anziché un dominio ufficiale proprietario (.it o .com). Questo limita la percezione di autorevolezza del brand e penalizza la visibilità SEO su Google.',
      severity: 'alta',
      recommendedSolution: 'Attivazione Dominio Professionale .IT + Restyling Piattaforma Web Ufficiale',
      estimatedImpact: 'Aumento immediato della fiducia dei clienti e +35% visibilità nelle ricerche territoriali',
    });
  }

  // 7. Social attivi ma senza Meta Pixel
  const hasSocials = (analysis.socialLinks || []).some((s) => s.platform === 'instagram' || s.platform === 'facebook');
  if (hasSocials && !hasPixel) {
    painPoints.push({
      id: 'social_without_pixel',
      title: 'Presenza social attiva ma assenza di Meta Pixel sul sito web',
      description: 'L\'azienda investe tempo sui social (Instagram/Facebook) ma non traccia chi visita il sito dal telefono, disperdendo traffico prezioso senza possibilità di fare retargeting.',
      severity: 'media',
      recommendedSolution: 'Setup Meta Pixel + Campagne AI di Remarketing Locale Automatizzato',
      estimatedImpact: 'Recupero stimato del 15-20% dei clienti indecisi che hanno visualizzato il menu',
    });
  }

  // 8. Schede Recensioni (TripAdvisor / Google) senza Review Booster attivo
  const hasReviewProfiles = (analysis.socialLinks || []).some((s) => s.platform === 'tripadvisor' || s.platform === 'google_maps');
  if (hasReviewProfiles) {
    painPoints.push({
      id: 'unleveraged_reviews',
      title: 'Schede recensioni pubbliche (TripAdvisor / Google) senza raccolta attiva post-visita',
      description: 'L\'attività riceve recensioni spontanee ma non dispone di un sistema smart post-conto per invitare i clienti soddisfatti a lasciare recensioni a 5 stelle.',
      severity: 'alta',
      recommendedSolution: 'Smart Review Booster AI: Invio promemoria recensioni via WhatsApp / QR Code al tavolo',
      estimatedImpact: '+40% di recensioni positive mensili per scalare la classifica locale',
    });
  }

  return painPoints;
}
