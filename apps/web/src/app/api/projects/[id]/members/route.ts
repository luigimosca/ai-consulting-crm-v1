import { NextResponse } from 'next/server';
import { requireAuth, checkUserProjectAccess, canUserManageProjectTeam } from '@/lib/auth';
import { getProjectMembers, addProjectMember } from '@/lib/team-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth();
    const { id: projectId } = await params;

    // Must be at least a viewer in this project or global admin
    if (!checkUserProjectAccess(currentUser, projectId, 'viewer')) {
      return NextResponse.json({ error: 'Accesso negato al progetto' }, { status: 403 });
    }

    const members = getProjectMembers(projectId);

    return NextResponse.json({ success: true, members });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Errore recupero membri progetto' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth();
    const { id: projectId } = await params;

    // Only Project Manager or Global Admin can add members
    if (!canUserManageProjectTeam(currentUser, projectId)) {
      return NextResponse.json(
        { error: 'Solo i manager del progetto o gli amministratori possono aggiungere membri' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, projectRole } = body;

    if (!userId) {
      return NextResponse.json({ error: 'ID utente obbligatorio' }, { status: 400 });
    }

    const validRoles = ['manager', 'editor', 'contributor', 'viewer'];
    if (projectRole && !validRoles.includes(projectRole)) {
      return NextResponse.json({ error: 'Ruolo di progetto non valido' }, { status: 400 });
    }

    const member = addProjectMember({
      projectId,
      userId,
      projectRole: projectRole || 'contributor',
      addedBy: currentUser.userId,
    });

    return NextResponse.json({ success: true, member }, { status: 201 });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }
    if (error?.message === 'PROJECT_NOT_FOUND') {
      return NextResponse.json({ error: 'Progetto non trovato' }, { status: 404 });
    }
    if (error?.message === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 });
    }
    if (error?.message === 'CANNOT_ADD_INACTIVE_USER') {
      return NextResponse.json({ error: 'Impossibile aggiungere un utente disattivato' }, { status: 400 });
    }
    return NextResponse.json({ error: error?.message || 'Errore aggiunta membro' }, { status: 500 });
  }
}
