import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  getOrCreateCalendarSyncToken,
  regenerateCalendarSyncToken,
} from '@/lib/activities-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const token = await getOrCreateCalendarSyncToken(user.userId);

    const host = request.headers.get('host') || 'ai-consulting-crm.fly.dev';
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${proto}://${host}`;

    const httpFeedUrl = `${baseUrl}/api/activities/calendar/feed?token=${token}`;
    const webcalFeedUrl = `webcal://${host}/api/activities/calendar/feed?token=${token}`;

    return NextResponse.json({
      success: true,
      token,
      httpFeedUrl,
      webcalFeedUrl,
      instructions: {
        googleCalendar: 'In Google Calendar: Altri calendari (+) -> Da URL -> Incolla il link httpFeedUrl',
        appleCalendar: 'In Apple Calendar: File -> Nuova iscrizione a calendario -> Incolla il link webcalFeedUrl',
        outlook: 'In Outlook: Aggiungi calendario -> Da Internet -> Incolla il link',
      },
    });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante il recupero del token di sincronizzazione' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const newToken = await regenerateCalendarSyncToken(user.userId);

    const host = request.headers.get('host') || 'ai-consulting-crm.fly.dev';
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${proto}://${host}`;

    const httpFeedUrl = `${baseUrl}/api/activities/calendar/feed?token=${newToken}`;
    const webcalFeedUrl = `webcal://${host}/api/activities/calendar/feed?token=${newToken}`;

    return NextResponse.json({
      success: true,
      token: newToken,
      httpFeedUrl,
      webcalFeedUrl,
      message: 'Token di sincronizzazione rigenerato con successo. Aggiorna il link nei tuoi calendari esterni.',
    });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante la rigenerazione del token' },
      { status: 500 }
    );
  }
}
