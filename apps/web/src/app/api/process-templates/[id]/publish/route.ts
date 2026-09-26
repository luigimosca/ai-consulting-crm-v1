import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { publishProcessTemplateVersion } from '@/lib/process-templates-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['admin']);
    const { id } = await params;
    const body = await request.json();

    if (!body.versionId) {
      return NextResponse.json({ error: 'ID versione obbligatorio' }, { status: 400 });
    }

    const result = await publishProcessTemplateVersion(id, body.versionId, user.userId);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Permesso negato: solo gli amministratori possono pubblicare modelli' }, { status: 403 });
    }
    return NextResponse.json({ error: error?.message || 'Errore pubblicazione versione modello' }, { status: 500 });
  }
}
