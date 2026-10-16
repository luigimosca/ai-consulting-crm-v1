import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getLocalWebsite, generateOrUpdateLocalWebsite } from '@/lib/local-growth-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAuth(['admin', 'operator']);
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || undefined;

    const website = await getLocalWebsite(companyId);
    return NextResponse.json({ success: true, website });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante il recupero del sito vetrina locale' },
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
        { error: 'Seleziona un attività per generare o aggiornare il Sito Vetrina Locale' },
        { status: 400 }
      );
    }

    const website = await generateOrUpdateLocalWebsite(
      {
        companyId: body.companyId,
        domainUrl: body.domainUrl,
        heroTitle: body.heroTitle,
        heroSubtitle: body.heroSubtitle,
        primaryCtaText: body.primaryCtaText,
        targetCity: body.targetCity,
        targetKeywords: body.targetKeywords,
        servicesShowcase: body.servicesShowcase,
        status: body.status,
        autoOptimizeAi: body.autoOptimizeAi,
      },
      user
    );

    return NextResponse.json({
      success: true,
      message: body.autoOptimizeAi
        ? 'Sito Vetrina Locale, Keywords e Schema.org JSON-LD generati e ottimizzati con successo!'
        : 'Configurazione Sito Vetrina Locale aggiornata!',
      website,
    });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante il salvataggio del sito vetrina locale' },
      { status: 500 }
    );
  }
}
