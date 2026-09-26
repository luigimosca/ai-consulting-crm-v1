import { NextResponse } from 'next/server';
import {
  db,
  projects,
  orders,
  leads,
  projectMilestones,
  tasks,
  taskAssignments,
  taskDependencies,
  documents,
  users,
} from '@ai-crm/db';
import { eq, desc, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { recalculateProjectProgress, isTaskBlocked } from '@/lib/task-graph';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const project = db.select().from(projects).where(eq(projects.id, id)).get();
    if (!project) {
      return NextResponse.json({ error: 'Progetto non trovato' }, { status: 404 });
    }

    // Commessa & Lead
    const order = db.select().from(orders).where(eq(orders.id, project.orderId)).get();
    let lead = null;
    if (order?.leadId) {
      lead = db.select().from(leads).where(eq(leads.id, order.leadId)).get();
    }

    // Manager
    let manager = null;
    if (project.managerId) {
      manager = db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, project.managerId)).get();
    }

    // Milestones
    const milestones = db
      .select()
      .from(projectMilestones)
      .where(eq(projectMilestones.projectId, id))
      .orderBy(projectMilestones.dueDate)
      .all();

    // Tasks with assignments and dependencies
    const projectTasks = db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, id))
      .orderBy(tasks.sortOrder, tasks.createdAt)
      .all();

    // Fetch assignments for all tasks
    const allAssignments = db
      .select({
        id: taskAssignments.id,
        taskId: taskAssignments.taskId,
        userId: taskAssignments.userId,
        role: taskAssignments.role,
        userName: users.name,
        userEmail: users.email,
      })
      .from(taskAssignments)
      .leftJoin(users, eq(taskAssignments.userId, users.id))
      .all();

    // Fetch dependencies for all tasks
    const allDependencies = db.select().from(taskDependencies).all();

    const tasksEnriched = projectTasks.map((t) => {
      const assignments = allAssignments.filter((a) => a.taskId === t.id);
      const predecessors = allDependencies.filter((d) => d.successorTaskId === t.id);
      const successors = allDependencies.filter((d) => d.predecessorTaskId === t.id);
      const isBlocked = isTaskBlocked(t.id);

      return {
        ...t,
        assignments,
        predecessors,
        successors,
        isBlocked,
      };
    });

    // Linked documents
    const linkedDocs = db
      .select()
      .from(documents)
      .where(and(eq(documents.entityType, 'project'), eq(documents.entityId, id)))
      .orderBy(desc(documents.createdAt))
      .all();

    return NextResponse.json({
      success: true,
      project,
      order,
      lead,
      manager,
      milestones,
      tasks: tasksEnriched,
      documents: linkedDocs,
    });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore recupero progetto' }, { status: 500 });
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

    const project = db.select().from(projects).where(eq(projects.id, id)).get();
    if (!project) {
      return NextResponse.json({ error: 'Progetto non trovato' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updates: any = { updatedAt: now };

    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.managerId !== undefined) updates.managerId = body.managerId;
    if (body.startDate !== undefined) updates.startDate = body.startDate;
    if (body.dueDate !== undefined) updates.dueDate = body.dueDate;
    if (body.budgetHours !== undefined) updates.budgetHours = Number(body.budgetHours) || 0;

    if (body.status !== undefined && body.status !== project.status) {
      updates.status = body.status;
      if (body.status === 'completato') {
        updates.completedAt = now;
        updates.progressPercent = 100;
      }
    }

    db.update(projects).set(updates).where(eq(projects.id, id)).run();

    await logActivity({
      entityType: 'project',
      entityId: id,
      action: 'project_updated',
      performedBy: user.userId,
      details: updates,
    });

    return NextResponse.json({ success: true, message: 'Progetto aggiornato con successo' });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore aggiornamento progetto' }, { status: 500 });
  }
}
