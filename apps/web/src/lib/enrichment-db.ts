import { 
  db, 
  leads, 
  companies, 
  enrichmentData, 
  enrichmentRuns, 
  websiteAnalysis, 
  publicContacts, 
  financialIndicators, 
  reviewsSignals, 
  growthSignals, 
  enrichmentSources 
} from '@ai-crm/db';
import { eq } from 'drizzle-orm';
import { type FullEnrichmentDossier } from '@ai-crm/ai';

export interface PersistEnrichmentInput {
  dossier: FullEnrichmentDossier;
  leadInput?: {
    id?: string;
    companyName?: string;
    website?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    notes?: string | null;
    sector?: string | null;
    source?: string | null;
  };
}

export function saveEnrichmentDossierToDb({ dossier, leadInput }: PersistEnrichmentInput) {
  try {
    const leadId = dossier.leadId;
    const existingLead = db.select().from(leads).where(eq(leads.id, leadId)).get();

    const companyName = existingLead?.companyName || leadInput?.companyName || dossier.companyName || 'Attività';
    const sector = existingLead?.sector || leadInput?.sector || dossier.sector || 'local_services';
    const city = existingLead?.city || leadInput?.city || dossier.city || null;
    const address = existingLead?.address || leadInput?.address || dossier.address || null;
    const notes = existingLead?.notes || leadInput?.notes || null;

    // Discovered contacts
    const discoveredEmail = dossier.publicContacts.find((c) => c.type.includes('email') || c.type === 'pec')?.value;
    const discoveredPhone = dossier.publicContacts.find((c) => c.type === 'phone')?.value;
    const website = existingLead?.website || leadInput?.website || dossier.websiteAnalysis?.url || dossier.domain || null;
    const email = existingLead?.email || leadInput?.email || discoveredEmail || null;
    const phone = existingLead?.phone || leadInput?.phone || discoveredPhone || null;

    // 0. Ensure lead exists or update existing lead
    if (!existingLead) {
      db.insert(leads).values({
        id: leadId,
        companyName,
        website,
        source: (leadInput?.source as any) || 'maps',
        sector: sector as any,
        score: dossier.commercialScore,
        status: 'arricchito',
        phone,
        email,
        address,
        city,
        notes,
        createdAt: dossier.startedAt,
        updatedAt: dossier.completedAt,
      }).run();
    } else {
      db.update(leads)
        .set({
          status: 'arricchito',
          score: dossier.commercialScore,
          email,
          phone,
          website,
          updatedAt: dossier.completedAt || new Date().toISOString(),
        })
        .where(eq(leads.id, leadId))
        .run();
    }

    // 1. Insert Enrichment Run
    db.insert(enrichmentRuns).values({
      id: dossier.runId,
      leadId,
      status: 'completed',
      startedAt: dossier.startedAt,
      completedAt: dossier.completedAt,
      overallConfidence: dossier.reliabilityScore / 100,
      commercialScore: dossier.commercialScore,
      reliabilityScore: dossier.reliabilityScore,
      summaryJson: JSON.stringify({
        digitalMaturity: dossier.digitalMaturity,
        techStack: dossier.techStackSummary,
        painPoints: dossier.painPoints,
        painPointsCount: dossier.painPoints.length,
        contactsCount: dossier.publicContacts.length,
        reputationChannels: dossier.reviews?.reputationChannels || [],
        signals: dossier.reviews?.signals || [],
        sentiment: dossier.reviews?.sentiment || null,
        socialLinks: dossier.websiteAnalysis?.socialLinks || [],
      }),
    }).run();

    // 2. Insert Website Analysis
    if (dossier.websiteAnalysis) {
      const wa = dossier.websiteAnalysis;
      db.insert(websiteAnalysis).values({
        id: `wa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        leadId,
        runId: dossier.runId,
        url: wa.url,
        isReachable: wa.isReachable,
        isHttps: wa.isHttps,
        httpStatus: wa.httpStatus || null,
        title: wa.title || null,
        metaDescription: wa.metaDescription || null,
        cms: wa.cms.value || null,
        isEcommerce: Boolean(wa.isEcommerce.value),
        hasChatbot: Boolean(wa.hasChatbot.value),
        hasWhatsapp: Boolean(wa.hasWhatsapp.value),
        hasBooking: Boolean(wa.hasBooking.value),
        hasContactForm: Boolean(wa.hasContactForm.value),
        hasAnalytics: Boolean(wa.hasAnalytics.value),
        hasPixel: Boolean(wa.hasPixel.value),
        hasNewsletter: Boolean(wa.hasNewsletter.value),
        isMultilingual: Boolean(wa.isMultilingual.value),
        detectedTechJson: JSON.stringify(wa.detectedTechnologies),
        subpagesScannedJson: JSON.stringify(wa.subpagesScanned),
        analyzedAt: wa.analyzedAt,
      }).run();
    }

    // 3. Insert Public Contacts
    for (const c of dossier.publicContacts) {
      db.insert(publicContacts).values({
        id: c.id || `pc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        leadId,
        runId: dossier.runId,
        type: c.type,
        value: c.value,
        sourceUrl: c.sourceUrl,
        confidence: c.confidence,
        isVerified: c.isVerified,
        collectedAt: c.collectedAt,
      }).run();
    }

    // 4. Insert Financial Indicators
    const fin = dossier.financials;
    if (fin) {
      db.insert(financialIndicators).values({
        id: `fi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        leadId,
        runId: dossier.runId,
        vatId: fin.vatId?.value || null,
        taxCode: fin.taxCode?.value || null,
        legalForm: fin.legalForm?.value || null,
        atecoCode: fin.atecoCode?.value || null,
        revenueType: fin.revenueType || 'unavailable',
        revenueMin: fin.revenue?.min || null,
        revenueMax: fin.revenue?.max || null,
        revenueOfficial: null,
        profitOfficial: null,
        employeesMin: fin.employees?.min || null,
        employeesMax: fin.employees?.max || null,
        employeesOfficial: null,
        sourceName: fin.revenue?.source || 'Public Directory',
        sourceUrl: fin.revenue?.sourceUrl,
        sourceYear: fin.revenue?.sourceYear || null,
        confidence: fin.revenue?.confidence || 0.3,
        notes: fin.notes || null,
        collectedAt: fin.revenue?.collectedAt || new Date().toISOString(),
      }).run();
    }

    // 5. Insert Review Signals
    if (dossier.reviews) {
      db.insert(reviewsSignals).values({
        id: `rs_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        leadId,
        runId: dossier.runId,
        sourceName: dossier.reviews.sourceName || 'Web Audit',
        sourceUrl: dossier.reviews.sourceUrl || null,
        hasPublicRating: dossier.reviews.hasPublicRating,
        ratingValue: dossier.reviews.ratingValue || null,
        reviewCount: dossier.reviews.reviewCount || null,
        signalsJson: JSON.stringify(dossier.reviews.signals || []),
        collectedAt: dossier.reviews.collectedAt || new Date().toISOString(),
      }).run();
    }

    // 6. Insert Growth Signals
    if (dossier.growth) {
      db.insert(growthSignals).values({
        id: `gs_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        leadId,
        runId: dossier.runId,
        growthLevel: dossier.growth.growthLevel || 'unknown',
        confidence: dossier.growth.confidence || 0,
        signalsJson: JSON.stringify(dossier.growth.signals || []),
        sourceUrlsJson: JSON.stringify(dossier.growth.sourceUrls || []),
        observedAt: dossier.growth.observedAt || new Date().toISOString(),
      }).run();
    }

    // 7. Insert Enrichment Sources
    for (const src of dossier.sourcesAudit || []) {
      db.insert(enrichmentSources).values({
        id: `es_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        leadId,
        runId: dossier.runId,
        adapterName: src.adapterName,
        status: src.status,
        durationMs: src.durationMs || 0,
        itemsCount: src.itemsCount || 0,
        errorMessage: src.errorMessage || null,
        executedAt: src.executedAt || new Date().toISOString(),
      }).run();
    }

    // 8. Backward Compatibility: Insert/Update companies & enrichmentData
    try {
      const existingCompany = db.select().from(companies).where(eq(companies.name, companyName)).get();
      const compId = existingCompany?.id || `comp_${leadId}`;
      if (!existingCompany) {
        db.insert(companies).values({
          id: compId,
          name: companyName,
          sector,
          address,
          city,
          phone,
          email,
          website,
          techStackJson: JSON.stringify(dossier.websiteAnalysis?.detectedTechnologies || []),
          createdAt: dossier.startedAt,
          updatedAt: dossier.completedAt,
        }).run();
      }

      db.insert(enrichmentData).values({
        id: `enrich_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        leadId,
        companyId: compId,
        source: 'full_enrichment_v2',
        dataJson: JSON.stringify({
          domain: website,
          techStack: {
            cms: dossier.websiteAnalysis?.cms?.value || 'Nessuno rilevato',
            ecommerce: Boolean(dossier.websiteAnalysis?.isEcommerce?.value),
            analytics: dossier.websiteAnalysis?.hasAnalytics?.value ? 'Google Analytics / GTM Rilevato' : 'Non rilevato',
            chat: Boolean(dossier.websiteAnalysis?.hasChatbot?.value || dossier.websiteAnalysis?.hasWhatsapp?.value),
            booking: Boolean(dossier.websiteAnalysis?.hasBooking?.value),
          },
          digitalMaturity: dossier.digitalMaturity || 'media',
          estimatedRevenueRange: dossier.financials?.revenue?.min
            ? `€${dossier.financials.revenue.min.toLocaleString()}${dossier.financials.revenue.max ? ` - €${dossier.financials.revenue.max.toLocaleString()}` : ''}`
            : undefined,
          detectedGaps: dossier.painPoints?.map((p) => p.title) || [],
          aiOpportunities: dossier.painPoints?.map((p) => p.recommendedSolution) || [],
          enrichedAt: dossier.completedAt,
        }),
        enrichedAt: dossier.completedAt,
      }).run();
    } catch {}

    return true;
  } catch (err) {
    console.error('[saveEnrichmentDossierToDb] Errore:', err);
    return false;
  }
}
