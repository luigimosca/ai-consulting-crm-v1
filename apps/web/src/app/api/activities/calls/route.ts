import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listCalls, logCall } from '@/lib/activities-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAuth(['admin', 'operator']);
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId') || undefined;
    const companyId = searchParams.get('companyId') || undefined;
    const callerUserId = searchParams.get('callerUserId') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined;

    const calls = await listCalls({ leadId, companyId, callerUserId, limit, offset });
    return NextResponse.json({ success: true, calls });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante il recupero delle chiamate' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const body = await request.json();

    if (!body.callOutcome) {
      return NextResponse.json(
        { error: "L'esito della chiamata (callOutcome) è obbligatorio" },
        { status: 400 }
      );
    }

    const result = await logCall(
      {
        leadId: body.leadId,
        companyId: body.companyId,
        direction: body.direction,
        phoneNumber: body.phoneNumber,
        callOutcome: body.callOutcome,
        durationSeconds: body.durationSeconds,
        notes: body.notes,
        calledAt: body.calledAt,
        scheduleCallback: body.scheduleCallback,
      },
      user
    );

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante la registrazione della chiamata' },
      { status: 500 }
    );
  }
}
