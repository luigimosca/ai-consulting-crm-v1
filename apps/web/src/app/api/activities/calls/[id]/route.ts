import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getCallById } from '@/lib/activities-service';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(['admin', 'operator']);
    const { id } = await params;
    const call = await getCallById(id);

    if (!call) {
      return NextResponse.json({ error: 'Chiamata non trovata' }, { status: 404 });
    }

    return NextResponse.json({ success: true, call });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante il recupero della chiamata' },
      { status: 500 }
    );
  }
}
