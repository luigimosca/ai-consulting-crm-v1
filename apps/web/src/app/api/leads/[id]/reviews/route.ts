import { NextResponse } from 'next/server';
import { db, leads, reviewsSignals, enrichmentRuns } from '@ai-crm/db';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const records = db
      .select()
      .from(reviewsSignals)
      .where(eq(reviewsSignals.leadId, id))
      .orderBy(desc(reviewsSignals.collectedAt))
      .all();

    return NextResponse.json({ success: true, reviews: records });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Errore recupero recensioni' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { ratingValue, reviewCount, platform, sourceUrl, notes } = body;

    const lead = db.select().from(leads).where(eq(leads.id, id)).get();
    if (!lead) {
      return NextResponse.json({ error: 'Lead non trovato' }, { status: 404 });
    }

    // Trova o crea un runId
    const latestRun = db
      .select()
      .from(enrichmentRuns)
      .where(eq(enrichmentRuns.leadId, id))
      .orderBy(desc(enrichmentRuns.startedAt))
      .get();

    const runId = latestRun?.id || `run_manual_${Date.now()}`;

    if (!latestRun) {
      db.insert(enrichmentRuns).values({
        id: runId,
        leadId: id,
        status: 'completed',
        overallConfidence: 0.9,
        commercialScore: lead.score || 70,
        reliabilityScore: 80,
        summaryJson: JSON.stringify({ note: 'Audit manuale recensioni' }),
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      }).run();
    }

    const recId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const signals = [
      `Valutazione verificata: ${ratingValue} stelle`,
      `Volume recensioni: ${reviewCount} recensioni`,
      `Piattaforma: ${platform || 'TripAdvisor / Google Maps'}`,
    ];
    if (notes) signals.push(`Note: ${notes}`);

    db.insert(reviewsSignals).values({
      id: recId,
      leadId: id,
      runId,
      sourceName: platform || 'Audit Ufficiale Reputazione',
      sourceUrl: sourceUrl || null,
      hasPublicRating: true,
      ratingValue: Number(ratingValue),
      reviewCount: Number(reviewCount),
      signalsJson: JSON.stringify(signals),
      collectedAt: now,
    }).run();

    return NextResponse.json({ success: true, recordId: recId });
  } catch (error: any) {
    console.error('Error saving review audit:', error);
    return NextResponse.json({ error: error?.message || 'Errore salvataggio recensioni' }, { status: 500 });
  }
}
