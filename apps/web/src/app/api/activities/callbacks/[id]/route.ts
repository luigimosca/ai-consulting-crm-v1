import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { updateCallback, deleteCallback } from '@/lib/activities-service';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const { id } = await params;
    const body = await request.json();

    const updated = await updateCallback(id, body, user);
    if (!updated) {
      return NextResponse.json({ error: 'Richiamata non trovata' }, { status: 404 });
    }

    return NextResponse.json({ success: true, callback: updated });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Errore durante l'aggiornamento della richiamata" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const { id } = await params;

    const ok = await deleteCallback(id, user);
    if (!ok) {
      return NextResponse.json({ error: 'Richiamata non trovata' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Richiamata eliminata con successo' });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Errore durante l'eliminazione della richiamata" },
      { status: 500 }
    );
  }
}
