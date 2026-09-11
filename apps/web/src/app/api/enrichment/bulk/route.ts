import { NextResponse } from 'next/server';
import { db, leads } from '@ai-crm/db';
import { eq, inArray } from 'drizzle-orm';
import { EnrichmentOrchestrator } from '@ai-crm/ai';
import { saveEnrichmentDossierToDb } from '@/lib/enrichment-db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { leadIds, unEnrichedOnly = false, limit = 10 } = body;

    let targetLeads: any[] = [];

    if (Array.isArray(leadIds) && leadIds.length > 0) {
      targetLeads = db.select().from(leads).where(inArray(leads.id, leadIds)).all();
    } else if (unEnrichedOnly) {
      targetLeads = db
        .select()
        .from(leads)
        .where(eq(leads.status, 'nuovo'))
        .limit(limit)
        .all();
    } else {
      targetLeads = db.select().from(leads).limit(limit).all();
    }

    if (targetLeads.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nessun lead da arricchire',
        processedCount: 0,
        errorsCount: 0,
        results: [],
      });
    }

    const orchestrator = new EnrichmentOrchestrator();
    const results: any[] = [];
    let errorsCount = 0;

    for (const l of targetLeads) {
      try {
        const leadInput = {
          id: l.id,
          companyName: l.companyName,
          website: l.website,
          phone: l.phone,
          email: l.email,
          address: l.address,
          city: l.city,
          sector: l.sector,
          notes: l.notes,
          source: l.source,
        };

        const dossier = await orchestrator.runEnrichment(leadInput);
        
        // Persist to database
        saveEnrichmentDossierToDb({ dossier, leadInput });

        results.push({
          leadId: l.id,
          companyName: l.companyName,
          success: true,
          commercialScore: dossier.commercialScore,
          reliabilityScore: dossier.reliabilityScore,
        });
      } catch (err: any) {
        errorsCount++;
        results.push({
          leadId: l.id,
          companyName: l.companyName,
          success: false,
          error: err?.message || 'Errore arricchimento lead',
        });
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: results.length,
      errorsCount,
      results,
    });
  } catch (error: any) {
    console.error('[Enrichment API Bulk] Errore:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Errore durante l\'arricchimento massivo' },
      { status: 500 }
    );
  }
}
