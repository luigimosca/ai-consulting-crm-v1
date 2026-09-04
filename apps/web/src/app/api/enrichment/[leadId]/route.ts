import { NextResponse } from 'next/server';
import { db, leads, enrichmentRuns, websiteAnalysis, publicContacts, financialIndicators, reviewsSignals, growthSignals, enrichmentSources } from '@ai-crm/db';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params;

    const lead = db.select().from(leads).where(eq(leads.id, leadId)).get();
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead non trovato' }, { status: 404 });
    }

    // Trova l'ultimo run di arricchimento
    const latestRun = db
      .select()
      .from(enrichmentRuns)
      .where(eq(enrichmentRuns.leadId, leadId))
      .orderBy(desc(enrichmentRuns.startedAt))
      .get();

    if (!latestRun) {
      return NextResponse.json({
        success: true,
        hasEnrichment: false,
        lead,
        dossier: null,
      });
    }

    const runId = latestRun.id;

    // Recupera dati da tutte le tabelle collegate
    const webAnalysisRecord = db
      .select()
      .from(websiteAnalysis)
      .where(eq(websiteAnalysis.runId, runId))
      .get();

    const contactsRecords = db
      .select()
      .from(publicContacts)
      .where(eq(publicContacts.runId, runId))
      .all();

    const financialRecord = db
      .select()
      .from(financialIndicators)
      .where(eq(financialIndicators.runId, runId))
      .get();

    const reviewsRecord = db
      .select()
      .from(reviewsSignals)
      .where(eq(reviewsSignals.runId, runId))
      .get();

    const growthRecord = db
      .select()
      .from(growthSignals)
      .where(eq(growthSignals.runId, runId))
      .get();

    const sourcesAuditRecords = db
      .select()
      .from(enrichmentSources)
      .where(eq(enrichmentSources.runId, runId))
      .all();

    const allRuns = db
      .select()
      .from(enrichmentRuns)
      .where(eq(enrichmentRuns.leadId, leadId))
      .orderBy(desc(enrichmentRuns.startedAt))
      .all();

    return NextResponse.json({
      success: true,
      hasEnrichment: true,
      lead,
      run: latestRun,
      websiteAnalysis: webAnalysisRecord || null,
      publicContacts: contactsRecords,
      financials: financialRecord || null,
      reviews: reviewsRecord || null,
      growth: growthRecord || null,
      sourcesAudit: sourcesAuditRecords,
      historyCount: allRuns.length,
    });
  } catch (error: any) {
    console.error('[Enrichment API GET Lead] Errore:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Errore recupero dossier lead' },
      { status: 500 }
    );
  }
}
