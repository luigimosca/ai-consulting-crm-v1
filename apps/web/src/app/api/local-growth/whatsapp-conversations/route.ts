import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  listWhatsappConversations,
  simulateIncomingWhatsappMessage,
  replyWhatsappConversationAsOperator,
  seedSampleWhatsappConversations,
} from '@/lib/local-growth-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAuth(['admin', 'operator']);
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || undefined;
    const status = searchParams.get('status') || undefined;
    const intentDetected = searchParams.get('intentDetected') || undefined;

    const conversations = await listWhatsappConversations({
      companyId,
      status,
      intentDetected,
    });

    return NextResponse.json({ success: true, conversations });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante il recupero delle conversazioni WhatsApp' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const body = await request.json();

    if (body.action === 'seed_samples') {
      if (!body.companyId) {
        return NextResponse.json(
          { error: 'Seleziona un attività per generare le conversazioni dimostrative' },
          { status: 400 }
        );
      }
      const conversations = await seedSampleWhatsappConversations(body.companyId, user);
      return NextResponse.json({
        success: true,
        message: '3 conversazioni reali WhatsApp simulate con acquisizione Lead e Prenotazione in Agenda!',
        conversations,
      });
    }

    if (body.action === 'operator_reply') {
      if (!body.conversationId || !body.replyText) {
        return NextResponse.json(
          { error: 'ID conversazione e testo risposta obbligatori' },
          { status: 400 }
        );
      }
      const updated = await replyWhatsappConversationAsOperator(
        body.conversationId,
        body.replyText,
        body.status,
        user
      );
      return NextResponse.json({
        success: true,
        message: 'Risposta operatore inviata con successo su WhatsApp!',
        conversation: updated,
      });
    }

    // Default: simulate_incoming
    if (!body.companyId || !body.messageText) {
      return NextResponse.json(
        { error: 'Attività e testo del messaggio sono obbligatori' },
        { status: 400 }
      );
    }

    const conversation = await simulateIncomingWhatsappMessage(
      {
        companyId: body.companyId,
        customerName: body.customerName || 'Cliente WhatsApp',
        customerPhone: body.customerPhone || '+39 340 5566778',
        messageText: body.messageText,
        conversationId: body.conversationId,
      },
      user
    );

    return NextResponse.json({
      success: true,
      message: 'Messaggio elaborato dall Agente WhatsApp AI 24/7!',
      conversation,
    });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante l elaborazione del messaggio WhatsApp' },
      { status: 500 }
    );
  }
}
