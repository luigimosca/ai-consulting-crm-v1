import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listSegments, createSegment } from '@/lib/marketing-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAuth(['admin', 'operator']);
    const segments = await listSegments();
    return NextResponse.json({ success: true, segments });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante il caricamento dei segmenti' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const body = await request.json();

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: 'Il nome del segmento è obbligatorio' }, { status: 400 });
    }
    if (!body.targetType || !['leads', 'companies'].includes(body.targetType)) {
      return NextResponse.json({ error: 'Il tipo di target (leads o companies) è obbligatorio' }, { status: 400 });
    }
    if (!body.rules) {
      return NextResponse.json({ error: 'Le regole del segmento sono obbligatorie' }, { status: 400 });
    }

    const segment = await createSegment(
      {
        name: body.name,
        description: body.description,
        targetType: body.targetType,
        rules: body.rules,
      },
      user
    );

    return NextResponse.json({ success: true, segment }, { status: 201 });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante la creazione del segmento' },
      { status: 500 }
    );
  }
}
