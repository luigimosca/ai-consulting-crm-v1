import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSegmentById, updateSegment, deleteSegment } from '@/lib/marketing-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(['admin', 'operator']);
    const { id } = await params;

    const segment = await getSegmentById(id);
    if (!segment) {
      return NextResponse.json({ error: 'Segmento non trovato' }, { status: 404 });
    }

    return NextResponse.json({ success: true, segment });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante il recupero del segmento' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const { id } = await params;
    const body = await request.json();

    const segment = await updateSegment(id, body, user);
    return NextResponse.json({ success: true, segment });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }
    if (error?.message?.startsWith('NOT_FOUND')) {
      return NextResponse.json({ error: 'Segmento non trovato' }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante la modifica del segmento' },
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

    await deleteSegment(id, user);
    return NextResponse.json({ success: true, message: 'Segmento eliminato con successo' });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }
    if (error?.message?.startsWith('NOT_FOUND')) {
      return NextResponse.json({ error: 'Segmento non trovato' }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || "Errore durante l'eliminazione del segmento" },
      { status: 500 }
    );
  }
}
