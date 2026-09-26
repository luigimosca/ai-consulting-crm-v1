import { NextResponse } from 'next/server';
import { db, documents, users } from '@ai-crm/db';
import { eq, desc, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const q = searchParams.get('q');

    let allDocs = db
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
      .where(eq(documents.isArchived, false))
      .orderBy(desc(documents.createdAt))
      .all();

    if (entityType) {
      allDocs = allDocs.filter((d) => d.entityType === entityType);
    }

    if (entityId) {
      allDocs = allDocs.filter((d) => d.entityId === entityId);
    }

    if (q) {
      const term = q.toLowerCase();
      allDocs = allDocs.filter(
        (d) =>
          d.originalName.toLowerCase().includes(term) ||
          (d.notes && d.notes.toLowerCase().includes(term))
      );
    }

    return NextResponse.json({ success: true, documents: allDocs });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore recupero documenti' }, { status: 500 });
  }
}
