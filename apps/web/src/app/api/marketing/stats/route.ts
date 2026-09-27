import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getMarketingDashboardStats } from '@/lib/marketing-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAuth(['admin', 'operator']);
    const stats = await getMarketingDashboardStats();
    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante il caricamento delle statistiche marketing' },
      { status: 500 }
    );
  }
}
