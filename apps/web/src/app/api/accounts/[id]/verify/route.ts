import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { verifyPlatformAccount } from '@/lib/platform-accounts-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const { id: accountId } = await params;
    const body = await request.json();

    if (!body.verificationMethod || !body.verificationMethod.trim()) {
      return NextResponse.json(
        { error: 'Metodo di verifica obbligatorio (es. invito MCC accettato, ping GA4 in tempo reale, record DNS TXT verificato)' },
        { status: 400 }
      );
    }

    const verified = await verifyPlatformAccount(
      accountId,
      {
        verificationMethod: body.verificationMethod,
        verificationNotes: body.verificationNotes,
        evidenceDocumentId: body.evidenceDocumentId,
      },
      user
    );

    return NextResponse.json({ success: true, account: verified });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'Accesso negato: permessi insufficienti per verificare questo account' },
        { status: 403 }
      );
    }
    if (error?.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Account non trovato' }, { status: 404 });
    }
    if (error?.message?.startsWith('INVALID_INPUT') || error?.message?.startsWith('SECURITY_VIOLATION')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error verifying platform account:', error);
    return NextResponse.json(
      { error: error.message || 'Errore durante la verifica dell\'account' },
      { status: 500 }
    );
  }
}
