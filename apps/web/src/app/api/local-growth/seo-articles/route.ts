import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  listLocalSeoArticles,
  generateLocalSeoArticlesBatch,
  createLocalSeoArticle,
  deleteLocalSeoArticle,
} from '@/lib/local-growth-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAuth(['admin', 'operator']);
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || undefined;
    const publishStatus = searchParams.get('publishStatus') || undefined;

    const articles = await listLocalSeoArticles({
      companyId,
      publishStatus,
    });

    return NextResponse.json({ success: true, articles });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante il recupero degli articoli SEO' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const body = await request.json();

    if (!body.companyId) {
      return NextResponse.json(
        { error: 'Seleziona un attività per generare o pubblicare articoli SEO' },
        { status: 400 }
      );
    }

    if (body.action === 'generate_batch') {
      const articles = await generateLocalSeoArticlesBatch(
        {
          companyId: body.companyId,
          targetCity: body.targetCity,
          sector: body.sector,
          count: body.count ? Number(body.count) : 4,
        },
        user
      );

      return NextResponse.json({
        success: true,
        message: `Generati e pubblicati ${articles.length} articoli SEO geolocalizzati ad alto posizionamento!`,
        articles,
      });
    }

    if (!body.title || !body.targetKeyword || !body.contentHtml) {
      return NextResponse.json(
        { error: 'Titolo, Keyword principale e contenuto articolo sono obbligatori' },
        { status: 400 }
      );
    }

    const article = await createLocalSeoArticle(
      {
        companyId: body.companyId,
        title: body.title,
        targetKeyword: body.targetKeyword,
        targetCity: body.targetCity,
        metaTitle: body.metaTitle,
        metaDescription: body.metaDescription,
        excerpt: body.excerpt,
        contentHtml: body.contentHtml,
        publishStatus: body.publishStatus,
      },
      user
    );

    return NextResponse.json({
      success: true,
      message: 'Articolo Blog SEO Locale creato con successo!',
      article,
    });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante la creazione degli articoli SEO' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID articolo mancante' }, { status: 400 });
    }

    await deleteLocalSeoArticle(id, user);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante l eliminazione dell articolo' },
      { status: 500 }
    );
  }
}
