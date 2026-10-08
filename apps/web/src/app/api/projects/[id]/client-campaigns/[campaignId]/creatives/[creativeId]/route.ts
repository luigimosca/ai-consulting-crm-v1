import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  updateCampaignCreative,
  deleteCampaignCreative,
} from '@/lib/client-marketing-service';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; campaignId: string; creativeId: string }> }
) {
  try {
    const user = await requireAuth();
    const { creativeId } = await params;
    const body = await request.json();

    const updated = await updateCampaignCreative(creativeId, body, user);
    return NextResponse.json({ data: updated });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (err.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Creatività non trovata' }, { status: 404 });
    }
    if (err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Permessi insufficienti per modificare la creatività' }, { status: 403 });
    }
    if (err.message?.startsWith('SECURITY_VIOLATION:')) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('Error updating campaign creative:', err);
    return NextResponse.json({ error: err.message || 'Errore interno' }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; campaignId: string; creativeId: string }> }
) {
  try {
    const user = await requireAuth();
    const { creativeId } = await params;

    const result = await deleteCampaignCreative(creativeId, user);
    return NextResponse.json({ data: result });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (err.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Creatività non trovata' }, { status: 404 });
    }
    if (err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Permessi insufficienti per eliminare la creatività' }, { status: 403 });
    }
    console.error('Error deleting campaign creative:', err);
    return NextResponse.json({ error: err.message || 'Errore interno' }, { status: 500 });
  }
}
