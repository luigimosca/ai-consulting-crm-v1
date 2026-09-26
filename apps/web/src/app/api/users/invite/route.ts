import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createInvitationToken } from '@/lib/team-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const currentUser = await requireAuth(['admin']);

    const body = await request.json();
    const { email, name, role } = body;

    if (!email || !email.trim() || !name || !name.trim()) {
      return NextResponse.json({ error: 'Email e nome sono obbligatori' }, { status: 400 });
    }

    const invitation = await createInvitationToken({
      email: email.trim(),
      name: name.trim(),
      role: role || 'operator',
      createdBy: currentUser.userId,
    });

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || '';
    const inviteUrl = `${origin}/activate?token=${invitation.token}`;

    return NextResponse.json({
      success: true,
      invitation: {
        ...invitation,
        inviteUrl,
      },
    });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Solo gli amministratori possono generare inviti' }, { status: 403 });
    }
    return NextResponse.json({ error: error?.message || 'Errore generazione invito' }, { status: 500 });
  }
}
