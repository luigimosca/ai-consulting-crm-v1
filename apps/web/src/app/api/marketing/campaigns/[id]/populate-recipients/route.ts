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

    const result = await populateCampaignRecipients(id, user);
    return NextResponse.json({
      success: true,
      populatedCount: result.populatedCount,
      totalRecipients: result.totalRecipients,
      limitApplied: result.limitApplied,
    });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message?.startsWith('FORBIDDEN')) {
      return NextResponse.json({ error: error.message.replace('FORBIDDEN: ', '') }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante il caricamento dei destinatari' },
      { status: 500 }
    );
  }
}
