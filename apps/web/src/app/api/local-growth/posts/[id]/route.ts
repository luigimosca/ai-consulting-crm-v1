import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { updateSocialPost, deleteSocialPost } from '@/lib/local-growth-service';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const { id } = await params;
    const body = await request.json();

    const updated = await updateSocialPost(id, body, user);
    if (!updated) {
      return NextResponse.json({ error: 'Post non trovato' }, { status: 404 });
    }

    return NextResponse.json({ success: true, post: updated });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante l\'aggiornamento del post' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const { id } = await params;

    const success = await deleteSocialPost(id, user);
    if (!success) {
      return NextResponse.json({ error: 'Post non trovato' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante l\'eliminazione del post' },
      { status: 500 }
    );
  }
}
