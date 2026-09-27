import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { approveCampaign } from '@/lib/marketing-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['admin']); // strictly admin
    const { id } = await params;

    const campaign = await approveCampaign(id, user);
    return NextResponse.json({ success: true, campaign });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN' || error?.message?.startsWith('FORBIDDEN')) {
      return NextResponse.json(
        { error: 'Accesso negato: solo gli amministratori possono approvare una campagna' },
        { status: 403 }
      );
    }
    if (error?.message?.startsWith('NOT_FOUND')) {
      return NextResponse.json({ error: 'Campagna non trovata' }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || "Errore durante l'approvazione della campagna" },
      { status: 500 }
    );
  }
}
