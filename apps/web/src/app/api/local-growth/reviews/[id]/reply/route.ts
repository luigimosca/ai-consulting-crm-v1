import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { generateReviewAiReply, saveReviewReply } from '@/lib/local-growth-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const { id } = await params;
    const body = await request.json();

    if (body.action === 'generate_ai') {
      const result = await generateReviewAiReply(id, user);
      return NextResponse.json({
        success: true,
        suggestedReply: result.suggestedReply,
        sentiment: result.sentiment,
      });
    }

    if (body.action === 'save_reply') {
      if (!body.replyText || !body.replyText.trim()) {
        return NextResponse.json({ error: 'Il testo della risposta è obbligatorio' }, { status: 400 });
      }

      const updated = await saveReviewReply(
        id,
        body.replyText.trim(),
        !!body.publishNow,
        user
      );

      return NextResponse.json({
        success: true,
        review: updated,
        message: body.publishNow
          ? 'Risposta pubblicata con successo sulla scheda Google!'
          : 'Bozza risposta salvata con successo.',
      });
    }

    return NextResponse.json({ error: 'Azione non valida' }, { status: 400 });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante la gestione della risposta alla recensione' },
      { status: 500 }
    );
  }
}
