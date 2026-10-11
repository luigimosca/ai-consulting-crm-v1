import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listAppointments, createAppointment } from '@/lib/activities-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAuth(['admin', 'operator']);
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const leadId = searchParams.get('leadId') || undefined;
    const companyId = searchParams.get('companyId') || undefined;
    const organizerUserId = searchParams.get('organizerUserId') || undefined;
    const status = (searchParams.get('status') as any) || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;

    const appointments = await listAppointments({
      startDate,
      endDate,
      leadId,
      companyId,
      organizerUserId,
      status,
      limit,
    });

    return NextResponse.json({ success: true, appointments });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante il recupero degli appuntamenti' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const body = await request.json();

    if (!body.title || !body.title.trim()) {
      return NextResponse.json(
        { error: "Il titolo dell'appuntamento è obbligatorio" },
        { status: 400 }
      );
    }
    if (!body.scheduledStartTime || !body.scheduledEndTime) {
      return NextResponse.json(
        { error: 'Orario di inizio e fine sono obbligatori' },
        { status: 400 }
      );
    }

    const appointment = await createAppointment(
      {
        leadId: body.leadId,
        companyId: body.companyId,
        orderId: body.orderId,
        projectId: body.projectId,
        title: body.title,
        description: body.description,
        appointmentType: body.appointmentType,
        status: body.status,
        scheduledStartTime: body.scheduledStartTime,
        scheduledEndTime: body.scheduledEndTime,
        locationType: body.locationType,
        meetingUrl: body.meetingUrl,
        meetingAddress: body.meetingAddress,
        attendees: body.attendees,
        outcomeNotes: body.outcomeNotes,
      },
      user
    );

    return NextResponse.json({ success: true, appointment }, { status: 201 });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Errore durante la creazione dell'appuntamento" },
      { status: 500 }
    );
  }
}
