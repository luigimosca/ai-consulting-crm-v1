import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getLeadCampaignHistory } from '@/lib/marketing-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(['admin', 'operator']);
    const { id } = await params;

    const history = await getLeadCampaignHistory(id);
    return NextResponse.json({ success: true, history });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante il recupero dello storico campagne del lead' },
      { status: 500 }
    );
  }
}
