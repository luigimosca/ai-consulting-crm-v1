import { NextResponse } from 'next/server';
import { db, leads } from '@ai-crm/db';
import { eq } from 'drizzle-orm';
import { calculateScore } from '@ai-crm/ai';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { leadId, sector, website, source, phone, email, enrichment } = body;

    let leadData = { sector, website, source, phone, email };

    if (leadId) {
      const existing = db.select().from(leads).where(eq(leads.id, leadId)).get();
      if (existing) {
        leadData = {
          sector: sector || existing.sector,
          website: website || existing.website || undefined,
          source: source || existing.source,
          phone: phone || existing.phone || undefined,
          email: email || existing.email || undefined,
        };
      }
    }

    const result = calculateScore(leadData, enrichment);

    if (leadId) {
      db.update(leads)
        .set({
          score: result.total,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(leads.id, leadId))
        .run();
    }

    return NextResponse.json({ success: true, score: result });
  } catch (error) {
    console.error('Scoring calculation error:', error);
    return NextResponse.json({ error: 'Errore nel calcolo dello score' }, { status: 500 });
  }
}
