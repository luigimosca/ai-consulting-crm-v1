import { NextResponse } from 'next/server';
import { listPublicVetrinaDirectory } from '@/lib/local-growth-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await listPublicVetrinaDirectory();
    return NextResponse.json({
      success: true,
      count: items.length,
      websites: items,
    });
  } catch (error: any) {
    console.error('[API Public Vetrina Directory GET] Error:', error);
    return NextResponse.json(
      { error: 'Errore nel caricamento della directory vetrine locali', details: error?.message },
      { status: 500 }
    );
  }
}
