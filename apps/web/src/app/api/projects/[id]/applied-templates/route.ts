import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAppliedTemplatesForProject } from '@/lib/process-templates-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const appliedTemplates = await getAppliedTemplatesForProject(id);
    return NextResponse.json({ success: true, appliedTemplates });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore recupero modelli applicati' }, { status: 500 });
  }
}
