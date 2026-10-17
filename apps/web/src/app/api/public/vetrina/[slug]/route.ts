import { NextRequest, NextResponse } from 'next/server';
import {
  getPublicVetrinaBundle,
  handlePublicVetrinaInteraction,
} from '@/lib/local-growth-service';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const bundle = await getPublicVetrinaBundle(slug);
    if (!bundle) {
      return NextResponse.json(
        { error: 'Sito vetrina locale non trovato' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      bundle,
    });
  } catch (error: any) {
    console.error('[API Public Vetrina Slug GET] Error:', error);
    return NextResponse.json(
      { error: 'Errore nel caricamento del sito vetrina', details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const {
      customerName,
      customerPhone,
      customerEmail,
      messageText,
      serviceSelected,
      preferredDate,
      conversationId,
    } = body;

    if (!customerName || !customerPhone) {
      return NextResponse.json(
        { error: 'Inserisci il tuo nome e numero di telefono/WhatsApp per continuare.' },
        { status: 400 }
      );
    }

    if (!messageText && !serviceSelected && !preferredDate) {
      return NextResponse.json(
        { error: 'Inserisci un messaggio o seleziona un servizio da prenotare.' },
        { status: 400 }
      );
    }

    const conversation = await handlePublicVetrinaInteraction(slug, {
      customerName: String(customerName),
      customerPhone: String(customerPhone),
      customerEmail: customerEmail ? String(customerEmail) : undefined,
      messageText: messageText ? String(messageText) : 'Vorrei prenotare un appuntamento',
      serviceSelected: serviceSelected ? String(serviceSelected) : undefined,
      preferredDate: preferredDate ? String(preferredDate) : undefined,
      conversationId: conversationId ? String(conversationId) : undefined,
    });

    return NextResponse.json({
      success: true,
      conversation,
    });
  } catch (error: any) {
    console.error('[API Public Vetrina Slug POST] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Errore durante l invio della richiesta' },
      { status: 500 }
    );
  }
}
