import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listTeamUsers, createUserByAdmin, getAvailableTaskAssignees } from '@/lib/team-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const currentUser = await requireAuth();

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = (searchParams.get('status') as 'active' | 'inactive' | 'all') || 'all';
    const search = searchParams.get('search') || '';

    // If querying task assignees for a specific project
    if (projectId) {
      const assignees = getAvailableTaskAssignees(projectId);
      return NextResponse.json({ success: true, users: assignees });
    }

    // Otherwise list team users (Admin sees all details, operators see active users)
    const filterStatus = currentUser.role === 'admin' ? status : 'active';
    const teamUsers = listTeamUsers({ status: filterStatus, search });

    return NextResponse.json({ success: true, users: teamUsers });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Errore recupero utenti' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Only global admin can create users
    const currentUser = await requireAuth(['admin']);

    const body = await request.json();
    const { name, email, role, password, createInviteToken } = body;

    if (!name || !name.trim() || !email || !email.trim()) {
      return NextResponse.json({ error: 'Nome ed email sono obbligatori' }, { status: 400 });
    }

    if (!createInviteToken && (!password || password.trim().length < 6)) {
      return NextResponse.json({ error: 'La password deve contenere almeno 6 caratteri' }, { status: 400 });
    }

    const created = await createUserByAdmin({
      name: name.trim(),
      email: email.trim(),
      role: role || 'operator',
      password: password?.trim(),
      createInviteToken: !!createInviteToken,
      createdBy: currentUser.userId,
    });

    return NextResponse.json({ success: true, user: created }, { status: 201 });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Solo gli amministratori possono creare utenti' }, { status: 403 });
    }
    if (error?.message === 'EMAIL_ALREADY_EXISTS') {
      return NextResponse.json({ error: 'Esiste già un utente con questa email' }, { status: 409 });
    }
    return NextResponse.json({ error: error?.message || 'Errore creazione utente' }, { status: 500 });
  }
}
