import { generateUserIcsCalendarFeed } from '@/lib/activities-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token || token.length < 16) {
      return new Response('Token di sincronizzazione mancante o non valido', { status: 401 });
    }

    const icsFeed = await generateUserIcsCalendarFeed(token);
    if (!icsFeed) {
      return new Response('Calendario non trovato per il token specificato', { status: 404 });
    }

    return new Response(icsFeed, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="crm-calendar-feed.ics"',
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error: any) {
    return new Response(`Errore durante la generazione del feed: ${error.message}`, {
      status: 500,
    });
  }
}
