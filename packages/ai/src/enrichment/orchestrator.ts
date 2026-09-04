import { OSMEnrichmentAdapter } from './osm-adapter';
import { WebsiteAnalyzerAdapter } from './website-analyzer';
import { PublicCompanyDataAdapter } from './company-data-adapter';
import { PublicDirectoryAdapter } from './public-directory-adapter';
import { ReviewSignalAdapter } from './review-signal-adapter';
import { GrowthSignalAdapter } from './growth-signal-adapter';
import { generateCommercialPainPoints } from './pain-points';
import { calculateEnrichmentScores } from './scoring';
import {
  type FullEnrichmentDossier,
  type PublicContactItem,
  type AdapterExecutionSummary,
} from './types';

export interface EnrichmentLeadInput {
  id?: string;
  companyName: string;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  notes?: string | null;
  sector?: string | null;
  source?: string | null;
}

export class EnrichmentOrchestrator {
  private osmAdapter = new OSMEnrichmentAdapter();
  private websiteAdapter = new WebsiteAnalyzerAdapter();
  private companyAdapter = new PublicCompanyDataAdapter();
  private directoryAdapter = new PublicDirectoryAdapter();
  private reviewAdapter = new ReviewSignalAdapter();
  private growthAdapter = new GrowthSignalAdapter();

