import { NextResponse } from 'next/server';
import { db, orders, leads, companies, quotes, projects, users } from '@ai-crm/db';
import { eq, desc, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { generateOrderCode } from '@/lib/quotes-service';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const leadId = searchParams.get('leadId');
    const managerId = searchParams.get('managerId');
    const q = searchParams.get('q');

    let allOrders = db
      .select({
        id: orders.id,
        code: orders.code,
        title: orders.title,
        leadId: orders.leadId,
        companyId: orders.companyId,
        quoteId: orders.quoteId,
        quoteVersionId: orders.quoteVersionId,
        agreedValue: orders.agreedValue,
        currency: orders.currency,
        status: orders.status,
        managerId: orders.managerId,
        startDate: orders.startDate,
        dueDate: orders.dueDate,
        completedAt: orders.completedAt,
        notes: orders.notes,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        leadCompanyName: leads.companyName,
        managerName: users.name,
      })
      .from(orders)
      .leftJoin(leads, eq(orders.leadId, leads.id))
      .leftJoin(users, eq(orders.managerId, users.id))
      .orderBy(desc(orders.createdAt))
      .all();

    // Attach project count for each order
    const allProjects = db.select({ orderId: projects.orderId, id: projects.id }).from(projects).all();
    const projectCounts = new Map<string, number>();
    for (const p of allProjects) {
      if (p.orderId) {
        projectCounts.set(p.orderId, (projectCounts.get(p.orderId) || 0) + 1);
      }
    }

    let results = allOrders.map((o) => ({
      ...o,
      projectCount: projectCounts.get(o.id) || 0,
    }));

    if (status && status !== 'all') {
      results = results.filter((o) => o.status === status);
    }

    if (leadId) {
      results = results.filter((o) => o.leadId === leadId);
    }

    if (managerId) {
      results = results.filter((o) => o.managerId === managerId);
    }

    if (q) {
      const term = q.toLowerCase();
      results = results.filter(
        (o) =>
          o.code.toLowerCase().includes(term) ||
          o.title.toLowerCase().includes(term) ||
          (o.leadCompanyName && o.leadCompanyName.toLowerCase().includes(term))
      );
    }

    return NextResponse.json({ success: true, orders: results });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore caricamento commesse' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(['admin']);
    const body = await request.json();

    if (!body.title) {
      return NextResponse.json({ error: 'Titolo commessa obbligatorio' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const code = generateOrderCode();

    const newOrder = {
      id: orderId,
      code,
      title: body.title,
      leadId: body.leadId || null,
      companyId: body.companyId || null,
      quoteId: body.quoteId || null,
      quoteVersionId: body.quoteVersionId || null,
      agreedValue: Math.round(Number(body.agreedValue) || 0),
      currency: body.currency || 'EUR',
      status: (body.status || 'da_avviare') as any,
      managerId: body.managerId || user.userId,
      startDate: body.startDate || now.slice(0, 10),
      dueDate: body.dueDate || null,
      completedAt: null,
      deliverablesSnapshotJson: body.deliverablesSnapshotJson || '[]',
      notes: body.notes || null,
      createdBy: user.userId,
      createdAt: now,
      updatedAt: now,
    };

    db.insert(orders).values(newOrder).run();

    await logActivity({
      entityType: 'order',
      entityId: orderId,
      action: 'order_created_manual',
      performedBy: user.userId,
      details: { code, title: body.title },
    });

    return NextResponse.json({ success: true, order: newOrder });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Operazione riservata agli amministratori' }, { status: 403 });
    }
    return NextResponse.json({ error: error?.message || 'Errore creazione commessa' }, { status: 500 });
  }
}
