import { NextResponse } from 'next/server';
import {
  db,
  tasks,
  projects,
  orders,
  taskAssignments,
  taskDependencies,
  users,
} from '@ai-crm/db';
import { eq, desc, and, or } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { recalculateProjectProgress, isTaskBlocked } from '@/lib/task-graph';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assigneeId = searchParams.get('assigneeId');
    const q = searchParams.get('q');
    const isOverdueParam = searchParams.get('isOverdue');
    const isBlockedParam = searchParams.get('isBlocked');

    let allTasks = db
      .select({
        id: tasks.id,
        projectId: tasks.projectId,
        milestoneId: tasks.milestoneId,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        plannedStartDate: tasks.plannedStartDate,
        plannedEndDate: tasks.plannedEndDate,
        actualStartDate: tasks.actualStartDate,
        actualEndDate: tasks.actualEndDate,
        estimatedHours: tasks.estimatedHours,
        actualHours: tasks.actualHours,
        progressPercent: tasks.progressPercent,
        checklistJson: tasks.checklistJson,
        sortOrder: tasks.sortOrder,
        createdBy: tasks.createdBy,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        projectCode: projects.code,
        projectTitle: projects.title,
        orderId: projects.orderId,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .orderBy(tasks.plannedEndDate, tasks.createdAt)
      .all();

    // Fetch all assignments and dependencies in memory
    const allAssignments = db
      .select({
        id: taskAssignments.id,
        taskId: taskAssignments.taskId,
        userId: taskAssignments.userId,
        role: taskAssignments.role,
        userName: users.name,
      })
      .from(taskAssignments)
      .leftJoin(users, eq(taskAssignments.userId, users.id))
      .all();

    const todayStr = new Date().toISOString().slice(0, 10);

    let enriched = allTasks.map((t) => {
      const taskAssignees = allAssignments.filter((a) => a.taskId === t.id);
      const isBlocked = isTaskBlocked(t.id);
      const isOverdue =
        t.plannedEndDate && t.plannedEndDate < todayStr && t.status !== 'completato';

      let checklist = [];
      try {
        checklist = JSON.parse(t.checklistJson || '[]');
      } catch {}

      return {
        ...t,
        assignees: taskAssignees,
        isBlocked,
        isOverdue: !!isOverdue,
        checklistCount: checklist.length,
        checklistDoneCount: checklist.filter((c: any) => c.completed).length,
      };
    });

    if (projectId) {
      enriched = enriched.filter((t) => t.projectId === projectId);
    }

    if (status && status !== 'all') {
      enriched = enriched.filter((t) => t.status === status);
    }

    if (priority && priority !== 'all') {
      enriched = enriched.filter((t) => t.priority === priority);
    }

    if (assigneeId && assigneeId !== 'all') {
      enriched = enriched.filter((t) => t.assignees.some((a) => a.userId === assigneeId));
    }

    if (isOverdueParam === 'true') {
      enriched = enriched.filter((t) => t.isOverdue);
    }

    if (isBlockedParam === 'true') {
      enriched = enriched.filter((t) => t.isBlocked);
    }

    if (q) {
      const term = q.toLowerCase();
      enriched = enriched.filter(
        (t) =>
          t.title.toLowerCase().includes(term) ||
          (t.projectTitle && t.projectTitle.toLowerCase().includes(term)) ||
          (t.description && t.description.toLowerCase().includes(term))
      );
    }

    return NextResponse.json({ success: true, tasks: enriched });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore recupero attività' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    if (!body.projectId || !body.title) {
      return NextResponse.json({ error: 'projectId e titolo attività sono obbligatori' }, { status: 400 });
    }

    const project = db.select().from(projects).where(eq(projects.id, body.projectId)).get();
    if (!project) {
      return NextResponse.json({ error: 'Progetto non trovato' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const taskId = `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newTask = {
      id: taskId,
      projectId: body.projectId,
      milestoneId: body.milestoneId || null,
      title: body.title,
      description: body.description || null,
      status: (body.status || 'da_fare') as any,
      priority: (body.priority || 'media') as any,
      plannedStartDate: body.plannedStartDate || null,
      plannedEndDate: body.plannedEndDate || null,
      actualStartDate: null,
      actualEndDate: null,
      estimatedHours: Number(body.estimatedHours) || 0,
      actualHours: 0,
      progressPercent: 0,
      checklistJson: JSON.stringify(body.checklist || []),
      sortOrder: Number(body.sortOrder) || 0,
      createdBy: user.userId,
      createdAt: now,
      updatedAt: now,
    };

    db.insert(tasks).values(newTask).run();

    // Assignees
    if (body.assignedUserIds && Array.isArray(body.assignedUserIds)) {
      for (const uid of body.assignedUserIds) {
        db.insert(taskAssignments)
          .values({
            id: `ta_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            taskId,
            userId: uid,
            role: 'contributor',
            assignedAt: now,
          })
          .run();
      }
    }

    recalculateProjectProgress(body.projectId);

    await logActivity({
      entityType: 'task',
      entityId: taskId,
      action: 'task_created',
      performedBy: user.userId,
      details: { title: body.title, projectCode: project.code },
    });

    return NextResponse.json({ success: true, task: newTask });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore creazione attività' }, { status: 500 });
  }
}
