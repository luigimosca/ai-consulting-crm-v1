import {
  type WebsiteAnalysisData,
  type PublicContactItem,
  type FinancialIndicatorsData,
  type GrowthSignalsData,
} from './types';

export function calculateEnrichmentScores(input: {
  sector?: string | null;
  websiteAnalysis?: WebsiteAnalysisData | null;
  contacts: PublicContactItem[];
  financials: FinancialIndicatorsData;
  growth: GrowthSignalsData;
  osmPresent: boolean;
}): {
  commercialScore: number;
  reliabilityScore: number;
  digitalMaturity: 'bassa' | 'media' | 'alta';
} {
  const { sector, websiteAnalysis, contacts, financials, growth, osmPresent } = input;

  // -------------------------------------------------------------------------
  // 1. COMMERCIAL SCORE (Opportunità di vendita AI)
  // -------------------------------------------------------------------------
  let commercialScore = 20;

  // Sector fit
  if (sector === 'horeca_ristoranti' || sector === 'horeca_hotel' || sector === 'studi_legali' || sector === 'commercialisti') {
    commercialScore += 25;
  } else if (sector === 'ecommerce') {
    commercialScore += 22;
  } else {
    commercialScore += 18;
  }

  // Presenza sito
  const hasWebsite = Boolean(websiteAnalysis?.isReachable);
  if (hasWebsite) {
    commercialScore += 15;

    // Lacune AI colmabili
    const hasBot = Boolean(websiteAnalysis?.hasChatbot?.value);
    const hasBooking = Boolean(websiteAnalysis?.hasBooking?.value);
    const hasWa = Boolean(websiteAnalysis?.hasWhatsapp?.value);
    const isEcom = Boolean(websiteAnalysis?.isEcommerce?.value);

    if (!hasBot) commercialScore += 10;
    if (!hasBooking && (sector?.includes('horeca') || sector?.includes('legali'))) commercialScore += 10;
    if (!hasWa) commercialScore += 5;
    if (isEcom && !hasBot) commercialScore += 5;
  }

  // Contatti disponibili per l'outreach
  const hasEmail = contacts.some((c) => c.type.includes('email') || c.type === 'pec');
  const hasPhone = contacts.some((c) => c.type === 'phone');
  if (hasEmail) commercialScore += 6;
  if (hasPhone) commercialScore += 6;

  // Segnali di crescita (più propensione all'investimento)
  if (growth.growthLevel === 'high') commercialScore += 8;
  else if (growth.growthLevel === 'medium') commercialScore += 5;

  commercialScore = Math.max(15, Math.min(98, commercialScore));

  // -------------------------------------------------------------------------
  // 2. RELIABILITY SCORE (Affidabilità e completezza delle fonti)
  // -------------------------------------------------------------------------
  let reliabilityScore = 10;

  // Fonte OSM verificata
  if (osmPresent) reliabilityScore += 25;

  // Sito web raggiungibile e analizzato
  if (hasWebsite) {
    reliabilityScore += 20;
    if (websiteAnalysis?.isHttps) reliabilityScore += 5;
  }

  // P.IVA ufficiale rilevata e validata
  if (financials.vatId.status === 'official' && financials.vatId.value) {
    reliabilityScore += 20;
  }

  // PEC o Contatti confermati
  if (contacts.some((c) => c.type === 'pec')) {
    reliabilityScore += 10;
  } else if (contacts.length >= 2) {
    reliabilityScore += 5;
  }

  // Aggiornamento recente
  if (websiteAnalysis?.copyrightYear && websiteAnalysis.copyrightYear >= 2024) {
    reliabilityScore += 10;
  }

  reliabilityScore = Math.max(10, Math.min(95, reliabilityScore));

  // -------------------------------------------------------------------------
  // 3. MATURITÀ DIGITALE
  // -------------------------------------------------------------------------
  let digitalMaturity: 'bassa' | 'media' | 'alta' = 'bassa';
  if (hasWebsite) {
    const techCount = websiteAnalysis?.detectedTechnologies.length || 0;
    const hasAnalytics = Boolean(websiteAnalysis?.hasAnalytics?.value);
    const hasInteraction = Boolean(websiteAnalysis?.hasChatbot?.value || websiteAnalysis?.hasBooking?.value || websiteAnalysis?.hasWhatsapp?.value);

    if (hasInteraction && hasAnalytics && techCount >= 3) {
      digitalMaturity = 'alta';
    } else if (techCount >= 1 || hasAnalytics || hasInteraction) {
      digitalMaturity = 'media';
    } else {
      digitalMaturity = 'bassa';
    }
  }

  return {
    commercialScore,
    reliabilityScore,
    digitalMaturity,
  };
}
