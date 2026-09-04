import { NextResponse } from 'next/server';
import { db, leads, enrichmentData, demoRequests } from '@ai-crm/db';
import { eq, desc } from 'drizzle-orm';
import { calculateScore } from '@ai-crm/ai';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lead = db.select().from(leads).where(eq(leads.id, id)).get();

    if (!lead) {
      return NextResponse.json({ error: 'Lead non trovato' }, { status: 404 });
    }

    // Fetch associated enrichment data
    const enrichment = db
      .select()
      .from(enrichmentData)
      .where(eq(enrichmentData.leadId, id))
      .orderBy(desc(enrichmentData.enrichedAt))
      .get();

    // Fetch demo requests
    const demos = db
      .select()
      .from(demoRequests)
      .where(eq(demoRequests.leadId, id))
      .orderBy(desc(demoRequests.createdAt))
      .all();

    let parsedEnrichment = null;
    if (enrichment) {
      try {
        parsedEnrichment = {
          ...enrichment,
          data: JSON.parse(enrichment.dataJson),
        };
      } catch (e) {
        parsedEnrichment = enrichment;
      }
    }

    return NextResponse.json({
      lead,
      enrichment: parsedEnrichment,
      demoRequests: demos,
    });
  } catch (error) {
    console.error('Error fetching lead details:', error);
    return NextResponse.json({ error: 'Errore nel recupero del lead' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes, score, website, email, phone, companyName, address, city } = body;

    const lead = db.select().from(leads).where(eq(leads.id, id)).get();
    if (!lead) {
      return NextResponse.json({ error: 'Lead non trovato' }, { status: 404 });
    }

    const updates: Partial<typeof leads.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };

    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (score !== undefined) updates.score = score;
    if (website !== undefined) updates.website = website;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (companyName !== undefined) updates.companyName = companyName;
    if (address !== undefined) updates.address = address;
    if (city !== undefined) updates.city = city;

    db.update(leads).set(updates).where(eq(leads.id, id)).run();

    const updatedLead = db.select().from(leads).where(eq(leads.id, id)).get();
    return NextResponse.json({ success: true, lead: updatedLead });
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json({ error: 'Errore nell aggiornamento del lead' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    db.delete(leads).where(eq(leads.id, id)).run();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json({ error: 'Errore nella cancellazione del lead' }, { status: 500 });
  }
}
