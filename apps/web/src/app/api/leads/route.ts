import { NextResponse } from 'next/server';
import { db, leads, companies, demoRequests } from '@ai-crm/db';
import { desc, eq, and, sql } from 'drizzle-orm';
import { calculateScore } from '@ai-crm/ai';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sector = searchParams.get('sector');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const allLeads = db.select().from(leads).orderBy(desc(leads.createdAt)).all();

    let filtered = allLeads;
    if (sector && sector !== 'all') {
      filtered = filtered.filter((l) => l.sector === sector);
    }
    if (status && status !== 'all') {
      filtered = filtered.filter((l) => l.status === status);
    }
    if (search) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (l) =>
          (l.companyName && l.companyName.toLowerCase().includes(q)) ||
          (l.city && l.city.toLowerCase().includes(q)) ||
          (l.email && l.email.toLowerCase().includes(q))
      );
    }

    return NextResponse.json(
      { leads: filtered, count: filtered.length },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: 'Errore nel recupero dei lead' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      companyName,
      website,
      source = 'maps',
      sector = 'local_services',
      phone,
      email,
      address,
      city,
      notes,
    } = body;

    if (!companyName) {
      return NextResponse.json({ error: 'Nome azienda obbligatorio' }, { status: 400 });
    }

    // Controllo duplicati esistenti nel database (per nome azienda e città)
    const existing = db
      .select()
      .from(leads)
      .where(eq(leads.companyName, companyName))
      .all();

    const matchedLead = existing.find(
      (l) => (!city || !l.city || l.city.toLowerCase() === city.toLowerCase())
    );

    if (matchedLead) {
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        lead: matchedLead,
        message: 'Lead già presente nel CRM',
      });
    }

    // Calculate score
    const scoreResult = calculateScore({
      sector,
      website,
      source,
      phone,
      email,
    });

    const now = new Date().toISOString();
    const newLeadId = `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newLead = {
      id: newLeadId,
      companyName,
      website: website || null,
      source: source as 'sito' | 'maps' | 'directory' | 'referral',
      sector: sector as any,
      score: scoreResult.total,
      status: 'nuovo' as const,
      phone: phone || null,
      email: email || null,
      address: address || null,
      city: city || null,
      notes: notes || null,
      createdAt: now,
      updatedAt: now,
    };

    db.insert(leads).values(newLead).run();

    // Also create company record
    const newCompanyId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    db.insert(companies).values({
      id: newCompanyId,
      name: companyName,
      sector,
      address: address || null,
      city: city || null,
      phone: phone || null,
      email: email || null,
      website: website || null,
      techStackJson: null,
      createdAt: now,
      updatedAt: now,
    }).run();

    return NextResponse.json({ success: true, lead: newLead }, { status: 201 });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json({ error: 'Errore durante la creazione del lead' }, { status: 500 });
  }
}
