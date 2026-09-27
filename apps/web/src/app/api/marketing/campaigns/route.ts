import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listCampaigns, createCampaign } from '@/lib/marketing-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAuth(['admin', 'operator']);
    const campaigns = await listCampaigns();
    return NextResponse.json({ success: true, campaigns });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante il recupero delle campagne' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const body = await request.json();

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: 'Il nome della campagna è obbligatorio' }, { status: 400 });
    }
    if (!body.objective) {
      return NextResponse.json({ error: "L'obiettivo della campagna è obbligatorio" }, { status: 400 });
    }
    if (!body.channel) {
      return NextResponse.json({ error: 'Il canale di contatto è obbligatorio' }, { status: 400 });
    }

    const campaign = await createCampaign(
      {
        name: body.name,
        objective: body.objective,
        channel: body.channel,
        segmentId: body.segmentId,
        contentSubject: body.contentSubject,
        contentBody: body.contentBody,
        dynamicVariables: body.dynamicVariables,
        scheduledStartAt: body.scheduledStartAt,
        scheduledEndAt: body.scheduledEndAt,
        notes: body.notes,
      },
      user
    );

    return NextResponse.json({ success: true, campaign }, { status: 201 });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante la creazione della campagna' },
      { status: 500 }
    );
  }
}
