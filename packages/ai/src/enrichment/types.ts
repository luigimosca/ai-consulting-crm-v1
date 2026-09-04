export type FieldStatus = 'official' | 'estimated' | 'not_available' | 'unverified';

export interface EnrichedField<T> {
  value: T | null;
  min?: number | null;
  max?: number | null;
  source: string;
  sourceUrl: string | null;
  collectedAt: string;
  confidence: number; // 0.0 to 1.0
  isEstimated: boolean;
  sourceYear?: number | null;
  status: FieldStatus;
  methodology?: string | null;
}

export interface WebsiteAnalysisData {
  url: string;
  isReachable: boolean;
  isHttps: boolean;
  httpStatus?: number | null;
  title?: string | null;
  metaDescription?: string | null;
  cms: EnrichedField<string>;
  isEcommerce: EnrichedField<boolean>;
  hasChatbot: EnrichedField<boolean | string>;
  hasWhatsapp: EnrichedField<boolean | string>;
  hasBooking: EnrichedField<boolean | string>;
  hasContactForm: EnrichedField<boolean>;
  hasAnalytics: EnrichedField<boolean | string>;
  hasPixel: EnrichedField<boolean>;
  hasNewsletter: EnrichedField<boolean>;
  isMultilingual: EnrichedField<boolean | string>;
  detectedTechnologies: string[];
  subpagesScanned: {
    path: string;
    status: number;
    title?: string | null;
  }[];
  socialLinks: {
    platform: 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'youtube' | 'tiktok' | 'tripadvisor' | 'thefork' | 'google_maps' | 'trustpilot' | 'other';
    url: string;
  }[];
  extractedPiva?: string | null;
  extractedPec?: string | null;
  extractedEmails?: string[];
  extractedPhones?: string[];
  copyrightYear?: number | null;
  hasCareersPage?: boolean;
  isFreeSubdomain?: boolean;
  freeSubdomainHost?: string | null;
  analyzedAt: string;
}

export interface PublicContactItem {
  id?: string;
  type: 'generic_email' | 'pec' | 'named_email' | 'phone' | 'whatsapp' | 'social';
  value: string;
  sourceUrl: string | null;
  confidence: number; // separate technical validation from identity verification
  isVerified: boolean;
  verificationStatus: 'da_verificare' | 'verificato' | 'non_raggiungibile';
  collectedAt: string;
}

export interface FinancialIndicatorsData {
  vatId: EnrichedField<string>;
  taxCode: EnrichedField<string>;
  legalForm: EnrichedField<string>;
  atecoCode: EnrichedField<string>;
  revenueType: 'official' | 'estimated' | 'unavailable';
  revenue: EnrichedField<number | string>;
  profit: EnrichedField<number | string>;
  employees: EnrichedField<number | string>;
  notes?: string | null;
}

export interface ReputationChannelItem {
  platform: 'tripadvisor' | 'google_maps' | 'thefork' | 'facebook' | 'trustpilot' | 'other';
  label: string;
  url: string;
  rating?: number | null;
  reviewCount?: number | null;
  source: string;
}

export interface ReviewSentimentAnalysis {
  positivePercentage: number;
  negativePercentage: number;
  neutralPercentage: number;
  positiveHighlights: string[];
  negativeCriticalPoints: string[];
  actionableSolutions: {
    issue: string;
    solution: string;
    impact: string;
  }[];
}

export interface ReviewSignalsData {
  hasPublicRating: boolean;
  ratingValue: number | null;
  reviewCount: number | null;
  sourceName: string;
  sourceUrl: string | null;
  signals: string[];
  reputationChannels?: ReputationChannelItem[];
  sentiment?: ReviewSentimentAnalysis;
  collectedAt: string;
}

export interface GrowthSignalsData {
  growthLevel: 'low' | 'medium' | 'high' | 'unknown';
  confidence: number;
  signals: string[];
  sourceUrls: string[];
  observedAt: string;
}

export interface CommercialPainPoint {
  id: string;
  title: string;
  description: string;
  severity: 'alta' | 'media' | 'bassa';
  recommendedSolution: string;
  estimatedImpact: string;
}

export interface AdapterExecutionSummary {
  adapterName: string;
  status: 'success' | 'partial' | 'failed' | 'skipped';
  durationMs: number;
  itemsCount: number;
  errorMessage?: string | null;
  executedAt: string;
}

export interface FullEnrichmentDossier {
  leadId: string;
  runId: string;
  companyName: string;
  domain?: string | null;
  sector: string;
  categoryLabel?: string | null;
  address?: string | null;
  city?: string | null;

  // 1. Dati Territoriali OSM
  territorialData: {
    osmId?: number | null;
    osmType?: string | null;
    osmUrl?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    openingHours?: string | null;
    address?: string | null;
    categoryGroup?: string | null;
    categoryLabel?: string | null;
  };

  // 2. Analisi Sito Web
  websiteAnalysis?: WebsiteAnalysisData | null;

  // 3. Contatti Pubblici
  publicContacts: PublicContactItem[];

  // 4. Tecnologia & Maturità Digitale
  digitalMaturity: 'bassa' | 'media' | 'alta';
  techStackSummary: string[];

  // 5. Dati Societari & Economici
  financials: FinancialIndicatorsData;

  // 6. Recensioni & Reputazione
  reviews: ReviewSignalsData;

  // 7. Segnali di Crescita
  growth: GrowthSignalsData;

  // 8. Pain Point & Opportunità Commerciali
  painPoints: CommercialPainPoint[];

  // 9. Fonti & Audit Trail
  sourcesAudit: AdapterExecutionSummary[];

  // Scoring
  commercialScore: number; // 0 to 100
  reliabilityScore: number; // 0 to 100

  startedAt: string;
  completedAt: string;
}
