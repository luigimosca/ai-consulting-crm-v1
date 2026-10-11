import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { generateIcsForAppointment } from '@/lib/activities-service';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(['admin', 'operator']);
    const { id } = await params;
    const icsContent = await generateIcsForAppointment(id);

    if (!icsContent) {
      return NextResponse.json({ error: 'Appuntamento non trovato' }, { status: 404 });
    }

    return new Response(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="appuntamento-${id}.ics"`,
      },
    });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante la generazione del file .ics' },
      { status: 500 }
    );
  }
}
