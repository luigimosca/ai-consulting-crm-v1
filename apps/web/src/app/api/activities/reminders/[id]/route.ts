import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { updateReminder, deleteReminder } from '@/lib/activities-service';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const { id } = await params;
    const body = await request.json();

    const updated = await updateReminder(id, body, user);
    if (!updated) {
      return NextResponse.json({ error: 'Promemoria non trovato' }, { status: 404 });
    }

    return NextResponse.json({ success: true, reminder: updated });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Errore durante l'aggiornamento del promemoria" },
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

    const ok = await deleteReminder(id, user);
    if (!ok) {
      return NextResponse.json({ error: 'Promemoria non trovato' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Promemoria eliminato con successo' });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Errore durante l'eliminazione del promemoria" },
      { status: 500 }
    );
  }
}
