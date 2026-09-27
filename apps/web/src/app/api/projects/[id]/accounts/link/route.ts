import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  linkAccountToProject,
  unlinkAccountFromProject,
} from '@/lib/platform-accounts-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const { id: projectId } = await params;
    const body = await request.json();

    if (!body.accountId) {
      return NextResponse.json({ error: 'accountId obbligatorio' }, { status: 400 });
    }

    const result = await linkAccountToProject(projectId, body.accountId, user, body.notes);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'Accesso negato: permessi insufficienti per collegare account a questo progetto' },
        { status: 403 }
      );
    }
    console.error('Error linking platform account to project:', error);
    return NextResponse.json(
      { error: error.message || 'Errore durante il collegamento dell\'account' },
      { status: error.message?.includes('NOT_FOUND') ? 404 : 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const { id: projectId } = await params;
    const body = await request.json();

    if (!body.accountId) {
      return NextResponse.json({ error: 'accountId obbligatorio' }, { status: 400 });
    }

    const result = await unlinkAccountFromProject(projectId, body.accountId, user);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'Accesso negato: permessi insufficienti per scollegare account da questo progetto' },
        { status: 403 }
      );
    }
    console.error('Error unlinking platform account from project:', error);
    return NextResponse.json(
      { error: error.message || 'Errore durante lo scollegamento dell\'account' },
      { status: 500 }
    );
  }
}
