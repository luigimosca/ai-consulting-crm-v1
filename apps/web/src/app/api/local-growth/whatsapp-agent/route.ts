import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getWhatsappAgent, upsertWhatsappAgent } from '@/lib/local-growth-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAuth(['admin', 'operator']);
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || undefined;

    const agent = await getWhatsappAgent(companyId);
    return NextResponse.json({ success: true, agent });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante il recupero dell agente WhatsApp' },
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
        { error: 'Seleziona un attività/azienda per configurare l Agente WhatsApp' },
        { status: 400 }
      );
    }

    const agent = await upsertWhatsappAgent(
      {
        companyId: body.companyId,
        agentName: body.agentName,
        whatsappPhone: body.whatsappPhone,
        status: body.status,
        welcomeMessage: body.welcomeMessage,
        businessHours: body.businessHours,
        addressInfo: body.addressInfo,
        pricingMenuInfo: body.pricingMenuInfo,
        faqs: body.faqs,
        bookingEnabled: body.bookingEnabled,
        leadCaptureEnabled: body.leadCaptureEnabled,
        escalationPhone: body.escalationPhone,
        toneOfVoice: body.toneOfVoice,
        autoGenerateKnowledgeBase: body.autoGenerateKnowledgeBase,
      },
      user
    );

    return NextResponse.json({
      success: true,
      message: body.autoGenerateKnowledgeBase
        ? 'Base di conoscenza e Agente WhatsApp AI 24/7 generati con successo!'
        : 'Configurazione Agente WhatsApp AI salvata con successo!',
      agent,
    });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante il salvataggio dell agente WhatsApp' },
      { status: 500 }
    );
  }
}
