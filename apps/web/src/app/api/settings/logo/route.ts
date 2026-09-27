import { NextResponse } from 'next/server';
import { db, documents, organizationSettings } from '@ai-crm/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { getStorageProvider } from '@/lib/storage';
import { sanitizeSvgBuffer, getOrganizationSettings } from '@/lib/settings-service';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_LOGO_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);

export async function POST(request: Request) {
  try {
    const user = await requireAuth(['admin']);
    const formData = await request.formData();

    const file = formData.get('file') as File | null;
    const logoType = (formData.get('logoType') as string) || 'primary'; // 'primary' | 'dark' | 'favicon'
    const brandKey = (formData.get('brandKey') as string) || 'default';

    if (!file) {
      return NextResponse.json({ error: 'Nessun file selezionato' }, { status: 400 });
    }

    if (file.size > MAX_LOGO_SIZE_BYTES) {
      return NextResponse.json(
        { error: `La dimensione del file supera il limite massimo di 5 MB (${Math.round(file.size / 1024)} KB)` },
        { status: 400 }
      );
    }

    const mimeType = file.type || 'application/octet-stream';
    if (!ALLOWED_LOGO_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: `Formato file non supportato (${mimeType}). Formati consentiti: PNG, JPEG, WEBP, SVG, ICO.` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // If SVG, perform strict security content validation
    if (mimeType === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      const svgCheck = sanitizeSvgBuffer(buffer);
      if (!svgCheck.isSafe) {
        return NextResponse.json(
          { error: svgCheck.reason || 'File SVG non valido o contenente codice non consentito' },
          { status: 400 }
        );
      }
    }

    const storageProvider = getStorageProvider();
    const uploadResult = await storageProvider.upload({
      buffer,
      originalName: file.name,
      mimeType,
      entityType: 'settings',
      entityId: `brand_${brandKey}_${logoType}`,
    });

    const docId = `doc_brand_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const docRecord = {
      id: docId,
      originalName: uploadResult.originalName,
      fileName: uploadResult.fileName,
      mimeType: uploadResult.mimeType,
      sizeBytes: uploadResult.sizeBytes,
      storageKey: uploadResult.storageKey,
      storageProvider: uploadResult.storageProvider,
      entityType: 'general' as const,
      entityId: `settings_${brandKey}`,
      version: 1,
      visibility: 'client' as const,
      uploadedBy: user.userId,
      notes: `Asset grafico brand: ${logoType} (${uploadResult.originalName})`,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };

    db.insert(documents).values(docRecord).run();

    // Update settings table with new document ID
    const settings = getOrganizationSettings(brandKey);
    const updateField: any = {
      updatedAt: now,
      updatedBy: user.userId,
    };

    if (logoType === 'primary') {
      updateField.logoDocumentId = docId;
    } else if (logoType === 'dark') {
      updateField.logoDarkDocumentId = docId;
    } else if (logoType === 'favicon') {
      updateField.faviconDocumentId = docId;
    }

    db.update(organizationSettings)
      .set(updateField)
      .where(eq(organizationSettings.brandKey, brandKey))
      .run();

    await logActivity({
      entityType: 'general',
      entityId: settings.id,
      action: 'brand_asset_uploaded',
      performedBy: user.userId,
      details: {
        logoType,
        originalName: uploadResult.originalName,
        sizeBytes: uploadResult.sizeBytes,
        docId,
      },
    });

    const downloadUrl = `/api/documents/${docId}/download`;

    return NextResponse.json({
      success: true,
      documentId: docId,
      logoType,
      downloadUrl,
      document: docRecord,
    });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso negato: solo gli amministratori possono caricare i loghi' }, { status: 403 });
    }
    return NextResponse.json({ error: error?.message || 'Errore durante il caricamento del file' }, { status: 500 });
  }
}
