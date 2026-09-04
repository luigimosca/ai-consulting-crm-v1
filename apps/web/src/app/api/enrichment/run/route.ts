import { NextResponse } from 'next/server';
import { db, leads, enrichmentRuns, websiteAnalysis, publicContacts, financialIndicators, reviewsSignals, growthSignals, enrichmentSources } from '@ai-crm/db';
import { eq } from 'drizzle-orm';
import { EnrichmentOrchestrator } from '@ai-crm/ai';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { leadId, companyName, website, phone, email, address, city, sector, notes } = body;

    if (!leadId && !companyName) {
      return NextResponse.json(
        { success: false, error: 'Specificare un leadId valido o i dati minimi dell\'azienda' },
        { status: 400 }
      );
    }

    let targetLead: any = null;
    if (leadId) {
      targetLead = db.select().from(leads).where(eq(leads.id, leadId)).get();
    }

    const leadInput = targetLead || {
      id: leadId || `lead_tmp_${Date.now()}`,
      companyName: companyName || 'Attività',
      website: website || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      city: city || null,
      sector: sector || 'local_services',
      notes: notes || null,
      source: 'maps',
    };

    const orchestrator = new EnrichmentOrchestrator();
    const dossier = await orchestrator.runEnrichment(leadInput);

    // Persistenza nel database
    try {
      // 0. Assicura che il lead esista nella tabella leads
      const existingLead = db.select().from(leads).where(eq(leads.id, dossier.leadId)).get();
      if (!existingLead) {
        db.insert(leads).values({
          id: dossier.leadId,
          companyName: leadInput.companyName,
          website: leadInput.website || dossier.websiteAnalysis?.url || null,
          source: 'maps',
          sector: leadInput.sector as any || 'local_services',
          score: dossier.commercialScore,
          status: 'arricchito',
          phone: leadInput.phone || null,
          email: leadInput.email || null,
          address: leadInput.address || null,
          city: leadInput.city || null,
          notes: leadInput.notes || null,
          createdAt: dossier.startedAt,
          updatedAt: dossier.completedAt,
        }).run();
      }

      // 1. Inserisci Run
      db.insert(enrichmentRuns).values({
        id: dossier.runId,
        leadId: dossier.leadId,
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

      // 2. Inserisci Website Analysis se presente
      if (dossier.websiteAnalysis) {
        const wa = dossier.websiteAnalysis;
        db.insert(websiteAnalysis).values({
          id: `wa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          leadId: dossier.leadId,
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

      // 3. Inserisci Contatti
      for (const c of dossier.publicContacts) {
        db.insert(publicContacts).values({
          id: c.id || `pc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          leadId: dossier.leadId,
          runId: dossier.runId,
          type: c.type,
          value: c.value,
          sourceUrl: c.sourceUrl,
          confidence: c.confidence,
          isVerified: c.isVerified,
          collectedAt: c.collectedAt,
        }).run();
      }

      // 4. Inserisci Indicatori Economici
      const fin = dossier.financials;
      db.insert(financialIndicators).values({
        id: `fi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        leadId: dossier.leadId,
        runId: dossier.runId,
        vatId: fin.vatId.value || null,
        taxCode: fin.taxCode.value || null,
        legalForm: fin.legalForm.value || null,
        atecoCode: fin.atecoCode.value || null,
        revenueType: fin.revenueType,
        revenueMin: fin.revenue.min || null,
        revenueMax: fin.revenue.max || null,
        revenueOfficial: null,
        profitOfficial: null,
        employeesMin: fin.employees.min || null,
        employeesMax: fin.employees.max || null,
        employeesOfficial: null,
        sourceName: fin.revenue.source,
        sourceUrl: fin.revenue.sourceUrl,
        sourceYear: fin.revenue.sourceYear || null,
        confidence: fin.revenue.confidence,
        notes: fin.notes || null,
        collectedAt: fin.revenue.collectedAt,
      }).run();

      // 5. Inserisci Recensioni & Reputazione
      if (dossier.reviews) {
        db.insert(reviewsSignals).values({
          id: `rs_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          leadId: dossier.leadId,
          runId: dossier.runId,
          sourceName: dossier.reviews.sourceName,
          sourceUrl: dossier.reviews.sourceUrl,
          hasPublicRating: dossier.reviews.hasPublicRating,
          ratingValue: dossier.reviews.ratingValue,
          reviewCount: dossier.reviews.reviewCount,
          signalsJson: JSON.stringify(dossier.reviews.signals),
          collectedAt: dossier.reviews.collectedAt,
        }).run();
      }

      // 6. Inserisci Segnali di Crescita
      if (dossier.growth) {
        db.insert(growthSignals).values({
          id: `gs_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          leadId: dossier.leadId,
          runId: dossier.runId,
          growthLevel: dossier.growth.growthLevel,
          confidence: dossier.growth.confidence,
          signalsJson: JSON.stringify(dossier.growth.signals),
          sourceUrlsJson: JSON.stringify(dossier.growth.sourceUrls),
          observedAt: dossier.growth.observedAt,
        }).run();
      }

      // 7. Inserisci Fonti Audit Trail
      for (const src of dossier.sourcesAudit) {
        db.insert(enrichmentSources).values({
          id: `es_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          leadId: dossier.leadId,
          runId: dossier.runId,
          adapterName: src.adapterName,
          status: src.status,
          durationMs: src.durationMs,
          itemsCount: src.itemsCount,
          errorMessage: src.errorMessage || null,
          executedAt: src.executedAt,
        }).run();
      }

      // 8. Aggiorna lo stato e lo score del lead
      const discoveredEmail = dossier.publicContacts.find((c) => c.type.includes('email') || c.type === 'pec')?.value;
      const discoveredPhone = dossier.publicContacts.find((c) => c.type === 'phone')?.value;

      db.update(leads)
        .set({
          status: 'arricchito',
          score: dossier.commercialScore,
          email: targetLead?.email || discoveredEmail || null,
          phone: targetLead?.phone || discoveredPhone || null,
          website: targetLead?.website || dossier.websiteAnalysis?.url || null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(leads.id, dossier.leadId))
        .run();
    } catch (dbErr) {
      console.error('[Enrichment API] Errore salvataggio DB:', dbErr);
    }

    return NextResponse.json({
      success: true,
      dossier,
      sourcesAudit: dossier.sourcesAudit,
    });
  } catch (error: any) {
    console.error('[Enrichment API Run] Errore:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Errore durante l\'esecuzione dell\'arricchimento lead',
      },
      { status: 500 }
    );
  }
}
