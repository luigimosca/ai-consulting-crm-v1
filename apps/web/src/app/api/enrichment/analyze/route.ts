import { NextResponse } from 'next/server';
import { db, enrichmentData, leads, companies } from '@ai-crm/db';
import { eq } from 'drizzle-orm';
import { analyzeDomain, calculateScore } from '@ai-crm/ai';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { domain, leadId, sector } = body;

    if (!domain && !leadId) {
      return NextResponse.json({ error: 'Specifica un dominio o un ID lead' }, { status: 400 });
    }

    let targetDomain = domain;
    let targetSector = sector;
    let leadRecord = null;

    if (leadId) {
      leadRecord = db.select().from(leads).where(eq(leads.id, leadId)).get();
      if (leadRecord) {
        if (!targetDomain && leadRecord.website) {
          targetDomain = leadRecord.website;
        }
        if (!targetSector) {
          targetSector = leadRecord.sector;
        }
      }
    }

    if (!targetDomain) {
      targetDomain = 'azienda-italiana.it';
    }

    // Run AI domain enrichment analysis
    const analysis = await analyzeDomain(targetDomain, targetSector);

    // Calculate updated score
    const scoreResult = calculateScore(
      {
        sector: targetSector,
        website: targetDomain,
        source: leadRecord?.source || 'sito',
        phone: leadRecord?.phone || undefined,
        email: leadRecord?.email || undefined,
      },
      analysis
    );

    const now = new Date().toISOString();
    const enrichmentId = `enrich_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Save enrichment record
    db.insert(enrichmentData).values({
      id: enrichmentId,
      leadId: leadId || null,
      companyId: null,
      source: 'ai_enrichment_v1',
      dataJson: JSON.stringify(analysis),
      enrichedAt: now,
    }).run();

    // If lead exists, update lead score and status
    if (leadId && leadRecord) {
      db.update(leads)
        .set({
          score: scoreResult.total,
          status: leadRecord.status === 'nuovo' ? 'arricchito' : leadRecord.status,
          updatedAt: now,
        })
        .where(eq(leads.id, leadId))
        .run();
    }

    return NextResponse.json({
      success: true,
      analysis,
      score: scoreResult,
    });
  } catch (error) {
    console.error('Enrichment analyze error:', error);
    return NextResponse.json({ error: 'Errore durante l analisi di arricchimento' }, { status: 500 });
  }
}
