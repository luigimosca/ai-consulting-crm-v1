import { NextResponse } from 'next/server';
import { db, documents, users } from '@ai-crm/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { getStorageProvider } from '@/lib/storage';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const doc = db
      .select({
        id: documents.id,
        originalName: documents.originalName,
        fileName: documents.fileName,
        mimeType: documents.mimeType,
        sizeBytes: documents.sizeBytes,
        storageKey: documents.storageKey,
        storageProvider: documents.storageProvider,
        entityType: documents.entityType,
        entityId: documents.entityId,
        version: documents.version,
        visibility: documents.visibility,
        uploadedBy: documents.uploadedBy,
        notes: documents.notes,
        isArchived: documents.isArchived,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        uploaderName: users.name,
      })
      .from(documents)
      .leftJoin(users, eq(documents.uploadedBy, users.id))
      .where(eq(documents.id, id))
      .get();

    if (!doc) {
      return NextResponse.json({ error: 'Documento non trovato' }, { status: 404 });
    }

    return NextResponse.json({ success: true, document: doc });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore recupero documento' }, { status: 500 });
  }
}

export async function DELETE(
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

    const now = new Date().toISOString();

    // Soft delete / archive
    db.update(documents)
      .set({ isArchived: true, updatedAt: now })
      .where(eq(documents.id, id))
      .run();

    await logActivity({
      entityType: 'document',
      entityId: id,
      action: 'document_archived',
      performedBy: user.userId,
      details: { originalName: doc.originalName },
    });

    return NextResponse.json({ success: true, message: 'Documento archiviato con successo' });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore eliminazione documento' }, { status: 500 });
  }
}
