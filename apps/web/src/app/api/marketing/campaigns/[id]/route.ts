import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getCampaignDetails, updateCampaign } from '@/lib/marketing-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(['admin', 'operator']);
    const { id } = await params;

    const campaign = await getCampaignDetails(id);
    return NextResponse.json({ success: true, campaign });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }
    if (error?.message?.startsWith('NOT_FOUND')) {
      return NextResponse.json({ error: 'Campagna non trovata' }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante il recupero della campagna' },
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

    const campaign = await updateCampaign(id, body, user);
    return NextResponse.json({ success: true, campaign });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message?.startsWith('FORBIDDEN')) {
      return NextResponse.json({ error: error.message.replace('FORBIDDEN: ', '') }, { status: 403 });
    }
    if (error?.message?.startsWith('NOT_FOUND')) {
      return NextResponse.json({ error: 'Campagna non trovata' }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante la modifica della campagna' },
      { status: 500 }
    );
  }
}
