import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listProjectClientRequests, createClientRequest } from '@/lib/client-requests-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status') || undefined;
    const category = searchParams.get('category') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const q = searchParams.get('q') || undefined;

    const data = await listProjectClientRequests(id, { status, category, priority, q });
    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore recupero richieste materiali cliente' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    if (!body.title) {
      return NextResponse.json({ error: 'Il titolo della richiesta è obbligatorio' }, { status: 400 });
    }

    const created = await createClientRequest({
      projectId: id,
      orderId: body.orderId,
      companyId: body.companyId,
      title: body.title,
      description: body.description,
      category: body.category,
      priority: body.priority,
      dueDate: body.dueDate,
      clientVisible: body.clientVisible !== false,
      blocksTaskCompletion: body.blocksTaskCompletion !== false,
      requestedByUserId: user.userId,
      assignedToUserId: body.assignedToUserId,
      items: body.items,
      linkedTaskIds: body.linkedTaskIds,
    });

    return NextResponse.json({ success: true, request: created }, { status: 201 });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore creazione richiesta cliente' }, { status: 400 });
  }
}
