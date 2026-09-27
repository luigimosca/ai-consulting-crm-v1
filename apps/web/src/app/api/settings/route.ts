import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getOrganizationSettings, updateOrganizationSettings } from '@/lib/settings-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await requireAuth(['admin']);
    const { searchParams } = new URL(request.url);
    const brandKey = searchParams.get('brandKey') || 'default';

    const settings = getOrganizationSettings(brandKey);
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso negato: solo gli amministratori possono accedere alle impostazioni' }, { status: 403 });
    }
    return NextResponse.json({ error: error?.message || 'Errore recupero impostazioni' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth(['admin']);
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const brandKey = searchParams.get('brandKey') || body.brandKey || 'default';

    const updated = await updateOrganizationSettings(body, user, brandKey);
    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso negato: solo gli amministratori possono modificare le impostazioni' }, { status: 403 });
    }
    if (error?.message === 'VALIDATION_ERROR') {
      return NextResponse.json({ error: 'Dati non validi', validationErrors: error.details }, { status: 400 });
    }
    return NextResponse.json({ error: error?.message || 'Errore salvataggio impostazioni' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return PATCH(request);
}
