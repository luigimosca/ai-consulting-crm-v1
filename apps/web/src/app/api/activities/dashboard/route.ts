import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getTodayAgenda } from '@/lib/activities-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'user'; // 'user' or 'all'
    const targetUserId = scope === 'all' && user.role === 'admin' ? undefined : user.userId;

    const agenda = await getTodayAgenda(targetUserId);
    return NextResponse.json({ success: true, ...agenda });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Errore durante il recupero dell'agenda" },
      { status: 500 }
    );
  }
}
