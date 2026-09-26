import { NextResponse } from 'next/server';
import { db, documents } from '@ai-crm/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { getStorageProvider } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const doc = db.select().from(documents).where(eq(documents.id, id)).get();
    if (!doc) {
      return NextResponse.json({ error: 'Documento non trovato' }, { status: 404 });
    }

    const storageProvider = getStorageProvider();
    const fileResult = await storageProvider.download(doc.storageKey);

    if (!fileResult) {
      return NextResponse.json({ error: 'File fisico non presente sullo storage' }, { status: 404 });
    }

    // Set download headers
    const headers = new Headers();
    headers.set('Content-Type', doc.mimeType || 'application/octet-stream');
    headers.set('Content-Length', doc.sizeBytes.toString());
    headers.set(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(doc.originalName)}"`
    );
    headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');

    return new Response(new Uint8Array(fileResult.buffer), {
      status: 200,
      headers,
    });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore download documento' }, { status: 500 });
  }
}
