import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  getPlatformAccountById,
  updatePlatformAccount,
  deletePlatformAccount,
} from '@/lib/platform-accounts-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const { id: accountId } = await params;

    const account = await getPlatformAccountById(accountId, user);
    if (!account) {
      return NextResponse.json({ error: 'Account non trovato' }, { status: 404 });
    }

    return NextResponse.json({ success: true, account });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'Accesso negato: non sei autorizzato a visualizzare questo account' },
        { status: 403 }
      );
    }
    console.error('Error fetching platform account by ID:', error);
    return NextResponse.json(
      { error: error.message || 'Errore durante il recupero dell\'account' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const { id: accountId } = await params;
    const body = await request.json();

    const updated = await updatePlatformAccount(accountId, body, user);
    return NextResponse.json({ success: true, account: updated });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'Accesso negato: non sei autorizzato a modificare questo account' },
        { status: 403 }
      );
    }
    if (error?.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Account non trovato' }, { status: 404 });
    }
    if (error?.message?.startsWith('SECURITY_VIOLATION') || error?.message?.startsWith('INVALID_OPERATION')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error updating platform account:', error);
    return NextResponse.json(
      { error: error.message || 'Errore durante l\'aggiornamento dell\'account' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const { id: accountId } = await params;

    const result = await deletePlatformAccount(accountId, user);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'Accesso negato: permessi insufficienti per eliminare questo account' },
        { status: 403 }
      );
    }
    console.error('Error deleting platform account:', error);
    return NextResponse.json(
      { error: error.message || 'Errore durante l\'eliminazione dell\'account' },
      { status: 500 }
    );
  }
}
