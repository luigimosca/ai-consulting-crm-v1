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

    const now = new Date().toISOString();
    const companyId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newCompany = {
      id: companyId,
      name: body.name.trim(),
      vatId: body.vatId?.trim() || null,
      sector: body.sector || 'local_services',
      estimatedRevenue: body.estimatedRevenue || null,
      employeeCount: body.employeeCount || null,
      techStackJson: body.techStack ? JSON.stringify(body.techStack) : null,
      address: body.address?.trim() || null,
      city: body.city?.trim() || null,
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      website: body.website?.trim() || null,
      rating: body.rating ? Number(body.rating) : null,
      reviewCount: body.reviewCount ? Number(body.reviewCount) : 0,
      notes: body.notes?.trim() || null,
      createdAt: now,
      updatedAt: now,
    };

    db.insert(companies).values(newCompany).run();

    await logActivity({
      entityType: 'company',
      entityId: companyId,
      action: 'company_created',
      performedBy: user.userId,
      details: { name: newCompany.name, sector: newCompany.sector, vatId: newCompany.vatId },
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
