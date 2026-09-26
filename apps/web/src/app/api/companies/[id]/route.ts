import { NextResponse } from 'next/server';
import { db, companies, projects, orders, quotes, leads, users } from '@ai-crm/db';
import { eq, desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const company = db.select().from(companies).where(eq(companies.id, id)).get();
    if (!company) {
      return NextResponse.json({ error: 'Azienda non trovata' }, { status: 404 });
    }

    // Fetch related projects, orders, quotes, and leads
    const relatedProjects = db
      .select({
        id: projects.id,
        code: projects.code,
        title: projects.title,
        projectType: projects.projectType,
        status: projects.status,
        progressPercent: projects.progressPercent,
        dueDate: projects.dueDate,
      })
      .from(projects)
      .where(eq(projects.companyId, id))
      .orderBy(desc(projects.createdAt))
      .all();

    const relatedOrders = db
      .select({
        id: orders.id,
        code: orders.code,
        title: orders.title,
        agreedValue: orders.agreedValue,
        currency: orders.currency,
        status: orders.status,
        startDate: orders.startDate,
        dueDate: orders.dueDate,
      })
      .from(orders)
      .where(eq(orders.companyId, id))
      .orderBy(desc(orders.createdAt))
      .all();

    const relatedQuotes = db
      .select({
        id: quotes.id,
        quoteNumber: quotes.quoteNumber,
        title: quotes.title,
        status: quotes.status,
        totalAmount: quotes.totalAmount,
        currency: quotes.currency,
        createdAt: quotes.createdAt,
      })
      .from(quotes)
      .where(eq(quotes.companyId, id))
      .orderBy(desc(quotes.createdAt))
      .all();

    return NextResponse.json({
      success: true,
      company,
      projects: relatedProjects,
      orders: relatedOrders,
      quotes: relatedQuotes,
    });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || 'Errore recupero dettaglio azienda' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const existing = db.select().from(companies).where(eq(companies.id, id)).get();
    if (!existing) {
      return NextResponse.json({ error: 'Azienda non trovata' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updateData: any = {
      updatedAt: now,
    };

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.vatId !== undefined) updateData.vatId = body.vatId?.trim() || null;
    if (body.sector !== undefined) updateData.sector = body.sector;
    if (body.estimatedRevenue !== undefined) updateData.estimatedRevenue = body.estimatedRevenue;
    if (body.employeeCount !== undefined) updateData.employeeCount = body.employeeCount;
    if (body.address !== undefined) updateData.address = body.address?.trim() || null;
    if (body.city !== undefined) updateData.city = body.city?.trim() || null;
    if (body.phone !== undefined) updateData.phone = body.phone?.trim() || null;
    if (body.email !== undefined) updateData.email = body.email?.trim() || null;
    if (body.website !== undefined) updateData.website = body.website?.trim() || null;
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;

    db.update(companies).set(updateData).where(eq(companies.id, id)).run();

    await logActivity({
      entityType: 'company',
      entityId: id,
      action: 'company_updated',
      performedBy: user.userId,
      details: { updatedFields: Object.keys(updateData) },
    });

    const updated = db.select().from(companies).where(eq(companies.id, id)).get();
    return NextResponse.json({ success: true, company: updated });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || 'Errore aggiornamento azienda' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['admin']);
    const { id } = await params;

    const existing = db.select().from(companies).where(eq(companies.id, id)).get();
    if (!existing) {
      return NextResponse.json({ error: 'Azienda non trovata' }, { status: 404 });
    }

    // Check if there are active projects or orders
    const activeProjects = db.select().from(projects).where(eq(projects.companyId, id)).all();
    const activeOrders = db.select().from(orders).where(eq(orders.companyId, id)).all();

    if (activeProjects.length > 0 || activeOrders.length > 0) {
      return NextResponse.json(
        {
          error: `Impossibile eliminare l'azienda: sono presenti ${activeProjects.length} progetti e ${activeOrders.length} commesse collegate.`,
        },
        { status: 400 }
      );
    }

    db.delete(companies).where(eq(companies.id, id)).run();

    await logActivity({
      entityType: 'company',
      entityId: id,
      action: 'company_deleted',
      performedBy: user.userId,
      details: { name: existing.name },
    });

    return NextResponse.json({ success: true, message: 'Azienda eliminata con successo' });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Operazione riservata agli amministratori' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error?.message || 'Errore eliminazione azienda' },
      { status: 500 }
    );
  }
}
