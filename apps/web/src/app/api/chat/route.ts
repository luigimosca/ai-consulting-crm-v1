import { NextResponse } from 'next/server';
import { db, chatMessages, leads, demoRequests } from '@ai-crm/db';
import { eq, and } from 'drizzle-orm';
import { processChatMessage, calculateScore, type ChatbotContext } from '@ai-crm/ai';

export const dynamic = 'force-dynamic';


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      sessionId,
      message,
      history = [],
      context = { step: 'greeting' },
    } = body;

    if (!message || !sessionId) {
      return NextResponse.json(
        { error: 'Parametri message e sessionId obbligatori' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const userMsgId = `msg_${Date.now()}_u_${Math.random().toString(36).substring(2, 6)}`;

    // 1. Save user message to database
    db.insert(chatMessages).values({
      id: userMsgId,
      sessionId,
      role: 'user',
      content: message,
      createdAt: now,
    }).run();

    // 2. Call AI Chatbot Processor (Gemini LLM with fallback)
    const result = await processChatMessage({
      sessionId,
      message,
      history,
      context,
    });

    const botMsgId = `msg_${Date.now()}_b_${Math.random().toString(36).substring(2, 6)}`;

    // 3. Save assistant message to database
    db.insert(chatMessages).values({
      id: botMsgId,
      sessionId,
      role: 'assistant',
      content: result.reply,
      createdAt: new Date().toISOString(),
    }).run();

    let leadId: string | null = null;
    let demoCreated = false;

    const mergedData: ChatbotContext = {
      ...context,
      ...result.collectedData,
      step: result.isComplete
        ? 'completed'
        : result.collectedData.step || context.step || 'sector',
    };

    // 4. If lead is qualified / contact email collected, save/update in CRM
    if (mergedData.contactEmail) {
      const email = mergedData.contactEmail.trim().toLowerCase();

      // Check if lead already exists by email or session
      const existingLead = db
        .select()
        .from(leads)
        .where(eq(leads.email, email))
        .get();

      if (existingLead) {
        leadId = existingLead.id;
        // Update existing lead notes and score
        db.update(leads)
          .set({
            sector: (mergedData.sector as any) || existingLead.sector,
            phone: mergedData.contactPhone || existingLead.phone,
            status: 'qualificato',
            notes: `${existingLead.notes || ''}\n[Chatbot Update]: ${mergedData.notes || 'Conversazione completata'}`,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(leads.id, existingLead.id))
          .run();
      } else {
        leadId = `lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const contactName = mergedData.contactName || 'Referente Web';
        const companyName = contactName.includes('Studio') || contactName.includes('Ristorante') || contactName.includes('Hotel')
          ? contactName
          : `Attività di ${contactName}`;

        const scoreCalc = calculateScore({
          sector: mergedData.sector,
          source: 'sito',
          email: mergedData.contactEmail,
          phone: mergedData.contactPhone,
        });

        db.insert(leads).values({
          id: leadId,
          companyName,
          website: null,
          source: 'sito',
          sector: (mergedData.sector as any) || 'local_services',
          score: Math.max(85, scoreCalc.total),
          status: 'qualificato',
          phone: mergedData.contactPhone || null,
          email: mergedData.contactEmail,
          address: null,
          city: null,
          notes: `[Inbound Chatbot Lead]\nSettore: ${mergedData.sector || 'N/D'}\nTeam: ${mergedData.companySize || 'N/D'}\nEsigenza: ${mergedData.needs || 'N/D'}`,
          createdAt: now,
          updatedAt: now,
        }).run();

        // Create Demo Request
        const demoId = `demo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        db.insert(demoRequests).values({
          id: demoId,
          leadId,
          contactName,
          contactEmail: mergedData.contactEmail,
          contactPhone: mergedData.contactPhone || null,
          sector: mergedData.sector || null,
          companySize: mergedData.companySize || null,
          preferredDate: 'Prima possibile',
          notes: `Richiesta demo qualificata via Chatbot AI. Esigenza: ${mergedData.needs || 'Consulenza AI'}`,
          status: 'pending',
          createdAt: now,
        }).run();

        demoCreated = true;
      }

      // Link all session messages to the leadId
      if (leadId) {
        db.update(chatMessages)
          .set({ leadId })
          .where(eq(chatMessages.sessionId, sessionId))
          .run();
      }
    }

    return NextResponse.json({
      success: true,
      reply: result.reply,
      quickReplies: result.quickReplies,
      context: mergedData,
      isComplete: result.isComplete,
      leadId,
      demoCreated,
      usedModel: result.usedModel,
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Errore durante l elaborazione della chat' },
      { status: 500 }
    );
  }
}
