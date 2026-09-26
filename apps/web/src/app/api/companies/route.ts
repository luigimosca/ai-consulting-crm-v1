import { NextResponse } from 'next/server';
import { db, companies, projects, orders, quotes, users } from '@ai-crm/db';
import { eq, desc, like } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const sector = searchParams.get('sector');
    const city = searchParams.get('city');

    let allCompanies = db
      .select()
      .from(companies)
      .orderBy(desc(companies.createdAt))
      .all();

    // Attach counts for projects, orders and quotes
    const allProjects = db.select({ companyId: projects.companyId }).from(projects).all();
    const allOrders = db.select({ companyId: orders.companyId }).from(orders).all();
    const allQuotes = db.select({ companyId: quotes.companyId }).from(quotes).all();

    const projectCounts = new Map<string, number>();
    for (const p of allProjects) {
      if (p.companyId) {
        projectCounts.set(p.companyId, (projectCounts.get(p.companyId) || 0) + 1);
      }
    }

    const orderCounts = new Map<string, number>();
    for (const o of allOrders) {
      if (o.companyId) {
        orderCounts.set(o.companyId, (orderCounts.get(o.companyId) || 0) + 1);
      }
    }

    const quoteCounts = new Map<string, number>();
    for (const qItem of allQuotes) {
      if (qItem.companyId) {
        quoteCounts.set(qItem.companyId, (quoteCounts.get(qItem.companyId) || 0) + 1);
      }
    }

    let results = allCompanies.map((c) => ({
      ...c,
      projectsCount: projectCounts.get(c.id) || 0,
      ordersCount: orderCounts.get(c.id) || 0,
      quotesCount: quoteCounts.get(c.id) || 0,
    }));

    if (sector && sector !== 'all') {
      results = results.filter((c) => c.sector === sector);
    }

    if (city && city !== 'all') {
      results = results.filter((c) => c.city && c.city.toLowerCase() === city.toLowerCase());
    }

    if (q) {
      const term = q.toLowerCase();
      results = results.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          (c.vatId && c.vatId.toLowerCase().includes(term)) ||
          (c.city && c.city.toLowerCase().includes(term)) ||
          (c.email && c.email.toLowerCase().includes(term)) ||
          (c.website && c.website.toLowerCase().includes(term))
      );
    }

    return NextResponse.json({ success: true, companies: results });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || 'Errore recupero anagrafica aziende' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: 'La ragione sociale / nome azienda è obbligatorio' }, { status: 400 });
    }

    const trimmedName = body.name.trim();
    const trimmedVat = body.vatId?.trim() || null;
    const trimmedFiscal = body.fiscalCode?.trim() || null;
    const trimmedCity = body.city?.trim() || null;
    const trimmedPlaceId = body.providerPlaceId?.trim() || null;
    const force = Boolean(body.force);

    // Controllo duplicati pre-creazione se non forzato
    if (!force) {
      const allExisting = db.select().from(companies).all();
      for (const exist of allExisting) {
        let dupReason: string | null = null;
        if (trimmedVat && exist.vatId && exist.vatId.trim() === trimmedVat) {
          dupReason = `Partita IVA già registrata (${exist.vatId})`;
        } else if (trimmedFiscal && exist.fiscalCode && exist.fiscalCode.trim() === trimmedFiscal) {
          dupReason = `Codice Fiscale già registrato (${exist.fiscalCode})`;
        } else if (trimmedPlaceId && exist.providerPlaceId && exist.providerPlaceId.trim() === trimmedPlaceId) {
          dupReason = `Luogo OpenStreetMap già registrato (${exist.providerPlaceId})`;
        } else if (
          trimmedCity &&
          exist.city &&
          exist.name.toLowerCase() === trimmedName.toLowerCase() &&
          exist.city.toLowerCase() === trimmedCity.toLowerCase()
        ) {
          dupReason = `Azienda con stesso nome e comune già presente (${exist.name}, ${exist.city})`;
        }

        if (dupReason) {
          return NextResponse.json(
            {
              error: `Azienda già presente nel CRM: ${dupReason}`,
              duplicateOfCompanyId: exist.id,
              duplicateCompany: exist,
              isDuplicate: true,
            },
            { status: 409 }
          );
        }
      }
    }

    const now = new Date().toISOString();
    const companyId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newCompany = {
      id: companyId,
      name: trimmedName,
      legalName: body.legalName?.trim() || null,
      vatId: trimmedVat,
      fiscalCode: trimmedFiscal,
      rea: body.rea?.trim() || null,
      sector: body.sector || 'local_services',
      ateco: body.ateco?.trim() || null,
      legalAddress: body.legalAddress?.trim() || null,
      operatingAddress: body.operatingAddress?.trim() || null,
      estimatedRevenue: body.estimatedRevenue || null,
      employeeCount: body.employeeCount || null,
      techStackJson: body.techStack ? JSON.stringify(body.techStack) : null,
      address: body.address?.trim() || body.operatingAddress?.trim() || body.legalAddress?.trim() || null,
      city: trimmedCity,
      province: body.province?.trim() || null,
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      pec: body.pec?.trim() || null,
      website: body.website?.trim() || null,
      rating: body.rating !== undefined && body.rating !== null ? Number(body.rating) : null,
      reviewCount: body.reviewCount !== undefined && body.reviewCount !== null ? Number(body.reviewCount) : null,
      notes: body.notes?.trim() || null,
      source: body.source?.trim() || 'inserimento_manuale',
      sourceUrl: body.sourceUrl?.trim() || null,
      providerPlaceId: trimmedPlaceId,
      confidence: body.confidence?.trim() || (body.source ? 'high' : 'medium'),
      rawSourceData: body.rawSourceData ? (typeof body.rawSourceData === 'string' ? body.rawSourceData : JSON.stringify(body.rawSourceData)) : null,
      fieldSourcesJson: body.fieldSources ? (typeof body.fieldSources === 'string' ? body.fieldSources : JSON.stringify(body.fieldSources)) : null,
      createdAt: now,
      updatedAt: now,
    };

    db.insert(companies).values(newCompany).run();

    await logActivity({
      entityType: 'company',
      entityId: companyId,
      action: 'company_created',
      performedBy: user.userId,
      details: {
        name: newCompany.name,
        legalName: newCompany.legalName,
        sector: newCompany.sector,
        vatId: newCompany.vatId,
        source: newCompany.source,
      },
    });

    return NextResponse.json({ success: true, company: newCompany }, { status: 201 });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || 'Errore creazione azienda' },
      { status: 500 }
    );
  }
}

