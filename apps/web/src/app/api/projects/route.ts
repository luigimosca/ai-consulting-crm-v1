import { NextResponse } from 'next/server';
import { db, projects, orders, leads, companies, users } from '@ai-crm/db';
import { eq, desc, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { generateProjectCode } from '@/lib/quotes-service';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const projectType = searchParams.get('projectType');
    const orderId = searchParams.get('orderId');
    const status = searchParams.get('status');
    const managerId = searchParams.get('managerId');
    const q = searchParams.get('q');

    let allProjects = db
      .select({
        id: projects.id,
        projectType: projects.projectType,
        orderId: projects.orderId,
        leadId: projects.leadId,
        companyId: projects.companyId,
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
        leadCompanyName: leads.companyName,
        companyName: companies.name,
        managerName: users.name,
      })
      .from(projects)
      .leftJoin(orders, eq(projects.orderId, orders.id))
      .leftJoin(leads, eq(projects.leadId, leads.id))
      .leftJoin(companies, eq(projects.companyId, companies.id))
      .leftJoin(users, eq(projects.managerId, users.id))
      .orderBy(desc(projects.createdAt))
      .all();

    if (projectType && projectType !== 'all') {
      allProjects = allProjects.filter((p) => p.projectType === projectType);
    }

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
          (p.orderCode && p.orderCode.toLowerCase().includes(term)) ||
          (p.leadCompanyName && p.leadCompanyName.toLowerCase().includes(term)) ||
          (p.companyName && p.companyName.toLowerCase().includes(term))
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

    const projectType = (body.projectType || 'client') as 'internal' | 'presales' | 'client';
    if (!['internal', 'presales', 'client'].includes(projectType)) {
      return NextResponse.json(
        { error: 'Tipo di progetto non valido. Valori ammessi: internal, presales, client' },
        { status: 400 }
      );
    }

    if (!body.title || !body.title.trim()) {
      return NextResponse.json(
        { error: 'Il titolo del progetto è obbligatorio' },
        { status: 400 }
      );
    }

    let orderId: string | null = null;
    let leadId: string | null = null;
    let companyId: string | null = null;

    if (projectType === 'internal') {
      // Internal projects: no commessa or company required
      orderId = null;
      leadId = null;
      companyId = null;
    } else if (projectType === 'presales') {
      // Presales projects: lead is optional, commessa not required
      orderId = null;
      if (body.leadId) {
        const lead = db.select().from(leads).where(eq(leads.id, body.leadId)).get();
        if (!lead) {
          return NextResponse.json({ error: 'Lead specificato non trovato' }, { status: 404 });
        }
        leadId = lead.id;
      }
      if (body.companyId) {
        const company = db.select().from(companies).where(eq(companies.id, body.companyId)).get();
        if (company) companyId = company.id;
      }
    } else if (projectType === 'client') {
      // Client projects: company or lead required; order required if specified or for accepted quotes
      if (body.orderId) {
        const order = db.select().from(orders).where(eq(orders.id, body.orderId)).get();
        if (!order) {
          return NextResponse.json({ error: 'Commessa specificata non trovata' }, { status: 404 });
        }
        orderId = order.id;
        leadId = order.leadId || body.leadId || null;
        companyId = order.companyId || body.companyId || null;
      } else {
        // Direct client project without existing order yet
        if (!body.companyId && !body.leadId) {
          return NextResponse.json(
            { error: 'Per i progetti di tipo "client" è obbligatorio specificare un\'azienda cliente, un lead o una commessa' },
            { status: 400 }
          );
        }
        if (body.leadId) {
          const lead = db.select().from(leads).where(eq(leads.id, body.leadId)).get();
          if (!lead) return NextResponse.json({ error: 'Lead non trovato' }, { status: 404 });
          leadId = lead.id;
        }
        if (body.companyId) {
          const company = db.select().from(companies).where(eq(companies.id, body.companyId)).get();
          if (!company) return NextResponse.json({ error: 'Azienda non trovata' }, { status: 404 });
          companyId = company.id;
        }
      }
    }

    const now = new Date().toISOString();
    const projectId = `prj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const code = generateProjectCode();

    const newProject = {
      id: projectId,
      projectType,
      orderId,
      leadId,
      companyId,
      code,
      title: body.title.trim(),
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
      details: {
        code,
        title: body.title,
        projectType,
        orderId,
        leadId,
        companyId,
      },
    });

    return NextResponse.json({ success: true, project: newProject });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore creazione progetto' }, { status: 500 });
  }
}

