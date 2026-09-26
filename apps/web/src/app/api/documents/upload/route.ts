import { NextResponse } from 'next/server';
import { db, documents } from '@ai-crm/db';
import {
  requireAuth,
  checkUserProjectAccess,
  canUserEditTask,
  canUserAccessClientRequest,
} from '@/lib/auth';
import { getStorageProvider } from '@/lib/storage';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const formData = await request.formData();

    const file = formData.get('file') as File | null;
    const entityType = formData.get('entityType') as string | null;
    const entityId = formData.get('entityId') as string | null;
    const visibility = (formData.get('visibility') as string) || 'internal';
    const notes = formData.get('notes') as string | null;

    if (!file || !entityType || !entityId) {
      return NextResponse.json(
        { error: 'File, entityType e entityId sono campi obbligatori' },
        { status: 400 }
      );
    }

    // Enforce entity-level authorization
    if (user.role !== 'admin') {
      if (entityType === 'project' && !checkUserProjectAccess(user, entityId, 'contributor')) {
        return NextResponse.json({ error: 'Accesso negato: non autorizzato al caricamento file per questo progetto' }, { status: 403 });
      }
      if (entityType === 'task' && !canUserEditTask(user, entityId)) {
        return NextResponse.json({ error: 'Accesso negato: non autorizzato al caricamento file per questa attività' }, { status: 403 });
      }
      if (entityType === 'client_request' && !canUserAccessClientRequest(user, entityId, 'submit')) {
        return NextResponse.json({ error: 'Accesso negato: non autorizzato al caricamento file per questa richiesta' }, { status: 403 });
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const storageProvider = getStorageProvider();
    const uploadResult = await storageProvider.upload({
      buffer,
      originalName: file.name,
      mimeType: file.type || 'application/octet-stream',
      entityType,
      entityId,
    });

    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const docRecord = {
      id: docId,
      originalName: uploadResult.originalName,
      fileName: uploadResult.fileName,
      mimeType: uploadResult.mimeType,
      sizeBytes: uploadResult.sizeBytes,
      storageKey: uploadResult.storageKey,
      storageProvider: uploadResult.storageProvider,
      entityType: entityType as any,
      entityId,
      version: 1,
      visibility: (visibility === 'client' ? 'client' : 'internal') as any,
      uploadedBy: user.userId,
      notes: notes || null,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };

    db.insert(documents).values(docRecord).run();

    await logActivity({
      entityType: 'document',
      entityId: docId,
      action: 'document_uploaded',
      performedBy: user.userId,
      details: {
        originalName: uploadResult.originalName,
        linkedEntityType: entityType,
        linkedEntityId: entityId,
        sizeBytes: uploadResult.sizeBytes,
      },
    });

    return NextResponse.json({ success: true, document: docRecord });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }
    return NextResponse.json({ error: error?.message || 'Errore caricamento documento' }, { status: 500 });
  }
}
