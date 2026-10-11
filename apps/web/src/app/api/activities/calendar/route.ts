import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getCalendarEvents } from '@/lib/activities-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAuth(['admin', 'operator']);
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = searchParams.get('userId') || undefined;
    const leadId = searchParams.get('leadId') || undefined;
    const companyId = searchParams.get('companyId') || undefined;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Parametri startDate e endDate obbligatori' },
        { status: 400 }
      );
    }

    const events = await getCalendarEvents({
      startDate,
      endDate,
      userId,
      leadId,
      companyId,
    });

    return NextResponse.json({ success: true, events });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante il recupero del calendario' },
      { status: 500 }
    );
  }
}
