import { NextResponse } from 'next/server';
import { getLeadScraperProvider } from '@ai-crm/ai';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sectorId, subcategories, city, radiusKm = 10, niche } = body;

    const targetCity = (city || 'Milano').trim();

    const provider = getLeadScraperProvider();
    console.log(`[LeadGen API] Avvio ricerca "${provider.name}" per città: "${targetCity}", settore: "${sectorId || niche || 'all'}", raggio: ${radiusKm}km`);

    const result = await provider.search({
      city: targetCity,
      sectorId,
      subcategories,
      radiusKm: Number(radiusKm),
      niche,
    });

    if (!result.success && result.places.length === 0 && result.error) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          debugInfo: result.debugInfo,
          provider: result.provider,
          results: [],
          count: 0,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      results: result.places,
      places: result.places,
      count: result.count,
      provider: result.provider,
      debugInfo: result.debugInfo,
    });
  } catch (error: any) {
    console.error('[LeadGen API] Errore inaspettato:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Errore durante la ricerca geospaziale dei lead territoriali',
        results: [],
        count: 0,
      },
      { status: 500 }
    );
  }
}
