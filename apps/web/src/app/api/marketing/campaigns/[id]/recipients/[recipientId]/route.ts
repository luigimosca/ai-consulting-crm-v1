import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { updateRecipientStatus } from '@/lib/marketing-service';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; recipientId: string }> }
) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const { id, recipientId } = await params;
    const body = await request.json();

    if (!body.status) {
      return NextResponse.json({ error: 'Lo stato del destinatario è obbligatorio' }, { status: 400 });
    }

    const updated = await updateRecipientStatus(
      recipientId,
      {
        status: body.status,
        outcomeNotes: body.outcomeNotes,
      },
      user,
      id
    );

    return NextResponse.json({ success: true, recipient: updated });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message?.startsWith('FORBIDDEN_PRIVACY')) {
      return NextResponse.json(
        { error: error.message.replace('FORBIDDEN_PRIVACY: ', '') },
        { status: 403 }
      );
    }
    if (error?.message?.startsWith('FORBIDDEN')) {
      return NextResponse.json(
        { error: error.message.replace('FORBIDDEN: ', '') },
        { status: 403 }
      );
    }
    if (error?.message?.startsWith('NOT_FOUND')) {
      return NextResponse.json({ error: 'Destinatario non trovato' }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || "Errore durante l'aggiornamento dello stato del destinatario" },
      { status: 500 }
    );
  }
}
