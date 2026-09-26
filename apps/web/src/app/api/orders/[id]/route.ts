import { NextResponse } from 'next/server';
import {
  db,
  orders,
  leads,
  companies,
  quotes,
  quoteVersions,
  projects,
  documents,
  approvals,
  activityLog,
  users,
} from '@ai-crm/db';
import { eq, desc, and } from 'drizzle-orm';
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

    const order = db.select().from(orders).where(eq(orders.id, id)).get();
    if (!order) {
      return NextResponse.json({ error: 'Commessa non trovata' }, { status: 404 });
    }

    // Manager info
    let manager = null;
    if (order.managerId) {
      manager = db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, order.managerId)).get();
    }

    // Lead & Company
    let lead = null;
    if (order.leadId) {
      lead = db.select().from(leads).where(eq(leads.id, order.leadId)).get();
    }

    let company = null;
    if (order.companyId) {
      company = db.select().from(companies).where(eq(companies.id, order.companyId)).get();
    }

    // Quote & Quote Version
    let quote = null;
    if (order.quoteId) {
      quote = db.select().from(quotes).where(eq(quotes.id, order.quoteId)).get();
    }

    let quoteVersion = null;
    if (order.quoteVersionId) {
      quoteVersion = db.select().from(quoteVersions).where(eq(quoteVersions.id, order.quoteVersionId)).get();
    }

    // Linked Projects
    const linkedProjects = db
      .select({
        id: projects.id,
        code: projects.code,
        title: projects.title,
        description: projects.description,
        status: projects.status,
        managerId: projects.managerId,
        startDate: projects.startDate,
        dueDate: projects.dueDate,
        progressPercent: projects.progressPercent,
        createdAt: projects.createdAt,
        managerName: users.name,
      })
      .from(projects)
      .leftJoin(users, eq(projects.managerId, users.id))
      .where(eq(projects.orderId, id))
      .orderBy(desc(projects.createdAt))
      .all();

    // Linked Documents
    const linkedDocs = db
      .select()
      .from(documents)
      .where(and(eq(documents.entityType, 'order'), eq(documents.entityId, id)))
      .orderBy(desc(documents.createdAt))
      .all();

    // Timeline / Approvals of the parent quote if any
    const quoteApprovals = order.quoteId
      ? db.select().from(approvals).where(eq(approvals.entityId, order.quoteId)).all()
      : [];

    // Activity Log
    const logs = db
      .select({
        id: activityLog.id,
        action: activityLog.action,
        performedBy: activityLog.performedBy,
        detailsJson: activityLog.detailsJson,
        createdAt: activityLog.createdAt,
        userName: users.name,
      })
      .from(activityLog)
      .leftJoin(users, eq(activityLog.performedBy, users.id))
      .where(and(eq(activityLog.entityType, 'order'), eq(activityLog.entityId, id)))
      .orderBy(desc(activityLog.createdAt))
      .all();

    return NextResponse.json({
      success: true,
      order,
      manager,
      lead,
      company,
      quote,
      quoteVersion,
      projects: linkedProjects,
      documents: linkedDocs,
      approvals: quoteApprovals,
      activityLogs: logs,
    });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore caricamento commessa' }, { status: 500 });
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

    const order = db.select().from(orders).where(eq(orders.id, id)).get();
    if (!order) {
      return NextResponse.json({ error: 'Commessa non trovata' }, { status: 404 });
    }

    // Only Admin can change status or manager of commessa
    if (user.role !== 'admin' && (body.status || body.managerId || body.agreedValue)) {
      return NextResponse.json(
        { error: 'Solo gli amministratori possono modificare stato o parametri contrattuali della commessa.' },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    const updates: any = { updatedAt: now };

    if (body.title !== undefined) updates.title = body.title;
    if (body.managerId !== undefined) updates.managerId = body.managerId;
    if (body.startDate !== undefined) updates.startDate = body.startDate;
    if (body.dueDate !== undefined) updates.dueDate = body.dueDate;
    if (body.notes !== undefined) updates.notes = body.notes;

    if (body.status !== undefined && body.status !== order.status) {
      // Validate transition
      const validStatuses = ['da_avviare', 'attiva', 'sospesa', 'completata', 'annullata'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: 'Stato commessa non valido' }, { status: 400 });
      }
      updates.status = body.status;
      if (body.status === 'completata') {
        updates.completedAt = now;
      }
    }

    db.update(orders).set(updates).where(eq(orders.id, id)).run();

    await logActivity({
      entityType: 'order',
      entityId: id,
      action: 'order_updated',
      performedBy: user.userId,
      details: updates,
    });

    return NextResponse.json({ success: true, message: 'Commessa aggiornata con successo' });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }
    return NextResponse.json({ error: error?.message || 'Errore aggiornamento commessa' }, { status: 500 });
  }
}
