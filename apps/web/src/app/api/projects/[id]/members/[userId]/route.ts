import { NextResponse } from 'next/server';
import { requireAuth, canUserManageProjectTeam, ProjectRole } from '@/lib/auth';
import { updateProjectMemberRole, removeProjectMember } from '@/lib/team-service';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const currentUser = await requireAuth();
    const { id: projectId, userId } = await params;

    if (!canUserManageProjectTeam(currentUser, projectId)) {
      return NextResponse.json(
        { error: 'Solo i manager del progetto o gli amministratori possono modificare i ruoli' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { projectRole } = body;

    const validRoles: ProjectRole[] = ['manager', 'editor', 'contributor', 'viewer'];
    if (!projectRole || !validRoles.includes(projectRole)) {
      return NextResponse.json({ error: 'Ruolo di progetto non valido' }, { status: 400 });
    }

    const updated = updateProjectMemberRole(projectId, userId, projectRole);

    return NextResponse.json({ success: true, member: updated });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }
    if (error?.message === 'MEMBER_NOT_FOUND') {
      return NextResponse.json({ error: 'Membro non trovato nel progetto' }, { status: 404 });
    }
    return NextResponse.json({ error: error?.message || 'Errore aggiornamento ruolo membro' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const currentUser = await requireAuth();
    const { id: projectId, userId } = await params;

    if (!canUserManageProjectTeam(currentUser, projectId)) {
      return NextResponse.json(
        { error: 'Solo i manager del progetto o gli amministratori possono rimuovere membri' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    const result = removeProjectMember(projectId, userId, force);

    if (!result.success && result.hasOpenTasks) {
      return NextResponse.json(
        {
          error: 'USER_HAS_OPEN_TASKS',
          message: result.message,
          openTasksCount: result.openTasksCount,
          openTasks: result.openTasks,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, removedUserId: userId });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }
    if (error?.message === 'MEMBER_NOT_FOUND') {
      return NextResponse.json({ error: 'Membro non trovato nel progetto' }, { status: 404 });
    }
    return NextResponse.json({ error: error?.message || 'Errore rimozione membro' }, { status: 500 });
  }
}