  /**
   * Esegue la pipeline di arricchimento a 6 adapter su un lead.
   */
  async runEnrichment(lead: EnrichmentLeadInput): Promise<FullEnrichmentDossier> {
    const startedAt = new Date().toISOString();
    const leadId = lead.id || `lead_tmp_${Date.now()}`;
    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sourcesAudit: AdapterExecutionSummary[] = [];

    // 1. Adapter 1: OpenStreetMap Data
    const t0 = Date.now();
    let osmResult: any = null;
    try {
      osmResult = await this.osmAdapter.enrich({
        companyName: lead.companyName,
        website: lead.website,
        phone: lead.phone,
        email: lead.email,
        address: lead.address,
        city: lead.city,
        notes: lead.notes,
        sector: lead.sector,
      });
      sourcesAudit.push({
        adapterName: this.osmAdapter.name,
        status: 'success',
        durationMs: Date.now() - t0,
        itemsCount: osmResult.contacts.length + (osmResult.territorialData.osmUrl ? 1 : 0),
        executedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      sourcesAudit.push({
        adapterName: this.osmAdapter.name,
        status: 'failed',
        durationMs: Date.now() - t0,
        itemsCount: 0,
        errorMessage: err?.message || 'Errore adapter OSM',
        executedAt: new Date().toISOString(),
      });
    }

    // 2. Adapter 2: Website Analyzer
    const t1 = Date.now();
    let webResult: any = null;
    const domainToAnalyze = lead.website || (osmResult?.contacts?.find((c: any) => c.type === 'website')?.value) || null;

    try {
      webResult = await this.websiteAdapter.analyze(domainToAnalyze, lead.sector);
      sourcesAudit.push({
        adapterName: this.websiteAdapter.name,
        status: webResult.data.isReachable ? 'success' : 'partial',
        durationMs: Date.now() - t1,
        itemsCount: webResult.discoveredContacts.length + (webResult.data.isReachable ? 1 : 0),
        errorMessage: webResult.data.isReachable ? null : 'Sito non raggiungibile o non presente',
        executedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      sourcesAudit.push({
        adapterName: this.websiteAdapter.name,
        status: 'failed',
        durationMs: Date.now() - t1,
        itemsCount: 0,
        errorMessage: err?.message || 'Errore analisi web',
        executedAt: new Date().toISOString(),
      });
    }

    // 3. Consolidamento Contatti e Deduplicazione
    const rawContacts: PublicContactItem[] = [
      ...(osmResult?.contacts || []),
      ...(webResult?.discoveredContacts || []),
    ];

    const deduplicatedContacts: PublicContactItem[] = [];
    const seenContactValues = new Set<string>();

    for (const c of rawContacts) {
      const key = `${c.type}:${c.value.toLowerCase().trim()}`;
      if (!seenContactValues.has(key)) {
        seenContactValues.add(key);
        deduplicatedContacts.push({
          ...c,
          id: `contact_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        });
      }
    }

    // 4. Adapter 3: Public Company Data
    const t2 = Date.now();
    let companyData: any = null;
    try {
      companyData = await this.companyAdapter.process({
        companyName: lead.companyName,
        sector: lead.sector,
        city: lead.city,
        extractedVat: webResult?.extractedVat || null,
        extractedPec: webResult?.extractedPec || null,
        websiteUrl: webResult?.data?.url || null,
      });
      sourcesAudit.push({
        adapterName: this.companyAdapter.name,
        status: 'success',
        durationMs: Date.now() - t2,
        itemsCount: companyData.vatId.value ? 4 : 2,
        executedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      sourcesAudit.push({
        adapterName: this.companyAdapter.name,
        status: 'failed',
        durationMs: Date.now() - t2,
        itemsCount: 0,
        errorMessage: err?.message || 'Errore dati aziendali',
        executedAt: new Date().toISOString(),
      });
    }

    // 5. Adapter 4: Public Directory
    const t3 = Date.now();
    try {
      const dirMatch = await this.directoryAdapter.match(lead.companyName, lead.sector);
      sourcesAudit.push({
        adapterName: this.directoryAdapter.name,
        status: 'success',
        durationMs: Date.now() - t3,
        itemsCount: dirMatch.isListed ? 1 : 0,
        executedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      sourcesAudit.push({
        adapterName: this.directoryAdapter.name,
        status: 'failed',
        durationMs: Date.now() - t3,
        itemsCount: 0,
        errorMessage: err?.message || 'Errore directory pubblica',
        executedAt: new Date().toISOString(),
      });
    }

    // 6. Adapter 5: Review Signals (Zero Fake Stars)
    const t4 = Date.now();
    let reviewData: any = null;
    try {
      const reputationLinks = (webResult?.data?.socialLinks || []).filter((s: any) =>
        ['tripadvisor', 'google_maps', 'thefork', 'trustpilot'].includes(s.platform)
      );

      reviewData = await this.reviewAdapter.evaluate({
        osmUrl: osmResult?.territorialData?.osmUrl,
        companyName: lead.companyName,
        city: lead.city,
        sector: lead.sector,
        socialCount: webResult?.data?.socialLinks?.length || 0,
        hasWebsite: Boolean(webResult?.data?.isReachable),
        hasOpeningHours: Boolean(osmResult?.territorialData?.openingHours),
        reputationLinks,
      });
      sourcesAudit.push({
        adapterName: this.reviewAdapter.name,
        status: 'success',
        durationMs: Date.now() - t4,
        itemsCount: reviewData.signals.length,
        executedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      sourcesAudit.push({
        adapterName: this.reviewAdapter.name,
        status: 'failed',
        durationMs: Date.now() - t4,
        itemsCount: 0,
        errorMessage: err?.message || 'Errore segnali recensioni',
        executedAt: new Date().toISOString(),
      });
    }

    // 7. Adapter 6: Growth Signals
    const t5 = Date.now();
    let growthData: any = null;
    try {
      growthData = await this.growthAdapter.evaluate({
        hasCareersPage: webResult?.data?.hasCareersPage,
        copyrightYear: webResult?.data?.copyrightYear,
        isEcommerce: Boolean(webResult?.data?.isEcommerce?.value),
        hasChatbot: Boolean(webResult?.data?.hasChatbot?.value),
        hasBooking: Boolean(webResult?.data?.hasBooking?.value),
        hasAnalytics: Boolean(webResult?.data?.hasAnalytics?.value),
        hasPixel: Boolean(webResult?.data?.hasPixel?.value),
        isMultilingual: Boolean(webResult?.data?.isMultilingual?.value),
        subpagesCount: webResult?.data?.subpagesScanned?.length || 0,
        websiteUrl: webResult?.data?.url,
      });
      sourcesAudit.push({
        adapterName: this.growthAdapter.name,
        status: 'success',
        durationMs: Date.now() - t5,
        itemsCount: growthData.signals.length,
        executedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      sourcesAudit.push({
        adapterName: this.growthAdapter.name,
        status: 'failed',
        durationMs: Date.now() - t5,
        itemsCount: 0,
        errorMessage: err?.message || 'Errore segnali di crescita',
        executedAt: new Date().toISOString(),
      });
    }

    // 8. Commercial Pain Points
    const painPoints = generateCommercialPainPoints(webResult?.data, lead.sector, deduplicatedContacts.length);

    // 9. Scoring
    const scores = calculateEnrichmentScores({
      sector: lead.sector,
      websiteAnalysis: webResult?.data,
      contacts: deduplicatedContacts,
      financials: companyData,
      growth: growthData,
      osmPresent: Boolean(osmResult?.territorialData?.osmUrl || lead.source === 'maps'),
    });

    const completedAt = new Date().toISOString();

    return {
      leadId,
      runId,
      companyName: lead.companyName,
      domain: domainToAnalyze,
      sector: lead.sector || 'local_services',
      address: lead.address,
      city: lead.city,
      territorialData: osmResult?.territorialData || {},
      websiteAnalysis: webResult?.data || null,
      publicContacts: deduplicatedContacts,
      digitalMaturity: scores.digitalMaturity,
      techStackSummary: webResult?.data?.detectedTechnologies || [],
      financials: companyData,
      reviews: reviewData,
      growth: growthData,
      painPoints,
      sourcesAudit,
      commercialScore: scores.commercialScore,
      reliabilityScore: scores.reliabilityScore,
      startedAt,
      completedAt,
    };
  }
}
