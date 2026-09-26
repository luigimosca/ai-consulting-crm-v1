import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { rejectClientRequest } from '@/lib/client-requests-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    if (!body.reason || typeof body.reason !== 'string' || body.reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Motivo del rifiuto obbligatorio per richiedere integrazioni al cliente.' },
        { status: 400 }
      );
    }

    const result = await rejectClientRequest(id, body.reason.trim(), user.userId);

    return NextResponse.json({ success: true, request: result });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Non autorizzato: accesso riservato al team interno' }, { status: 403 });
    }
    console.error('Error rejecting client request:', error);
    return NextResponse.json(
      { error: error.message || 'Errore durante il rifiuto della richiesta' },
      { status: error.message?.includes('non trovata') ? 404 : 400 }
    );
  }
}
