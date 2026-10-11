import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  getAppointmentById,
  updateAppointment,
  deleteAppointment,
} from '@/lib/activities-service';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(['admin', 'operator']);
    const { id } = await params;
    const appointment = await getAppointmentById(id);

    if (!appointment) {
      return NextResponse.json({ error: 'Appuntamento non trovato' }, { status: 404 });
    }

    return NextResponse.json({ success: true, appointment });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Errore durante il recupero dell'appuntamento" },
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

    const updated = await updateAppointment(id, body, user);
    if (!updated) {
      return NextResponse.json({ error: 'Appuntamento non trovato' }, { status: 404 });
    }

    return NextResponse.json({ success: true, appointment: updated });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Errore durante l'aggiornamento dell'appuntamento" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const { id } = await params;

    const ok = await deleteAppointment(id, user);
    if (!ok) {
      return NextResponse.json({ error: 'Appuntamento non trovato' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Appuntamento eliminato con successo' });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Errore durante l'eliminazione dell'appuntamento" },
      { status: 500 }
    );
  }
}
