import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listGbpReviews, seedSampleGbpReviews } from '@/lib/local-growth-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAuth(['admin', 'operator']);
    const { searchParams } = new URL(request.url);

    const companyId = searchParams.get('companyId') || undefined;
    const replyStatus = searchParams.get('replyStatus') || undefined;
    const sentiment = searchParams.get('sentiment') || undefined;
    const ratingParam = searchParams.get('rating');
    const rating = ratingParam ? parseInt(ratingParam, 10) : undefined;

    const reviews = await listGbpReviews({
      companyId,
      replyStatus,
      sentiment,
      rating,
    });

    return NextResponse.json({ success: true, reviews });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante il recupero delle recensioni' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const body = await request.json();

    if (body.action === 'seed_samples' && body.companyId) {
      const seeded = await seedSampleGbpReviews(body.companyId, user);
      return NextResponse.json({
        success: true,
        message: `${seeded.length} recensioni Google generate come esempio dimostrativo.`,
        reviews: seeded,
      });
    }

    return NextResponse.json({ error: 'Azione non supportata' }, { status: 400 });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante l\'elaborazione' },
      { status: 500 }
    );
  }
}
