import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { updateClientRequestItem } from '@/lib/client-requests-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    if (!body.itemId) {
      return NextResponse.json({ error: 'itemId obbligatorio' }, { status: 400 });
    }

    const updated = await updateClientRequestItem({
      itemId: body.itemId,
      valueText: body.valueText,
      valueUrl: body.valueUrl,
      documentId: body.documentId,
      accessConfig: body.accessConfig,
      notes: body.notes,
      status: body.status,
      performedByUserId: user.userId,
    });

    return NextResponse.json({ success: true, request: updated });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore aggiornamento voce richiesta' }, { status: 400 });
  }
}
