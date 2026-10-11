import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listCallbacks, createCallback } from '@/lib/activities-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAuth(['admin', 'operator']);
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId') || undefined;
    const companyId = searchParams.get('companyId') || undefined;
    const assignedUserId = searchParams.get('assignedUserId') || undefined;
    const status = (searchParams.get('status') as any) || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;

    const callbacks = await listCallbacks({ leadId, companyId, assignedUserId, status, limit });
    return NextResponse.json({ success: true, callbacks });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante il recupero delle richiamate' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const body = await request.json();

    if (!body.reason || !body.reason.trim()) {
      return NextResponse.json(
        { error: 'Il motivo della richiamata è obbligatorio' },
        { status: 400 }
      );
    }
    if (!body.scheduledAt) {
      return NextResponse.json(
        { error: 'La data e ora della richiamata sono obbligatorie' },
        { status: 400 }
      );
    }

    const callback = await createCallback(
      {
        leadId: body.leadId,
        companyId: body.companyId,
        callId: body.callId,
        assignedUserId: body.assignedUserId,
        scheduledAt: body.scheduledAt,
        priority: body.priority,
        reason: body.reason,
      },
      user
    );

    return NextResponse.json({ success: true, callback }, { status: 201 });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante la creazione della richiamata' },
      { status: 500 }
    );
  }
}
