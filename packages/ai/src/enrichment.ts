export * from './enrichment/index';

import { WebsiteAnalyzerAdapter } from './enrichment/website-analyzer';
import { generateCommercialPainPoints } from './enrichment/pain-points';
import { calculateEnrichmentScores } from './enrichment/scoring';

export interface TechStackInfo {
  cms: string;
  analytics: string;
  chat: boolean | string;
  booking: boolean | string;
  ecommerce: boolean | string;
  hosting?: string;
}

export interface EnrichmentResult {
  domain: string;
  techStack: TechStackInfo;
  digitalMaturity: 'bassa' | 'media' | 'alta';
  estimatedRevenueRange: string;
  employeeCountRange: string;
  detectedGaps: string[];
  aiOpportunities: string[];
  suggestedOffer: string;
  summary: string;
}

/**
 * Funzione di compatibilità che delega all'adapter WebsiteAnalyzerAdapter
 */
export async function analyzeDomain(domain: string, sector?: string): Promise<EnrichmentResult> {
  const analyzer = new WebsiteAnalyzerAdapter();
  const { data } = await analyzer.analyze(domain, sector);

  const painPoints = generateCommercialPainPoints(data, sector, 0);

  const detectedGaps = painPoints.map((p) => p.title);
  const aiOpportunities = painPoints.map((p) => p.recommendedSolution);

  let suggestedOffer = 'Consulenza Strategica AI + Assistente WhatsApp Custom';
  if (sector === 'studi_legali' || sector === 'commercialisti') {
    suggestedOffer = 'Sistema AI Documentale RAG + Segreteria Virtuale Intelligente';
  } else if (sector === 'horeca_ristoranti' || sector === 'horeca_hotel') {
    suggestedOffer = 'Booking AI & Assistente WhatsApp per Prenotazioni Automatiche';
  } else if (sector === 'ecommerce') {
    suggestedOffer = 'AI Shopping Assistant + Automazione Recupero Carrelli';
  }

  const cms = data.cms.value || 'Custom HTML / Framework';
  const analytics = data.hasAnalytics.value ? String(data.hasAnalytics.value) : 'Nessun tracking rilevato';
  const chat = data.hasWhatsapp.value || data.hasChatbot.value || false;
  const booking = data.hasBooking.value || false;
  const isEcom = Boolean(data.isEcommerce.value);

  const digitalMaturity = (data.isReachable && (chat || booking) && data.hasAnalytics.value) ? 'alta' : data.isReachable ? 'media' : 'bassa';

  return {
    domain: data.url || domain,
    techStack: {
      cms,
      analytics,
      chat,
      booking,
      ecommerce: isEcom ? 'Sì (Attivo)' : 'No',
    },
    digitalMaturity,
    estimatedRevenueRange: '€150k - €500k (Stima Benchmark)',
    employeeCountRange: '2 - 8 addetti (Stima)',
    detectedGaps,
    aiOpportunities,
    suggestedOffer,
    summary: `Analisi per ${domain}: Maturità digitale ${digitalMaturity.toUpperCase()}, CMS: ${cms}. ${detectedGaps.length} opportunità rilevate con alto potenziale per ${suggestedOffer}.`,
  };
}
