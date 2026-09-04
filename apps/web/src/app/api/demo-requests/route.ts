import { NextResponse } from 'next/server';
import { db, leads, demoRequests } from '@ai-crm/db';
import { calculateScore } from '@ai-crm/ai';

export async function GET() {
  try {
    const requests = db.select().from(demoRequests).all();
    return NextResponse.json({ requests, count: requests.length });
  } catch (error) {
    console.error('Error fetching demo requests:', error);
    return NextResponse.json({ error: 'Errore nel recupero delle demo' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      contactName,
      contactEmail,
      contactPhone,
      sector = 'local_services',
      companySize,
      preferredDate,
      notes,
    } = body;

    if (!contactName || !contactEmail) {
      return NextResponse.json({ error: 'Nome e email sono obbligatori' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const leadId = `lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const demoId = `demo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Automatic high score calculation for inbound demo request
    const scoreResult = calculateScore({
      sector,
      source: 'sito',
      email: contactEmail,
      phone: contactPhone || undefined,
    });

    // Derive company name
    const companyName = contactName.includes('Studio') || contactName.includes('Ristorante') || contactName.includes('Hotel')
      ? contactName
      : `Attività di ${contactName}`;

    // Insert Lead
    const newLead = {
      id: leadId,
      companyName,
      website: null,
      source: 'sito' as const,
      sector: sector as any,
      score: Math.max(85, scoreResult.total), // Inbound demo requests get high priority
      status: 'qualificato' as const,
      phone: contactPhone || null,
      email: contactEmail,
      address: null,
      city: null,
      notes: `[Richiesta Demo dal Sito/Chatbot]\nDimensione: ${companySize || 'N/D'}\nData preferita: ${preferredDate || 'Prima possibile'}\nNote: ${notes || 'Nessuna nota aggiuntiva'}`,
      createdAt: now,
      updatedAt: now,
    };
    db.insert(leads).values(newLead).run();

    // Insert DemoRequest
    const newDemo = {
      id: demoId,
      leadId,
      contactName,
      contactEmail,
      contactPhone: contactPhone || null,
      sector,
      companySize: companySize || null,
      preferredDate: preferredDate || null,
      notes: notes || null,
      status: 'pending' as const,
      createdAt: now,
    };
    db.insert(demoRequests).values(newDemo).run();

    return NextResponse.json({
      success: true,
      lead: newLead,
      demoRequest: newDemo,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating demo request:', error);
    return NextResponse.json({ error: 'Errore durante la creazione della richiesta demo' }, { status: 500 });
  }
}
