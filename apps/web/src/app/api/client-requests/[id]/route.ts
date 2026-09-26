import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getClientRequestById, updateClientRequest } from '@/lib/client-requests-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const req = await getClientRequestById(id, user);
    if (!req) {
      return NextResponse.json({ error: 'Richiesta cliente non trovata' }, { status: 404 });
    }

    return NextResponse.json({ success: true, request: req });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (error?.message?.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'Accesso negato: non sei autorizzato a consultare questa richiesta' }, { status: 403 });
    }
    return NextResponse.json({ error: error?.message || 'Errore recupero richiesta' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const updated = await updateClientRequest(id, body, user.userId, user);
    return NextResponse.json({ success: true, request: updated });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (error?.message?.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'Accesso negato: non sei autorizzato a modificare questa richiesta' }, { status: 403 });
    }
    return NextResponse.json({ error: error?.message || 'Errore aggiornamento richiesta' }, { status: 400 });
  }
}
