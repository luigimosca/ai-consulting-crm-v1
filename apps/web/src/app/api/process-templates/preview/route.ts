import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { previewTemplateApplication } from '@/lib/process-templates-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    if (!body.projectId || !body.templateId) {
      return NextResponse.json(
        { error: 'projectId e templateId sono obbligatori per calcolare l’anteprima' },
        { status: 400 }
      );
    }

    const preview = await previewTemplateApplication({
      projectId: body.projectId,
      templateId: body.templateId,
      versionNumber: body.versionNumber,
      startDate: body.startDate || new Date().toISOString().slice(0, 10),
      excludedTaskIds: body.excludedTaskIds || [],
      roleAssignments: body.roleAssignments || {},
    });

    return NextResponse.json({ success: true, preview });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore calcolo anteprima modello' }, { status: 500 });
  }
}
