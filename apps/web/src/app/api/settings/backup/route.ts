import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { exportSettingsBackup } from '@/lib/settings-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await requireAuth(['admin']);
    const { searchParams } = new URL(request.url);
    const brandKey = searchParams.get('brandKey') || 'default';

    const backup = exportSettingsBackup(brandKey);
    return NextResponse.json({ success: true, backup });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso negato: solo gli amministratori possono esportare le impostazioni' }, { status: 403 });
    }
    return NextResponse.json({ error: error?.message || 'Errore durante l\'esportazione delle impostazioni' }, { status: 500 });
  }
}
