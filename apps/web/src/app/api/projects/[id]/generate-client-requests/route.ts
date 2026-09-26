import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { generateClientRequestsFromTemplate } from '@/lib/client-requests-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const result = await generateClientRequestsFromTemplate(
      {
        projectId: id,
        templateCode: body.templateCode || 'ONBOARDING_WEBSITE_MARKETING',
        preview: !!body.preview,
        excludedGroupIds: body.excludedGroupIds || [],
        excludedItemIds: body.excludedItemIds || [],
        idempotencyKey: body.idempotencyKey || undefined,
        performedByUserId: user.userId,
      },
      user
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (error?.message?.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'Accesso negato: non sei autorizzato a generare richieste su questo progetto' }, { status: 403 });
    }
    return NextResponse.json({ error: error?.message || 'Errore generazione richieste materiali' }, { status: 400 });
  }
}
