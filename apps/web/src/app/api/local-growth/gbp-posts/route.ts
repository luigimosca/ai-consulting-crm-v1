import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listGbpPosts, createGbpPost } from '@/lib/local-growth-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAuth(['admin', 'operator']);
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || undefined;

    const posts = await listGbpPosts(companyId);
    return NextResponse.json({ success: true, posts });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante il recupero dei post Google' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const body = await request.json();

    if (!body.companyId || !body.title || !body.summary) {
      return NextResponse.json(
        { error: 'Azienda, titolo e testo dell\'aggiornamento sono obbligatori' },
        { status: 400 }
      );
    }

    const post = await createGbpPost(
      {
        companyId: body.companyId,
        postType: body.postType || 'standard',
        title: body.title.trim(),
        summary: body.summary.trim(),
        ctaType: body.ctaType,
        ctaUrl: body.ctaUrl,
        couponCode: body.couponCode,
        termsConditions: body.termsConditions,
        startDate: body.startDate,
        endDate: body.endDate,
      },
      user
    );

    return NextResponse.json({
      success: true,
      post,
      message: 'Aggiornamento Google Business Profile pubblicato con successo!',
    });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante la creazione del post Google' },
      { status: 500 }
    );
  }
}
