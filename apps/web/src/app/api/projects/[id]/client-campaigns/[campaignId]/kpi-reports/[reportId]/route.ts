import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  updateCampaignKpiReport,
  deleteCampaignKpiReport,
} from '@/lib/client-marketing-service';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; campaignId: string; reportId: string }> }
) {
  try {
    const user = await requireAuth();
    const { reportId } = await params;
    const body = await request.json();

    const updated = await updateCampaignKpiReport(reportId, body, user);
    return NextResponse.json({ data: updated });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (err.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Report KPI non trovato' }, { status: 404 });
    }
    if (err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Permessi insufficienti per modificare il report KPI' }, { status: 403 });
    }
    if (err.message?.startsWith('SECURITY_VIOLATION:')) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('Error updating KPI report:', err);
    return NextResponse.json({ error: err.message || 'Errore interno' }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; campaignId: string; reportId: string }> }
) {
  try {
    const user = await requireAuth();
    const { reportId } = await params;

    const result = await deleteCampaignKpiReport(reportId, user);
    return NextResponse.json({ data: result });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (err.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Report KPI non trovato' }, { status: 404 });
    }
    if (err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Permessi insufficienti per eliminare il report KPI' }, { status: 403 });
    }
    console.error('Error deleting KPI report:', err);
    return NextResponse.json({ error: err.message || 'Errore interno' }, { status: 500 });
  }
}
