import { NextResponse } from 'next/server';
import { db, projectMilestones, projects } from '@ai-crm/db';
import { eq, desc, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    if (!body.title || !body.dueDate) {
      return NextResponse.json({ error: 'Titolo e data prevista della milestone sono obbligatori' }, { status: 400 });
    }

    const project = db.select().from(projects).where(eq(projects.id, id)).get();
    if (!project) {
      return NextResponse.json({ error: 'Progetto non trovato' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const milestoneId = `mls_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newMilestone = {
      id: milestoneId,
      projectId: id,
      title: body.title,
      description: body.description || null,
      dueDate: body.dueDate,
      actualDate: body.actualDate || null,
      status: (body.status || 'in_programma') as any,
      sortOrder: Number(body.sortOrder) || 0,
      createdAt: now,
      updatedAt: now,
    };

    db.insert(projectMilestones).values(newMilestone).run();

    await logActivity({
      entityType: 'project',
      entityId: id,
      action: 'milestone_created',
      performedBy: user.userId,
      details: { title: body.title, dueDate: body.dueDate },
    });

    return NextResponse.json({ success: true, milestone: newMilestone });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore creazione milestone' }, { status: 500 });
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
    const { milestoneId } = body;

    if (!milestoneId) {
      return NextResponse.json({ error: 'milestoneId obbligatorio' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const updates: any = { updatedAt: now };

    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.dueDate !== undefined) updates.dueDate = body.dueDate;
    if (body.actualDate !== undefined) updates.actualDate = body.actualDate;
    if (body.status !== undefined) updates.status = body.status;
    if (body.sortOrder !== undefined) updates.sortOrder = Number(body.sortOrder) || 0;

    db.update(projectMilestones)
      .set(updates)
      .where(and(eq(projectMilestones.id, milestoneId), eq(projectMilestones.projectId, id)))
      .run();

    return NextResponse.json({ success: true, message: 'Milestone aggiornata' });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore aggiornamento milestone' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const milestoneId = searchParams.get('milestoneId');

    if (!milestoneId) {
      return NextResponse.json({ error: 'milestoneId obbligatorio' }, { status: 400 });
    }

    db.delete(projectMilestones)
      .where(and(eq(projectMilestones.id, milestoneId), eq(projectMilestones.projectId, id)))
      .run();

    return NextResponse.json({ success: true, message: 'Milestone eliminata' });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore eliminazione milestone' }, { status: 500 });
  }
}
