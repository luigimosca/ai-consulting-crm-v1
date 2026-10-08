import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { buildUtmUrl, parseUtmUrl } from '@/lib/client-marketing-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await requireAuth();
    const body = await request.json();

    if (body.action === 'parse' && body.url) {
      const parsed = parseUtmUrl(body.url);
      return NextResponse.json({ data: parsed });
    }

    const { baseUrl, source, medium, campaign, term, content } = body;
    const trackedUrl = buildUtmUrl({
      baseUrl,
      source,
      medium,
      campaign,
      term,
      content,
    });

    const parsed = parseUtmUrl(trackedUrl);

    return NextResponse.json({
      data: {
        trackedUrl,
        ...parsed,
      },
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || 'Errore nella generazione UTM' }, { status: 400 });
  }
}
