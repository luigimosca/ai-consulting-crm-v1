import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { approveClientRequest } from '@/lib/client-requests-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const result = await approveClientRequest(id, user.userId, body.comment, user);

    return NextResponse.json({ success: true, request: result });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message?.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'Accesso negato: non sei autorizzato ad approvare richieste per questo progetto' }, { status: 403 });
    }
    console.error('Error approving client request:', error);
    return NextResponse.json(
      { error: error.message || 'Errore durante l\'approvazione della richiesta' },
      { status: error.message?.includes('non trovata') ? 404 : 500 }
    );
  }
}
