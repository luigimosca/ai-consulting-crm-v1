import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  getCompanyPlatformAccounts,
  createPlatformAccount,
} from '@/lib/platform-accounts-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const { id: companyId } = await params;

    const accounts = await getCompanyPlatformAccounts(companyId, user);
    return NextResponse.json({ success: true, accounts });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'Accesso negato: non sei autorizzato a visualizzare gli account di questa azienda' },
        { status: 403 }
      );
    }
    console.error('Error fetching company platform accounts:', error);
    return NextResponse.json(
      { error: error.message || 'Errore durante il recupero degli account' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const { id: companyId } = await params;
    const body = await request.json();

    if (!body.platformType || !body.accountName) {
      return NextResponse.json(
        { error: 'Tipo piattaforma e nome account sono obbligatori' },
        { status: 400 }
      );
    }

    const account = await createPlatformAccount(
      {
        companyId,
        projectId: body.projectId,
        platformType: body.platformType,
        accountName: body.accountName,
        externalId: body.externalId,
        externalUrl: body.externalUrl,
        accessMethod: body.accessMethod,
        accessLevel: body.accessLevel,
        delegatedToIdentifier: body.delegatedToIdentifier,
        status: body.status,
        notes: body.notes,
        evidenceDocumentId: body.evidenceDocumentId,
      },
      user
    );

    return NextResponse.json({ success: true, account }, { status: 201 });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'Accesso negato: non sei autorizzato a creare account per questa azienda' },
        { status: 403 }
      );
    }
    if (error?.message?.startsWith('SECURITY_VIOLATION')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error creating company platform account:', error);
    return NextResponse.json(
      { error: error.message || 'Errore durante la creazione dell\'account' },
      { status: 500 }
    );
  }
}
