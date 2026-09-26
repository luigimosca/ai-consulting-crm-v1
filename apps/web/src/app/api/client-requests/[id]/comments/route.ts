import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { addRequestComment } from '@/lib/client-requests-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    if (!body.message || typeof body.message !== 'string' || body.message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Il messaggio del commento non può essere vuoto.' },
        { status: 400 }
      );
    }

    const isInternal = typeof body.isInternal === 'boolean' ? body.isInternal : false;

    const comment = await addRequestComment(
      {
        requestId: id,
        authorUserId: user.userId,
        content: body.message.trim(),
        visibility: isInternal ? 'internal' : 'client',
      },
      user
    );

    return NextResponse.json({ success: true, comment });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (error?.message?.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'Accesso negato: non sei autorizzato a commentare questa richiesta' }, { status: 403 });
    }
    console.error('Error adding request comment:', error);
    return NextResponse.json(
      { error: error.message || 'Errore durante l\'aggiunta del commento' },
      { status: error.message?.includes('non consentiti') ? 400 : 500 }
    );
  }
}
