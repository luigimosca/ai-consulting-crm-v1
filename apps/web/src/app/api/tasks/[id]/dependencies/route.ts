import { NextResponse } from 'next/server';
import { db, taskDependencies, tasks } from '@ai-crm/db';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { wouldCreateDependencyCycle } from '@/lib/task-graph';
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
    const { predecessorTaskId } = body;

    if (!predecessorTaskId) {
      return NextResponse.json({ error: 'predecessorTaskId obbligatorio' }, { status: 400 });
    }

    if (predecessorTaskId === id) {
      return NextResponse.json({ error: 'Un\'attività non può dipendere da se stessa' }, { status: 400 });
    }

    const targetTask = db.select().from(tasks).where(eq(tasks.id, id)).get();
    const predTask = db.select().from(tasks).where(eq(tasks.id, predecessorTaskId)).get();

    if (!targetTask || !predTask) {
      return NextResponse.json({ error: 'Attività non trovata' }, { status: 404 });
    }

    // Check for cycle in DAG
    if (wouldCreateDependencyCycle(predecessorTaskId, id)) {
      return NextResponse.json(
        { error: 'Impossibile aggiungere la dipendenza: creerebbe una dipendenza ciclica nel progetto!' },
        { status: 400 }
      );
    }

    // Check if already exists
    const existing = db
      .select()
      .from(taskDependencies)
      .where(
        and(
          eq(taskDependencies.predecessorTaskId, predecessorTaskId),
          eq(taskDependencies.successorTaskId, id)
        )
      )
      .get();

    if (existing) {
      return NextResponse.json({ success: true, dependency: existing });
    }

    const now = new Date().toISOString();
    const depId = `td_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newDep = {
      id: depId,
      predecessorTaskId,
      successorTaskId: id,
      dependencyType: 'finish_to_start' as const,
      createdAt: now,
    };

    db.insert(taskDependencies).values(newDep).run();

    await logActivity({
      entityType: 'task',
      entityId: id,
      action: 'dependency_added',
      performedBy: user.userId,
      details: { predecessorTaskId, predecessorTitle: predTask.title },
    });

    return NextResponse.json({ success: true, dependency: newDep });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore aggiunta dipendenza' }, { status: 500 });
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
    const dependencyId = searchParams.get('dependencyId');

    if (!dependencyId) {
      return NextResponse.json({ error: 'dependencyId obbligatorio' }, { status: 400 });
    }

    db.delete(taskDependencies)
      .where(eq(taskDependencies.id, dependencyId))
      .run();

    return NextResponse.json({ success: true, message: 'Dipendenza rimossa' });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore eliminazione dipendenza' }, { status: 500 });
  }
}
