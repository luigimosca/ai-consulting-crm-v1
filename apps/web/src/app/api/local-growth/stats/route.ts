import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getLocalGrowthStats } from '@/lib/local-growth-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAuth(['admin', 'operator']);
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || undefined;

    const stats = await getLocalGrowthStats(companyId);
    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante il recupero delle statistiche' },
      { status: 500 }
    );
  }
}
