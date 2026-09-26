import { NextResponse } from 'next/server';
import { db, companies, leads } from '@ai-crm/db';
import { requireAuth } from '@/lib/auth';
import { PublicCompanySearchService } from '@ai-crm/ai';

export const dynamic = 'force-dynamic';

const searchService = new PublicCompanySearchService();

export async function GET(request: Request) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const city = searchParams.get('city') || null;
    const province = searchParams.get('province') || null;
    const vatId = searchParams.get('vatId') || null;
    const fiscalCode = searchParams.get('fiscalCode') || null;
    const domain = searchParams.get('domain') || null;
    const sources = searchParams.get('sources') || null;

    if (!q.trim() && !vatId?.trim() && !fiscalCode?.trim() && !domain?.trim()) {
      return NextResponse.json(
        { error: 'Specificare almeno un criterio di ricerca (nome azienda, P.IVA, codice fiscale o dominio)' },
        { status: 400 }
      );
    }

    const existingCompanies = db.select().from(companies).all();
    const existingLeads = db.select().from(leads).all();

    const result = await searchService.searchCandidates({
      q,
      city,
      province,
      vatId,
      fiscalCode,
      domain,
      sources,
      existingCompanies,
      existingLeads,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || 'Errore durante la ricerca dati pubblici aziendali' },
      { status: 500 }
    );
  }
}
