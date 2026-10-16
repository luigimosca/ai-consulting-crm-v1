import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listReminders, createReminder } from '@/lib/activities-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'user'; // 'user' or 'all'
    const targetUserId = scope === 'all' && user.role === 'admin' ? undefined : user.userId;
    const category = searchParams.get('category') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const isCompletedParam = searchParams.get('isCompleted');
    const isCompleted = isCompletedParam !== null ? isCompletedParam === 'true' : undefined;

    const reminders = await listReminders({
      userId: targetUserId,
      category,
      priority,
      isCompleted,
    });

    return NextResponse.json({ success: true, reminders });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante il recupero dei promemoria' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const body = await request.json();

    if (!body.title || !body.title.trim()) {
      return NextResponse.json(
        { error: 'Il titolo del promemoria è obbligatorio' },
        { status: 400 }
      );
    }

    const reminder = await createReminder(
      {
        title: body.title.trim(),
        description: body.description,
        dueDateTime: body.dueDateTime,
        priority: body.priority,
        category: body.category,
        leadId: body.leadId,
        companyId: body.companyId,
        color: body.color,
      },
      user
    );

    return NextResponse.json({ success: true, reminder }, { status: 201 });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante la creazione del promemoria' },
      { status: 500 }
    );
  }
}
