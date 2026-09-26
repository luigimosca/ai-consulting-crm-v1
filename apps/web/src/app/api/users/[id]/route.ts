import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { updateUser, getUserProjects } from '@/lib/team-service';
import { db, users } from '@ai-crm/db';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth();
    const { id: userId } = await params;

    // Operator can only view self, Admin can view anyone
    if (currentUser.role !== 'admin' && currentUser.userId !== userId) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }

    const user = db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        avatar: users.avatar,
        invitedBy: users.invitedBy,
        activatedAt: users.activatedAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!user) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 });
    }

    const projects = getUserProjects(userId);

    return NextResponse.json({ success: true, user, projects });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Errore recupero utente' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Only admin can modify other users/roles/status
    const currentUser = await requireAuth(['admin']);
    const { id: userId } = await params;
    const body = await request.json();

    const updated = await updateUser(userId, {
      name: body.name,
      email: body.email,
      role: body.role,
      status: body.status,
      password: body.password,
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Solo gli amministratori possono modificare utenti' }, { status: 403 });
    }
    if (error?.message === 'EMAIL_ALREADY_EXISTS') {
      return NextResponse.json({ error: 'Email già utilizzata da un altro utente' }, { status: 409 });
    }
    if (error?.message === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 });
    }
    return NextResponse.json({ error: error?.message || 'Errore aggiornamento utente' }, { status: 500 });
  }
}
