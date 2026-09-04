export interface ScoreBreakdown {
  total: number;
  sectorFit: number;
  needGaps: number;
  digitalReadiness: number;
  sourceSignal: number;
  tier: 'freddo' | 'tiepido' | 'caldo';
}

export function calculateScore(
  lead: {
    sector?: string;
    website?: string;
    source?: string;
    phone?: string;
    email?: string;
  },
  enrichment?: {
    digitalMaturity?: 'bassa' | 'media' | 'alta';
    detectedGaps?: string[];
    techStack?: { chat?: boolean | string; booking?: boolean | string };
  }
): ScoreBreakdown {
  let sectorFit = 20;
  switch (lead.sector) {
    case 'horeca_ristoranti':
      sectorFit = 30;
      break;
    case 'studi_legali':
      sectorFit = 30;
      break;
    case 'commercialisti':
      sectorFit = 28;
      break;
    case 'horeca_hotel':
      sectorFit = 28;
      break;
    case 'ecommerce':
      sectorFit = 25;
      break;
    default:
      sectorFit = 18;
  }

  let needGaps = 20;
  let digitalReadiness = 15;

  if (enrichment) {
    // If gaps are detected, higher need for AI solutions
    const gapsCount = enrichment.detectedGaps?.length || 0;
    needGaps = Math.min(35, 15 + gapsCount * 7);

    if (enrichment.digitalMaturity === 'media') {
      digitalReadiness = 25; // Sweet spot: ready to adopt AI
    } else if (enrichment.digitalMaturity === 'bassa') {
      digitalReadiness = 18;
    } else {
      digitalReadiness = 20;
    }
  } else if (lead.website) {
    needGaps = 22;
    digitalReadiness = 18;
  }

  let sourceSignal = 10;
  if (lead.source === 'sito') {
    sourceSignal = 20; // Inbound direct lead is super hot
  } else if (lead.source === 'referral') {
    sourceSignal = 18;
  } else if (lead.source === 'maps') {
    sourceSignal = 12;
  }

  // Bonus if contact info is complete
  if (lead.email && lead.phone) {
    sourceSignal += 5;
  }

  const rawTotal = sectorFit + needGaps + digitalReadiness + sourceSignal;
  const total = Math.max(15, Math.min(98, rawTotal));

  let tier: ScoreBreakdown['tier'] = 'freddo';
  if (total >= 75) {
    tier = 'caldo';
  } else if (total >= 50) {
    tier = 'tiepido';
  }

  return {
    total,
    sectorFit,
    needGaps,
    digitalReadiness,
    sourceSignal,
    tier
  };
}
