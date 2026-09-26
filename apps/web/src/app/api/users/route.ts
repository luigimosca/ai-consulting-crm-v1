import { NextResponse } from 'next/server';
import { db, users } from '@ai-crm/db';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAuth();

    const allUsers = db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        avatar: users.avatar,
      })
      .from(users)
      .all();

    return NextResponse.json({ success: true, users: allUsers });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Errore recupero utenti' }, { status: 500 });
  }
}
