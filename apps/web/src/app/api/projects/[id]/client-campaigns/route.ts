import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  getClientCampaignsByProject,
  createClientCampaign,
} from '@/lib/client-marketing-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: projectId } = await params;

    const campaigns = await getClientCampaignsByProject(projectId, user);
    return NextResponse.json({ data: campaigns });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso negato al progetto' }, { status: 403 });
    }
    console.error('Error fetching client campaigns:', err);
    return NextResponse.json({ error: err.message || 'Errore interno' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: projectId } = await params;
    const body = await request.json();

    const campaign = await createClientCampaign(
      {
        ...body,
        projectId,
      },
      user
    );

    return NextResponse.json({ data: campaign }, { status: 201 });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Permessi insufficienti per creare campagne nel progetto' }, { status: 403 });
    }
    if (err.message?.startsWith('SECURITY_VIOLATION:')) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('Error creating client campaign:', err);
    return NextResponse.json({ error: err.message || 'Errore interno' }, { status: 400 });
  }
}
