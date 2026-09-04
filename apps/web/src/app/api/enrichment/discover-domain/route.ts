import { NextResponse } from 'next/server';
import { discoverCompanyOnlinePresence } from '@ai-crm/ai';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyName, city, sector, address } = body;

    if (!companyName || typeof companyName !== 'string') {
      return NextResponse.json({ error: 'Nome azienda obbligatorio' }, { status: 400 });
    }

    const discovery = await discoverCompanyOnlinePresence({
      companyName,
      city: city || null,
      sector: sector || null,
      address: address || null,
    });

    return NextResponse.json({
      success: true,
      discovery,
    });
  } catch (error: any) {
    console.error('Error in discover-domain route:', error);
    return NextResponse.json(
      { error: 'Errore durante la ricerca online del dominio', details: error?.message },
      { status: 500 }
    );
  }
}
