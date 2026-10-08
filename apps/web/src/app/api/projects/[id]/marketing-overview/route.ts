import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getProjectMarketingOverview } from '@/lib/client-marketing-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: projectId } = await params;

    const overview = await getProjectMarketingOverview(projectId, user);
    return NextResponse.json({ data: overview });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso negato al progetto' }, { status: 403 });
    }
    console.error('Error fetching marketing overview:', err);
    return NextResponse.json({ error: err.message || 'Errore interno' }, { status: 500 });
  }
}
