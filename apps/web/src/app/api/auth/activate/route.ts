import { NextResponse } from 'next/server';
import { getInvitationByToken, activateUserInvitation } from '@/lib/team-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token non specificato' }, { status: 400 });
    }

    const check = getInvitationByToken(token);
    if (!check) {
      return NextResponse.json({ error: 'Token non valido o inesistente' }, { status: 404 });
    }

    if (check.error === 'TOKEN_ALREADY_USED') {
      return NextResponse.json({ error: 'Questo link di invito è già stato utilizzato' }, { status: 410 });
    }

    if (check.error === 'TOKEN_EXPIRED') {
      return NextResponse.json({ error: 'Questo link di invito è scaduto' }, { status: 410 });
    }

    return NextResponse.json({
      success: true,
      invitation: {
        email: check.invite?.email,
        name: check.invite?.name,
        role: check.invite?.role,
        expiresAt: check.invite?.expiresAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Errore verifica token' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json({ error: 'Token e password obbligatori' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'La password deve contenere almeno 6 caratteri' }, { status: 400 });
    }

    const result = await activateUserInvitation(token, password);

    return NextResponse.json({
      success: true,
      message: 'Account attivato con successo. Ora puoi effettuare il login.',
      user: result.user,
    });
  } catch (error: any) {
    if (error?.message === 'TOKEN_ALREADY_USED') {
      return NextResponse.json({ error: 'Questo link di invito è già stato utilizzato' }, { status: 410 });
    }
    if (error?.message === 'TOKEN_EXPIRED') {
      return NextResponse.json({ error: 'Questo link di invito è scaduto' }, { status: 410 });
    }
    if (error?.message === 'PASSWORD_TOO_SHORT') {
      return NextResponse.json({ error: 'La password deve contenere almeno 6 caratteri' }, { status: 400 });
    }
    return NextResponse.json({ error: error?.message || 'Errore attivazione account' }, { status: 400 });
  }
}
