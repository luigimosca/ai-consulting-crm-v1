import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  getClientCampaignById,
  updateClientCampaign,
  deleteClientCampaign,
} from '@/lib/client-marketing-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; campaignId: string }> }
) {
  try {
    const user = await requireAuth();
    const { campaignId } = await params;

    const campaign = await getClientCampaignById(campaignId, user);
    return NextResponse.json({ data: campaign });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (err.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Campagna non trovata' }, { status: 404 });
    }
    if (err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso negato alla campagna' }, { status: 403 });
    }
    console.error('Error getting client campaign:', err);
    return NextResponse.json({ error: err.message || 'Errore interno' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; campaignId: string }> }
) {
  try {
    const user = await requireAuth();
    const { campaignId } = await params;
    const body = await request.json();

    const updated = await updateClientCampaign(campaignId, body, user);
    return NextResponse.json({ data: updated });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (err.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Campagna non trovata' }, { status: 404 });
    }
    if (err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Permessi insufficienti per modificare la campagna' }, { status: 403 });
    }
    if (err.message?.startsWith('SECURITY_VIOLATION:')) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('Error updating client campaign:', err);
    return NextResponse.json({ error: err.message || 'Errore interno' }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; campaignId: string }> }
) {
  try {
    const user = await requireAuth();
    const { campaignId } = await params;

    const result = await deleteClientCampaign(campaignId, user);
    return NextResponse.json({ data: result });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (err.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Campagna non trovata' }, { status: 404 });
    }
    if (err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Solo i manager di progetto o admin possono eliminare una campagna' }, { status: 403 });
    }
    console.error('Error deleting client campaign:', err);
    return NextResponse.json({ error: err.message || 'Errore interno' }, { status: 500 });
  }
}
