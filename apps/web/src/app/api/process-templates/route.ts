import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listProcessTemplates, createProcessTemplateDraft } from '@/lib/process-templates-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const status = searchParams.get('status') || undefined;
    const q = searchParams.get('q') || undefined;

    const templates = await listProcessTemplates({ category, status, q });
    return NextResponse.json({ success: true, templates });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore recupero modelli' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Solo gli amministratori possono creare modelli di processo
    const user = await requireAuth(['admin']);
    const body = await request.json();

    if (!body.name || !body.code || !body.definition) {
      return NextResponse.json(
        { error: 'Nome, codice e definizione del modello sono obbligatori' },
        { status: 400 }
      );
    }

    const result = await createProcessTemplateDraft(
      {
        name: body.name,
        code: body.code,
        category: body.category || 'website',
        description: body.description,
        definition: body.definition,
      },
      user.userId
    );

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Permesso negato: solo gli amministratori possono gestire i modelli' }, { status: 403 });
    }
    return NextResponse.json({ error: error?.message || 'Errore creazione modello' }, { status: 500 });
  }
}
