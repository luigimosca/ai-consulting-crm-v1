import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { submitCampaignForReview } from '@/lib/marketing-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const { id } = await params;

    const campaign = await submitCampaignForReview(id, user);
    return NextResponse.json({ success: true, campaign });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message?.startsWith('NOT_FOUND')) {
      return NextResponse.json({ error: 'Campagna non trovata' }, { status: 404 });
    }
    if (error?.message?.startsWith('INVALID_STATE')) {
      return NextResponse.json({ error: error.message.replace('INVALID_STATE: ', '') }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || "Errore durante l'invio in revisione" },
      { status: 500 }
    );
  }
}
