import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { applyTemplateToProject } from '@/lib/process-templates-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    if (!body.projectId || !body.templateId) {
      return NextResponse.json(
        { error: 'projectId e templateId sono obbligatori' },
        { status: 400 }
      );
    }

    const result = await applyTemplateToProject({
      projectId: body.projectId,
      templateId: body.templateId,
      versionNumber: body.versionNumber,
      startDate: body.startDate || new Date().toISOString().slice(0, 10),
      excludedTaskIds: body.excludedTaskIds || [],
      roleAssignments: body.roleAssignments || {},
      customTaskTitles: body.customTaskTitles || {},
      idempotencyKey: body.idempotencyKey || undefined,
      forceReapply: !!body.forceReapply,
      appliedBy: user.userId,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore applicazione modello al progetto' }, { status: 500 });
  }
}
