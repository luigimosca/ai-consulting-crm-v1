import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { revokePlatformAccount } from '@/lib/platform-accounts-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const { id: accountId } = await params;
    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    const revoked = await revokePlatformAccount(
      accountId,
      {
        revocationReason: body.revocationReason || body.notes || 'Accesso revocato dall\'operatore',
      },
      user
    );

    return NextResponse.json({ success: true, account: revoked });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'Accesso negato: permessi insufficienti per revocare questo account' },
        { status: 403 }
      );
    }
    if (error?.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Account non trovato' }, { status: 404 });
    }
    if (error?.message?.startsWith('SECURITY_VIOLATION')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error revoking platform account:', error);
    return NextResponse.json(
      { error: error.message || 'Errore durante la revoca dell\'account' },
      { status: 500 }
    );
  }
}
