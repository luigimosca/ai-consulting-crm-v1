import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { populateCampaignRecipients } from '@/lib/marketing-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const { id } = await params;

    const count = await populateCampaignRecipients(id, user);
    return NextResponse.json({ success: true, populatedCount: count });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante il caricamento dei destinatari' },
      { status: 500 }
    );
  }
}
