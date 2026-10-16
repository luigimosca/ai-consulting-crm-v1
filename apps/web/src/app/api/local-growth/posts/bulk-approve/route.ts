import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { bulkApprovePosts } from '@/lib/local-growth-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const body = await request.json();

    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json(
        { error: 'Nessun post specificato per l\'approvazione' },
        { status: 400 }
      );
    }

    const approvedCount = await bulkApprovePosts(body.ids, user);

    return NextResponse.json({
      success: true,
      message: `${approvedCount} post approvati con successo.`,
      approvedCount,
    });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante l\'approvazione a blocchi' },
      { status: 500 }
    );
  }
}
