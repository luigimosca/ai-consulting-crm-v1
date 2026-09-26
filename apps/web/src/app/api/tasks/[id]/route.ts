import { NextResponse } from 'next/server';
import {
  db,
  tasks,
  projects,
  taskAssignments,
  taskDependencies,
  documents,
  users,
} from '@ai-crm/db';
import { eq, desc, and } from 'drizzle-orm';
import {
  requireAuth,
  checkUserProjectAccess,
  canUserEditTask,
  canUserManageProjectContent,
} from '@/lib/auth';
import { getProjectMembers } from '@/lib/team-service';
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

    const task = db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!task) {
      return NextResponse.json({ error: 'Attività non trovata' }, { status: 404 });
    }

    if (!checkUserProjectAccess(user, task.projectId, 'viewer')) {
      return NextResponse.json({ error: 'Accesso negato al progetto' }, { status: 403 });
    }

    const project = db.select().from(projects).where(eq(projects.id, task.projectId)).get();

    // Assignees
    const assignments = db
      .select({
        id: taskAssignments.id,
        userId: taskAssignments.userId,
        role: taskAssignments.role,
        userName: users.name,
        userEmail: users.email,
        assignedAt: taskAssignments.assignedAt,
      })
      .from(taskAssignments)
      .leftJoin(users, eq(taskAssignments.userId, users.id))
      .where(eq(taskAssignments.taskId, id))
      .all();

    // Dependencies
    const predecessors = db
      .select({
        id: taskDependencies.id,
        predecessorTaskId: taskDependencies.predecessorTaskId,
        dependencyType: taskDependencies.dependencyType,
        title: tasks.title,
        status: tasks.status,
      })
      .from(taskDependencies)
      .leftJoin(tasks, eq(taskDependencies.predecessorTaskId, tasks.id))
      .where(eq(taskDependencies.successorTaskId, id))
      .all();

    const successors = db
      .select({
        id: taskDependencies.id,
        successorTaskId: taskDependencies.successorTaskId,
        dependencyType: taskDependencies.dependencyType,
        title: tasks.title,
        status: tasks.status,
      })
      .from(taskDependencies)
      .leftJoin(tasks, eq(taskDependencies.successorTaskId, tasks.id))
      .where(eq(taskDependencies.predecessorTaskId, id))
      .all();

    const isBlocked = isTaskBlocked(id);

    // Linked documents
    const taskDocs = db
      .select()
      .from(documents)
      .where(and(eq(documents.entityType, 'task'), eq(documents.entityId, id)))
      .orderBy(desc(documents.createdAt))
      .all();

    return NextResponse.json({
      success: true,
      task: {
        ...task,
        checklist: JSON.parse(task.checklistJson || '[]'),
      },
      project,
      assignees: assignments,
      predecessors,
      successors,
      isBlocked,
      documents: taskDocs,
    });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }
    return NextResponse.json({ error: error?.message || 'Errore recupero attività' }, { status: 500 });
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

    const task = db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!task) {
      return NextResponse.json({ error: 'Attività non trovata' }, { status: 404 });
    }

    // Check if user is authorized to edit this task (Admin, Manager, Editor, or Contributor assigned to this task)
    if (!canUserEditTask(user, id)) {
      return NextResponse.json(
        { error: 'Accesso negato: non sei autorizzato a modificare questa attività' },
        { status: 403 }
      );
    }

    // If attempting to change task assignments, must be Manager/Editor
    if (body.assignedUserIds !== undefined) {
      if (!canUserManageProjectContent(user, task.projectId)) {
        return NextResponse.json(
          { error: 'Accesso negato: solo manager ed editor possono riassegnare attività' },
          { status: 403 }
        );
      }

      if (Array.isArray(body.assignedUserIds) && body.assignedUserIds.length > 0) {
        const projectMembersList = getProjectMembers(task.projectId);
        const memberIds = new Set(projectMembersList.map((m) => m.userId));
        for (const uid of body.assignedUserIds) {
          if (!memberIds.has(uid)) {
            return NextResponse.json(
              { error: `L'utente selezionato (${uid}) non fa parte del team di questo progetto` },
              { status: 400 }
            );
          }
        }
      }
    }

    const now = new Date().toISOString();
    const updates: any = { updatedAt: now };

    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.milestoneId !== undefined) updates.milestoneId = body.milestoneId || null;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.plannedStartDate !== undefined) updates.plannedStartDate = body.plannedStartDate || null;
    if (body.plannedEndDate !== undefined) updates.plannedEndDate = body.plannedEndDate || null;
    if (body.actualStartDate !== undefined) updates.actualStartDate = body.actualStartDate || null;
    if (body.actualEndDate !== undefined) updates.actualEndDate = body.actualEndDate || null;
    if (body.estimatedHours !== undefined) updates.estimatedHours = Number(body.estimatedHours) || 0;
    if (body.actualHours !== undefined) updates.actualHours = Number(body.actualHours) || 0;
    if (body.sortOrder !== undefined) updates.sortOrder = Number(body.sortOrder) || 0;

    if (body.checklist !== undefined && Array.isArray(body.checklist)) {
      updates.checklistJson = JSON.stringify(body.checklist);

      // Auto update progress % based on checklist if checklist items exist
      if (body.checklist.length > 0 && body.progressPercent === undefined) {
        const done = body.checklist.filter((c: any) => c.completed).length;
        updates.progressPercent = Math.round((done / body.checklist.length) * 100);
      }
    }

    if (body.progressPercent !== undefined) {
      updates.progressPercent = Math.max(0, Math.min(100, Number(body.progressPercent) || 0));
    }

    if (body.status !== undefined && body.status !== task.status) {
      updates.status = body.status;
      if (body.status === 'completato') {
        updates.progressPercent = 100;
        updates.actualEndDate = updates.actualEndDate || now.slice(0, 10);
      } else if (body.status === 'in_corso' && !task.actualStartDate) {
        updates.actualStartDate = now.slice(0, 10);
      }
    }

    db.update(tasks).set(updates).where(eq(tasks.id, id)).run();

    // Update assignees if provided
    if (body.assignedUserIds && Array.isArray(body.assignedUserIds)) {
      db.delete(taskAssignments).where(eq(taskAssignments.taskId, id)).run();
      for (const uid of body.assignedUserIds) {
        db.insert(taskAssignments)
          .values({
            id: `ta_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            taskId: id,
            userId: uid,
            role: 'contributor',
            assignedAt: now,
          })
          .run();
      }
    }

    // Recalculate project progress
    recalculateProjectProgress(task.projectId);

    await logActivity({
      entityType: 'task',
      entityId: id,
      action: 'task_updated',
      performedBy: user.userId,
      details: updates,
    });

    return NextResponse.json({ success: true, message: 'Attività aggiornata con successo' });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }
    return NextResponse.json({ error: error?.message || 'Errore aggiornamento attività' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const task = db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!task) {
      return NextResponse.json({ error: 'Attività non trovata' }, { status: 404 });
    }

    // Only Manager or Editor can delete tasks
    if (!canUserManageProjectContent(user, task.projectId)) {
      return NextResponse.json(
        { error: 'Accesso negato: solo manager ed editor possono eliminare attività' },
        { status: 403 }
      );
    }

    // Delete assignments & dependencies
    db.delete(taskAssignments).where(eq(taskAssignments.taskId, id)).run();
    db.delete(taskDependencies)
      .where(
        and(
          eq(taskDependencies.predecessorTaskId, id)
        )
      )
      .run();
    db.delete(taskDependencies)
      .where(
        and(
          eq(taskDependencies.successorTaskId, id)
        )
      )
      .run();

    db.delete(tasks).where(eq(tasks.id, id)).run();

    recalculateProjectProgress(task.projectId);

    return NextResponse.json({ success: true, message: 'Attività eliminata con successo' });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }
    return NextResponse.json({ error: error?.message || 'Errore eliminazione attività' }, { status: 500 });
  }
}
