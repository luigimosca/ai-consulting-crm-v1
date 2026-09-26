import { NextResponse } from 'next/server';
import { db, projects, orders, leads, users } from '@ai-crm/db';
import { eq, desc, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { generateProjectCode } from '@/lib/quotes-service';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const status = searchParams.get('status');
    const managerId = searchParams.get('managerId');
    const q = searchParams.get('q');

    let allProjects = db
      .select({
        id: projects.id,
        orderId: projects.orderId,
        code: projects.code,
        title: projects.title,
        description: projects.description,
        status: projects.status,
        managerId: projects.managerId,
        startDate: projects.startDate,
        dueDate: projects.dueDate,
        completedAt: projects.completedAt,
        progressPercent: projects.progressPercent,
        budgetHours: projects.budgetHours,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        orderCode: orders.code,
        orderTitle: orders.title,
        managerName: users.name,
      })
      .from(projects)
      .leftJoin(orders, eq(projects.orderId, orders.id))
      .leftJoin(users, eq(projects.managerId, users.id))
      .orderBy(desc(projects.createdAt))
      .all();

    if (orderId) {
      allProjects = allProjects.filter((p) => p.orderId === orderId);
    }

    if (status && status !== 'all') {
      allProjects = allProjects.filter((p) => p.status === status);
    }

    if (managerId) {
      allProjects = allProjects.filter((p) => p.managerId === managerId);
    }

    if (q) {
      const term = q.toLowerCase();
      allProjects = allProjects.filter(
        (p) =>
          p.code.toLowerCase().includes(term) ||
          p.title.toLowerCase().includes(term) ||
          (p.orderCode && p.orderCode.toLowerCase().includes(term))
      );
    }

    return NextResponse.json({ success: true, projects: allProjects });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore recupero progetti' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    if (!body.orderId || !body.title) {
      return NextResponse.json(
        { error: 'Collegamento alla commessa (orderId) e titolo del progetto sono obbligatori' },
        { status: 400 }
      );
    }

    const order = db.select().from(orders).where(eq(orders.id, body.orderId)).get();
    if (!order) {
      return NextResponse.json({ error: 'Commessa non trovata' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const projectId = `prj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const code = generateProjectCode();

    const newProject = {
      id: projectId,
      orderId: body.orderId,
      code,
      title: body.title,
      description: body.description || null,
      status: (body.status || 'pianificato') as any,
      managerId: body.managerId || user.userId,
      startDate: body.startDate || now.slice(0, 10),
      dueDate: body.dueDate || null,
      completedAt: null,
      progressPercent: 0,
      budgetHours: Number(body.budgetHours) || 0,
      createdBy: user.userId,
      createdAt: now,
      updatedAt: now,
    };

    db.insert(projects).values(newProject).run();

    await logActivity({
      entityType: 'project',
      entityId: projectId,
      action: 'project_created',
      performedBy: user.userId,
      details: { code, title: body.title, orderCode: order.code },
    });

    return NextResponse.json({ success: true, project: newProject });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore creazione progetto' }, { status: 500 });
  }
}
