import { type GrowthSignalsData } from './types';

export class GrowthSignalAdapter {
  name = 'GrowthSignalAdapter';

  async evaluate(input: {
    hasCareersPage?: boolean;
    copyrightYear?: number | null;
    isEcommerce?: boolean;
    hasChatbot?: boolean;
    hasBooking?: boolean;
    hasAnalytics?: boolean;
    hasPixel?: boolean;
    isMultilingual?: boolean;
    subpagesCount: number;
    websiteUrl?: string | null;
  }): Promise<GrowthSignalsData> {
    const now = new Date().toISOString();
    const signals: string[] = [];
    const sourceUrls: string[] = [];

    if (input.websiteUrl) {
      sourceUrls.push(input.websiteUrl);
    }

    let scorePoints = 0;

    // 1. Pagina Lavora con noi / Carriere
    if (input.hasCareersPage) {
      signals.push('Sezione assunzioni / posizioni aperte ("Lavora con noi") rilevata sul sito.');
      scorePoints += 3;
    }

    // 2. Copyright / Aggiornamento recente
    const currentYear = new Date().getFullYear();
    if (input.copyrightYear && input.copyrightYear >= currentYear - 1) {
      signals.push(`Sito web manutenuto e aggiornato di recente (anno copyright: ${input.copyrightYear}).`);
      scorePoints += 2;
    }

    // 3. E-commerce e transazioni attive
    if (input.isEcommerce) {
      signals.push('Canale di vendita online attivo con piattaforma e-commerce.');
      scorePoints += 2;
    }

    // 4. Presenza multilingua (espansione mercato internazionale/turistico)
    if (input.isMultilingual) {
      signals.push('Struttura multilingua per target internazionale e turistico.');
      scorePoints += 2;
    }

    // 5. Investimento in tracking e marketing
    if (input.hasPixel || input.hasAnalytics) {
      signals.push('Presenza di strumenti avanzati di tracciamento e marketing (Meta Pixel / GA4).');
      scorePoints += 1;
    }

    // 6. Sistemi di interazione digitale (Chatbot o Booking)
    if (input.hasChatbot || input.hasBooking) {
      signals.push('Automazione parziale dei flussi di contatto (prenotazione / chat).');
      scorePoints += 1;
    }

    let growthLevel: GrowthSignalsData['growthLevel'] = 'unknown';
    let confidence = 0.3;

    if (signals.length === 0) {
      growthLevel = 'unknown';
      confidence = 0.2;
      signals.push('Nessun segnale pubblico di espansione o aggiornamento recente rilevabile.');
    } else if (scorePoints >= 6) {
      growthLevel = 'high';
      confidence = 0.75;
    } else if (scorePoints >= 3) {
      growthLevel = 'medium';
      confidence = 0.65;
    } else {
      growthLevel = 'low';
      confidence = 0.5;
    }

    return {
      growthLevel,
      confidence,
      signals,
      sourceUrls,
      observedAt: now,
    };
  }
}
