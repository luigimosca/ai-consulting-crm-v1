import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getProjectPlatformAccounts } from '@/lib/platform-accounts-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const { id: projectId } = await params;

    const accounts = await getProjectPlatformAccounts(projectId, user);
    return NextResponse.json({ success: true, accounts });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'Accesso negato: non sei autorizzato a visualizzare gli account di questo progetto' },
        { status: 403 }
      );
    }
    console.error('Error fetching project platform accounts:', error);
    return NextResponse.json(
      { error: error.message || 'Errore durante il recupero degli account del progetto' },
      { status: 500 }
    );
  }
}
