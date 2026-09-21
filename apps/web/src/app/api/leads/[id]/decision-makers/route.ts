import { NextResponse } from 'next/server';
import { db, leads, decisionMakers, enrichmentRuns } from '@ai-crm/db';
import { eq, desc, and } from 'drizzle-orm';
import { discoverDecisionMakers } from '@ai-crm/ai';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let records = db
      .select()
      .from(decisionMakers)
      .where(eq(decisionMakers.leadId, id))
      .orderBy(desc(decisionMakers.confidence))
      .all();

    // Se non ci sono ancora record, avvia discovery automatica immediata
    if (records.length === 0) {
      const lead = db.select().from(leads).where(eq(leads.id, id)).get();
      if (lead) {
        const now = new Date().toISOString();
        const discovery = await discoverDecisionMakers({
          companyName: lead.companyName,
          website: lead.website,
          sector: lead.sector,
          city: lead.city,
          address: lead.address,
          notes: lead.notes,
        });

        for (const dm of discovery.decisionMakers) {
          const recId = `dm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const newRecord = {
            id: recId,
            leadId: id,
            runId: null,
            fullName: dm.fullName,
            role: dm.role,
            department: dm.department,
            seniority: dm.seniority,
            email: dm.email || null,
            phone: dm.phone || null,
            linkedinUrl: dm.linkedinUrl || null,
            avatarUrl: dm.avatarUrl || null,
            confidence: dm.confidence,
            source: dm.source,
            sourceUrl: dm.sourceUrl || null,
            rawData: dm.rawData || null,
            extractedAt: dm.extractedAt || now,
            lastVerifiedAt: dm.lastVerifiedAt || now,
            verificationMethod: dm.verificationMethod || 'website_published',
            isVerified: dm.isVerified,
            notes: dm.notes || null,
            createdAt: now,
            updatedAt: now,
          };

          try {
            db.insert(decisionMakers).values(newRecord).run();
          } catch {}
        }

        records = db
          .select()
          .from(decisionMakers)
          .where(eq(decisionMakers.leadId, id))
          .orderBy(desc(decisionMakers.confidence))
          .all();
      }
    }

    return NextResponse.json({ success: true, decisionMakers: records });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Errore durante il recupero dei decisori' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action = 'discover' } = body;

    const lead = db.select().from(leads).where(eq(leads.id, id)).get();
    if (!lead) {
      return NextResponse.json({ error: 'Lead non trovato' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // 1. Discovery Automatica con AI
    if (action === 'discover') {
      const discovery = await discoverDecisionMakers({
        companyName: lead.companyName,
        website: lead.website,
        sector: lead.sector,
        city: lead.city,
        address: lead.address,
        notes: lead.notes,
      });

      // Salva i decisori trovati evitando duplicati
      const existing = db
        .select()
        .from(decisionMakers)
        .where(eq(decisionMakers.leadId, id))
        .all();

      const existingNames = new Set(existing.map((e) => e.fullName.toLowerCase().trim()));
      const savedRecords: any[] = [];

      for (const dm of discovery.decisionMakers) {
        if (!existingNames.has(dm.fullName.toLowerCase().trim())) {
          const recId = `dm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const newRecord = {
            id: recId,
            leadId: id,
            runId: null,
            fullName: dm.fullName,
            role: dm.role,
            department: dm.department,
            seniority: dm.seniority,
            email: dm.email || null,
            phone: dm.phone || null,
            linkedinUrl: dm.linkedinUrl || null,
            avatarUrl: dm.avatarUrl || null,
            confidence: dm.confidence,
            source: dm.source,
            sourceUrl: dm.sourceUrl || null,
            rawData: dm.rawData || null,
            extractedAt: dm.extractedAt || now,
            lastVerifiedAt: dm.lastVerifiedAt || now,
            verificationMethod: dm.verificationMethod || 'website_published',
            isVerified: dm.isVerified,
            notes: dm.notes || null,
            createdAt: now,
            updatedAt: now,
          };

          db.insert(decisionMakers).values(newRecord).run();
          savedRecords.push(newRecord);
        }
      }

      // Restituisci la lista aggiornata di tutti i decisori
      const allRecords = db
        .select()
        .from(decisionMakers)
        .where(eq(decisionMakers.leadId, id))
        .orderBy(desc(decisionMakers.confidence))
        .all();

      return NextResponse.json({
        success: true,
        decisionMakers: allRecords,
        newlyFoundCount: savedRecords.length,
        summary: discovery.summary,
      });
    }

    // 2. Creazione Manuale di un Decisore
    const {
      fullName,
      role,
      department = 'management',
      seniority = 'owner',
      email,
      phone,
      linkedinUrl,
      notes,
    } = body;

    if (!fullName || !role) {
      return NextResponse.json({ error: 'Nome completo e ruolo sono obbligatori' }, { status: 400 });
    }

    const recId = `dm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const manualRecord = {
      id: recId,
      leadId: id,
      runId: null,
      fullName: fullName.trim(),
      role: role.trim(),
      department: department as any,
      seniority: seniority as any,
      email: email ? email.trim() : null,
      phone: phone ? phone.trim() : null,
      linkedinUrl: linkedinUrl ? linkedinUrl.trim() : null,
      avatarUrl: null,
      confidence: 1.0,
      source: 'manual_input' as const,
      sourceUrl: null,
      rawData: null,
      extractedAt: now,
      lastVerifiedAt: now,
      verificationMethod: 'manual_verified' as const,
      isVerified: true,
      notes: notes ? notes.trim() : null,
      createdAt: now,
      updatedAt: now,
    };

    db.insert(decisionMakers).values(manualRecord).run();

    return NextResponse.json({ success: true, decisionMaker: manualRecord }, { status: 201 });
  } catch (error: any) {
    console.error('Error in decision-makers POST:', error);
    return NextResponse.json(
      { error: error?.message || 'Errore durante l\'elaborazione dei decisori' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { decisionMakerId, fullName, role, department, seniority, email, phone, linkedinUrl, isVerified, notes } = body;

    if (!decisionMakerId) {
      return NextResponse.json({ error: 'ID decisore mancante' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const updateData: any = {
      updatedAt: now,
    };

    if (fullName !== undefined) updateData.fullName = fullName.trim();
    if (role !== undefined) updateData.role = role.trim();
    if (department !== undefined) updateData.department = department;
    if (seniority !== undefined) updateData.seniority = seniority;
    if (email !== undefined) updateData.email = email ? email.trim() : null;
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
    if (linkedinUrl !== undefined) updateData.linkedinUrl = linkedinUrl ? linkedinUrl.trim() : null;
    if (isVerified !== undefined) {
      updateData.isVerified = isVerified;
      if (isVerified) {
        updateData.lastVerifiedAt = now;
        updateData.verificationMethod = 'manual_verified';
      }
    }
    if (notes !== undefined) updateData.notes = notes ? notes.trim() : null;

    db.update(decisionMakers)
      .set(updateData)
      .where(and(eq(decisionMakers.id, decisionMakerId), eq(decisionMakers.leadId, id)))
      .run();

    const updated = db.select().from(decisionMakers).where(eq(decisionMakers.id, decisionMakerId)).get();

    return NextResponse.json({ success: true, decisionMaker: updated });
  } catch (error: any) {
    console.error('Error updating decision maker:', error);
    return NextResponse.json(
      { error: error?.message || 'Errore durante l\'aggiornamento del decisore' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const decisionMakerId = searchParams.get('decisionMakerId');

    if (!decisionMakerId) {
      return NextResponse.json({ error: 'ID decisore mancante' }, { status: 400 });
    }

    db.delete(decisionMakers)
      .where(and(eq(decisionMakers.id, decisionMakerId), eq(decisionMakers.leadId, id)))
      .run();

    return NextResponse.json({ success: true, message: 'Decisore eliminato con successo' });
  } catch (error: any) {
    console.error('Error deleting decision maker:', error);
    return NextResponse.json(
      { error: error?.message || 'Errore durante l\'eliminazione del decisore' },
      { status: 500 }
    );
  }
}
